"use client";

import { useState } from "react";

type Block = { start: string; end: string; type: string; label: string; details?: string };

export function DailyPlanView({
  date,
  initialPlan,
}: {
  date: string;
  initialPlan: { blocks?: Block[] } | null;
}) {
  const [plan, setPlan] = useState<{ blocks: Block[] } | null>(
    initialPlan?.blocks ? { blocks: initialPlan.blocks } : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate");
      setPlan(data.plan ?? { blocks: [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {date} — Generate a realistic daily plan with study blocks (based on due dates) and 1–2 habits (e.g. gym) around your schedule.
      </p>
      {!plan?.blocks?.length && (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? "Generating…" : "Generate today's plan"}
        </button>
      )}
      {plan?.blocks?.length ? (
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Your plan</span>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {loading ? "Regenerating…" : "Regenerate"}
          </button>
        </div>
      ) : null}
      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </p>
      )}
      {plan?.blocks?.length ? (
        <ul className="space-y-2 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          {plan.blocks.map((b, i) => (
            <li key={i} className="flex gap-4 text-sm">
              <span className="shrink-0 font-medium text-zinc-500 dark:text-zinc-400">
                {b.start}–{b.end}
              </span>
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${
                b.type === "habit" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" :
                b.type === "class" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" :
                b.type === "break" ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300" :
                "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
              }`}>
                {b.type}
              </span>
              <span className="text-zinc-800 dark:text-zinc-200">{b.label}</span>
              {b.details && <span className="text-zinc-500 dark:text-zinc-400">— {b.details}</span>}
            </li>
          ))}
        </ul>
      ) : plan && !plan.blocks?.length ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No blocks generated. Try again or add more classes/assignments/habits.</p>
      ) : null}
    </div>
  );
}
