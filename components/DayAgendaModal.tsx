"use client";

import { useEffect, useMemo } from "react";

export type DayAgendaEvent = {
  id: string;
  starts_at: string;
  ends_at: string;
  title: string;
  source:
    | "external"
    | "class"
    | "fixed_habit"
    | "flexible_habit"
    | "assignment"
    | "generated"
    | "personal";
};

const DAY_MINUTES = 24 * 60;

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

export function DayAgendaModal({
  open,
  date,
  timeZone,
  events,
  onClose,
}: {
  open: boolean;
  date: string;
  timeZone: string;
  events: DayAgendaEvent[];
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const sorted = useMemo(
    () =>
      [...events].sort((a, b) => {
        const da = localMinutes(a.starts_at, timeZone) - localMinutes(b.starts_at, timeZone);
        if (da !== 0) return da;
        return a.starts_at.localeCompare(b.starts_at);
      }),
    [events, timeZone]
  );

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
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="day-agenda-title">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <div className="relative flex max-h-[min(92vh,860px)] w-full max-w-lg flex-col rounded-t-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900 sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <h2 id="day-agenda-title" className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {date}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">Times in {timeZone}</p>

          <div className="relative h-[min(360px,50vh)] w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950/50">
            {[
              { h: 0, label: "12 AM" },
              { h: 6, label: "6 AM" },
              { h: 12, label: "12 PM" },
              { h: 18, label: "6 PM" },
            ].map(({ h, label }) => (
              <div
                key={h}
                className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-zinc-200/80 text-[10px] text-zinc-400 dark:border-zinc-700 dark:text-zinc-500"
                style={{ top: `${(h / 24) * 100}%` }}
              >
                <span className="absolute left-1 top-0 -translate-y-1/2 bg-zinc-50 px-0.5 dark:bg-zinc-950">{label}</span>
              </div>
            ))}
            <div className="absolute inset-0 ml-12">
              {blocks.map(({ e, topPct, heightPct }, idx) => (
                <div
                  key={`${e.id}-${idx}`}
                  className={`absolute left-0 right-1 overflow-hidden rounded border-l-4 px-2 py-1 text-[11px] leading-tight shadow-sm ${sourceCls[e.source]}`}
                  style={{ top: `${topPct}%`, height: `${Math.max(heightPct, 1.2)}%`, minHeight: 22 }}
                  title={e.title}
                >
                  <span className="line-clamp-2 font-medium">{e.title}</span>
                </div>
              ))}
            </div>
          </div>

          <h3 className="mb-2 mt-5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">All events</h3>
          {sorted.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Nothing scheduled this day.</p>
          ) : (
            <ul className="space-y-2">
              {sorted.map((e, idx) => (
                <li key={`${e.id}-list-${idx}`} className="flex gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${sourceCls[e.source]}`}>
                    {e.source.replace(/_/g, " ")}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{e.title}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{formatRange(e.starts_at, e.ends_at, timeZone)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
