import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const TASK_COMPLETION_RATINGS = ["not_started", "partially_completed", "completed"] as const;

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
  const normalized = (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    if (typeof r.name !== "string" && typeof r.title === "string") {
      return { ...r, name: r.title };
    }
    return r;
  });
  return NextResponse.json(normalized);
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
  const task_completion_rating = TASK_COMPLETION_RATINGS.includes(body.task_completion_rating)
    ? body.task_completion_rating
    : "not_started";
  const task_quality_rating =
    typeof body.task_quality_rating === "number" && Number.isInteger(body.task_quality_rating)
      ? body.task_quality_rating
      : null;

  if (!class_id || !name || !due_at || !estimated_minutes || estimated_minutes % 15 !== 0) {
    return NextResponse.json({ error: "class_id, name, due_at, estimated_minutes(15-min) required" }, { status: 400 });
  }
  if (task_quality_rating !== null && (task_quality_rating < 1 || task_quality_rating > 5)) {
    return NextResponse.json({ error: "task_quality_rating must be 1 to 5" }, { status: 400 });
  }

  let { data, error } = await supabase
    .from("assignments")
    .insert({
      user_id: user.id,
      class_id,
      name,
      due_at,
      estimated_minutes,
      remaining_minutes: estimated_minutes,
      status: "not_started",
      task_completion_rating,
      task_quality_rating,
    })
    .select()
    .single();

  // Backward-compat: some DBs still enforce legacy non-null `title`.
  if (error?.message?.includes("null value in column \"title\"")) {
    ({ data, error } = await supabase
      .from("assignments")
      .insert({
        user_id: user.id,
        class_id,
        name,
        title: name,
        due_at,
        estimated_minutes,
        remaining_minutes: estimated_minutes,
        status: "not_started",
        task_completion_rating,
        task_quality_rating,
      })
      .select()
      .single());
  }

  // Backward-compat: some DBs still enforce legacy non-null `due_date`.
  if (error?.message?.includes("null value in column \"due_date\"")) {
    ({ data, error } = await supabase
      .from("assignments")
      .insert({
        user_id: user.id,
        class_id,
        name,
        title: name,
        due_at,
        due_date: due_at,
        estimated_minutes,
        remaining_minutes: estimated_minutes,
        status: "not_started",
        task_completion_rating,
        task_quality_rating,
      })
      .select()
      .single());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const out = data as Record<string, unknown>;
  if (typeof out?.name !== "string" && typeof out?.title === "string") {
    return NextResponse.json({ ...out, name: out.title });
  }
  return NextResponse.json(out);
}
