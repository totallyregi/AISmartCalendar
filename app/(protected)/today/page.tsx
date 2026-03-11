import { createClient } from "@/lib/supabase/server";
import { DailyPlanView } from "@/components/DailyPlanView";

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const supabase = await createClient();
  const { date: queryDate } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const date = queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate) ? queryDate : today;
  const isToday = date === today;

  const { data: planRow } = await supabase
    .from("daily_plans")
    .select("plan_json")
    .eq("date", date)
    .single();

  const plan = planRow?.plan_json as { blocks?: { start: string; end: string; type: string; label: string; details?: string }[] } | null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        {isToday ? "Today" : date}
      </h1>
      <DailyPlanView date={date} initialPlan={plan} />
    </div>
  );
}
