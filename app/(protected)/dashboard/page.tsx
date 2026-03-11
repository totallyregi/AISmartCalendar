import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [planRes, assignmentsRes] = await Promise.all([
    supabase.from("daily_plans").select("plan_json").eq("date", today).single(),
    supabase.from("assignments").select("id, title, due_date, status").order("due_date", { ascending: true }).limit(5),
  ]);

  const plan = planRes.data?.plan_json as { blocks?: { start: string; end: string; label: string }[] } | null;
  const assignments = assignmentsRes.data ?? [];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        Dashboard
      </h1>

      <section className="animate-in" style={{ animationDelay: "50ms" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            Today&apos;s plan
          </h2>
          <Link
            href="/today"
            className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            View / Generate →
          </Link>
        </div>
        {plan?.blocks?.length ? (
          <ul className="mt-2 space-y-1.5 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
            {plan.blocks.slice(0, 5).map((b, i) => (
              <li key={i} className="text-sm text-zinc-700 dark:text-zinc-300">
                {b.start}–{b.end} — {b.label}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            No plan for today. Generate one on the Today page.
          </p>
        )}
      </section>

      <section className="animate-in" style={{ animationDelay: "100ms" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            Upcoming assignments
          </h2>
          <Link
            href="/assignments"
            className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            All assignments →
          </Link>
        </div>
        {assignments.length ? (
          <ul className="mt-2 space-y-2 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
            {assignments.map((a) => (
              <li key={a.id} className="flex justify-between text-sm">
                <span className="text-zinc-700 dark:text-zinc-300">{a.title}</span>
                <span className="text-zinc-500 dark:text-zinc-400">{a.due_date}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            No assignments yet. Add some in Assignments.
          </p>
        )}
      </section>
    </div>
  );
}
