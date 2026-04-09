import { createClient } from "@/lib/supabase/server";
import {
  buildAllowedGenerateWeeks,
  buildSequentialStatus,
  fetchSequencingWeekStarts,
} from "@/lib/planner/weekGenerationStatus";
import { NextResponse } from "next/server";
import { DEFAULT_USER_TIMEZONE } from "@/lib/datetimeDisplay";
import { addDaysToDateKey, isValidTimeZone, weekStartSundayDateKey, zonedDateTimeToUtc } from "@/lib/timezone";

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

  const distinctWeeks = await fetchSequencingWeekStarts(supabase, user.id, currentWeekStart);
  const status = buildSequentialStatus(currentWeekStart, distinctWeeks, timeZone);
  const allowedGenerateWeeks = buildAllowedGenerateWeeks(currentWeekStart, status.nextWeekToGenerate, timeZone);

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
      const { count: pendingDraftCount } = await supabase
        .from("ai_draft_blocks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("applied", false)
        .eq("week_start_date", w);

      const weekEndExclusive = addDaysToDateKey(w, 7, timeZone);
      const weekStartUtc = zonedDateTimeToUtc(w, "00:00:00", timeZone).toISOString();
      const weekEndUtc = zonedDateTimeToUtc(weekEndExclusive, "00:00:00", timeZone).toISOString();

      const { count: calendarAppliedCount } = await supabase
        .from("weekly_plan_blocks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("origin", "applied")
        .gte("starts_at", weekStartUtc)
        .lt("starts_at", weekEndUtc);

      const draftCount = pendingDraftCount ?? 0;
      const appliedCalendarBlockCount = calendarAppliedCount ?? 0;
      const weekEnd = addDaysToDateKey(w, 6, timeZone);
      return {
        weekStart: w,
        weekEnd,
        draftCount,
        appliedCalendarBlockCount,
        /** @deprecated use draftCount === 0; label was confusing */
        appliedOnly: draftCount === 0,
      };
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
      allowedGenerateWeeks,
      hasDraftChain: status.hasDraftChain,
      generatedWeeks: weekSummaries,
      totalDraftBlocks: totalDraftBlocks ?? 0,
      timeZone,
    },
  });
}
