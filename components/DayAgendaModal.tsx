"use client";

import { useEffect, useMemo, useState } from "react";
import { zonedDateTimeToUtc } from "@/lib/timezone";
import type { CalendarTimelineEvent } from "@/lib/calendarTimelineEvent";
import { EventEditModal, resolveEventEditKind } from "@/components/EventEditModal";
import { useCalendarTimelineActions } from "@/hooks/useCalendarTimelineActions";
import { TimelineEventActionButtons } from "@/components/TimelineEventActionButtons";

export type DayAgendaEvent = CalendarTimelineEvent;

const DAY_MINUTES = 24 * 60;

/** Pixel height for the full 24h strip — larger = less cramped blocks when many events cluster in one part of the day */
const TIMELINE_DAY_HEIGHT_PX = 960;

const sourceCls: Record<DayAgendaEvent["source"], string> = {
  external: "border-l-indigo-500 bg-indigo-50/90 text-indigo-900 dark:border-l-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-200",
  class: "border-l-violet-500 bg-violet-50/90 text-violet-900 dark:border-l-violet-400 dark:bg-violet-950/40 dark:text-violet-200",
  fixed_habit: "border-l-green-600 bg-green-50/90 text-green-900 dark:border-l-green-400 dark:bg-green-950/40 dark:text-green-200",
  flexible_habit: "border-l-fuchsia-500 bg-fuchsia-50/90 text-fuchsia-900 dark:border-l-fuchsia-400 dark:bg-fuchsia-950/40 dark:text-fuchsia-200",
  assignment: "border-l-orange-500 bg-orange-50/90 text-orange-900 dark:border-l-orange-400 dark:bg-orange-950/40 dark:text-orange-200",
  generated: "border-l-cyan-500 bg-cyan-50/90 text-cyan-900 dark:border-l-cyan-400 dark:bg-cyan-950/40 dark:text-cyan-200",
  personal: "border-l-rose-500 bg-rose-50/90 text-rose-900 dark:border-l-rose-400 dark:bg-rose-950/40 dark:text-rose-200",
};

function localMinutes(iso: string, timeZone: string) {
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

function localDateKey(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function formatRange(isoStart: string, isoEnd: string, timeZone: string) {
  const o = { hour: "numeric" as const, minute: "2-digit" as const, hour12: true, timeZone };
  return `${new Date(isoStart).toLocaleTimeString("en-US", o)} – ${new Date(isoEnd).toLocaleTimeString("en-US", o)}`;
}

/** Compact hour tick: 12a, 1a–11a, 12p, 1p–11p */
function hourTickLabel(h: number) {
  if (h === 0) return "12a";
  if (h < 12) return `${h}a`;
  if (h === 12) return "12p";
  return `${h - 12}p`;
}

function formatDayTitle(dateKey: string, timeZone: string) {
  const noon = zonedDateTimeToUtc(dateKey, "12:00:00", timeZone);
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(noon);
}

export function DayAgendaModal({
  open,
  date,
  timeZone,
  mode,
  events,
  onClose,
}: {
  open: boolean;
  date: string;
  timeZone: string;
  mode: "main" | "ai";
  events: DayAgendaEvent[];
  onClose: () => void;
}) {
  const [editing, setEditing] = useState<CalendarTimelineEvent | null>(null);
  const [sheetEntered, setSheetEntered] = useState(false);
  const actions = useCalendarTimelineActions(date);

  useEffect(() => {
    if (!open) setEditing(null);
  }, [open, date]);

  useEffect(() => {
    if (!open) {
      setSheetEntered(false);
      return;
    }
    const id = requestAnimationFrame(() => setSheetEntered(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (editing) setEditing(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, editing]);

  const sorted = useMemo(
    () =>
      [...events].sort((a, b) => {
        const da = localMinutes(a.starts_at, timeZone) - localMinutes(b.starts_at, timeZone);
        if (da !== 0) return da;
        return a.starts_at.localeCompare(b.starts_at);
      }),
    [events, timeZone]
  );

  const dayTitle = useMemo(() => formatDayTitle(date, timeZone), [date, timeZone]);

  const blocks = useMemo(() => {
    return sorted.map((e) => {
      const startMin = localMinutes(e.starts_at, timeZone);
      const endKey = localDateKey(e.ends_at, timeZone);
      let endMin = localMinutes(e.ends_at, timeZone);
      if (endKey > date) endMin = DAY_MINUTES;
      else if (endKey < date) endMin = startMin + 15;
      endMin = Math.max(endMin, startMin + 15);
      const span = Math.min(DAY_MINUTES - startMin, endMin - startMin);
      const topPct = (startMin / DAY_MINUTES) * 100;
      const heightPct = (span / DAY_MINUTES) * 100;
      return { e, topPct, heightPct };
    });
  }, [sorted, date, timeZone]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-5 lg:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="day-agenda-title"
    >
      <button type="button" className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" aria-label="Close" onClick={onClose} />
      <div
        className={`relative flex max-h-[min(94vh,920px)] w-full max-w-[min(96vw,56rem)] flex-col overflow-hidden rounded-t-2xl border border-zinc-200/90 bg-white shadow-2xl ring-1 ring-black/5 transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none dark:border-zinc-600 dark:bg-zinc-900 dark:ring-white/10 sm:rounded-2xl ${
          sheetEntered ? "translate-y-0 opacity-100 sm:scale-100" : "translate-y-5 opacity-0 sm:translate-y-0 sm:scale-[0.97]"
        }`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-700 sm:px-6">
          <div>
            <h2 id="day-agenda-title" className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-xl">
              {dayTitle}
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Times in {timeZone}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
            <section className="min-w-0 flex-1 lg:max-w-none">
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Day timeline</h3>
              <div className="max-h-[min(72vh,800px)] min-h-[280px] overflow-y-auto rounded-2xl border border-zinc-200/90 bg-zinc-50/80 dark:border-zinc-600 dark:bg-zinc-950/60">
                <div className="relative w-full" style={{ height: TIMELINE_DAY_HEIGHT_PX, minHeight: TIMELINE_DAY_HEIGHT_PX }}>
                  {Array.from({ length: 24 }, (_, h) => (
                    <div
                      key={h}
                      className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-zinc-200/70 text-[11px] tabular-nums text-zinc-400 dark:border-zinc-600/80 dark:text-zinc-500"
                      style={{ top: `${(h / 24) * 100}%` }}
                    >
                      <span className="absolute left-2 top-0 w-10 -translate-y-1/2 bg-zinc-50/95 py-0.5 pl-0.5 text-right text-[11px] dark:bg-zinc-950/95">
                        {hourTickLabel(h)}
                      </span>
                    </div>
                  ))}
                                   <div className="absolute inset-0 ml-[3.25rem] pr-1 sm:ml-14 sm:pr-2">
                    {blocks.map(({ e, topPct, heightPct }, idx) => {
                      const canEdit = resolveEventEditKind(e, mode) !== null;
                      const style = {
                        top: `${topPct}%`,
                        height: `${Math.max(heightPct, 1.1)}%`,
                        minHeight: 28,
                      } as const;
                      const cls = `absolute left-0 right-0 overflow-hidden rounded-lg border-l-[3px] px-3 py-1.5 text-left text-xs leading-snug shadow-sm ring-1 ring-black/5 dark:ring-white/10 ${sourceCls[e.source]} ${
                        canEdit
                          ? "cursor-pointer hover:brightness-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-500"
                          : ""
                      }`;
                      if (canEdit) {
                        return (
                          <button
                            key={`${e.id}-${idx}`}
                            type="button"
                            className={cls}
                            style={style}
                            title={`${e.title} — Edit`}
                            onClick={() => setEditing(e)}
                          >
                            <span className="line-clamp-3 font-medium">{e.title}</span>
                          </button>
                        );
                      }
                      return (
                        <div key={`${e.id}-${idx}`} className={cls} style={style} title={e.title}>
                          <span className="line-clamp-3 font-medium">{e.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section className="min-w-0 shrink-0 lg:w-[min(100%,22rem)] xl:w-80">
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">All events</h3>
              {sorted.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
                  Nothing scheduled this day.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {sorted.map((e, idx) => (
                    <li
                      key={`${e.id}-list-${idx}`}
                      className="flex flex-col gap-2 rounded-xl border border-zinc-200/90 bg-white px-3.5 py-2.5 text-sm shadow-sm dark:border-zinc-600 dark:bg-zinc-900/80"
                    >
                      <div className="flex gap-3">
                        <span
                          className={`mt-0.5 h-fit shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${sourceCls[e.source]}`}
                        >
                          {e.source.replace(/_/g, " ")}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium leading-snug text-zinc-900 dark:text-zinc-100">{e.title}</p>
                          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{formatRange(e.starts_at, e.ends_at, timeZone)}</p>
                        </div>
                      </div>
                      <TimelineEventActionButtons
                        event={e}
                        mode={mode}
                        onEdit={() => setEditing(e)}
                        actions={actions}
                        variant="zinc"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>

      <EventEditModal open={!!editing} event={editing} mode={mode} timeZone={timeZone} onClose={() => setEditing(null)} />
    </div>
  );
}
