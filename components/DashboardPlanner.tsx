"use client";

import { useEffect, useMemo, useState } from "react";
import type { SchedulerMode } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";

function sundayStart(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatWeekLabel(weekStart: string) {
  const start = new Date(`${weekStart}T00:00:00`);
  const end = addDays(start, 6);
  const fmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return `${weekStart} (${fmt.format(start)} to ${fmt.format(end)})`;
}

type Block = { id: string; title: string; starts_at: string; ends_at: string; block_type: string };

export function DashboardPlanner({
  currentWeek,
  hasCurrentPlan,
}: {
  currentWeek: string;
  hasCurrentPlan: boolean;
}) {
  const router = useRouter();
  const [weekStart, setWeekStart] = useState(currentWeek);
  const [mode, setMode] = useState<SchedulerMode>("relaxed");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftBlocks, setDraftBlocks] = useState<Block[]>([]);
  const [preferencesConfigured, setPreferencesConfigured] = useState(false);

  const weekOptions = useMemo(() => {
    const out: string[] = [];
    const base = sundayStart(new Date());
    for (let i = 0; i < 8; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + i * 7);
      out.push(isoDate(d));
    }
    return out;
  }, []);

  useEffect(() => {
    if (!weekOptions.includes(weekStart)) {
      setWeekStart(weekOptions[0]);
    }
  }, [weekOptions, weekStart]);

  async function loadDraft() {
    const res = await fetch(`/api/plans/weekly?weekStart=${weekStart}`);
    const data = await res.json().catch(() => ({}));
    setDraftBlocks(Array.isArray(data.draftBlocks) ? data.draftBlocks : []);
  }

  async function loadPreferenceState() {
    const res = await fetch("/api/preferences/scheduler");
    const data = await res.json().catch(() => ({}));
    setPreferencesConfigured(!!data.configured);
  }

  useEffect(() => {
    loadDraft();
    loadPreferenceState();
  }, [weekStart]);

  async function generateWeek() {
    setLoading(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/plans/weekly/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weekStart,
        mode,
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
        nowIso: new Date().toISOString(),
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

  async function applyToCalendar() {
    setLoading(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/plans/weekly/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekStart }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Apply failed");
      return;
    }
    setMessage(`Applied ${data.applied ?? 0} AI events to your main Calendar`);
    await loadDraft();
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
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Week start (Sunday)</label>
            <select value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800">
              {weekOptions.map((w) => <option key={w} value={w}>{formatWeekLabel(w)}</option>)}
            </select>
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
      </section>

      <section className="space-y-2 rounded-lg border border-zinc-200/80 p-3 dark:border-zinc-700/80">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Apply</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={applyToCalendar} disabled={loading || draftBlocks.length === 0} className="rounded bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900">
            Apply AI schedule to Calendar
          </button>
          <span className="text-xs text-zinc-500">Draft events: {draftBlocks.length}</span>
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
