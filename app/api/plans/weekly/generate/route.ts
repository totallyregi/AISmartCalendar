import { createClient } from "@/lib/supabase/server";
import {
  buildAllowedGenerateWeeks,
  buildSequentialStatus,
  fetchSequencingWeekStarts,
  isAllowedGenerateWeek,
} from "@/lib/planner/weekGenerationStatus";
import {
  mergeIntervals,
  minutesBetween,
  removeBusy,
  type Interval,
} from "@/lib/scheduler/weekly";
import { NextResponse } from "next/server";
import { DEFAULT_USER_TIMEZONE } from "@/lib/datetimeDisplay";
import {
  addDaysToDateKey,
  dayOfWeekFromDateKey,
  isValidTimeZone,
  weekStartSundayDateKey,
  zonedDateKeyFromIso,
  zonedDateTimeToUtc,
} from "@/lib/timezone";

type Mode = "intense" | "relaxed" | "lazy";

function pushBusyFromRecurring(
  busy: Interval[],
  weekStartDate: string,
  classRows: { class_meetings: { day_of_week: number; start_time: string; end_time: string }[] }[],
  fixedHabitRows: { habit_fixed_slots: { day_of_week: number; start_time: string; end_time: string }[] }[],
  timeZone: string
) {
  for (let i = 0; i < 7; i++) {
    const dayKey = addDaysToDateKey(weekStartDate, i, timeZone);
    const dow = dayOfWeekFromDateKey(dayKey, timeZone);

    classRows.forEach((c) => {
      (c.class_meetings ?? []).forEach((m) => {
        if (m.day_of_week === dow) busy.push({ start: zonedDateTimeToUtc(dayKey, m.start_time, timeZone), end: zonedDateTimeToUtc(dayKey, m.end_time, timeZone) });
      });
    });

    fixedHabitRows.forEach((h) => {
      (h.habit_fixed_slots ?? []).forEach((s) => {
        if (s.day_of_week === dow) busy.push({ start: zonedDateTimeToUtc(dayKey, s.start_time, timeZone), end: zonedDateTimeToUtc(dayKey, s.end_time, timeZone) });
      });
    });
  }
}

function buildAllowedSlotsForDay(dayKey: string, dayWindows: { start_time: string; end_time: string }[], timeZone: string) {
  const slots: Interval[] = [];
  for (const w of dayWindows) {
    const s = zonedDateTimeToUtc(dayKey, w.start_time, timeZone);
    const e = zonedDateTimeToUtc(dayKey, w.end_time, timeZone);
    for (let t = s.getTime(); t < e.getTime(); t += 15 * 60 * 1000) {
      const start = new Date(t);
      const end = new Date(t + 15 * 60 * 1000);
      if (end <= e) slots.push({ start, end });
    }
  }
  return slots;
}

function contiguousCount(slots: Interval[], startIndex: number) {
  let count = 1;
  for (let i = startIndex + 1; i < slots.length; i++) {
    if (slots[i - 1].end.getTime() !== slots[i].start.getTime()) break;
    count += 1;
  }
  return count;
}

function reserveRange(used: Set<number>, slots: Interval[], startIndex: number, count: number) {
  for (let i = startIndex; i < startIndex + count; i++) {
    if (!slots[i]) break;
    used.add(slots[i].start.getTime());
  }
}

function isUsed(used: Set<number>, slot: Interval) {
  return used.has(slot.start.getTime());
}

function modeDailyTarget(mode: Mode, minMins: number, prefMins: number, maxMins: number) {
  if (mode === "intense") return maxMins;
  if (mode === "lazy") return minMins;
  return prefMins;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const mode: Mode = ["intense", "relaxed", "lazy"].includes(body.mode) ? body.mode : "relaxed";
  const now = new Date();

  const prefQuick = await supabase.from("scheduler_preferences").select("timezone").eq("user_id", user.id).single();
  const timeZone = (prefQuick.data?.timezone as string | undefined) ?? DEFAULT_USER_TIMEZONE;
  if (!isValidTimeZone(timeZone)) {
    return NextResponse.json({ error: "Invalid timezone in preferences. Update Preferences first." }, { status: 400 });
  }

  const requestedWeekStart = typeof body.weekStart === "string" ? body.weekStart : weekStartSundayDateKey(now, timeZone);
  const weekStartDate = requestedWeekStart;
  const weekEndDate = addDaysToDateKey(weekStartDate, 7, timeZone);
  const weekStartUtc = zonedDateTimeToUtc(weekStartDate, "00:00:00", timeZone);
  const weekEndUtc = zonedDateTimeToUtc(weekEndDate, "00:00:00", timeZone);

  const currentWeekStart = weekStartSundayDateKey(now, timeZone);
  if (weekStartDate < currentWeekStart) {
    return NextResponse.json({ error: "Cannot generate past weeks" }, { status: 400 });
  }

  const distinctWeeks = await fetchSequencingWeekStarts(supabase, user.id, currentWeekStart);
  const seqStatus = buildSequentialStatus(currentWeekStart, distinctWeeks, timeZone);
  if (!isAllowedGenerateWeek(weekStartDate, currentWeekStart, seqStatus.nextWeekToGenerate, timeZone)) {
    if (!seqStatus.hasDraftChain && weekStartDate !== currentWeekStart) {
      return NextResponse.json(
        { error: `First generation must start at current week ${currentWeekStart}.` },
        { status: 400 }
      );
    }
    const allowed = buildAllowedGenerateWeeks(currentWeekStart, seqStatus.nextWeekToGenerate, timeZone).join(", ");
    return NextResponse.json(
      {
        error: `Choose a week from your planner list (allowed: ${allowed}). Reset suggestions if you need to clear pending drafts.`,
      },
      { status: 400 }
    );
  }

  // Past weeks cannot be regenerated (see check above). Remove orphaned unapplied drafts for those weeks so the AI Calendar does not keep showing stale blocks and they never affect future runs.
  const { error: deleteStaleDraftsErr } = await supabase
    .from("ai_draft_blocks")
    .delete()
    .eq("user_id", user.id)
    .eq("applied", false)
    .lt("week_start_date", currentWeekStart);
  if (deleteStaleDraftsErr) {
    return NextResponse.json({ error: deleteStaleDraftsErr.message }, { status: 500 });
  }

  // Drop unapplied drafts for this week only; keep applied rows so sequencing still counts the week as generated.
  const { error: deleteWeekDraftsErr } = await supabase
    .from("ai_draft_blocks")
    .delete()
    .eq("user_id", user.id)
    .eq("week_start_date", weekStartDate)
    .eq("applied", false);
  if (deleteWeekDraftsErr) {
    return NextResponse.json({ error: deleteWeekDraftsErr.message }, { status: 500 });
  }

  const [extRes, appliedPlanRes, userEventRes, classRes, fixedHabitRes, flexHabitRes, assignmentRes, prefRes, windowRes] = await Promise.all([
    supabase.from("external_events").select("starts_at,ends_at").eq("user_id", user.id).gte("starts_at", weekStartUtc.toISOString()).lt("starts_at", weekEndUtc.toISOString()),
    supabase
      .from("weekly_plan_blocks")
      .select("starts_at,ends_at,block_type,habit_id")
      .eq("user_id", user.id)
      .eq("origin", "applied")
      .gte("starts_at", weekStartUtc.toISOString())
      .lt("starts_at", weekEndUtc.toISOString()),
    supabase.from("user_events").select("starts_at,ends_at,habit_id").eq("user_id", user.id).gte("starts_at", weekStartUtc.toISOString()).lt("starts_at", weekEndUtc.toISOString()),
    supabase.from("class_sections").select("class_meetings(day_of_week,start_time,end_time)").eq("user_id", user.id),
    supabase.from("habits").select("id,name,habit_fixed_slots(day_of_week,start_time,end_time)").eq("user_id", user.id).eq("type", "fixed").eq("active", true),
    supabase
      .from("habits")
      .select(
        "id,name,habit_flexible_rules(duration_minutes,preference_mode,preferred_days,times_per_week),habit_flexible_preferred_slots(day_of_week,start_time,end_time)"
      )
      .eq("user_id", user.id)
      .eq("type", "flexible")
      .eq("active", true),
    supabase.from("assignments").select("*").eq("user_id", user.id).neq("status", "done").order("due_at", { ascending: true }),
    supabase.from("scheduler_preferences").select("*").eq("user_id", user.id).single(),
    supabase.from("scheduler_preferred_windows").select("day_of_week,start_time,end_time,is_override").eq("user_id", user.id),
  ]);

  const { data: priorDraftRows } = await supabase
    .from("ai_draft_blocks")
    .select("assignment_id,starts_at,ends_at")
    .eq("user_id", user.id)
    .eq("applied", false)
    .not("assignment_id", "is", null)
    .gte("week_start_date", currentWeekStart);

  if (!prefRes.data) {
    return NextResponse.json({ error: "Please save Preferences before generating a schedule." }, { status: 400 });
  }
  if (!(windowRes.data ?? []).length) {
    return NextResponse.json({ error: "Please add at least one preferred work window in Preferences before generating." }, { status: 400 });
  }

  const prefs = prefRes.data;

  const windows = (windowRes.data ?? []) as { day_of_week: number; start_time: string; end_time: string; is_override: boolean }[];

  const busy: Interval[] = [];
  (extRes.data ?? []).forEach((e) => busy.push({ start: new Date(e.starts_at as string), end: new Date(e.ends_at as string) }));
  (appliedPlanRes.data ?? []).forEach((e) => busy.push({ start: new Date(e.starts_at as string), end: new Date(e.ends_at as string) }));
  (userEventRes.data ?? []).forEach((e) => busy.push({ start: new Date(e.starts_at as string), end: new Date(e.ends_at as string) }));

  pushBusyFromRecurring(
    busy,
    weekStartDate,
    (classRes.data ?? []) as { class_meetings: { day_of_week: number; start_time: string; end_time: string }[] }[],
    (fixedHabitRes.data ?? []) as { habit_fixed_slots: { day_of_week: number; start_time: string; end_time: string }[] }[],
    timeZone
  );

  const mergedBusy = mergeIntervals(busy);
  const daySlots = new Map<string, Interval[]>();
  const dayUsed = new Map<string, Set<number>>();
  /** AI assignment minutes placed this run only — not classes/habits/personal (those only shrink free slots via mergedBusy). */
  const dayAssignedMinutes = new Map<string, number>();

  for (let i = 0; i < 7; i++) {
    const dateKey = addDaysToDateKey(weekStartDate, i, timeZone);
    const dow = dayOfWeekFromDateKey(dateKey, timeZone);

    // No AI drafts on Sundays (week boundary / user preference). Recurring busy still includes Sunday for slot math on other days.
    if (dow === 0) {
      daySlots.set(dateKey, []);
      dayUsed.set(dateKey, new Set<number>());
      dayAssignedMinutes.set(dateKey, 0);
      continue;
    }

    const dayWindows = windows.filter((w) => w.day_of_week === dow);

    const allowed = dayWindows.length ? buildAllowedSlotsForDay(dateKey, dayWindows, timeZone) : [];
    // Require full slot to be in the future: slot.end > now allowed 5:30–5:45 when now is 5:34 (invalid).
    const free = removeBusy(allowed, mergedBusy).filter((slot) => slot.start >= now);
    daySlots.set(dateKey, free);
    dayUsed.set(dateKey, new Set<number>());
    dayAssignedMinutes.set(dateKey, 0);
  }

  const blocks: { block_type: string; title: string; starts_at: string; ends_at: string; assignment_id?: string; habit_id?: string }[] = [];
  const priorDraftMinutesByAssignment: Record<string, number> = {};
  (priorDraftRows ?? []).forEach((d) => {
    const assignmentId = d.assignment_id as string | null;
    if (!assignmentId) return;
    const mins = minutesBetween(new Date(String(d.starts_at)), new Date(String(d.ends_at)));
    priorDraftMinutesByAssignment[assignmentId] = (priorDraftMinutesByAssignment[assignmentId] ?? 0) + mins;
  });

  const assignments = [...(assignmentRes.data ?? [])].sort(
    (x, y) => new Date((x as { due_at: string }).due_at).getTime() - new Date((y as { due_at: string }).due_at).getTime()
  ) as {
    id: string;
    name: string;
    due_at: string;
    remaining_minutes: number;
  }[];

  const assignmentRemaining = new Map<string, number>();
  for (const a of assignments) {
    const draftAllocated = priorDraftMinutesByAssignment[a.id] ?? 0;
    assignmentRemaining.set(a.id, Math.max(0, Number(a.remaining_minutes ?? 0) - draftAllocated));
  }

  // Mon–Sat only (skip Sunday index 0): i = 1..6
  const dayOrderForward = [1, 2, 3, 4, 5, 6].map((i) => addDaysToDateKey(weekStartDate, i, timeZone));
  const dayOrderBackward = [...dayOrderForward].reverse();

  function placeAssignmentPass(slotMap: Map<string, Interval[]>, usePreferredDayCap: boolean) {
    for (const a of assignments) {
      let remaining = assignmentRemaining.get(a.id) ?? 0;
      if (remaining <= 0) continue;

      const due = new Date(a.due_at);
      const dayOrder = mode === "lazy" ? dayOrderBackward : dayOrderForward;
      const preferEarlierStart = mode !== "lazy";

      while (remaining > 0) {
        let bestTake = 0;
        let bestDayKey: string | null = null;
        let bestIndex = -1;
        let bestStartMs = preferEarlierStart ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;

        for (const dayKey of dayOrder) {
          const dayDate = zonedDateTimeToUtc(dayKey, "00:00:00", timeZone);
          if (dayDate >= due) continue;

          const slots = slotMap.get(dayKey) ?? [];
          const used = dayUsed.get(dayKey) ?? new Set<number>();
          const already = dayAssignedMinutes.get(dayKey) ?? 0;

          let dayRemaining: number;
          if (usePreferredDayCap) {
            let dayTarget = modeDailyTarget(mode, prefs.min_daily_minutes, prefs.preferred_daily_minutes, prefs.max_daily_minutes);
            dayTarget = Math.min(dayTarget, prefs.max_daily_minutes);
            dayRemaining = Math.max(0, dayTarget - already);
            if (mode === "lazy" && remaining < dayRemaining) dayRemaining = remaining;
          } else {
            dayRemaining = Math.max(0, prefs.max_daily_minutes - already);
            if (mode === "lazy" && remaining < dayRemaining) dayRemaining = remaining;
          }

          const maxIntervalsByConsecutive = Math.floor(prefs.max_consecutive_minutes / 15);
          const maxIntervalsByDay = Math.floor(dayRemaining / 15);
          const maxIntervalsByRemaining = Math.floor(remaining / 15);

          for (let i = 0; i < slots.length; i++) {
            if (isUsed(used, slots[i])) continue;
            if (slots[i].start < now) continue;
            if (slots[i].start >= due) continue;

            const contiguous = contiguousCount(slots, i);
            const takeIntervals = Math.min(contiguous, maxIntervalsByConsecutive, maxIntervalsByDay, maxIntervalsByRemaining);

            if (takeIntervals <= 0) continue;

            const startMs = slots[i].start.getTime();
            const betterTie =
              preferEarlierStart ? startMs < bestStartMs : startMs > bestStartMs;
            if (takeIntervals > bestTake || (takeIntervals === bestTake && betterTie)) {
              bestTake = takeIntervals;
              bestDayKey = dayKey;
              bestIndex = i;
              bestStartMs = startMs;
            }
          }
        }

        if (bestTake <= 0 || bestDayKey === null || bestIndex < 0) break;

        const slots = slotMap.get(bestDayKey) ?? [];
        const used = dayUsed.get(bestDayKey) ?? new Set<number>();
        const i = bestIndex;

        const start = slots[i].start;
        const end = slots[i + bestTake - 1].end;
        blocks.push({
          block_type: "assignment",
          title: a.name,
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
          assignment_id: a.id,
        });

        reserveRange(used, slots, i, bestTake);
        const blockMinutes = bestTake * 15;
        remaining -= blockMinutes;
        dayAssignedMinutes.set(bestDayKey, (dayAssignedMinutes.get(bestDayKey) ?? 0) + blockMinutes);

        const breakIntervals = Math.floor(prefs.break_minutes / 15);
        if (breakIntervals > 0) reserveRange(used, slots, i + bestTake, breakIntervals);
      }

      assignmentRemaining.set(a.id, remaining);
    }
  }

  // Assignments only inside preferred work windows (no early-morning / full-day overflow).
  placeAssignmentPass(daySlots, true);
  // Second pass: fill toward max_daily_minutes where first pass stopped at preferred/min targets.
  placeAssignmentPass(daySlots, false);

  // Flexible habits use mode-aware frequency and preferred-hour placement.
  const flexHabits = (flexHabitRes.data ?? []) as {
    id: string;
    name: string;
    habit_flexible_preferred_slots?: { day_of_week: number; start_time: string; end_time: string }[];
    habit_flexible_rules:
      | {
          duration_minutes: number;
          preference_mode?: "preferred_days" | "times_per_week";
          preferred_days: number[];
          times_per_week: number | null;
        }
      | {
          duration_minutes: number;
          preference_mode?: "preferred_days" | "times_per_week";
          preferred_days: number[];
          times_per_week: number | null;
        }[];
  }[];

  // If a flexible habit has already been applied for this week, don't generate it again.
  // Otherwise each generate/apply cycle would create duplicate applied events.
  type AppliedFlexBlock = { block_type: string | null; habit_id: string | null };
  const flexAlreadyApplied = new Set<string>(
    ((appliedPlanRes.data ?? []) as AppliedFlexBlock[])
      .filter((b) => b.block_type === "habit_flexible" && b.habit_id)
      .map((b) => String(b.habit_id))
  );
  for (const ue of userEventRes.data ?? []) {
    const row = ue as { habit_id?: string | null };
    if (row.habit_id) flexAlreadyApplied.add(String(row.habit_id));
  }

  for (const h of flexHabits) {
    if (flexAlreadyApplied.has(String(h.id))) continue;

    const ruleOrArr = h.habit_flexible_rules as unknown;
    const rule =
      (Array.isArray(ruleOrArr) ? ruleOrArr[0] : ruleOrArr) as
        | {
            duration_minutes: number;
            preference_mode?: "preferred_days" | "times_per_week";
            preferred_days: number[];
            times_per_week: number | null;
          }
        | undefined;
    if (!rule) continue;

    const duration = Math.max(15, Number(rule.duration_minutes || 60));
    const habitRuleMode = rule.preference_mode === "times_per_week" ? "times_per_week" : "preferred_days";
    const preferredDays = [
      ...new Set((rule.preferred_days ?? []).filter((d: number) => Number.isInteger(d) && d >= 0 && d <= 6)),
    ];
    const slotsByDow = new Map<number, { day_of_week: number; start_time: string; end_time: string }[]>();
    (h.habit_flexible_preferred_slots ?? []).forEach((s) => {
      if (!slotsByDow.has(s.day_of_week)) slotsByDow.set(s.day_of_week, []);
      slotsByDow.get(s.day_of_week)?.push(s);
    });

    const dayKeyByDow = new Map<number, string>();
    for (let i = 0; i < 7; i++) {
      const dayKey = addDaysToDateKey(weekStartDate, i, timeZone);
      dayKeyByDow.set(dayOfWeekFromDateKey(dayKey, timeZone), dayKey);
    }

    const rawDows = habitRuleMode === "preferred_days" ? preferredDays : [0, 1, 2, 3, 4, 5, 6];
    const candidateDows = rawDows.filter((d) => d !== 0);
    if (candidateDows.length === 0) continue;

    const targetSessions =
      habitRuleMode === "times_per_week" ? Math.max(1, Number(rule.times_per_week ?? 1)) : candidateDows.length;
    const base = Math.floor(targetSessions / candidateDows.length);
    const remainder = targetSessions % candidateDows.length;
    const sessionsByDow = new Map<number, number>();
    candidateDows.forEach((dow, idx) => {
      sessionsByDow.set(dow, base + (idx < remainder ? 1 : 0));
    });

    const needIntervals = Math.max(1, Math.floor(duration / 15));
    for (const dow of candidateDows) {
      const plannedSessions = sessionsByDow.get(dow) ?? 0;
      if (plannedSessions <= 0) continue;
      const dayKey = dayKeyByDow.get(dow);
      if (!dayKey) continue;

      const daySpecificWindows = slotsByDow.get(dow) ?? [];
      const slots =
        daySpecificWindows.length > 0
          ? removeBusy(buildAllowedSlotsForDay(dayKey, daySpecificWindows, timeZone), mergedBusy).filter((slot) => slot.start >= now)
          : daySlots.get(dayKey) ?? [];
      const used = dayUsed.get(dayKey) ?? new Set<number>();
      let placed = 0;

      for (let idx = 0; idx < slots.length && placed < plannedSessions; idx++) {
        if (isUsed(used, slots[idx])) continue;
        const contiguous = contiguousCount(slots, idx);
        if (contiguous < needIntervals) continue;

        let ok = true;
        for (let k = 0; k < needIntervals; k++) {
          if (isUsed(used, slots[idx + k])) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;

        const start = slots[idx].start;
        const end = slots[idx + needIntervals - 1].end;
        blocks.push({
          block_type: "habit_flexible",
          title: `Habit: ${h.name}`,
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
          habit_id: h.id,
        });
        reserveRange(used, slots, idx, needIntervals);
        placed += 1;
      }
    }
  }

  // Merge adjacent assignment blocks for same assignment up to max consecutive cap.
  const sorted = [...blocks].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const mergedBlocks: typeof blocks = [];
  for (const b of sorted) {
    const last = mergedBlocks[mergedBlocks.length - 1];
    if (
      last &&
      b.block_type === "assignment" &&
      last.block_type === "assignment" &&
      b.assignment_id &&
      b.assignment_id === last.assignment_id &&
      new Date(last.ends_at).getTime() === new Date(b.starts_at).getTime() &&
      minutesBetween(new Date(last.starts_at), new Date(b.ends_at)) <= prefs.max_consecutive_minutes
    ) {
      last.ends_at = b.ends_at;
    } else {
      mergedBlocks.push({ ...b });
    }
  }

  // Safety: drafts must fall in [weekStartDate, weekEndDate) in user TZ and not on excluded Sundays.
  const mergedBlocksFiltered = mergedBlocks.filter((b) => {
    const sk = zonedDateKeyFromIso(b.starts_at, timeZone);
    if (sk < weekStartDate || sk >= weekEndDate) return false;
    return dayOfWeekFromDateKey(sk, timeZone) !== 0;
  });

  const { data: plan, error: planErr } = await supabase
    .from("weekly_plans")
    .upsert({ user_id: user.id, week_start_date: weekStartDate, status: "generated" }, { onConflict: "user_id,week_start_date" })
    .select()
    .single();

  if (planErr || !plan) return NextResponse.json({ error: planErr?.message ?? "Failed to save weekly plan" }, { status: 500 });

  await supabase
    .from("ai_draft_blocks")
    .delete()
    .eq("user_id", user.id)
    .eq("week_start_date", weekStartDate)
    .eq("applied", false);
  if (mergedBlocksFiltered.length) {
    const { error: draftErr } = await supabase.from("ai_draft_blocks").insert(
      mergedBlocksFiltered.map((b) => ({ user_id: user.id, week_start_date: weekStartDate, ...b, editable: true, applied: false }))
    );
    if (draftErr) return NextResponse.json({ error: draftErr.message }, { status: 500 });
  }

  const assignmentMinutes = Math.round(
    mergedBlocksFiltered
      .filter((b) => b.block_type === "assignment")
      .reduce((sum, b) => sum + minutesBetween(new Date(b.starts_at), new Date(b.ends_at)), 0)
  );

  // Week is [weekStartDate .. weekEndDate) in date keys; weekEndDate is the first day *after* the week.
  // Only warn about unscheduled work when the assignment is actually due by end of this generated week
  // (before start of that next day in the user's TZ). Later due dates can be placed in future weeks.
  const weekExclusiveEndUtc = zonedDateTimeToUtc(weekEndDate, "00:00:00", timeZone);

  const unscheduled = assignments
    .map((a) => {
      const rem = assignmentRemaining.get(a.id) ?? 0;
      if (rem <= 0) return null;
      const dueMs = new Date(a.due_at).getTime();
      if (dueMs >= weekExclusiveEndUtc.getTime()) return null;
      return { assignmentId: a.id, name: a.name, remainingMinutes: rem, dueAt: a.due_at };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const warning =
    unscheduled.length > 0
      ? "Not enough free time before some due dates this week. Remove or move events on your main calendar, widen preferred work windows in Preferences, or adjust due dates."
      : undefined;

  return NextResponse.json({
    ok: true,
    weekStart: weekStartDate,
    mode,
    blocks: mergedBlocksFiltered.length,
    assignmentMinutes,
    perDay: Object.fromEntries(dayAssignedMinutes),
    unscheduled,
    ...(warning ? { warning } : {}),
  });
}
