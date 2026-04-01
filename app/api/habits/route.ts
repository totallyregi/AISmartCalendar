import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type FixedSlot = { day_of_week: number; start_time: string; end_time: string };

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("habits")
    .select("*,habit_fixed_slots(*),habit_flexible_rules(*)")
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

  const body = await request.json();
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
    const duration = Number(body.duration_minutes ?? 0);
    const preferred_days = Array.isArray(body.preferred_days) ? body.preferred_days.map(Number) : [];
    const times_per_week = body.times_per_week == null ? null : Number(body.times_per_week);

    const { error: ruleErr } = await supabase.from("habit_flexible_rules").insert({
      habit_id: habit.id,
      duration_minutes: duration,
      preferred_days,
      times_per_week,
    });
    if (ruleErr) return NextResponse.json({ error: ruleErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: habit.id });
}
