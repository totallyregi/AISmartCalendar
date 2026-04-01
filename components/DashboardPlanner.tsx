"use client";

import { useEffect, useMemo, useState } from "react";

function sundayStart(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

type Block = { id: string; title: string; starts_at: string; ends_at: string; block_type: string };

export function DashboardPlanner({
  currentWeek,
  hasCurrentPlan,
}: {
  currentWeek: string;
  hasCurrentPlan: boolean;
}) {
  const [weekStart, setWeekStart] = useState(currentWeek);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [draftBlocks, setDraftBlocks] = useState<Block[]>([]);

  const weekOptions = useMemo(() => {
    const out: string[] = [];
    const base = sundayStart(new Date(currentWeek));
    for (let i = 0; i < 8; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + i * 7);
      out.push(isoDate(d));
    }
    return out;
  }, [currentWeek]);

  async function refreshGoogleStatus() {
    const res = await fetch("/api/integrations/google/status");
    const data = await res.json().catch(() => ({}));
    setGoogleConnected(!!data.connected);
    setGoogleEmail(data.accountEmail ?? null);
  }

  async function loadDraft() {
    const res = await fetch(`/api/plans/weekly?weekStart=${weekStart}`);
    const data = await res.json().catch(() => ({}));
    setDraftBlocks(Array.isArray(data.draftBlocks) ? data.draftBlocks : []);
  }

  useEffect(() => {
    refreshGoogleStatus();
  }, []);

  useEffect(() => {
    loadDraft();
  }, [weekStart]);

  function connectGoogle() {
    window.location.href = "/api/integrations/google/connect";
  }

  async function disconnectGoogle() {
    setLoading(true);
    await fetch("/api/integrations/google/disconnect", { method: "POST" });
    await refreshGoogleStatus();
    setLoading(false);
    setMessage("Google calendar disconnected");
  }

  async function syncGoogle() {
    setLoading(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/integrations/google/sync", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Sync failed");
      return;
    }
    setMessage(`Google sync complete (${data.imported ?? 0} events)`);
  }

  async function generateWeek() {
    setLoading(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/plans/weekly/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekStart }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Generate failed");
      return;
    }
    const hours = Number(data.assignmentMinutes ?? 0) / 60;
    setMessage(`Generated ${data.blocks ?? 0} suggested blocks (${hours.toFixed(1)}h assignment time) for week ${data.weekStart}`);
    await loadDraft();
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
    <div className="space-y-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">AI Calendar controls</h2>

      <section className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Connection</p>
        <div className="flex flex-wrap items-center gap-2">
          {!googleConnected ? (
            <button type="button" onClick={connectGoogle} className="rounded bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
              Connect Google Calendar
            </button>
          ) : (
            <button type="button" disabled className="cursor-default rounded bg-emerald-600 px-3 py-2 text-sm text-white">
              Google Calendar Connected
            </button>
          )}
          <button type="button" onClick={syncGoogle} disabled={loading || !googleConnected} className="rounded border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-600">
            Sync now
          </button>
          {googleConnected && (
            <button type="button" onClick={disconnectGoogle} disabled={loading} className="rounded border border-red-300 px-3 py-2 text-sm text-red-600 dark:border-red-700 dark:text-red-400">
              Disconnect
            </button>
          )}
          {googleEmail && <span className="text-xs text-zinc-500">{googleEmail}</span>}
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Generate suggestions</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Week start (Sunday)</label>
            <select value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800">
              {weekOptions.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button type="button" onClick={generateWeek} disabled={loading} className="w-full rounded bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-50 hover:bg-emerald-700">
              Generate suggested schedule
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-2">
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
