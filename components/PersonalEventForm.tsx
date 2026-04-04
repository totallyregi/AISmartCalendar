"use client";

import { useState } from "react";
import { TimePicker12h } from "@/components/TimePicker12h";
import { localDateTimeToIsoUtc } from "@/lib/time12h";

export function PersonalEventForm({ defaultDate }: { defaultDate: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("12:00:00");
  const [endTime, setEndTime] = useState("13:00:00");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/user-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        starts_at: localDateTimeToIsoUtc(date, startTime),
        ends_at: localDateTimeToIsoUtc(date, endTime),
      }),
    });
    setLoading(false);
    window.location.reload();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setDate(defaultDate);
          setStartTime("12:00:00");
          setEndTime("13:00:00");
          setOpen(true);
        }}
        className="rounded bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Add personal event
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            required
            className="w-full rounded border border-zinc-300 px-2 py-2 dark:border-zinc-600 dark:bg-zinc-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full rounded border border-zinc-300 px-2 py-2 dark:border-zinc-600 dark:bg-zinc-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Start</label>
          <TimePicker12h idPrefix="pe-s" minuteStep={5} value={startTime} onChange={setStartTime} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">End</label>
          <TimePicker12h idPrefix="pe-e" minuteStep={5} value={endTime} onChange={setEndTime} />
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <button
          disabled={loading}
          className="rounded bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          {loading ? "Adding..." : "Add"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
