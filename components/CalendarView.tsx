"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function CalendarView({
  year,
  month,
  planDates,
}: {
  year: number;
  month: number;
  planDates: string[];
}) {
  const router = useRouter();
  const planSet = new Set(planDates);
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const startPad = first.getDay();
  const daysInMonth = last.getDate();
  const today = new Date().toISOString().slice(0, 10);

  const cells: { date: string | null; label: number | null }[] = [];
  for (let i = 0; i < startPad; i++) cells.push({ date: null, label: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ date, label: d });
  }

  function prevMonth() {
    const m = month === 1 ? 12 : month - 1;
    const y = month === 1 ? year - 1 : year;
    router.push(`/calendar?year=${y}&month=${m}`);
  }
  function nextMonth() {
    const m = month === 12 ? 1 : month + 1;
    const y = month === 12 ? year + 1 : year;
    router.push(`/calendar?year=${y}&month=${m}`);
  }

  return (
    <div className="animate-in">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
          {MONTH_NAMES[month - 1]} {year}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Next →
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800">
          {DAY_NAMES.map((day) => (
            <div
              key={day}
              className="border-r border-zinc-200 py-2 text-center text-xs font-medium text-zinc-500 last:border-r-0 dark:border-zinc-800 dark:text-zinc-400"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            if (cell.date === null) {
              return <div key={`empty-${i}`} className="min-h-[4rem] border-r border-b border-zinc-100 bg-zinc-50/50 last:border-r-0 dark:border-zinc-800 dark:bg-zinc-950/50" />;
            }
            const hasPlan = planSet.has(cell.date);
            const isToday = cell.date === today;
            return (
              <Link
                key={cell.date}
                href={`/today?date=${cell.date}`}
                className={`flex min-h-[4rem] flex-col border-r border-b border-zinc-100 p-2 transition-colors last:border-r-0 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800 ${
                  isToday ? "bg-amber-50 dark:bg-amber-950/30" : "bg-white dark:bg-zinc-900"
                }`}
              >
                <span className={`text-sm font-medium ${isToday ? "text-amber-700 dark:text-amber-400" : "text-zinc-700 dark:text-zinc-300"}`}>
                  {cell.label}
                </span>
                {hasPlan && (
                  <span className="mt-1 flex gap-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
