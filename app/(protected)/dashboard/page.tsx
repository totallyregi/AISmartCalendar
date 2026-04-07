import { CalendarLegend } from "@/components/CalendarLegend";
import { CalendarView } from "@/components/CalendarView";
import { WeekTimeline } from "@/components/WeekTimeline";
import { DashboardPlanner } from "@/components/DashboardPlanner";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_USER_TIMEZONE } from "@/lib/datetimeDisplay";
import type { CalendarDayMeta } from "@/lib/calendarMeta";
import { emptyDayMeta, incrementMetaForWeeklyBlock, timelineSourceFromWeeklyBlockType } from "@/lib/calendarMeta";
import {
  dayOfWeekFromDateKey,
  isValidTimeZone,
  weekStartSundayDateKey,
  zonedDateKey,
  zonedDateKeyFromIso,
  zonedDateTimeToUtc,
} from "@/lib/timezone";

type TimelineEvent = {
  id: string;
  starts_at: string;
  ends_at: string;
  title: string;
  source: "external" | "class" | "fixed_habit" | "flexible_habit" | "assignment" | "generated" | "personal";
  class_meeting_id?: string;
  class_id?: string;
  fromWeeklyPlan?: boolean;
};

type CalendarPreviewEvent = {
  starts_at: string;
  title: string;
  source: "external" | "class" | "fixed_habit" | "flexible_habit" | "assignment" | "generated" | "personal";
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; date?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const prefTzRes = await supabase.from("scheduler_preferences").select("timezone").eq("user_id", user?.id).single();
  const preferredTimeZone = (prefTzRes.data?.timezone as string | undefined) ?? DEFAULT_USER_TIMEZONE;
  const timeZone = isValidTimeZone(preferredTimeZone) ? preferredTimeZone : DEFAULT_USER_TIMEZONE;
  const params = await searchParams;
  const year = params.year ? Number(params.year) : now.getFullYear();
  const month = params.month ? Number(params.month) : now.getMonth() + 1;
  const selectedDate = params.date ?? zonedDateKey(now, timeZone);
  const currentWeek = weekStartSundayDateKey(now, timeZone);

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);
  const startIso = monthStart.toISOString();
  const endIso = monthEnd.toISOString();

  const [extRes, classRes, habitRes, appliedRes, userEventRes, overrideRes, draftRes, planRes] = await Promise.all([
    supabase.from("external_events").select("id,starts_at,ends_at,summary").eq("user_id", user?.id).gte("starts_at", startIso).lte("starts_at", endIso),
    supabase.from("class_sections").select("id,class_code,class_name,class_meetings(id,day_of_week,start_time,end_time)").eq("user_id", user?.id),
    supabase.from("habits").select("id,name,habit_fixed_slots(id,day_of_week,start_time,end_time)").eq("user_id", user?.id).eq("type", "fixed"),
    supabase.from("weekly_plan_blocks").select("id,starts_at,ends_at,title,origin,block_type").eq("user_id", user?.id).eq("origin", "applied").gte("starts_at", startIso).lte("starts_at", endIso),
    supabase.from("user_events").select("id,starts_at,ends_at,title").eq("user_id", user?.id).gte("starts_at", startIso).lte("starts_at", endIso),
    supabase
      .from("class_meeting_overrides")
      .select("id,class_meeting_id,override_date,canceled,override_start_time,override_end_time")
      .eq("user_id", user?.id)
      .gte("override_date", startIso.slice(0, 10))
      .lte("override_date", endIso.slice(0, 10)),
    supabase.from("ai_draft_blocks").select("id,starts_at,ends_at,title,block_type,applied").eq("user_id", user?.id).eq("applied", false).gte("starts_at", startIso).lte("starts_at", endIso),
    supabase.from("weekly_plans").select("id").eq("user_id", user?.id).eq("week_start_date", currentWeek).single(),
  ]);

  const metaByDate: Record<string, CalendarDayMeta> = {};
  const events: TimelineEvent[] = [];
  const overrideByMeetingDate = new Map<string, { canceled: boolean; start?: string; end?: string }>();

  (overrideRes.data ?? []).forEach((o) => {
    overrideByMeetingDate.set(`${o.class_meeting_id}_${o.override_date}`, {
      canceled: Boolean(o.canceled),
      start: o.override_start_time ?? undefined,
      end: o.override_end_time ?? undefined,
    });
  });

  const ensure = (d: string) => {
    if (!metaByDate[d]) metaByDate[d] = emptyDayMeta();
    return metaByDate[d];
  };

  (extRes.data ?? []).forEach((e) => {
    const d = zonedDateKeyFromIso(e.starts_at as string, timeZone);
    ensure(d).external += 1;
    events.push({ id: e.id as string, starts_at: e.starts_at as string, ends_at: e.ends_at as string, title: (e.summary as string) || "External", source: "external" });
  });

  const daysInMonth = new Date(year, month, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const d = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dow = dayOfWeekFromDateKey(d, timeZone);

    (classRes.data ?? []).forEach((c) => {
      (c.class_meetings ?? []).forEach((m: { id: string; day_of_week: number; start_time: string; end_time: string }) => {
        if (m.day_of_week !== dow) return;
        const ov = overrideByMeetingDate.get(`${m.id}_${d}`);
        if (ov?.canceled) return;
        const startTime = ov?.start ?? m.start_time;
        const endTime = ov?.end ?? m.end_time;

        ensure(d).classes += 1;
        events.push({
          id: `${m.id}_${d}`,
          class_meeting_id: m.id,
          class_id: c.id as string,
          starts_at: zonedDateTimeToUtc(d, startTime, timeZone).toISOString(),
          ends_at: zonedDateTimeToUtc(d, endTime, timeZone).toISOString(),
          title: `${c.class_code} ${c.class_name}`,
          source: "class",
        });
      });
    });

    (habitRes.data ?? []).forEach((h) => {
      (h.habit_fixed_slots ?? []).forEach((s: { id: string; day_of_week: number; start_time: string; end_time: string }) => {
        if (s.day_of_week === dow) {
          ensure(d).fixedHabits += 1;
          events.push({
            id: s.id,
            starts_at: zonedDateTimeToUtc(d, s.start_time, timeZone).toISOString(),
            ends_at: zonedDateTimeToUtc(d, s.end_time, timeZone).toISOString(),
            title: h.name as string,
            source: "fixed_habit",
          });
        }
      });
    });
  }

  (appliedRes.data ?? []).forEach((b) => {
    const d = zonedDateKeyFromIso(b.starts_at as string, timeZone);
    const bt = (b.block_type as string) ?? "assignment";
    incrementMetaForWeeklyBlock(ensure(d), bt);
    events.push({
      id: b.id as string,
      starts_at: b.starts_at as string,
      ends_at: b.ends_at as string,
      title: b.title as string,
      source: timelineSourceFromWeeklyBlockType(bt),
      fromWeeklyPlan: true,
    });
  });

  (userEventRes.data ?? []).forEach((e) => {
    const d = zonedDateKeyFromIso(e.starts_at as string, timeZone);
    ensure(d).personal += 1;
    events.push({ id: e.id as string, starts_at: e.starts_at as string, ends_at: e.ends_at as string, title: e.title as string, source: "personal" });
  });

  (draftRes.data ?? []).forEach((b) => {
    const d = zonedDateKeyFromIso(b.starts_at as string, timeZone);
    ensure(d).generated += 1;
    events.push({
      id: b.id as string,
      starts_at: b.starts_at as string,
      ends_at: b.ends_at as string,
      title: b.title as string,
      source: "generated",
    });
  });

  const selectedEvents = events
    .filter((e) => zonedDateKeyFromIso(e.starts_at, timeZone) === selectedDate)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const dayPreviewByDate: Record<string, CalendarPreviewEvent[]> = {};
  for (const e of events) {
    const d = zonedDateKeyFromIso(e.starts_at, timeZone);
    if (!dayPreviewByDate[d]) dayPreviewByDate[d] = [];
    dayPreviewByDate[d].push({ starts_at: e.starts_at, title: e.title, source: e.source });
  }
  Object.keys(dayPreviewByDate).forEach((d) => {
    dayPreviewByDate[d].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  });
  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">AI Calendar</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Suggested calendar workspace. Review drafts here, then choose whether to apply to main Calendar.</p>
      </div>

      <DashboardPlanner currentWeek={currentWeek} hasCurrentPlan={!!planRes.data} />

      <CalendarLegend variant="ai" />
      <CalendarView
        year={year}
        month={month}
        selectedDate={selectedDate}
        dayMeta={metaByDate}
        dayPreview={dayPreviewByDate}
        previewLimit={3}
        timeZone={timeZone}
        basePath="/dashboard"
        showGeneratedDots
        monthAgendaEvents={events.map((e) => ({
          id: e.id,
          starts_at: e.starts_at,
          ends_at: e.ends_at,
          title: e.title,
          source: e.source,
        }))}
      />
      <WeekTimeline date={selectedDate} events={selectedEvents} mode="ai" timeZone={timeZone} />
    </div>
  );
}
