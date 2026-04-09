import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addDaysToDateKey,
  dayOfWeekFromDateKey,
  zonedDateKeyFromIso,
  zonedDateTimeToUtc,
} from "@/lib/timezone";

const LABEL_MAX = 48;
const MAX_SEGMENTS_PER_DAY = 40;

export type CalendarWeekSnapshotDay = {
  date: string;
  segments: Array<{ kind: string; startLocal: string; endLocal: string; label?: string }>;
};

export type CalendarWeekSnapshot = {
  weekStart: string;
  timeZone: string;
  days: CalendarWeekSnapshotDay[];
};

type RawSeg = { startMs: number; endMs: number; kind: string; label?: string };

function clampLabel(s: string | null | undefined): string | undefined {
  if (s == null || !String(s).trim()) return undefined;
  const t = String(s).trim();
  return t.length <= LABEL_MAX ? t : `${t.slice(0, LABEL_MAX - 1)}…`;
}

function formatHm(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function appliedBlockKind(blockType: string): string {
  switch (blockType) {
    case "assignment":
      return "assignment_applied";
    case "habit_flexible":
      return "flexible_habit";
    case "habit_fixed":
      return "fixed_habit";
    case "class":
      return "class";
    case "external":
      return "external";
    default:
      return "assignment_applied";
  }
}

function draftBlockKind(blockType: string): string {
  switch (blockType) {
    case "assignment":
      return "assignment_draft";
    case "habit_flexible":
      return "flexible_habit_draft";
    case "habit_fixed":
      return "fixed_habit_draft";
    case "class":
      return "class_draft";
    case "external":
      return "external_draft";
    case "personal":
      return "personal_draft";
    default:
      return "assignment_draft";
  }
}

function expandRecurringInWeek(
  weekStartDate: string,
  timeZone: string,
  classRows: {
    class_code: string;
    class_meetings: { day_of_week: number; start_time: string; end_time: string }[];
  }[],
  fixedHabitRows: {
    name: string;
    habit_fixed_slots: { day_of_week: number; start_time: string; end_time: string }[];
  }[],
  flexPrefRows: {
    name: string;
    habit_flexible_preferred_slots: { day_of_week: number; start_time: string; end_time: string }[];
  }[]
): RawSeg[] {
  const out: RawSeg[] = [];
  for (let i = 0; i < 7; i++) {
    const dayKey = addDaysToDateKey(weekStartDate, i, timeZone);
    const dow = dayOfWeekFromDateKey(dayKey, timeZone);

    for (const c of classRows) {
      for (const m of c.class_meetings ?? []) {
        if (m.day_of_week !== dow) continue;
        const start = zonedDateTimeToUtc(dayKey, m.start_time, timeZone);
        const end = zonedDateTimeToUtc(dayKey, m.end_time, timeZone);
        out.push({
          startMs: start.getTime(),
          endMs: end.getTime(),
          kind: "class",
          label: clampLabel(c.class_code),
        });
      }
    }

    for (const h of fixedHabitRows) {
      for (const s of h.habit_fixed_slots ?? []) {
        if (s.day_of_week !== dow) continue;
        const start = zonedDateTimeToUtc(dayKey, s.start_time, timeZone);
        const end = zonedDateTimeToUtc(dayKey, s.end_time, timeZone);
        out.push({
          startMs: start.getTime(),
          endMs: end.getTime(),
          kind: "fixed_habit",
          label: clampLabel(h.name),
        });
      }
    }

    for (const h of flexPrefRows) {
      for (const s of h.habit_flexible_preferred_slots ?? []) {
        if (s.day_of_week !== dow) continue;
        const start = zonedDateTimeToUtc(dayKey, s.start_time, timeZone);
        const end = zonedDateTimeToUtc(dayKey, s.end_time, timeZone);
        out.push({
          startMs: start.getTime(),
          endMs: end.getTime(),
          kind: "flexible_habit_preference",
          label: clampLabel(h.name ? `${h.name} (typical window)` : "Flexible habit (typical window)"),
        });
      }
    }
  }
  return out;
}

/** YYYY-MM-DD week start (Sunday) in user TZ. */
export async function buildWeekSnapshot(
  supabase: SupabaseClient,
  userId: string,
  weekStartDate: string,
  timeZone: string
): Promise<CalendarWeekSnapshot | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStartDate)) return null;

  const weekEndDate = addDaysToDateKey(weekStartDate, 7, timeZone);
  const weekStartUtc = zonedDateTimeToUtc(weekStartDate, "00:00:00", timeZone);
  const weekEndUtc = zonedDateTimeToUtc(weekEndDate, "00:00:00", timeZone);
  const startIso = weekStartUtc.toISOString();
  const endIso = weekEndUtc.toISOString();

  const [extRes, appliedRes, userEvRes, draftRes, classRes, fixedHabitRes, flexHabitRes] = await Promise.all([
    supabase.from("external_events").select("summary,starts_at,ends_at").eq("user_id", userId).gte("starts_at", startIso).lt("starts_at", endIso),
    supabase
      .from("weekly_plan_blocks")
      .select("starts_at,ends_at,title,block_type")
      .eq("user_id", userId)
      .eq("origin", "applied")
      .gte("starts_at", startIso)
      .lt("starts_at", endIso),
    supabase.from("user_events").select("title,starts_at,ends_at").eq("user_id", userId).gte("starts_at", startIso).lt("starts_at", endIso),
    supabase
      .from("ai_draft_blocks")
      .select("block_type,title,starts_at,ends_at")
      .eq("user_id", userId)
      .eq("week_start_date", weekStartDate)
      .eq("applied", false),
    supabase.from("class_sections").select("class_code,class_meetings(day_of_week,start_time,end_time)").eq("user_id", userId),
    supabase.from("habits").select("name,habit_fixed_slots(day_of_week,start_time,end_time)").eq("user_id", userId).eq("type", "fixed").eq("active", true),
    supabase
      .from("habits")
      .select("name,habit_flexible_preferred_slots(day_of_week,start_time,end_time)")
      .eq("user_id", userId)
      .eq("type", "flexible")
      .eq("active", true),
  ]);

  const raw: RawSeg[] = [];

  for (const e of extRes.data ?? []) {
    const sa = String(e.starts_at);
    const ea = String(e.ends_at);
    raw.push({
      startMs: new Date(sa).getTime(),
      endMs: new Date(ea).getTime(),
      kind: "external",
      label: clampLabel(e.summary as string | null),
    });
  }

  for (const b of appliedRes.data ?? []) {
    const sa = String(b.starts_at);
    const ea = String(b.ends_at);
    raw.push({
      startMs: new Date(sa).getTime(),
      endMs: new Date(ea).getTime(),
      kind: appliedBlockKind(String(b.block_type)),
      label: clampLabel(b.title as string),
    });
  }

  for (const e of userEvRes.data ?? []) {
    const sa = String(e.starts_at);
    const ea = String(e.ends_at);
    raw.push({
      startMs: new Date(sa).getTime(),
      endMs: new Date(ea).getTime(),
      kind: "personal",
      label: clampLabel(e.title as string),
    });
  }

  for (const d of draftRes.data ?? []) {
    const sa = String(d.starts_at);
    const ea = String(d.ends_at);
    raw.push({
      startMs: new Date(sa).getTime(),
      endMs: new Date(ea).getTime(),
      kind: draftBlockKind(String(d.block_type)),
      label: clampLabel(d.title as string),
    });
  }

  raw.push(
    ...expandRecurringInWeek(
      weekStartDate,
      timeZone,
      (classRes.data ?? []) as {
        class_code: string;
        class_meetings: { day_of_week: number; start_time: string; end_time: string }[];
      }[],
      (fixedHabitRes.data ?? []) as {
        name: string;
        habit_fixed_slots: { day_of_week: number; start_time: string; end_time: string }[];
      }[],
      (flexHabitRes.data ?? []) as {
        name: string;
        habit_flexible_preferred_slots: { day_of_week: number; start_time: string; end_time: string }[];
      }[]
    )
  );

  const byDay = new Map<string, RawSeg[]>();
  for (const s of raw) {
    const sa = new Date(s.startMs).toISOString();
    const dayKey = zonedDateKeyFromIso(sa, timeZone);
    if (!byDay.has(dayKey)) byDay.set(dayKey, []);
    byDay.get(dayKey)!.push(s);
  }

  const dayKeys: string[] = [];
  for (let i = 0; i < 7; i++) {
    dayKeys.push(addDaysToDateKey(weekStartDate, i, timeZone));
  }

  const days: CalendarWeekSnapshotDay[] = dayKeys.map((date) => {
    let segs = (byDay.get(date) ?? []).sort((a, b) => a.startMs - b.startMs);
    let omitted = 0;
    if (segs.length > MAX_SEGMENTS_PER_DAY) {
      omitted = segs.length - MAX_SEGMENTS_PER_DAY;
      segs = segs.slice(0, MAX_SEGMENTS_PER_DAY);
    }
    const segments = segs.map((s) => ({
      kind: s.kind,
      startLocal: formatHm(new Date(s.startMs).toISOString(), timeZone),
      endLocal: formatHm(new Date(s.endMs).toISOString(), timeZone),
      label: s.label,
    }));
    if (omitted > 0) {
      segments.push({
        kind: "truncated",
        startLocal: "",
        endLocal: "",
        label: `${omitted} more segment(s) omitted this day`,
      });
    }
    return { date, segments };
  });

  return {
    weekStart: weekStartDate,
    timeZone,
    days,
  };
}
