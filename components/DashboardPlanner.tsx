"use client";

import { useEffect, useState } from "react";
import type { SchedulerMode } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatWeekLabel(weekStart: string, weekEnd?: string) {
  const start = new Date(`${weekStart}T00:00:00`);
  const end = weekEnd ? new Date(`${weekEnd}T00:00:00`) : addDays(start, 6);
  const fmt = new Intl.DateTimeFormat("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return `${fmt.format(start)} to ${fmt.format(end)}`;
}

type PlannerStatus = {
  currentWeekStart: string;
  nextWeekToGenerate: string;
  hasDraftChain: boolean;
  generatedWeeks: { weekStart: string; weekEnd: string; draftCount: number }[];
  totalDraftBlocks: number;
};

export function DashboardPlanner({
  currentWeek,
  hasCurrentPlan,
}: {
  currentWeek: string;
  hasCurrentPlan: boolean;
}) {
  const router = useRouter();
  const [nextWeekStart, setNextWeekStart] = useState(currentWeek);
  const [mode, setMode] = useState<SchedulerMode>("relaxed");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<PlannerStatus | null>(null);
  const [preferencesConfigured, setPreferencesConfigured] = useState(false);

  async function loadDraft() {
    const res = await fetch(`/api/plans/weekly?weekStart=${nextWeekStart}`);
    const data = await res.json().catch(() => ({}));
    if (data.status) {
      setStatus(data.status as PlannerStatus);
      setNextWeekStart(String(data.status.nextWeekToGenerate ?? currentWeek));
    }
  }

  async function loadPreferenceState() {
    const res = await fetch("/api/preferences/scheduler");
    const data = await res.json().catch(() => ({}));
    setPreferencesConfigured(!!data.configured);
  }

  useEffect(() => {
    loadDraft();
    loadPreferenceState();
  }, [nextWeekStart]);

  async function generateWeek() {
    setLoading(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/plans/weekly/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weekStart: nextWeekStart,
        mode,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Generate failed");
      return;
    }
    const hours = Number(data.assignmentMinutes ?? 0) / 60;
    setMessage(`Generated ${data.blocks ?? 0} suggested blocks (${hours.toFixed(1)}h assignment time) for week ${data.weekStart} in ${data.mode ?? mode} mode`);
    await loadDraft();
    router.refresh();
  }

  async function resetSuggestions() {
    if (!confirm("Reset all AI suggestions and restart generation from this week?")) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/plans/weekly/reset", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Reset failed");
      return;
    }
    setMessage(`Reset suggestions for ${data.resetWeeks ?? 0} week(s). You can now regenerate from this week.`);
    await loadDraft();
    router.refresh();
  }

  async function applyToCalendar() {
    setLoading(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/plans/weekly/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Apply failed");
      return;
    }
    setMessage(`Applied ${data.applied ?? 0} AI events to your main Calendar`);
    await loadDraft();
    router.refresh();
  }

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">Suggestion Controls</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Generate in AI Calendar first, then apply to your main Calendar when ready.
        </p>
      </div>

      <section className="space-y-2 rounded-lg border border-zinc-200/80 p-3 dark:border-zinc-700/80">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Generate suggestions</p>
        <div className="space-y-2">
          <div className="rounded border border-zinc-200 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Next week to generate</p>
            <p className="mt-1 font-medium">{formatWeekLabel(nextWeekStart)}</p>
          </div>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="mt-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Mode</label>
            <select value={mode} onChange={(e) => setMode(e.target.value as SchedulerMode)} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800">
              <option value="intense">Intense (finish faster)</option>
              <option value="relaxed">Relaxed (target preferred hours)</option>
              <option value="lazy">Lazy (minimum daily effort)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="button" onClick={generateWeek} disabled={loading || !preferencesConfigured} className="w-full rounded bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-50 hover:bg-emerald-700">
              Generate suggested schedule
            </button>
          </div>
        </div>
        {!preferencesConfigured && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Configure <Link href="/preferences" className="underline">Preferences</Link> (including at least one work window) before generating.
          </p>
        )}
        <div className="flex items-center justify-between gap-2 rounded border border-zinc-200/80 p-2 dark:border-zinc-700/80">
          <div className="text-xs text-zinc-500">
            {status?.generatedWeeks?.length ? "Regenerating requires reset." : "No generated chain yet."}
          </div>
          <button
            type="button"
            onClick={resetSuggestions}
            disabled={loading || !(status?.hasDraftChain)}
            className="rounded border border-red-300 px-3 py-1 text-xs text-red-600 disabled:opacity-50 dark:border-red-700"
          >
            Reset suggestions
          </button>
        </div>
      </section>

      <section className="space-y-2 rounded-lg border border-zinc-200/80 p-3 dark:border-zinc-700/80">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Generation tracker</p>
        {status?.generatedWeeks?.length ? (
          <ul className="space-y-1 text-sm">
            {status.generatedWeeks.map((w) => (
              <li key={w.weekStart} className="flex items-center justify-between rounded border border-zinc-200 px-2 py-1 dark:border-zinc-700">
                <span>{formatWeekLabel(w.weekStart, w.weekEnd)}</span>
                <span className="text-xs text-zinc-500">{w.draftCount} draft block(s)</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-zinc-500">No generated weeks yet.</p>
        )}
        <p className="text-xs text-zinc-500">
          Current week: {formatWeekLabel(status?.currentWeekStart ?? currentWeek)}. Next step: generate {formatWeekLabel(nextWeekStart)}.
        </p>
      </section>

      <section className="space-y-2 rounded-lg border border-zinc-200/80 p-3 dark:border-zinc-700/80">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Apply</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={applyToCalendar} disabled={loading || !(status?.totalDraftBlocks)} className="rounded bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900">
            Apply AI schedule to Calendar
          </button>
          <span className="text-xs text-zinc-500">Draft events: {status?.totalDraftBlocks ?? 0}</span>
        </div>
      </section>

      {!hasCurrentPlan && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          You must generate the current week first before future weeks.
        </p>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {message && <p className="text-sm text-emerald-700 dark:text-emerald-400">{message}</p>}
    </div>
  );
}
