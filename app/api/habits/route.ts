import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type FixedSlot = { day_of_week: number; start_time: string; end_time: string };
type FlexiblePreferenceMode = "preferred_days" | "times_per_week";
type FlexiblePreferredSlot = { day_of_week: number; start_time: string; end_time: string };

function normalizePreferredDays(input: unknown) {
  const arr = Array.isArray(input) ? input.map(Number) : [];
  return [...new Set(arr)].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
}

function normalizePreferredSlots(input: unknown) {
  const slots = Array.isArray(input) ? (input as FlexiblePreferredSlot[]) : [];
  return slots
    .map((s) => ({
      day_of_week: Number(s.day_of_week),
      start_time: String(s.start_time ?? ""),
      end_time: String(s.end_time ?? ""),
    }))
    .filter(
      (s) =>
        Number.isInteger(s.day_of_week) &&
        s.day_of_week >= 0 &&
        s.day_of_week <= 6 &&
        s.start_time &&
        s.end_time
    );
}

function validateFlexiblePayload(body: Record<string, unknown>) {
  const duration = Number(body.duration_minutes ?? 0);
  const preference_mode: FlexiblePreferenceMode =
    body.preference_mode === "times_per_week" ? "times_per_week" : "preferred_days";
  const preferred_days = normalizePreferredDays(body.preferred_days);
  const times_per_week = body.times_per_week == null ? null : Number(body.times_per_week);
  const preferred_slots = normalizePreferredSlots(body.preferred_slots);

  if (!Number.isInteger(duration) || duration <= 0 || duration % 15 !== 0) {
    return { error: "duration_minutes must be a positive 15-minute increment" };
  }
  if (preference_mode === "preferred_days" && preferred_days.length === 0) {
    return { error: "Select at least one preferred day for preferred_days mode" };
  }
  if (preference_mode === "times_per_week" && (!times_per_week || !Number.isInteger(times_per_week) || times_per_week <= 0)) {
    return { error: "times_per_week must be a positive integer for times_per_week mode" };
  }

  return {
    duration,
    preference_mode,
    preferred_days: preference_mode === "preferred_days" ? preferred_days : [],
    times_per_week: preference_mode === "times_per_week" ? times_per_week : null,
    preferred_slots,
  };
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("habits")
    .select("*,habit_fixed_slots(*),habit_flexible_rules(*,habit_flexible_preferred_slots(*))")
    .eq("user_id", user.id)
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  const type = body.type === "fixed" ? "fixed" : "flexible";

  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const { data: habit, error } = await supabase
    .from("habits")
    .insert({ user_id: user.id, name, type, active: true })
    .select()
    .single();

  if (error || !habit) return NextResponse.json({ error: error?.message ?? "Failed" }, { status: 500 });

  if (type === "fixed") {
    const slots = (Array.isArray(body.fixed_slots) ? body.fixed_slots : []) as FixedSlot[];
    if (slots.length) {
      const { error: slotErr } = await supabase.from("habit_fixed_slots").insert(
        slots.map((s) => ({ habit_id: habit.id, day_of_week: s.day_of_week, start_time: s.start_time, end_time: s.end_time }))
      );
      if (slotErr) return NextResponse.json({ error: slotErr.message }, { status: 500 });
    }
  } else {
    const flex = validateFlexiblePayload(body);
    if ("error" in flex) return NextResponse.json({ error: flex.error }, { status: 400 });

    const { error: ruleErr } = await supabase.from("habit_flexible_rules").insert({
      habit_id: habit.id,
      duration_minutes: flex.duration,
      preference_mode: flex.preference_mode,
      preferred_days: flex.preferred_days,
      times_per_week: flex.times_per_week,
    });
    if (ruleErr) return NextResponse.json({ error: ruleErr.message }, { status: 500 });

    if (flex.preferred_slots.length) {
      const { error: slotErr } = await supabase.from("habit_flexible_preferred_slots").insert(
        flex.preferred_slots.map((s) => ({
          habit_id: habit.id,
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
        }))
      );
      if (slotErr) return NextResponse.json({ error: slotErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, id: habit.id });
}
