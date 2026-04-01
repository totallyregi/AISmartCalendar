import { CalendarLegend } from "@/components/CalendarLegend";
import { CalendarView } from "@/components/CalendarView";
import { WeekTimeline } from "@/components/WeekTimeline";
import { DashboardPlanner } from "@/components/DashboardPlanner";
import { createClient } from "@/lib/supabase/server";

function dateOnly(value: string) {
  return value.slice(0, 10);
}

function sunday(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

type DayMeta = { external: number; classes: number; fixedHabits: number; generated: number; personal: number };

type TimelineEvent = {
  id: string;
  starts_at: string;
  ends_at: string;
  title: string;
  source: "external" | "class" | "fixed_habit" | "generated" | "personal";
};

function toDateTimeLocalIso(date: Date, hhmmss: string) {
  const d = date.toISOString().slice(0, 10);
  return new Date(`${d}T${hhmmss}`).toISOString();
}

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
  const params = await searchParams;
  const year = params.year ? Number(params.year) : now.getFullYear();
  const month = params.month ? Number(params.month) : now.getMonth() + 1;
  const selectedDate = params.date ?? now.toISOString().slice(0, 10);
  const currentWeek = sunday(now).toISOString().slice(0, 10);

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);
  const startIso = monthStart.toISOString();
  const endIso = monthEnd.toISOString();

  const [extRes, classRes, habitRes, appliedRes, userEventRes, overrideRes, draftRes, assignRes, planRes] = await Promise.all([
    supabase.from("external_events").select("id,starts_at,ends_at,summary").eq("user_id", user?.id).gte("starts_at", startIso).lte("starts_at", endIso),
    supabase.from("class_sections").select("id,class_code,class_name,class_meetings(id,day_of_week,start_time,end_time)").eq("user_id", user?.id),
    supabase.from("habits").select("id,name,habit_fixed_slots(id,day_of_week,start_time,end_time)").eq("user_id", user?.id).eq("type", "fixed"),
    supabase.from("weekly_plan_blocks").select("id,starts_at,ends_at,title,origin").eq("user_id", user?.id).eq("origin", "applied").gte("starts_at", startIso).lte("starts_at", endIso),
    supabase.from("user_events").select("id,starts_at,ends_at,title").eq("user_id", user?.id).gte("starts_at", startIso).lte("starts_at", endIso),
    supabase
      .from("class_meeting_overrides")
      .select("id,class_meeting_id,override_date,canceled,override_start_time,override_end_time")
      .eq("user_id", user?.id)
      .gte("override_date", startIso.slice(0, 10))
      .lte("override_date", endIso.slice(0, 10)),
    supabase.from("ai_draft_blocks").select("id,starts_at,ends_at,title,block_type,applied").eq("user_id", user?.id).eq("applied", false).gte("starts_at", startIso).lte("starts_at", endIso),
    supabase.from("assignments").select("estimated_minutes,remaining_minutes").eq("user_id", user?.id),
    supabase.from("weekly_plans").select("id").eq("user_id", user?.id).eq("week_start_date", currentWeek).single(),
  ]);

  const metaByDate: Record<string, DayMeta> = {};
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
    if (!metaByDate[d]) metaByDate[d] = { external: 0, classes: 0, fixedHabits: 0, generated: 0, personal: 0 };
    return metaByDate[d];
  };

  (extRes.data ?? []).forEach((e) => {
    const d = dateOnly(e.starts_at as string);
    ensure(d).external += 1;
    events.push({ id: e.id as string, starts_at: e.starts_at as string, ends_at: e.ends_at as string, title: (e.summary as string) || "External", source: "external" });
  });

  const daysInMonth = new Date(year, month, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const dt = new Date(year, month - 1, day);
    const d = dt.toISOString().slice(0, 10);
    const dow = dt.getDay();

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
          starts_at: toDateTimeLocalIso(dt, startTime),
          ends_at: toDateTimeLocalIso(dt, endTime),
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
            starts_at: toDateTimeLocalIso(dt, s.start_time),
            ends_at: toDateTimeLocalIso(dt, s.end_time),
            title: h.name as string,
            source: "fixed_habit",
          });
        }
      });
    });
  }

  (appliedRes.data ?? []).forEach((b) => {
    const d = dateOnly(b.starts_at as string);
    ensure(d).generated += 1;
    events.push({ id: b.id as string, starts_at: b.starts_at as string, ends_at: b.ends_at as string, title: b.title as string, source: "generated" });
  });

  (userEventRes.data ?? []).forEach((e) => {
    const d = dateOnly(e.starts_at as string);
    ensure(d).personal += 1;
    events.push({ id: e.id as string, starts_at: e.starts_at as string, ends_at: e.ends_at as string, title: e.title as string, source: "personal" });
  });

  (draftRes.data ?? []).forEach((b) => {
    const d = dateOnly(b.starts_at as string);
    ensure(d).generated += 1;
    events.push({ id: b.id as string, starts_at: b.starts_at as string, ends_at: b.ends_at as string, title: b.title as string, source: "generated" });
  });

  const selectedEvents = events.filter((e) => dateOnly(e.starts_at) === selectedDate).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const totalEstimated = (assignRes.data ?? []).reduce((sum, a) => sum + Number(a.estimated_minutes || 0), 0);
  const totalRemaining = (assignRes.data ?? []).reduce((sum, a) => sum + Number(a.remaining_minutes || 0), 0);
  const draftAssignmentMinutes = (draftRes.data ?? [])
    .filter((b) => b.block_type === "assignment")
    .reduce((sum, b) => sum + Math.max(0, (new Date(b.ends_at as string).getTime() - new Date(b.starts_at as string).getTime()) / 60000), 0);

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">AI Calendar</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Suggested calendar workspace. Review drafts here, then choose whether to apply to main Calendar.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Imported events</p>
          <p className="mt-1 text-xl font-semibold text-zinc-800 dark:text-zinc-200">{(extRes.data ?? []).length}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Classes</p>
          <p className="mt-1 text-xl font-semibold text-zinc-800 dark:text-zinc-200">{(classRes.data ?? []).length}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Assignment hours planned</p>
          <p className="mt-1 text-xl font-semibold text-zinc-800 dark:text-zinc-200">{Math.max(0, (totalEstimated - totalRemaining + draftAssignmentMinutes) / 60).toFixed(1)}h</p>
        </div>
      </div>

      <DashboardPlanner currentWeek={currentWeek} hasCurrentPlan={!!planRes.data} />

      <CalendarLegend />
      <CalendarView year={year} month={month} selectedDate={selectedDate} dayMeta={metaByDate} basePath="/dashboard" />
      <WeekTimeline date={selectedDate} events={selectedEvents} mode="ai" />
    </div>
  );
}
