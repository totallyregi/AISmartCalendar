"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { WEEKDAY_FULL } from "@/lib/datetimeDisplay";
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type DayMeta = { external: number; classes: number; fixedHabits: number; generated: number; personal: number };

export function CalendarView({
  year,
  month,
  selectedDate,
  dayMeta,
  basePath = "/calendar",
}: {
  year: number;
  month: number;
  selectedDate: string;
  dayMeta: Record<string, DayMeta>;
  basePath?: "/calendar" | "/dashboard";
}) {
  const router = useRouter();
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
    router.push(`${basePath}?year=${y}&month=${m}`);
  }

  function nextMonth() {
    const m = month === 12 ? 1 : month + 1;
    const y = month === 12 ? year + 1 : year;
    router.push(`${basePath}?year=${y}&month=${m}`);
  }

  return (
    <div className="animate-in">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
          {MONTH_NAMES[month - 1]} {year}
        </h2>
        <div className="flex gap-2">
          <button type="button" onClick={prevMonth} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">← Prev</button>
          <button type="button" onClick={nextMonth} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">Next →</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800">
          {WEEKDAY_FULL.map((day) => (
            <div
              key={day}
              className="border-r border-zinc-200 px-0.5 py-2 text-center text-[10px] font-medium leading-tight text-zinc-500 last:border-r-0 sm:text-xs dark:border-zinc-800 dark:text-zinc-400"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            if (!cell.date) {
              return <div key={`empty-${i}`} className="min-h-[5rem] border-r border-b border-zinc-100 bg-zinc-50/40 last:border-r-0 dark:border-zinc-800 dark:bg-zinc-950/30" />;
            }

            const meta = dayMeta[cell.date] ?? { external: 0, classes: 0, fixedHabits: 0, generated: 0, personal: 0 };
            const isToday = cell.date === today;
            const isSelected = cell.date === selectedDate;

            return (
              <Link
                key={cell.date}
                href={`${basePath}?year=${year}&month=${month}&date=${cell.date}`}
                className={`flex min-h-[5rem] flex-col border-r border-b border-zinc-100 p-2 transition-colors last:border-r-0 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800 ${
                  isSelected ? "bg-zinc-100 dark:bg-zinc-800" : isToday ? "bg-amber-50 dark:bg-amber-950/20" : "bg-white dark:bg-zinc-900"
                }`}
              >
                <span className={`text-sm font-medium ${isToday ? "text-amber-700 dark:text-amber-400" : "text-zinc-700 dark:text-zinc-300"}`}>{cell.label}</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {meta.external > 0 && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                  {meta.classes > 0 && <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />}
                  {meta.fixedHabits > 0 && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                  {meta.generated > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                  {meta.personal > 0 && <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
