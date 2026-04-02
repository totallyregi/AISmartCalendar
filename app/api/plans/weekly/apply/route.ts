import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const weekStart = typeof body.weekStart === "string" ? body.weekStart : null;
  const draftQuery = supabase
    .from("ai_draft_blocks")
    .select("*")
    .eq("user_id", user.id)
    .eq("applied", false);
  const { data: drafts, error: draftErr } = weekStart ? await draftQuery.eq("week_start_date", weekStart) : await draftQuery;

  if (draftErr) return NextResponse.json({ error: draftErr.message }, { status: 500 });
  if (!drafts?.length) return NextResponse.json({ applied: 0 });

  const draftsByWeek = drafts.reduce<Record<string, typeof drafts>>((acc, d) => {
    const w = String(d.week_start_date);
    if (!acc[w]) acc[w] = [];
    acc[w].push(d);
    return acc;
  }, {});

  const rows: {
    weekly_plan_id: string;
    user_id: string;
    block_type: string;
    title: string;
    starts_at: string;
    ends_at: string;
    assignment_id: string | null;
    habit_id: string | null;
    origin: string;
    editable: boolean;
  }[] = [];
  for (const w of Object.keys(draftsByWeek)) {
    const { data: plan, error: planErr } = await supabase
      .from("weekly_plans")
      .upsert({ user_id: user.id, week_start_date: w, status: "generated" }, { onConflict: "user_id,week_start_date" })
      .select()
      .single();
    if (planErr || !plan) return NextResponse.json({ error: planErr?.message ?? "Failed to load weekly plan" }, { status: 500 });

    rows.push(
      ...draftsByWeek[w].map((d) => ({
        weekly_plan_id: plan.id as string,
        user_id: user.id,
        block_type: String(d.block_type),
        title: String(d.title),
        starts_at: String(d.starts_at),
        ends_at: String(d.ends_at),
        assignment_id: (d.assignment_id as string | null) ?? null,
        habit_id: (d.habit_id as string | null) ?? null,
        origin: "applied",
        editable: true,
      }))
    );
  }

  const { error: insertErr } = await supabase.from("weekly_plan_blocks").insert(rows);
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  const draftIds = drafts.map((d) => d.id as string);
  await supabase.from("ai_draft_blocks").update({ applied: true }).eq("user_id", user.id).in("id", draftIds);

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
        .update({ remaining_minutes: nextRemaining })
        .eq("id", a.id as string)
        .eq("user_id", user.id);
    }
  }

  return NextResponse.json({ applied: rows.length });
}
