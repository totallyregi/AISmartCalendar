import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const start_time = typeof body.start_time === "string" ? body.start_time : undefined;
  const end_time = typeof body.end_time === "string" ? body.end_time : undefined;
  if (!start_time || !end_time) {
    return NextResponse.json({ error: "start_time and end_time are required" }, { status: 400 });
  }

  const { data: slot, error: readErr } = await supabase
    .from("habit_fixed_slots")
    .select("id,habit_id")
    .eq("id", id)
    .single();
  if (readErr || !slot) return NextResponse.json({ error: readErr?.message ?? "Slot not found" }, { status: 404 });

  const { data: habit } = await supabase.from("habits").select("id").eq("id", slot.habit_id).eq("user_id", user.id).single();
  if (!habit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("habit_fixed_slots")
    .update({ start_time, end_time })
    .eq("id", id)
    .select("id,day_of_week,start_time,end_time")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data: slot, error: readErr } = await supabase
    .from("habit_fixed_slots")
    .select("id,habit_id")
    .eq("id", id)
    .single();
  if (readErr || !slot) return NextResponse.json({ error: readErr?.message ?? "Slot not found" }, { status: 404 });

  const { data: habit } = await supabase.from("habits").select("id").eq("id", slot.habit_id).eq("user_id", user.id).single();
  if (!habit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabase.from("habit_fixed_slots").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

