import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const weekStart = typeof body.weekStart === "string" ? body.weekStart : null;
  if (!weekStart) return NextResponse.json({ error: "weekStart required" }, { status: 400 });

  const { data: plan, error: planErr } = await supabase
    .from("weekly_plans")
    .upsert({ user_id: user.id, week_start_date: weekStart, status: "generated" }, { onConflict: "user_id,week_start_date" })
    .select()
    .single();
  if (planErr || !plan) return NextResponse.json({ error: planErr?.message ?? "Failed to load weekly plan" }, { status: 500 });

  const { data: drafts, error: draftErr } = await supabase
    .from("ai_draft_blocks")
    .select("*")
    .eq("user_id", user.id)
    .eq("week_start_date", weekStart)
    .eq("applied", false);

  if (draftErr) return NextResponse.json({ error: draftErr.message }, { status: 500 });
  if (!drafts?.length) return NextResponse.json({ applied: 0 });

  const rows = drafts.map((d) => ({
    weekly_plan_id: plan.id,
    user_id: user.id,
    block_type: d.block_type,
    title: d.title,
    starts_at: d.starts_at,
    ends_at: d.ends_at,
    assignment_id: d.assignment_id,
    habit_id: d.habit_id,
    origin: "applied",
    editable: true,
  }));

  const { error: insertErr } = await supabase.from("weekly_plan_blocks").insert(rows);
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  await supabase.from("ai_draft_blocks").update({ applied: true }).eq("user_id", user.id).eq("week_start_date", weekStart).eq("applied", false);

  // decrement assignment remaining after apply
  const minutesByAssignment: Record<string, number> = {};
  for (const d of drafts) {
    if (!d.assignment_id) continue;
    const mins = Math.round((new Date(d.ends_at as string).getTime() - new Date(d.starts_at as string).getTime()) / 60000);
    minutesByAssignment[d.assignment_id as string] = (minutesByAssignment[d.assignment_id as string] ?? 0) + mins;
  }

  const assignmentIds = Object.keys(minutesByAssignment);
  if (assignmentIds.length) {
    const { data: assignments } = await supabase.from("assignments").select("id,remaining_minutes").eq("user_id", user.id).in("id", assignmentIds);
    for (const a of assignments ?? []) {
      const used = minutesByAssignment[a.id as string] ?? 0;
      const nextRemaining = Math.max(0, Number(a.remaining_minutes ?? 0) - used);
      await supabase
        .from("assignments")
        .update({ remaining_minutes: nextRemaining, status: nextRemaining === 0 ? "done" : "in_progress" })
        .eq("id", a.id as string)
        .eq("user_id", user.id);
    }
  }

  return NextResponse.json({ applied: rows.length });
}
