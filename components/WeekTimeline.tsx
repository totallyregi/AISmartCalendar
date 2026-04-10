"use client";

import { useState } from "react";
import { EventEditModal } from "@/components/EventEditModal";
import type { CalendarTimelineEvent } from "@/lib/calendarTimelineEvent";
import { useCalendarTimelineActions } from "@/hooks/useCalendarTimelineActions";
import { TimelineEventActionButtons } from "@/components/TimelineEventActionButtons";

const sourceCls: Record<CalendarTimelineEvent["source"], string> = {
  external: "bg-indigo-100 text-indigo-800",
  class: "bg-violet-100 text-violet-700",
  fixed_habit: "bg-green-100 text-green-800",
  flexible_habit: "bg-fuchsia-100 text-fuchsia-800",
  assignment: "bg-orange-100 text-orange-800",
  generated: "bg-cyan-100 text-cyan-900",
  personal: "bg-rose-100 text-rose-700",
};

export function WeekTimeline({
  date,
  events,
  mode,
  timeZone = "UTC",
}: {
  date: string;
  events: CalendarTimelineEvent[];
  mode: "main" | "ai";
  timeZone?: string;
}) {
  const [editing, setEditing] = useState<CalendarTimelineEvent | null>(null);
  const actions = useCalendarTimelineActions(date);

  function localMinutesOfDay(iso: string) {
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

  const sortedEvents = [...events].sort((a, b) => {
    const byLocalTime = localMinutesOfDay(a.starts_at) - localMinutesOfDay(b.starts_at);
    if (byLocalTime !== 0) return byLocalTime;
    return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
  });

  return (
    <div className="ds-card p-4">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-medium text-palette-navy">{date} details</h3>
        <span className="text-xs text-palette-slate">
          {events.length} item{events.length === 1 ? "" : "s"}
        </span>
      </div>
      {sortedEvents.length === 0 ? (
        <p className="mt-2 text-sm text-palette-slate">No events for this day.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {sortedEvents.map((e, idx) => (
            <li key={`${e.id}-${idx}`} className="space-y-1 rounded border-[0.5px] border-palette-card-border bg-palette-card-bg p-2">
              <div className="flex items-center gap-2 text-sm">
                <span className={`rounded px-1.5 py-0.5 text-xs capitalize font-medium ${sourceCls[e.source]}`}>{e.source.replace(/_/g, " ")}</span>
                <span className="text-palette-navy">
                  {new Date(e.starts_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone })}
                  {" – "}
                  {new Date(e.ends_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone })}
                  {" · "}
                  {e.title}
                </span>
              </div>

              <TimelineEventActionButtons event={e} mode={mode} onEdit={() => setEditing(e)} actions={actions} variant="palette" />
            </li>
          ))}
        </ul>
      )}

      <EventEditModal open={!!editing} event={editing} mode={mode} timeZone={timeZone} onClose={() => setEditing(null)} />
    </div>
  );
}
