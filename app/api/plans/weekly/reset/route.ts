import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: weeksBefore } = await supabase
    .from("ai_draft_blocks")
    .select("week_start_date")
    .eq("user_id", user.id)
    .eq("applied", false);
  const resetWeeks = Array.from(new Set((weeksBefore ?? []).map((w) => String(w.week_start_date)).filter(Boolean)));

  const { error: draftDeleteErr } = await supabase
    .from("ai_draft_blocks")
    .delete()
    .eq("user_id", user.id)
    .eq("applied", false);
  if (draftDeleteErr) return NextResponse.json({ error: draftDeleteErr.message }, { status: 500 });

  if (resetWeeks.length) {
    for (const weekStart of resetWeeks) {
      const { data: plan } = await supabase
        .from("weekly_plans")
        .select("id")
        .eq("user_id", user.id)
        .eq("week_start_date", weekStart)
        .single();
      if (!plan) continue;

      const { count: appliedCount } = await supabase
        .from("weekly_plan_blocks")
        .select("id", { count: "exact", head: true })
        .eq("weekly_plan_id", plan.id)
        .eq("user_id", user.id)
        .eq("origin", "applied");
      if ((appliedCount ?? 0) === 0) {
        await supabase.from("weekly_plans").delete().eq("id", plan.id).eq("user_id", user.id);
      }
    }
  }

  return NextResponse.json({ ok: true, resetWeeks: resetWeeks.length });
}

