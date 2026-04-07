"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TimePicker12h } from "@/components/TimePicker12h";
import { formatConflictApiMessage, validateHhmmssRange, validateOrderedInstants } from "@/lib/calendarOverlap";
import { zonedDateKey, zonedDateTimeToUtc, zonedHhMmSs } from "@/lib/timezone";

export type EventEditKind = "generated" | "personal" | "weekly_applied" | "external" | "class_override" | "fixed_habit";

type EditableEvent = {
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
  class_meeting_id?: string;
  class_id?: string;
  fromWeeklyPlan?: boolean;
};

export function resolveEventEditKind(e: EditableEvent, mode: "main" | "ai"): EventEditKind | null {
  if (mode === "ai" && e.source === "generated") return "generated";
  if (e.source === "personal") return "personal";
  if (e.fromWeeklyPlan) return "weekly_applied";
  if (e.source === "external") return "external";
  if (e.source === "class" && e.class_meeting_id && e.class_id) return "class_override";
  if (e.source === "fixed_habit" && !e.fromWeeklyPlan) return "fixed_habit";
  return null;
}

function minuteStepForKind(k: EventEditKind): 5 | 15 {
  return k === "fixed_habit" ? 15 : 5;
}

export function EventEditModal({
  open,
  onClose,
  event,
  mode,
  timeZone,
}: {
  open: boolean;
  onClose: () => void;
  event: EditableEvent | null;
  mode: "main" | "ai";
  timeZone: string;
}) {
  const [title, setTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [startTime, setStartTime] = useState("12:00:00");
  const [endTime, setEndTime] = useState("13:00:00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kind = event ? resolveEventEditKind(event, mode) : null;
  const step = kind ? minuteStepForKind(kind) : 5;

  useEffect(() => {
    if (!open || !event || !kind) return;
    setError(null);
    setTitle(event.title);
    const d0 = zonedDateKey(new Date(event.starts_at), timeZone);
    setEditDate(d0);
    setStartTime(zonedHhMmSs(event.starts_at, timeZone, step));
    setEndTime(zonedHhMmSs(event.ends_at, timeZone, step));
  }, [open, event, kind, timeZone, step]);

  async function handleSave() {
    if (!event || !kind) return;
    setLoading(true);
    setError(null);
    try {
      const starts_at = zonedDateTimeToUtc(editDate, startTime, timeZone).toISOString();
      const ends_at = zonedDateTimeToUtc(editDate, endTime, timeZone).toISOString();

      if (kind === "fixed_habit" || kind === "class_override") {
        const rangeErr = validateHhmmssRange(startTime, endTime);
        if (rangeErr) {
          setError(rangeErr);
          setLoading(false);
          return;
        }
      } else {
        const orderErr = validateOrderedInstants(starts_at, ends_at);
        if (orderErr) {
          setError(orderErr);
          setLoading(false);
          return;
        }
      }

      if (kind === "generated") {
        const res = await fetch(`/api/ai-draft-blocks/${event.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, starts_at, ends_at }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to update draft");
        }
      } else if (kind === "personal") {
        const res = await fetch(`/api/user-events/${event.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, starts_at, ends_at }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(formatConflictApiMessage(data));
        }
      } else if (kind === "weekly_applied") {
        const res = await fetch(`/api/weekly-plan-blocks/${event.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, starts_at, ends_at }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to update block");
        }
      } else if (kind === "external") {
        const res = await fetch(`/api/external-events/${event.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ summary: title, starts_at, ends_at }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to update event");
        }
      } else if (kind === "class_override") {
        const res = await fetch(`/api/classes/overrides`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            class_meeting_id: event.class_meeting_id,
            class_id: event.class_id,
            override_date: editDate,
            canceled: false,
            override_start_time: startTime,
            override_end_time: endTime,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to save override");
        }
      } else if (kind === "fixed_habit") {
        const res = await fetch(`/api/habit-fixed-slots/${event.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ start_time: startTime, end_time: endTime }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to update habit slot");
        }
      }

      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!open || !event || !kind) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-edit-title"
    >
      <button type="button" className="fixed inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <div className="relative z-[1] my-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <h2 id="event-edit-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Edit event
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Times use your scheduler timezone ({timeZone}).
          {kind === "fixed_habit" && " Day-of-week for this habit is managed in Habits."}
        </p>

        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {kind === "external" ? "Title (summary)" : "Title"}
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
            />
          </div>

          {kind !== "fixed_habit" && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Date</label>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
              />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Start</label>
              <div className="mt-1">
                <TimePicker12h idPrefix="ev-s" minuteStep={step} value={startTime} onChange={setStartTime} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">End</label>
              <div className="mt-1">
                <TimePicker12h idPrefix="ev-e" minuteStep={step} value={endTime} onChange={setEndTime} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleSave()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
