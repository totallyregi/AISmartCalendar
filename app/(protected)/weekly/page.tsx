import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { WeeklyPlanList } from "@/components/WeeklyPlanList";

function getWeekDates(): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export default async function WeeklyPage() {
  const supabase = await createClient();
  const weekDates = getWeekDates();
  const start = weekDates[0];
  const end = weekDates[6];

  const { data: plans } = await supabase
    .from("daily_plans")
    .select("date, plan_json")
    .gte("date", start)
    .lte("date", end)
    .order("date");

  const planByDate = new Map((plans ?? []).map((p) => [p.date, p.plan_json as { blocks?: unknown[] }]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        Weekly plan
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        This week at a glance. Click a day to view or generate its plan.
      </p>
      <WeeklyPlanList
        dates={weekDates}
        planByDate={planByDate}
      />
    </div>
  );
}
