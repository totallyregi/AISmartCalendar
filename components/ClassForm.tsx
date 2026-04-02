"use client";

import { useMemo, useState } from "react";
import type { ClassMeeting, ClassSection } from "@/lib/types";

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildTimeOptions() {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
    }
  }
  return out;
}

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
  const [meetings, setMeetings] = useState<ClassMeeting[]>(
    item?.class_meetings?.length
      ? item.class_meetings
      : []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timeOptions = useMemo(buildTimeOptions, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const url = item ? `/api/classes/${item.id}` : "/api/classes";
    const method = item ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        class_code: classCode,
        class_name: className,
        meetings,
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

  function updateMeeting(i: number, patch: Partial<ClassMeeting>) {
    setMeetings((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  }

  function addMeeting() {
    setMeetings((prev) => [...prev, { day_of_week: 1, start_time: "", end_time: "" }]);
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

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Meeting slots (15-min intervals)</p>
          <button type="button" onClick={addMeeting} className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400">
            + Add slot
          </button>
        </div>

        {meetings.map((m, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-4">
            <select
              value={m.day_of_week}
              onChange={(e) => updateMeeting(i, { day_of_week: Number(e.target.value) })}
              className="rounded border border-zinc-300 px-2 py-2 dark:border-zinc-600 dark:bg-zinc-800"
            >
              {dayNames.map((d, idx) => (
                <option key={d} value={idx}>{d}</option>
              ))}
            </select>
            <select
              value={m.start_time}
              onChange={(e) => updateMeeting(i, { start_time: e.target.value })}
              required
              className="rounded border border-zinc-300 px-2 py-2 dark:border-zinc-600 dark:bg-zinc-800"
            >
              <option value="" disabled>Start time</option>
              {timeOptions.map((t) => (<option key={t} value={t}>{t.slice(0,5)}</option>))}
            </select>
            <select
              value={m.end_time}
              onChange={(e) => updateMeeting(i, { end_time: e.target.value })}
              required
              className="rounded border border-zinc-300 px-2 py-2 dark:border-zinc-600 dark:bg-zinc-800"
            >
              <option value="" disabled>End time</option>
              {timeOptions.map((t) => (<option key={t} value={t}>{t.slice(0,5)}</option>))}
            </select>
            <button
              type="button"
              onClick={() => removeMeeting(i)}
              className="rounded border border-zinc-300 px-3 py-2 text-sm text-red-600 dark:border-zinc-600"
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
