import { DashboardPlanner } from "@/components/DashboardPlanner";
import { CalendarLegend } from "@/components/CalendarLegend";
import { CalendarView } from "@/components/CalendarView";
import { WeekTimeline } from "@/components/WeekTimeline";
import { createClient } from "@/lib/supabase/server";

function sunday(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function dateOnly(value: string) {
  return value.slice(0, 10);
}

type DayMeta = { external: number; classes: number; fixedHabits: number; generated: number; personal: number };

type TimelineEvent = {
  id: string;
  starts_at: string;
  ends_at: string;
  title: string;
  source: "external" | "class" | "fixed_habit" | "generated" | "personal";
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
  const params = await searchParams;
  const year = params.year ? Number(params.year) : now.getFullYear();
  const month = params.month ? Number(params.month) : now.getMonth() + 1;
  const selectedDate = params.date ?? now.toISOString().slice(0, 10);
  const currentWeek = sunday(now).toISOString().slice(0, 10);

  const monthStart = new Date(year, month - 1, 1).toISOString();
  const monthEnd = new Date(year, month, 0, 23, 59, 59).toISOString();

  const [extRes, classRes, assignRes, planRes, draftRes] = await Promise.all([
    supabase.from("external_events").select("id,starts_at,ends_at,summary", { count: "exact" }).eq("user_id", user?.id).gte("starts_at", monthStart).lte("starts_at", monthEnd),
    supabase.from("class_sections").select("id,class_code,class_name,class_meetings(day_of_week,start_time,end_time)", { count: "exact" }).eq("user_id", user?.id),
    supabase.from("assignments").select("estimated_minutes,remaining_minutes").eq("user_id", user?.id),
    supabase.from("weekly_plans").select("id").eq("user_id", user?.id).eq("week_start_date", currentWeek).single(),
    supabase.from("ai_draft_blocks").select("id,starts_at,ends_at,title,block_type,applied").eq("user_id", user?.id).eq("applied", false).gte("starts_at", monthStart).lte("starts_at", monthEnd),
  ]);

  const totalEstimated = (assignRes.data ?? []).reduce((sum, a) => sum + Number(a.estimated_minutes || 0), 0);
  const totalRemaining = (assignRes.data ?? []).reduce((sum, a) => sum + Number(a.remaining_minutes || 0), 0);

  const metaByDate: Record<string, DayMeta> = {};
  const events: TimelineEvent[] = [];
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
      (c.class_meetings ?? []).forEach((m: { day_of_week: number; start_time: string; end_time: string }) => {
        if (m.day_of_week !== dow) return;
        ensure(d).classes += 1;
        events.push({
          id: `${c.id}_${d}_${m.start_time}`,
          starts_at: `${d}T${m.start_time}`,
          ends_at: `${d}T${m.end_time}`,
          title: `${c.class_code} ${c.class_name}`,
          source: "class",
        });
      });
    });
  }

  (draftRes.data ?? []).forEach((b) => {
    const d = dateOnly(b.starts_at as string);
    ensure(d).generated += 1;
    events.push({ id: b.id as string, starts_at: b.starts_at as string, ends_at: b.ends_at as string, title: b.title as string, source: "generated" });
  });

  const selectedEvents = events.filter((e) => dateOnly(e.starts_at) === selectedDate).sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  return (
    <div className="space-y-6 animate-in">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">AI Calendar</h1>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Imported events</p>
          <p className="mt-1 text-xl font-semibold text-zinc-800 dark:text-zinc-200">{extRes.count ?? 0}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Classes</p>
          <p className="mt-1 text-xl font-semibold text-zinc-800 dark:text-zinc-200">{classRes.count ?? 0}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Assignment hours planned</p>
          <p className="mt-1 text-xl font-semibold text-zinc-800 dark:text-zinc-200">{Math.max(0, (totalEstimated - totalRemaining) / 60).toFixed(1)}h</p>
        </div>
      </div>

      <DashboardPlanner currentWeek={currentWeek} hasCurrentPlan={!!planRes.data} />
      <CalendarLegend />
      <CalendarView year={year} month={month} selectedDate={selectedDate} dayMeta={metaByDate} />
      <WeekTimeline date={selectedDate} events={selectedEvents} mode="ai" />
    </div>
  );
}
