import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "@/components/CalendarView";

function getMonthStartEnd(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  const now = new Date();
  const year = params.year ? parseInt(params.year, 10) : now.getFullYear();
  const month = params.month ? parseInt(params.month, 10) : now.getMonth() + 1;
  const { start, end } = getMonthStartEnd(year, month);

  const { data: plans } = await supabase
    .from("daily_plans")
    .select("date, plan_json")
    .gte("date", start)
    .lte("date", end)
    .order("date");

  const planDates = new Set((plans ?? []).map((p) => p.date));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        Calendar
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Click a day to view or generate its plan.
      </p>
      <CalendarView
        year={year}
        month={month}
        planDates={Array.from(planDates)}
      />
    </div>
  );
}
