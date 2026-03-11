import { createClient } from "@/lib/supabase/server";
import { DailyPlanView } from "@/components/DailyPlanView";

export default async function TodayPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: planRow } = await supabase
    .from("daily_plans")
    .select("plan_json")
    .eq("date", today)
    .single();

  const plan = planRow?.plan_json as { blocks?: { start: string; end: string; type: string; label: string; details?: string }[] } | null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        Today
      </h1>
      <DailyPlanView date={today} initialPlan={plan} />
    </div>
  );
}
