"use client";

import { useState } from "react";
import type { Class } from "@/lib/types";

export function ClassForm({
  class: initial,
  onClose,
  onSaved,
}: {
  class?: Class;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [schedule, setSchedule] = useState(initial?.schedule ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const url = initial ? `/api/classes/${initial.id}` : "/api/classes";
    const method = initial ? "PUT" : "POST";
    const body = JSON.stringify({ name, schedule });
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? res.statusText);
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
        {initial ? "Edit class" : "New class"}
      </h3>
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <div className="mt-3 space-y-2">
        <div>
          <label htmlFor="class-name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Name</label>
          <input
            id="class-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div>
          <label htmlFor="class-schedule" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Schedule</label>
          <input
            id="class-schedule"
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            placeholder="e.g. Mon/Wed 10am"
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={loading} className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900">
          {loading ? "Saving…" : initial ? "Update" : "Add"}
        </button>
        <button type="button" onClick={onClose} className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600">
          Cancel
        </button>
      </div>
    </form>
  );
}
