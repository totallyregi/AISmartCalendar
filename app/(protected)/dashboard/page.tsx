import { DashboardPlanner } from "@/components/DashboardPlanner";
import { createClient } from "@/lib/supabase/server";

function sunday(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentWeek = sunday(new Date()).toISOString().slice(0, 10);

  const [extRes, classRes, assignRes, planRes] = await Promise.all([
    supabase.from("external_events").select("id", { count: "exact", head: true }).eq("user_id", user?.id),
    supabase.from("class_sections").select("id", { count: "exact", head: true }).eq("user_id", user?.id),
    supabase.from("assignments").select("estimated_minutes,remaining_minutes").eq("user_id", user?.id),
    supabase.from("weekly_plans").select("id").eq("user_id", user?.id).eq("week_start_date", currentWeek).single(),
  ]);

  const totalEstimated = (assignRes.data ?? []).reduce((sum, a) => sum + Number(a.estimated_minutes || 0), 0);
  const totalRemaining = (assignRes.data ?? []).reduce((sum, a) => sum + Number(a.remaining_minutes || 0), 0);

  return (
    <div className="space-y-6 animate-in">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Dashboard</h1>

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
    </div>
  );
}
