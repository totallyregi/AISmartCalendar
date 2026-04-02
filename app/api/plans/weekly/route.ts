import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { DEFAULT_USER_TIMEZONE } from "@/lib/datetimeDisplay";
import { addDaysToDateKey, isValidTimeZone, weekStartSundayDateKey } from "@/lib/timezone";

function buildSequentialStatus(currentWeekStart: string, generatedWeeks: string[]) {
  const generatedSet = new Set(generatedWeeks);
  const contiguousGeneratedWeeks: string[] = [];
  let cursor = currentWeekStart;
  while (generatedSet.has(cursor)) {
    contiguousGeneratedWeeks.push(cursor);
    cursor = addDaysToDateKey(cursor, 7);
  }
  return {
    nextWeekToGenerate: cursor,
    contiguousGeneratedWeeks,
    hasDraftChain: contiguousGeneratedWeeks.length > 0,
  };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const prefRes = await supabase.from("scheduler_preferences").select("timezone").eq("user_id", user.id).single();
  const preferredTimeZone = (prefRes.data?.timezone as string | undefined) ?? DEFAULT_USER_TIMEZONE;
  const timeZone = isValidTimeZone(preferredTimeZone) ? preferredTimeZone : DEFAULT_USER_TIMEZONE;
  const currentWeekStart = weekStartSundayDateKey(now, timeZone);

  const qs = new URL(request.url).searchParams;
  const weekStartInput = qs.get("weekStart");
  const weekStart = weekStartInput ?? currentWeekStart;

  const { data: draftWeekRows } = await supabase
    .from("ai_draft_blocks")
    .select("week_start_date")
    .eq("user_id", user.id)
    .eq("applied", false)
    .gte("week_start_date", currentWeekStart);
  const generatedWeeks = Array.from(
    new Set((draftWeekRows ?? []).map((r) => String(r.week_start_date)).filter(Boolean))
  ).sort();
  const status = buildSequentialStatus(currentWeekStart, generatedWeeks);

  const { data: plan } = await supabase
    .from("weekly_plans")
    .select("*")
    .eq("user_id", user.id)
    .eq("week_start_date", weekStart)
    .single();

  const { data: blocks } = await supabase
    .from("weekly_plan_blocks")
    .select("*")
    .eq("user_id", user.id)
    .gte("starts_at", `${weekStart}T00:00:00.000Z`)
    .lte("starts_at", `${weekStart}T23:59:59.999Z`)
    .order("starts_at", { ascending: true });

  const { data: draftBlocks } = await supabase
    .from("ai_draft_blocks")
    .select("*")
    .eq("user_id", user.id)
    .eq("week_start_date", weekStart)
    .eq("applied", false)
    .order("starts_at", { ascending: true });
  const { count: totalDraftBlocks } = await supabase
    .from("ai_draft_blocks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("applied", false);

  const weekSummaries = await Promise.all(
    status.contiguousGeneratedWeeks.map(async (w) => {
      const { count } = await supabase
        .from("ai_draft_blocks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("applied", false)
        .eq("week_start_date", w);
      return { weekStart: w, weekEnd: addDaysToDateKey(w, 6), draftCount: count ?? 0 };
    })
  );

  return NextResponse.json({
    weekStart,
    plan: plan ?? null,
    blocks: blocks ?? [],
    draftBlocks: draftBlocks ?? [],
    status: {
      currentWeekStart,
      nextWeekToGenerate: status.nextWeekToGenerate,
      hasDraftChain: status.hasDraftChain,
      generatedWeeks: weekSummaries,
      totalDraftBlocks: totalDraftBlocks ?? 0,
      timeZone,
    },
  });
}
