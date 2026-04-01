import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type FixedSlot = { day_of_week: number; start_time: string; end_time: string };

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : undefined;
  const type = body.type === "fixed" || body.type === "flexible" ? body.type : undefined;
  const active = typeof body.active === "boolean" ? body.active : undefined;

  const updates: Record<string, unknown> = {};
  if (name) updates.name = name;
  if (type) updates.type = type;
  if (active !== undefined) updates.active = active;

  const { error } = await supabase.from("habits").update(updates).eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (type === "fixed") {
    await supabase.from("habit_flexible_rules").delete().eq("habit_id", id);
    await supabase.from("habit_fixed_slots").delete().eq("habit_id", id);
    const slots = (Array.isArray(body.fixed_slots) ? body.fixed_slots : []) as FixedSlot[];
    if (slots.length) {
      const { error: slotErr } = await supabase.from("habit_fixed_slots").insert(
        slots.map((s) => ({ habit_id: id, day_of_week: s.day_of_week, start_time: s.start_time, end_time: s.end_time }))
      );
      if (slotErr) return NextResponse.json({ error: slotErr.message }, { status: 500 });
    }
  }

  if (type === "flexible") {
    await supabase.from("habit_fixed_slots").delete().eq("habit_id", id);
    await supabase.from("habit_flexible_rules").delete().eq("habit_id", id);
    const { error: ruleErr } = await supabase.from("habit_flexible_rules").insert({
      habit_id: id,
      duration_minutes: Number(body.duration_minutes ?? 60),
      preferred_days: Array.isArray(body.preferred_days) ? body.preferred_days.map(Number) : [],
      times_per_week: body.times_per_week == null ? null : Number(body.times_per_week),
    });
    if (ruleErr) return NextResponse.json({ error: ruleErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("habits").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
