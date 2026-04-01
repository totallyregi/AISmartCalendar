import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classId = new URL(request.url).searchParams.get("classId");
  let query = supabase
    .from("assignments")
    .select("*")
    .eq("user_id", user.id)
    .order("due_at", { ascending: true });
  if (classId) query = query.eq("class_id", classId);

  const { data, error } = await query;
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
  const class_id = String(body.class_id ?? "");
  const name = String(body.name ?? "");
  const due_at = String(body.due_at ?? "");
  const estimated_minutes = Number(body.estimated_minutes ?? 0);

  if (!class_id || !name || !due_at || !estimated_minutes || estimated_minutes % 15 !== 0) {
    return NextResponse.json({ error: "class_id, name, due_at, estimated_minutes(15-min) required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("assignments")
    .insert({
      user_id: user.id,
      class_id,
      name,
      due_at,
      estimated_minutes,
      remaining_minutes: estimated_minutes,
      status: "not_started",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
