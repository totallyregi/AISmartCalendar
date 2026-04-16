import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const TASK_COMPLETION_RATINGS = ["not_started", "partially_completed", "completed"] as const;

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
  const requestedStatus = typeof body.status === "string" ? body.status : null;
  const markingDone = requestedStatus === "done";
  const requestedCompletionRating =
    typeof body.task_completion_rating === "string" && TASK_COMPLETION_RATINGS.includes(body.task_completion_rating)
      ? body.task_completion_rating
      : null;
  const requestedQualityRating =
    typeof body.task_quality_rating === "number" && Number.isInteger(body.task_quality_rating)
      ? body.task_quality_rating
      : body.task_quality_rating === null
        ? null
        : undefined;

  let previousStatus: string | null = null;
  if (markingDone) {
    const { data: existing } = await supabase
      .from("assignments")
      .select("status")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    previousStatus = (existing?.status as string | undefined) ?? null;
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string") updates.name = body.name;
  if (typeof body.due_at === "string") updates.due_at = body.due_at;
  if (typeof body.due_at === "string") updates.due_date = body.due_at;
  if (typeof body.estimated_minutes === "number") updates.estimated_minutes = body.estimated_minutes;
  if (typeof body.remaining_minutes === "number") updates.remaining_minutes = body.remaining_minutes;
  if (["not_started", "in_progress", "done"].includes(body.status)) updates.status = body.status;
  if (requestedCompletionRating) updates.task_completion_rating = requestedCompletionRating;
  if (requestedQualityRating !== undefined) {
    if (requestedQualityRating !== null && (requestedQualityRating < 1 || requestedQualityRating > 5)) {
      return NextResponse.json({ error: "task_quality_rating must be 1 to 5" }, { status: 400 });
    }
    updates.task_quality_rating = requestedQualityRating;
  }
  if (markingDone) {
    updates.remaining_minutes = 0;
    updates.task_completion_rating = "completed";
  }

  let { data, error } = await supabase
    .from("assignments")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  // Backward-compat: keep legacy `title` in sync when required.
  if (error?.message?.includes("null value in column \"title\"") || error?.message?.includes("column \"title\"")) {
    const retryUpdates = { ...updates } as Record<string, unknown>;
    if (typeof body.name === "string") retryUpdates.title = body.name;
    ({ data, error } = await supabase
      .from("assignments")
      .update(retryUpdates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (markingDone && previousStatus !== "done") {
    const nowIso = new Date().toISOString();
    await Promise.all([
      supabase
        .from("ai_draft_blocks")
        .delete()
        .eq("user_id", user.id)
        .eq("assignment_id", id)
        .eq("applied", false)
        .gte("starts_at", nowIso),
      supabase
        .from("weekly_plan_blocks")
        .delete()
        .eq("user_id", user.id)
        .eq("assignment_id", id)
        .eq("origin", "applied")
        .gte("starts_at", nowIso),
    ]);
  }

  const out = data as Record<string, unknown>;
  if (typeof out?.name !== "string" && typeof out?.title === "string") {
    return NextResponse.json({ ...out, name: out.title });
  }
  return NextResponse.json(out);
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

  const [{ error: draftErr }, { error: appliedErr }] = await Promise.all([
    supabase.from("ai_draft_blocks").delete().eq("user_id", user.id).eq("assignment_id", id),
    supabase.from("weekly_plan_blocks").delete().eq("user_id", user.id).eq("assignment_id", id),
  ]);
  if (draftErr) return NextResponse.json({ error: draftErr.message }, { status: 500 });
  if (appliedErr) return NextResponse.json({ error: appliedErr.message }, { status: 500 });

  const { error } = await supabase
    .from("assignments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
