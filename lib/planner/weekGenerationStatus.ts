import type { SupabaseClient } from "@supabase/supabase-js";
import { addDaysToDateKey } from "@/lib/timezone";

export type SequentialWeekStatus = {
  nextWeekToGenerate: string;
  contiguousGeneratedWeeks: string[];
  hasDraftChain: boolean;
};

export function buildSequentialStatus(
  currentWeekStart: string,
  completedWeekStarts: string[],
  timeZone: string
): SequentialWeekStatus {
  const generatedSet = new Set(completedWeekStarts);
  const contiguousGeneratedWeeks: string[] = [];
  let cursor = currentWeekStart;
  while (generatedSet.has(cursor)) {
    contiguousGeneratedWeeks.push(cursor);
    cursor = addDaysToDateKey(cursor, 7, timeZone);
  }
  return {
    nextWeekToGenerate: cursor,
    contiguousGeneratedWeeks,
    hasDraftChain: contiguousGeneratedWeeks.length > 0,
  };
}

/** Distinct weeks that have any AI draft row (applied or not), from `fromWeekStart` onward. */
export async function fetchDistinctDraftWeekStarts(
  supabase: SupabaseClient,
  userId: string,
  fromWeekStartDate: string
): Promise<string[]> {
  const { data: draftWeekRows } = await supabase
    .from("ai_draft_blocks")
    .select("week_start_date")
    .eq("user_id", userId)
    .gte("week_start_date", fromWeekStartDate);

  return Array.from(
    new Set((draftWeekRows ?? []).map((r) => String(r.week_start_date)).filter(Boolean))
  ).sort();
}

/**
 * Weeks that count as "generated or applied" for sequential scheduling: any AI draft week
 * (applied or not) plus weeks that have at least one main-calendar block from apply (`origin = applied`).
 */
export async function fetchSequencingWeekStarts(
  supabase: SupabaseClient,
  userId: string,
  fromWeekStartDate: string
): Promise<string[]> {
  const fromDrafts = await fetchDistinctDraftWeekStarts(supabase, userId, fromWeekStartDate);

  const { data: plans } = await supabase
    .from("weekly_plans")
    .select("id, week_start_date")
    .eq("user_id", userId)
    .gte("week_start_date", fromWeekStartDate);

  if (!plans?.length) {
    return fromDrafts;
  }

  const planIds = plans.map((p) => String(p.id)).filter(Boolean);
  const { data: appliedBlocks } = await supabase
    .from("weekly_plan_blocks")
    .select("weekly_plan_id")
    .eq("user_id", userId)
    .eq("origin", "applied")
    .in("weekly_plan_id", planIds);

  const planIdsWithApplied = new Set(
    (appliedBlocks ?? []).map((b) => String(b.weekly_plan_id)).filter(Boolean)
  );

  const fromPlans = plans
    .filter((p) => planIdsWithApplied.has(String(p.id)))
    .map((p) => String(p.week_start_date));

  return Array.from(new Set([...fromDrafts, ...fromPlans])).sort();
}

/**
 * Weeks the user may target for generate/regenerate: every Sunday-key week from the current
 * calendar week through the first incomplete week (inclusive), so intermediate applied weeks
 * stay selectable.
 */
export function buildAllowedGenerateWeeks(
  currentWeekStart: string,
  nextWeekToGenerate: string,
  timeZone: string
): string[] {
  const weeks: string[] = [];
  let cursor = currentWeekStart;
  for (let guard = 0; guard < 52 && cursor <= nextWeekToGenerate; guard += 1) {
    weeks.push(cursor);
    if (cursor === nextWeekToGenerate) break;
    cursor = addDaysToDateKey(cursor, 7, timeZone);
  }
  return weeks;
}

export function isAllowedGenerateWeek(
  weekStartDate: string,
  currentWeekStart: string,
  nextWeekToGenerate: string,
  timeZone: string
): boolean {
  return buildAllowedGenerateWeeks(currentWeekStart, nextWeekToGenerate, timeZone).includes(weekStartDate);
}
