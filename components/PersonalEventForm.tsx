"use client";

import { useState } from "react";

export function PersonalEventForm({ defaultDate }: { defaultDate: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState(`${defaultDate}T12:00`);
  const [end, setEnd] = useState(`${defaultDate}T13:00`);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/user-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, starts_at: new Date(start).toISOString(), ends_at: new Date(end).toISOString() }),
    });
    setLoading(false);
    window.location.reload();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setStart(`${defaultDate}T12:00`);
          setEnd(`${defaultDate}T13:00`);
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
      <div className="grid gap-2 sm:grid-cols-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" required className="rounded border border-zinc-300 px-2 py-2 dark:border-zinc-600 dark:bg-zinc-800" />
        <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required className="rounded border border-zinc-300 px-2 py-2 dark:border-zinc-600 dark:bg-zinc-800" />
        <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required className="rounded border border-zinc-300 px-2 py-2 dark:border-zinc-600 dark:bg-zinc-800" />
      </div>
      <div className="mt-2 flex gap-2">
        <button disabled={loading} className="rounded bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">{loading ? "Adding..." : "Add"}</button>
        <button type="button" onClick={() => setOpen(false)} className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600">Cancel</button>
      </div>
    </form>
  );
}
