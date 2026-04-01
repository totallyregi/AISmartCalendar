import { createClient } from "@/lib/supabase/server";
import { CalendarLegend } from "@/components/CalendarLegend";
import { CalendarView } from "@/components/CalendarView";
import { WeekTimeline } from "@/components/WeekTimeline";

type DayMeta = { external: number; classes: number; fixedHabits: number; generated: number };

type DayEvent = { starts_at: string; ends_at: string; title: string; source: "external" | "class" | "fixed_habit" | "generated" };

function dateOnly(value: string) {
  return value.slice(0, 10);
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; date?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const params = await searchParams;
  const now = new Date();
  const year = params.year ? Number(params.year) : now.getFullYear();
  const month = params.month ? Number(params.month) : now.getMonth() + 1;
  const selectedDate = params.date ?? now.toISOString().slice(0, 10);

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);
  const startIso = monthStart.toISOString();
  const endIso = monthEnd.toISOString();

  const [extRes, classRes, habitRes, planRes] = await Promise.all([
    supabase.from("external_events").select("starts_at,ends_at,summary").eq("user_id", user?.id).gte("starts_at", startIso).lte("starts_at", endIso),
    supabase.from("class_sections").select("id,class_code,class_name,class_meetings(day_of_week,start_time,end_time)").eq("user_id", user?.id),
    supabase.from("habits").select("id,name,type,habit_fixed_slots(day_of_week,start_time,end_time)").eq("user_id", user?.id).eq("type", "fixed"),
    supabase.from("weekly_plan_blocks").select("starts_at,ends_at,title").eq("user_id", user?.id).gte("starts_at", startIso).lte("starts_at", endIso),
  ]);

  const metaByDate: Record<string, DayMeta> = {};
  const dayEvents: DayEvent[] = [];

  const ensure = (d: string) => {
    if (!metaByDate[d]) metaByDate[d] = { external: 0, classes: 0, fixedHabits: 0, generated: 0 };
    return metaByDate[d];
  };

  (extRes.data ?? []).forEach((e) => {
    const d = dateOnly(e.starts_at as string);
    ensure(d).external += 1;
    dayEvents.push({ starts_at: e.starts_at as string, ends_at: e.ends_at as string, title: (e.summary as string) || "External event", source: "external" });
  });

  const daysInMonth = new Date(year, month, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const dt = new Date(year, month - 1, day);
    const d = dt.toISOString().slice(0, 10);
    const dow = dt.getDay();

    (classRes.data ?? []).forEach((c) => {
      (c.class_meetings ?? []).forEach((m: { day_of_week: number; start_time: string; end_time: string }) => {
        if (m.day_of_week === dow) {
          ensure(d).classes += 1;
          dayEvents.push({ starts_at: `${d}T${m.start_time}`, ends_at: `${d}T${m.end_time}`, title: `${c.class_code} ${c.class_name}`, source: "class" });
        }
      });
    });

    (habitRes.data ?? []).forEach((h) => {
      (h.habit_fixed_slots ?? []).forEach((s: { day_of_week: number; start_time: string; end_time: string }) => {
        if (s.day_of_week === dow) {
          ensure(d).fixedHabits += 1;
          dayEvents.push({ starts_at: `${d}T${s.start_time}`, ends_at: `${d}T${s.end_time}`, title: h.name as string, source: "fixed_habit" });
        }
      });
    });
  }

  (planRes.data ?? []).forEach((b) => {
    const d = dateOnly(b.starts_at as string);
    ensure(d).generated += 1;
    dayEvents.push({ starts_at: b.starts_at as string, ends_at: b.ends_at as string, title: b.title as string, source: "generated" });
  });

  const selectedEvents = dayEvents
    .filter((e) => dateOnly(e.starts_at) === selectedDate)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Calendar</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Unified view: Google events, classes, fixed habits, and generated schedule blocks.
        </p>
      </div>
      <CalendarLegend />
      <CalendarView year={year} month={month} selectedDate={selectedDate} dayMeta={metaByDate} />
      <WeekTimeline date={selectedDate} events={selectedEvents} />
    </div>
  );
}
