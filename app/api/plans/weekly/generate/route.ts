import { createClient } from "@/lib/supabase/server";
import {
  addDays,
  buildDaySlots,
  dayDateKey,
  mergeIntervals,
  minutesBetween,
  removeBusy,
  toDateTime,
  weekStartSunday,
  type Interval,
} from "@/lib/scheduler/weekly";
import { NextResponse } from "next/server";

type Mode = "intense" | "relaxed" | "lazy";

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function toUserDateTime(day: Date, hhmmss: string, tzOffsetMinutes: number) {
  const serverLocal = toDateTime(day, hhmmss);
  return new Date(serverLocal.getTime() + tzOffsetMinutes * 60 * 1000);
}

function pushBusyFromRecurring(
  busy: Interval[],
  weekStart: Date,
  classRows: { class_meetings: { day_of_week: number; start_time: string; end_time: string }[] }[],
  fixedHabitRows: { habit_fixed_slots: { day_of_week: number; start_time: string; end_time: string }[] }[],
  tzOffsetMinutes: number
) {
  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    const dow = day.getDay();

    classRows.forEach((c) => {
      (c.class_meetings ?? []).forEach((m) => {
        if (m.day_of_week === dow) busy.push({ start: toUserDateTime(day, m.start_time, tzOffsetMinutes), end: toUserDateTime(day, m.end_time, tzOffsetMinutes) });
      });
    });

    fixedHabitRows.forEach((h) => {
      (h.habit_fixed_slots ?? []).forEach((s) => {
        if (s.day_of_week === dow) busy.push({ start: toUserDateTime(day, s.start_time, tzOffsetMinutes), end: toUserDateTime(day, s.end_time, tzOffsetMinutes) });
      });
    });
  }
}

function buildAllowedSlotsForDay(day: Date, dayWindows: { start_time: string; end_time: string }[], tzOffsetMinutes: number) {
  const slots: Interval[] = [];
  for (const w of dayWindows) {
    const s = toUserDateTime(day, w.start_time, tzOffsetMinutes);
    const e = toUserDateTime(day, w.end_time, tzOffsetMinutes);
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
  const tzOffsetMinutes = Number(body.timezoneOffsetMinutes ?? 0);
  const now = typeof body.nowIso === "string" ? new Date(body.nowIso) : new Date();
  const requested = typeof body.weekStart === "string" ? new Date(`${body.weekStart}T00:00:00`) : weekStartSunday(new Date());
  const weekStart = weekStartSunday(requested);
  const weekEnd = addDays(weekStart, 7);

  const currentWeekStart = weekStartSunday(new Date());
  if (weekStart.getTime() < currentWeekStart.getTime()) {
    return NextResponse.json({ error: "Cannot generate past weeks" }, { status: 400 });
  }

  if (weekStart.getTime() > currentWeekStart.getTime()) {
    const prevStart = addDays(weekStart, -7).toISOString().slice(0, 10);
    const { data: prevPlan } = await supabase
      .from("weekly_plans")
      .select("id")
      .eq("user_id", user.id)
      .eq("week_start_date", prevStart)
      .single();
    if (!prevPlan) {
      return NextResponse.json({ error: `Must generate previous week first (${prevStart})` }, { status: 400 });
    }
  }

  const [extRes, classRes, fixedHabitRes, flexHabitRes, assignmentRes, prefRes, windowRes] = await Promise.all([
    supabase.from("external_events").select("starts_at,ends_at").eq("user_id", user.id).gte("starts_at", weekStart.toISOString()).lt("starts_at", weekEnd.toISOString()),
    supabase.from("class_sections").select("class_meetings(day_of_week,start_time,end_time)").eq("user_id", user.id),
    supabase.from("habits").select("id,name,habit_fixed_slots(day_of_week,start_time,end_time)").eq("user_id", user.id).eq("type", "fixed").eq("active", true),
    supabase.from("habits").select("id,name,habit_flexible_rules(duration_minutes,preferred_days,times_per_week)").eq("user_id", user.id).eq("type", "flexible").eq("active", true),
    supabase.from("assignments").select("*").eq("user_id", user.id).neq("status", "done").order("due_at", { ascending: true }),
    supabase.from("scheduler_preferences").select("*").eq("user_id", user.id).single(),
    supabase.from("scheduler_preferred_windows").select("day_of_week,start_time,end_time,is_override").eq("user_id", user.id),
  ]);

  if (!prefRes.data) {
    return NextResponse.json({ error: "Please save Preferences before generating a schedule." }, { status: 400 });
  }
  if (!(windowRes.data ?? []).length) {
    return NextResponse.json({ error: "Please add at least one preferred work window in Preferences before generating." }, { status: 400 });
  }

  const prefs = prefRes.data;

  const applyDays = new Set<number>((prefs.default_apply_days ?? [1, 2, 3, 4, 5]).map((d: number) => Number(d)));
  const windows = (windowRes.data ?? []) as { day_of_week: number; start_time: string; end_time: string; is_override: boolean }[];
  const globalWindows = windows.filter((w) => !w.is_override);

  const busy: Interval[] = [];
  (extRes.data ?? []).forEach((e) => busy.push({ start: new Date(e.starts_at as string), end: new Date(e.ends_at as string) }));

  pushBusyFromRecurring(
    busy,
    weekStart,
    (classRes.data ?? []) as { class_meetings: { day_of_week: number; start_time: string; end_time: string }[] }[],
    (fixedHabitRes.data ?? []) as { habit_fixed_slots: { day_of_week: number; start_time: string; end_time: string }[] }[],
    Number.isNaN(tzOffsetMinutes) ? 0 : tzOffsetMinutes
  );

  const mergedBusy = mergeIntervals(busy);
  const daySlots = new Map<string, Interval[]>();
  const dayUsed = new Map<string, Set<number>>();
  const dayAssignedMinutes = new Map<string, number>();

  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    const dateKey = dayDateKey(day);
    const dow = day.getDay();

    let dayWindows = windows.filter((w) => w.is_override && w.day_of_week === dow);
    if (!dayWindows.length) {
      dayWindows = applyDays.has(dow) ? globalWindows : [];
    }

    const allowed = dayWindows.length ? buildAllowedSlotsForDay(day, dayWindows, Number.isNaN(tzOffsetMinutes) ? 0 : tzOffsetMinutes) : [];
    const free = removeBusy(allowed, mergedBusy).filter((slot) => slot.end > now);
    daySlots.set(dateKey, free);
    dayUsed.set(dateKey, new Set<number>());
    dayAssignedMinutes.set(dateKey, 0);
  }

  const blocks: { block_type: string; title: string; starts_at: string; ends_at: string; assignment_id?: string; habit_id?: string }[] = [];
  const assignments = (assignmentRes.data ?? []) as {
    id: string;
    name: string;
    due_at: string;
    remaining_minutes: number;
  }[];

  const dayOrderForward = Array.from({ length: 7 }, (_, i) => dayDateKey(addDays(weekStart, i)));
  const dayOrderBackward = [...dayOrderForward].reverse();

  for (const a of assignments) {
    let remaining = Math.max(0, Number(a.remaining_minutes ?? 0));
    if (!remaining) continue;

    const due = new Date(a.due_at);
    const dayOrder = mode === "lazy" ? dayOrderBackward : dayOrderForward;

    for (const dayKey of dayOrder) {
      if (remaining <= 0) break;
      const dayDate = new Date(`${dayKey}T00:00:00`);
      if (dayDate >= due) continue;

      const slots = daySlots.get(dayKey) ?? [];
      const used = dayUsed.get(dayKey) ?? new Set<number>();
      const already = dayAssignedMinutes.get(dayKey) ?? 0;

      let dayTarget = modeDailyTarget(mode, prefs.min_daily_minutes, prefs.preferred_daily_minutes, prefs.max_daily_minutes);
      dayTarget = Math.min(dayTarget, prefs.max_daily_minutes);
      let dayRemaining = Math.max(0, dayTarget - already);

      // Do not force min when workload is low (requested behavior).
      if (mode === "lazy" && remaining < dayRemaining) dayRemaining = remaining;

      for (let i = 0; i < slots.length && remaining > 0 && dayRemaining > 0; i++) {
        if (isUsed(used, slots[i])) continue;
        if (slots[i].start >= due) continue;

        const contiguous = contiguousCount(slots, i);
        const maxIntervalsByConsecutive = Math.floor(prefs.max_consecutive_minutes / 15);
        const maxIntervalsByDay = Math.floor(dayRemaining / 15);
        const maxIntervalsByRemaining = Math.floor(remaining / 15);
        const takeIntervals = Math.min(contiguous, maxIntervalsByConsecutive, maxIntervalsByDay, maxIntervalsByRemaining);

        if (takeIntervals <= 0) continue;

        const start = slots[i].start;
        const end = slots[i + takeIntervals - 1].end;
        blocks.push({
          block_type: "assignment",
          title: `Assignment: ${a.name}`,
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
          assignment_id: a.id,
        });

        reserveRange(used, slots, i, takeIntervals);
        const blockMinutes = takeIntervals * 15;
        remaining -= blockMinutes;
        dayRemaining -= blockMinutes;
        dayAssignedMinutes.set(dayKey, (dayAssignedMinutes.get(dayKey) ?? 0) + blockMinutes);

        // Reserve break slots after each consecutive work chunk.
        const breakIntervals = Math.floor(prefs.break_minutes / 15);
        if (breakIntervals > 0) reserveRange(used, slots, i + takeIntervals, breakIntervals);
      }
    }
  }

  // Flexible habits remain existing behavior (not constrained by assignment workload prefs).
  const flexHabits = (flexHabitRes.data ?? []) as {
    id: string;
    name: string;
    habit_flexible_rules: { duration_minutes: number; preferred_days: number[]; times_per_week: number | null }[];
  }[];

  for (const h of flexHabits) {
    const rule = h.habit_flexible_rules?.[0];
    if (!rule) continue;

    const duration = Math.max(15, Number(rule.duration_minutes || 60));
    const timesPerWeek = Number(rule.times_per_week ?? (rule.preferred_days?.length || 1));
    const targetDays = (rule.preferred_days ?? []).length ? new Set(rule.preferred_days) : null;

    let placed = 0;
    for (let i = 0; i < 7 && placed < timesPerWeek; i++) {
      const day = addDays(weekStart, i);
      const dayKey = dayDateKey(day);
      const slots = daySlots.get(dayKey) ?? [];
      const used = dayUsed.get(dayKey) ?? new Set<number>();
      if (targetDays && !targetDays.has(day.getDay())) continue;

      for (let idx = 0; idx < slots.length && placed < timesPerWeek; idx++) {
        if (isUsed(used, slots[idx])) continue;

        const needIntervals = Math.max(1, Math.floor(duration / 15));
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

  const weekStartDate = weekStart.toISOString().slice(0, 10);
  const { data: plan, error: planErr } = await supabase
    .from("weekly_plans")
    .upsert({ user_id: user.id, week_start_date: weekStartDate, status: "generated" }, { onConflict: "user_id,week_start_date" })
    .select()
    .single();

  if (planErr || !plan) return NextResponse.json({ error: planErr?.message ?? "Failed to save weekly plan" }, { status: 500 });

  await supabase.from("ai_draft_blocks").delete().eq("user_id", user.id).eq("week_start_date", weekStartDate);
  if (mergedBlocks.length) {
    const { error: draftErr } = await supabase.from("ai_draft_blocks").insert(
      mergedBlocks.map((b) => ({ user_id: user.id, week_start_date: weekStartDate, ...b, editable: true, applied: false }))
    );
    if (draftErr) return NextResponse.json({ error: draftErr.message }, { status: 500 });
  }

  const assignmentMinutes = mergedBlocks
    .filter((b) => b.block_type === "assignment")
    .reduce((sum, b) => sum + minutesBetween(new Date(b.starts_at), new Date(b.ends_at)), 0);

  return NextResponse.json({
    ok: true,
    weekStart: weekStartDate,
    mode,
    blocks: mergedBlocks.length,
    assignmentMinutes,
    perDay: Object.fromEntries(dayAssignedMinutes),
  });
}
