"use client";

import Link from "next/link";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function WeeklyPlanList({
  dates,
  planByDate,
}: {
  dates: string[];
  planByDate: Map<string, { blocks?: unknown[] }>;
}) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <ul className="space-y-2">
      {dates.map((date, i) => {
        const plan = planByDate.get(date);
        const hasPlan = plan?.blocks?.length;
        const isToday = date === today;
        const [y, m, d] = date.split("-");
        const dayName = DAY_NAMES[new Date(Number(y), Number(m) - 1, Number(d)).getDay()];

        return (
          <li
            key={date}
            style={{ animationDelay: `${i * 40}ms` }}
            className="sidebar-link"
          >
            <Link
              href={`/today?date=${date}`}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-all hover:border-zinc-300 hover:shadow-sm dark:hover:border-zinc-600 ${
                isToday
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium opacity-80">
                  {dayName}, {Number(m)}/{Number(d)}
                </span>
                {isToday && <span className="rounded bg-white/20 px-1.5 py-0.5 text-xs dark:bg-zinc-900/20">Today</span>}
              </div>
              <div className="flex items-center gap-2">
                {hasPlan ? (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">
                    {plan!.blocks!.length} blocks
                  </span>
                ) : (
                  <span className="text-xs opacity-70">No plan</span>
                )}
                <span className="text-xs opacity-60">→</span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
