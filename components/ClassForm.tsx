"use client";

import { useState } from "react";
import type { ClassMeeting, ClassSection } from "@/lib/types";
import { WEEKDAY_FULL } from "@/lib/datetimeDisplay";
import { TimePicker12h } from "@/components/TimePicker12h";

/** `-1` means day not chosen yet (placeholder). */
type MeetingFormRow = Omit<ClassMeeting, "day_of_week"> & { day_of_week: number };

export function ClassForm({
  item,
  onClose,
  onSaved,
}: {
  item?: ClassSection;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [classCode, setClassCode] = useState(item?.class_code ?? "");
  const [className, setClassName] = useState(item?.class_name ?? "");
  const [meetings, setMeetings] = useState<MeetingFormRow[]>(() =>
    item?.class_meetings?.length
      ? (item.class_meetings as MeetingFormRow[]).map((m) => ({
          ...m,
          start_time: m.start_time || "09:00:00",
          end_time: m.end_time || "10:00:00",
        }))
      : []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (meetings.length > 0) {
      const incomplete = meetings.some(
        (m) => m.day_of_week < 0 || !m.start_time || !m.end_time
      );
      if (incomplete) {
        setError("Please select a day, start time, and end time for each meeting slot.");
        setLoading(false);
        return;
      }
    }

    const url = item ? `/api/classes/${item.id}` : "/api/classes";
    const method = item ? "PUT" : "POST";

    const meetingsPayload: ClassMeeting[] = meetings.map((m) => ({
      day_of_week: m.day_of_week,
      start_time: m.start_time,
      end_time: m.end_time,
    }));

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        class_code: classCode,
        class_name: className,
        meetings: meetingsPayload,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save class");
      return;
    }
    onSaved();
  }

  function updateMeeting(i: number, patch: Partial<MeetingFormRow>) {
    setMeetings((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  }

  function addMeeting() {
    setMeetings((prev) => [...prev, { day_of_week: -1, start_time: "09:00:00", end_time: "10:00:00" }]);
  }

  function removeMeeting(i: number) {
    setMeetings((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
        {item ? "Edit class" : "New class"}
      </h3>

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Class code</label>
          <input
            value={classCode}
            onChange={(e) => setClassCode(e.target.value)}
            placeholder="e.g. CS 101"
            required
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Class name</label>
          <input
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="e.g. Intro to Programming"
            required
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
          />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Meeting times (15-minute steps)</p>
          <button
            type="button"
            onClick={addMeeting}
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            + Add slot
          </button>
        </div>

        {meetings.map((m, i) => (
          <div
            key={i}
            className="flex flex-wrap items-end gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-800/50"
          >
            <div className="min-w-[9.5rem] flex-1">
              <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Day</label>
              <select
                value={m.day_of_week < 0 ? "" : String(m.day_of_week)}
                onChange={(e) => {
                  const v = e.target.value;
                  updateMeeting(i, { day_of_week: v === "" ? -1 : Number(v) });
                }}
                required
                className="w-full rounded-md border border-zinc-300 px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              >
                <option value="" disabled>
                  Day
                </option>
                {WEEKDAY_FULL.map((d, idx) => (
                  <option key={d} value={idx}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[10rem] flex-1">
              <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Start</label>
              <TimePicker12h
                idPrefix={`class-${i}-s`}
                minuteStep={15}
                value={m.start_time || "09:00:00"}
                onChange={(v) => updateMeeting(i, { start_time: v })}
              />
            </div>
            <div className="min-w-[10rem] flex-1">
              <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">End</label>
              <TimePicker12h
                idPrefix={`class-${i}-e`}
                minuteStep={15}
                value={m.end_time || "10:00:00"}
                onChange={(v) => updateMeeting(i, { end_time: v })}
              />
            </div>
            <button
              type="button"
              onClick={() => removeMeeting(i)}
              className="shrink-0 rounded-md border border-zinc-300 px-3 py-2 text-sm text-red-600 dark:border-zinc-600 dark:text-red-400"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={loading} className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
          {loading ? "Saving..." : item ? "Update" : "Add class"}
        </button>
        <button type="button" onClick={onClose} className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600">
          Cancel
        </button>
      </div>
    </form>
  );
}
