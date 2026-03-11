"use client";

import { useState } from "react";

export function CheckInForm({
  date,
  initialResponses,
}: {
  date: string;
  initialResponses: Record<string, string>;
}) {
  const [howItWent, setHowItWent] = useState(initialResponses.how_it_went ?? "");
  const [blockers, setBlockers] = useState(initialResponses.blockers ?? "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    const res = await fetch("/api/check-ins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        responses: { how_it_went: howItWent, blockers },
      }),
    });
    setLoading(false);
    if (res.ok) setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="space-y-4">
        <div>
          <label htmlFor="how" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            How did today go?
          </label>
          <textarea
            id="how"
            value={howItWent}
            onChange={(e) => setHowItWent(e.target.value)}
            rows={3}
            placeholder="e.g. Got through two study blocks, skipped gym."
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div>
          <label htmlFor="blockers" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            What blocked you? (optional)
          </label>
          <textarea
            id="blockers"
            value={blockers}
            onChange={(e) => setBlockers(e.target.value)}
            rows={2}
            placeholder="e.g. Meeting ran long, felt tired."
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? "Saving…" : "Save check-in"}
        </button>
        {saved && <span className="text-sm text-green-600 dark:text-green-400">Saved.</span>}
      </div>
    </form>
  );
}
