"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { WEEKDAY_FULL } from "@/lib/datetimeDisplay";
import type { CalendarDayMeta } from "@/lib/calendarMeta";
import { emptyDayMeta } from "@/lib/calendarMeta";
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

const previewCls: Record<
  "external" | "class" | "fixed_habit" | "flexible_habit" | "assignment" | "generated" | "personal",
  string
> = {
  external: "bg-indigo-100/90 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  class: "bg-violet-100/90 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  fixed_habit: "bg-green-100/90 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  flexible_habit: "bg-fuchsia-100/90 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-300",
  assignment: "bg-orange-100/90 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  generated: "bg-cyan-100/90 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
  personal: "bg-rose-100/90 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
};

export function CalendarView({
  year,
  month,
  selectedDate,
  dayMeta,
  dayPreview = {},
  previewLimit = 3,
  timeZone = "UTC",
  basePath = "/calendar",
  showGeneratedDots = false,
}: {
  year: number;
  month: number;
  selectedDate: string;
  dayMeta: Record<string, CalendarDayMeta>;
  dayPreview?: Record<string, { starts_at: string; title: string; source: "external" | "class" | "fixed_habit" | "flexible_habit" | "assignment" | "generated" | "personal" }[]>;
  previewLimit?: number;
  timeZone?: string;
  basePath?: "/calendar" | "/dashboard";
  /** Only the AI Calendar month grid shows draft “generated” dots */
  showGeneratedDots?: boolean;
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

  function formatPreviewTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone,
    });
  }

  function localSortMinutes(iso: string) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(new Date(iso));
    const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    const h = Number(map.hour ?? "0");
    const m = Number(map.minute ?? "0");
    return h * 60 + m;
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

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="min-w-[760px]">
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
              return <div key={`empty-${i}`} className="min-h-[8rem] border-r border-b border-zinc-100 bg-zinc-50/40 last:border-r-0 dark:border-zinc-800 dark:bg-zinc-950/30 md:min-h-[9.5rem]" />;
            }

            const meta = dayMeta[cell.date] ?? emptyDayMeta();
            const isToday = cell.date === today;
            const isSelected = cell.date === selectedDate;
            const dayPreviews = [...(dayPreview[cell.date] ?? [])].sort((a, b) => {
              const byLocal = localSortMinutes(a.starts_at) - localSortMinutes(b.starts_at);
              if (byLocal !== 0) return byLocal;
              return a.starts_at.localeCompare(b.starts_at);
            });
            const previews = dayPreviews.slice(0, previewLimit);
            const hiddenCount = Math.max(0, dayPreviews.length - previews.length);

            return (
              <Link
                key={cell.date}
                href={`${basePath}?year=${year}&month=${month}&date=${cell.date}`}
                className={`flex min-h-[8rem] flex-col border-r border-b border-zinc-100 p-2 transition-colors last:border-r-0 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800 md:min-h-[9.5rem] ${
                  isSelected ? "bg-zinc-100 dark:bg-zinc-800" : isToday ? "bg-amber-50 dark:bg-amber-950/20" : "bg-white dark:bg-zinc-900"
                }`}
              >
                <span className={`text-sm font-medium ${isToday ? "text-amber-700 dark:text-amber-400" : "text-zinc-700 dark:text-zinc-300"}`}>{cell.label}</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {meta.external > 0 && <span className="h-2 w-2 rounded-full bg-indigo-500 ring-1 ring-indigo-400/40 dark:ring-indigo-400/25" />}
                  {meta.classes > 0 && <span className="h-2 w-2 rounded-full bg-violet-500 ring-1 ring-violet-400/40 dark:ring-violet-400/25" />}
                  {meta.fixedHabits > 0 && <span className="h-2 w-2 rounded-full bg-green-600 ring-1 ring-green-400/40 dark:ring-green-400/25" />}
                  {meta.flexibleHabits > 0 && <span className="h-2 w-2 rounded-full bg-fuchsia-500 ring-1 ring-fuchsia-400/40 dark:ring-fuchsia-400/25" />}
                  {meta.assignments > 0 && <span className="h-2 w-2 rounded-full bg-orange-500 ring-1 ring-orange-400/40 dark:ring-orange-400/25" />}
                  {showGeneratedDots && meta.generated > 0 && <span className="h-2 w-2 rounded-full bg-cyan-400 ring-1 ring-cyan-300/50 dark:ring-cyan-300/35" />}
                  {meta.personal > 0 && <span className="h-2 w-2 rounded-full bg-rose-500 ring-1 ring-rose-400/40 dark:ring-rose-400/25" />}
                </div>
                <div className="mt-2 space-y-1">
                  {previews.map((p, idx) => (
                    <div
                      key={`${p.starts_at}-${idx}`}
                      className={`truncate rounded px-1.5 py-0.5 text-[10px] ${previewCls[p.source]}`}
                    >
                      <span className="font-medium">{formatPreviewTime(p.starts_at)}</span> {p.title}
                    </div>
                  ))}
                  {hiddenCount > 0 && (
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400">+{hiddenCount} more</div>
                  )}
                </div>
              </Link>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
}
