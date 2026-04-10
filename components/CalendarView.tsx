"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { WEEKDAY_FULL } from "@/lib/datetimeDisplay";
import { zonedDateKeyFromIso } from "@/lib/timezone";
import type { CalendarDayMeta } from "@/lib/calendarMeta";
import { emptyDayMeta } from "@/lib/calendarMeta";
import { DayAgendaModal, type DayAgendaEvent } from "@/components/DayAgendaModal";
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
  external: "bg-indigo-100/90 text-indigo-800",
  class: "bg-violet-100/90 text-violet-800",
  fixed_habit: "bg-green-100/90 text-green-800",
  flexible_habit: "bg-fuchsia-100/90 text-fuchsia-800",
  assignment: "bg-orange-100/90 text-orange-800",
  generated: "bg-cyan-100/90 text-cyan-800",
  personal: "bg-rose-100/90 text-rose-800",
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
  monthAgendaEvents = [],
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
  /** Full-month events for the day agenda popout (same sources as the timeline). */
  monthAgendaEvents?: DayAgendaEvent[];
}) {
  const router = useRouter();
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [agendaDate, setAgendaDate] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setAgendaOpen(false);
      setAgendaDate(null);
    });
  }, [year, month]);

  const agendaForDay = useMemo(() => {
    if (!agendaDate) return [];
    return monthAgendaEvents.filter((e) => zonedDateKeyFromIso(e.starts_at, timeZone) === agendaDate);
  }, [monthAgendaEvents, agendaDate, timeZone]);

  const calendarMode = basePath === "/dashboard" ? "ai" : "main";

  function openDay(dateStr: string) {
    setAgendaDate(dateStr);
    setAgendaOpen(true);
    router.push(`${basePath}?year=${year}&month=${month}&date=${dateStr}`, { scroll: false });
  }
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
  /* Full 7-column rows: without trailing pad the last row has <7 cells so grid columns are empty and borders vanish. */
  while (cells.length % 7 !== 0) cells.push({ date: null, label: null });

  const lastRowStartIndex = (Math.ceil(cells.length / 7) - 1) * 7;

  function prevMonth() {
    const m = month === 1 ? 12 : month - 1;
    const y = month === 1 ? year - 1 : year;
    router.push(`${basePath}?year=${y}&month=${m}`, { scroll: false });
  }

  function nextMonth() {
    const m = month === 12 ? 1 : month + 1;
    const y = month === 12 ? year + 1 : year;
    router.push(`${basePath}?year=${y}&month=${m}`, { scroll: false });
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
      <div className="ds-card overflow-hidden p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-medium text-palette-navy">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          <div className="flex gap-2">
            <button type="button" onClick={prevMonth} className="rounded-lg border border-palette-card-border bg-palette-card-bg px-3 py-1.5 text-sm font-medium text-palette-navy hover:bg-palette-hover">← Prev</button>
            <button type="button" onClick={nextMonth} className="rounded-lg border border-palette-card-border bg-palette-card-bg px-3 py-1.5 text-sm font-medium text-palette-navy hover:bg-palette-hover">Next →</button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-palette-card-border bg-palette-card-bg">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-7 border-b border-palette-card-border">
            {WEEKDAY_FULL.map((day) => (
              <div
                key={day}
                className="border-r border-palette-card-border px-0.5 py-2 text-center text-[10px] font-medium leading-tight text-palette-slate last:border-r-0 sm:text-xs"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            const colIndex = i % 7;
            const isLastCol = colIndex === 6;
            const isLastRow = i >= lastRowStartIndex;
            /* No border-b on last row: outer wrapper’s border is the bottom edge (avoids double line). */
            const cellBottom = isLastRow ? "" : "border-b border-palette-card-border";
            const cellEdge = `${isLastCol ? "" : "border-r border-palette-card-border "}${cellBottom}`;

            if (!cell.date) {
              return (
                <div
                  key={`empty-${i}`}
                  className={`min-h-[8rem] bg-palette-cream/50 md:min-h-[9.5rem] ${cellEdge}`}
                />
              );
            }

            const dayKey = cell.date;
            const meta = dayMeta[dayKey] ?? emptyDayMeta();
            const isToday = dayKey === today;
            const isSelected = dayKey === selectedDate;
            const dayPreviews = [...(dayPreview[dayKey] ?? [])].sort((a, b) => {
              const byLocal = localSortMinutes(a.starts_at) - localSortMinutes(b.starts_at);
              if (byLocal !== 0) return byLocal;
              return a.starts_at.localeCompare(b.starts_at);
            });
            const previews = dayPreviews.slice(0, previewLimit);
            const hiddenCount = Math.max(0, dayPreviews.length - previews.length);

            return (
              <button
                type="button"
                key={dayKey}
                onClick={() => openDay(dayKey)}
                className={`flex min-h-[8rem] min-w-0 w-full flex-col p-2 text-left transition-colors hover:bg-palette-hover/75 md:min-h-[9.5rem] ${cellEdge} ${
                  isSelected ? "bg-palette-sky/15" : isToday ? "bg-amber-50 dark:bg-amber-950/45" : "bg-palette-card-bg"
                }`}
              >
                <span className={`text-sm font-medium ${isToday ? "text-amber-800 dark:text-amber-200" : "text-palette-navy"}`}>{cell.label}</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {meta.external > 0 && <span className="h-2 w-2 rounded-full bg-indigo-500 ring-1 ring-indigo-400/40" />}
                  {meta.classes > 0 && <span className="h-2 w-2 rounded-full bg-violet-500 ring-1 ring-violet-400/40" />}
                  {meta.fixedHabits > 0 && <span className="h-2 w-2 rounded-full bg-green-600 ring-1 ring-green-400/40" />}
                  {meta.flexibleHabits > 0 && <span className="h-2 w-2 rounded-full bg-fuchsia-500 ring-1 ring-fuchsia-400/40" />}
                  {meta.assignments > 0 && <span className="h-2 w-2 rounded-full bg-orange-500 ring-1 ring-orange-400/40" />}
                  {showGeneratedDots && meta.generated > 0 && <span className="h-2 w-2 rounded-full bg-cyan-400 ring-1 ring-cyan-300/50" />}
                  {meta.personal > 0 && <span className="h-2 w-2 rounded-full bg-rose-500 ring-1 ring-rose-400/40" />}
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
                    <div className="text-[10px] text-palette-slate">+{hiddenCount} more</div>
                  )}
                </div>
              </button>
            );
          })}
          </div>
        </div>
        </div>
      </div>

      <DayAgendaModal
        open={agendaOpen && !!agendaDate}
        date={agendaDate ?? selectedDate}
        timeZone={timeZone}
        mode={calendarMode}
        events={agendaForDay}
        onClose={() => {
          setAgendaOpen(false);
          setAgendaDate(null);
        }}
      />
    </div>
  );
}
