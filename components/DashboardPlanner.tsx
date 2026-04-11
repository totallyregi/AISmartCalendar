"use client";

import { useCallback, useEffect, useState } from "react";
import { useConfirm } from "@/components/ConfirmDialogProvider";
import type { SchedulerMode } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

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

/**
 * Formats `assignmentMinutes` from the generate API (integer sum of assignment block lengths).
 * Uses integer division only — never via decimal hours (which misreads, e.g. 105 min → “1.8h” → 108 min).
 */
function formatAssignmentDuration(totalMinutes: number): string {
  const raw = Number(totalMinutes);
  const n = Number.isFinite(raw) ? Math.max(0, Math.trunc(raw)) : 0;
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

type PlannerStatus = {
  currentWeekStart: string;
  nextWeekToGenerate: string;
  allowedGenerateWeeks: string[];
  hasDraftChain: boolean;
  generatedWeeks: {
    weekStart: string;
    weekEnd: string;
    draftCount: number;
    appliedCalendarBlockCount?: number;
    appliedOnly?: boolean;
  }[];
  totalDraftBlocks: number;
};

type GenerateSummary = {
  weekStart: string;
  mode: string;
  blocks: number;
  assignmentMinutes: number;
  perDay?: Record<string, number>;
  unscheduled: unknown[];
  warning?: string;
};

export function DashboardPlanner({
  currentWeek,
  hasCurrentPlan,
}: {
  currentWeek: string;
  hasCurrentPlan: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [generateTargetWeek, setGenerateTargetWeek] = useState(currentWeek);
  const [mode, setMode] = useState<SchedulerMode>("relaxed");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [scheduleWarning, setScheduleWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<PlannerStatus | null>(null);
  const [preferencesConfigured, setPreferencesConfigured] = useState(false);
  const [insights, setInsights] = useState<string[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsFetchError, setInsightsFetchError] = useState<string | null>(null);

  const loadPreferenceState = useCallback(async () => {
    const res = await fetch("/api/preferences/scheduler");
    const data = await res.json().catch(() => ({}));
    setPreferencesConfigured(!!data.configured);
  }, []);

  const syncGenerateTargetFromServer = useCallback(async () => {
    const res = await fetch(`/api/plans/weekly?weekStart=${encodeURIComponent(currentWeek)}`);
    const data = await res.json().catch(() => ({}));
    if (data.status) {
      const s = data.status as PlannerStatus;
      setStatus(s);
      setGenerateTargetWeek(String(s.nextWeekToGenerate ?? currentWeek));
    }
  }, [currentWeek]);

  useEffect(() => {
    void loadPreferenceState();
  }, [loadPreferenceState]);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      const res = await fetch(`/api/plans/weekly?weekStart=${encodeURIComponent(generateTargetWeek)}`, {
        signal: ac.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (ac.signal.aborted || !data.status) return;
      setStatus(data.status as PlannerStatus);
    })().catch(() => {});
    return () => ac.abort();
  }, [generateTargetWeek]);

  useEffect(() => {
    if (!status?.allowedGenerateWeeks?.length) return;
    if (!status.allowedGenerateWeeks.includes(generateTargetWeek)) {
      setGenerateTargetWeek(status.nextWeekToGenerate);
    }
  }, [status, generateTargetWeek]);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      const res = await fetch(`/api/plans/weekly?weekStart=${encodeURIComponent(currentWeek)}`, {
        signal: ac.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (ac.signal.aborted || !data.status) return;
      const s = data.status as PlannerStatus;
      setStatus(s);
      setGenerateTargetWeek(String(s.nextWeekToGenerate ?? currentWeek));
    })().catch(() => {});
    return () => ac.abort();
  }, [currentWeek]);

  async function fetchInsights(summary: GenerateSummary) {
    setInsightsLoading(true);
    setInsights([]);
    setInsightsFetchError(null);
    try {
      const res = await fetch("/api/calendar/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setInsightsFetchError(typeof data.error === "string" ? data.error : "Could not load insights.");
        setInsights([]);
        return;
      }
      const list = Array.isArray(data.insights) ? data.insights.filter((x: unknown) => typeof x === "string") : [];
      setInsights(list as string[]);
    } catch {
      setInsightsFetchError("Could not load insights.");
      setInsights([]);
    } finally {
      setInsightsLoading(false);
    }
  }

  async function generateWeek() {
    setLoading(true);
    setError(null);
    setMessage(null);
    setScheduleWarning(null);
    setInsights([]);
    setInsightsFetchError(null);
    const res = await fetch("/api/plans/weekly/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weekStart: generateTargetWeek,
        mode,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      const err = data.error ?? "Generate failed";
      setError(err);
      showToast(err, "error");
      return;
    }
    const assignmentTimeLabel = formatAssignmentDuration(Number(data.assignmentMinutes ?? 0));
    showToast(`Generated ${data.blocks ?? 0} suggested blocks for this week`, "success");
    setMessage(
      `Generated ${data.blocks ?? 0} suggested blocks (${assignmentTimeLabel} assignment time) for week ${data.weekStart} in ${data.mode ?? mode} mode`
    );
    const unsched = Array.isArray(data.unscheduled) ? data.unscheduled : [];
    if (unsched.length > 0) {
      const detail = unsched
        .map((u: { name: string; remainingMinutes: number }) => `${u.name} (${u.remainingMinutes} min not scheduled)`)
        .join("; ");
      setScheduleWarning(`${data.warning ?? "Some assignment time could not fit before due dates."} ${detail}`);
    } else {
      setScheduleWarning(null);
    }
    const summary: GenerateSummary = {
      weekStart: String(data.weekStart ?? ""),
      mode: String(data.mode ?? mode),
      blocks: Number(data.blocks ?? 0),
      assignmentMinutes: Number(data.assignmentMinutes ?? 0),
      perDay: typeof data.perDay === "object" && data.perDay !== null ? (data.perDay as Record<string, number>) : undefined,
      unscheduled: unsched,
      warning: typeof data.warning === "string" ? data.warning : undefined,
    };
    await syncGenerateTargetFromServer();
    router.refresh();
    void fetchInsights(summary);
  }

  async function resetSuggestions() {
    const ok = await confirm({
      title: "Reset AI draft suggestions?",
      message:
        "Remove all pending (unapplied) AI draft blocks? Weeks you already applied to your main calendar are not undone; generation progress for those weeks stays in place.",
      confirmLabel: "Reset",
      tone: "danger",
    });
    if (!ok) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    setInsights([]);
    setInsightsFetchError(null);
    const res = await fetch("/api/plans/weekly/reset", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      const err = data.error ?? "Reset failed";
      setError(err);
      showToast(err, "error");
      return;
    }
    showToast("AI draft suggestions reset", "success");
    setMessage(
      `Removed unapplied drafts for ${data.resetWeeks ?? 0} week(s). Your applied weeks still count toward what to generate next.`
    );
    await syncGenerateTargetFromServer();
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
      const err = data.error ?? "Apply failed";
      setError(err);
      showToast(err, "error");
      return;
    }
    showToast(`Applied ${data.applied ?? 0} events to your main calendar`, "success");
    setMessage(`Applied ${data.applied ?? 0} AI events to your main Calendar`);
    setInsights([]);
    setInsightsFetchError(null);
    setInsightsLoading(false);
    await syncGenerateTargetFromServer();
    router.refresh();
  }

  const card = "rounded-xl border border-palette-card-border bg-palette-card-bg/95 shadow-sm";
  const inner = "space-y-2 rounded-lg border border-palette-card-border bg-palette-muted-panel/60 p-3";

  return (
    <div className={`space-y-4 ${card} p-5`}>
      <div>
        <h2 className="text-lg font-semibold text-palette-navy">Suggestion Controls</h2>
        <p className="mt-1 text-xs text-palette-slate">Generate in AI Calendar first, then apply to your main Calendar when ready.</p>
        <details className="mt-2 rounded-lg border border-palette-card-border bg-palette-muted-panel/40 px-3 py-2 text-palette-navy">
          <summary className="cursor-pointer text-xs font-medium text-palette-slate marker:text-palette-slate">
            How this works
          </summary>
          <p className="mt-2 text-xs leading-relaxed text-palette-slate">
            Pick a week and mode, generate draft blocks, review them on this AI Calendar, then apply when you want them copied to your main Calendar.
            <Link href="/help#calendar-vs-ai" className="ml-1 font-medium text-palette-navy underline-offset-2 hover:underline">
              More in Help
            </Link>
          </p>
        </details>
      </div>

      <section className={inner}>
        <p className="text-xs font-medium uppercase tracking-wide text-palette-slate/80">Generate suggestions</p>
        <div className="space-y-2">
          <label className="block rounded-lg border border-palette-card-border bg-palette-card-bg px-3 py-2 text-sm text-palette-slate">
            <span className="text-xs uppercase tracking-wide text-palette-slate/70">Week to generate</span>
            <select
              value={generateTargetWeek}
              onChange={(e) => setGenerateTargetWeek(e.target.value)}
              disabled={!status?.allowedGenerateWeeks?.length}
              className="mt-1 w-full rounded-lg border border-palette-card-border bg-palette-card-bg px-2 py-1.5 font-medium text-palette-navy disabled:opacity-50"
            >
              {(status?.allowedGenerateWeeks ?? [generateTargetWeek]).map((w) => (
                <option key={w} value={w}>
                  {formatWeekLabel(w)}
                </option>
              ))}
            </select>
          </label>
          {status && generateTargetWeek !== status.nextWeekToGenerate && (
            <p className="text-xs text-palette-slate">
              Suggested next: {formatWeekLabel(status.nextWeekToGenerate)}. You are regenerating a different allowed week.
            </p>
          )}
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="mt-2 block text-sm font-medium text-palette-navy">Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as SchedulerMode)}
              className="mt-1 w-full rounded-lg border border-palette-card-border bg-palette-card-bg px-3 py-2 text-palette-slate"
            >
              <option value="intense">Intense (finish faster)</option>
              <option value="relaxed">Relaxed (target preferred hours)</option>
              <option value="lazy">Lazy (minimum daily effort)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void generateWeek()}
              disabled={loading || !preferencesConfigured}
              className="w-full rounded-lg bg-palette-sky px-3 py-2 text-sm font-medium text-palette-ink shadow-sm transition-colors hover:brightness-95 disabled:opacity-50"
            >
              Generate suggested schedule
            </button>
          </div>
        </div>
        <p className="text-xs text-palette-slate">Assignment and flexible-habit suggestions are placed Monday–Saturday only (Sundays excluded).</p>
        {!preferencesConfigured && (
          <p className="text-xs text-amber-800/90 dark:text-amber-200/90">
            Configure{" "}
            <Link href="/preferences" className="font-medium text-palette-sky underline hover:text-palette-navy">
              Preferences
            </Link>{" "}
            (including at least one work window) before generating.
          </p>
        )}
        <div className="flex items-center justify-between gap-2 rounded-lg border border-palette-card-border bg-palette-muted-panel/50 p-2">
          <div className="text-xs text-palette-slate">
            {(status?.totalDraftBlocks ?? 0) > 0
              ? "Clears pending (unapplied) AI draft blocks only. Does not remove events already applied to your main calendar or reset progress for weeks you finished applying."
              : "No unapplied AI draft suggestions in the database."}
          </div>
          <button
            type="button"
            onClick={() => void resetSuggestions()}
            disabled={loading || (status?.totalDraftBlocks ?? 0) === 0}
            className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            Reset suggestions
          </button>
        </div>
      </section>

      {(message || insightsLoading || insights.length > 0 || insightsFetchError) && (
        <div
          className="rounded-xl border border-palette-green/35 bg-palette-green/10 p-4"
          aria-busy={insightsLoading}
          aria-live="polite"
        >
          {message && <p className="text-sm font-medium text-palette-navy">{message}</p>}
          {(insightsLoading || insights.length > 0 || insightsFetchError) && (
            <div className={message ? "mt-4 border-t border-palette-green/30 pt-4" : ""}>
              <p className="text-xs font-semibold uppercase tracking-wide text-palette-navy">Insights</p>
              <p className="mt-0.5 text-xs text-palette-slate">
                Suggestions based on this generation — the calendar was not changed by this summary.
              </p>
              {insightsLoading ? (
                <p className="mt-3 text-sm text-palette-slate">Generating insights…</p>
              ) : insightsFetchError ? (
                <p className="mt-3 text-sm text-red-600">{insightsFetchError}</p>
              ) : (
                <ul className="mt-3 list-inside list-disc space-y-2 text-sm leading-relaxed text-palette-slate marker:text-palette-green">
                  {insights.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      <section className={inner}>
        <p className="text-xs font-medium uppercase tracking-wide text-palette-slate/80">Generation tracker</p>
        {status?.generatedWeeks?.length ? (
          <ul className="space-y-1 text-sm text-palette-slate">
            {status.generatedWeeks.map((w) => (
              <li key={w.weekStart} className="flex items-center justify-between rounded-lg border border-palette-card-border bg-palette-card-bg px-2 py-1">
                <span>{formatWeekLabel(w.weekStart, w.weekEnd)}</span>
                <span className="text-xs text-palette-slate/80">
                  {(() => {
                    const pending = w.draftCount;
                    const onCalendar = w.appliedCalendarBlockCount ?? 0;
                    if (pending > 0 && onCalendar > 0) {
                      return `${pending} draft(s) pending · ${onCalendar} on calendar`;
                    }
                    if (pending > 0) return `${pending} draft block(s) pending`;
                    if (onCalendar > 0) return `${onCalendar} block(s) on calendar (applied)`;
                    return "No drafts · nothing applied from AI this week";
                  })()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-palette-slate">No generated weeks yet.</p>
        )}
        <p className="text-xs text-palette-slate">
          Current week: {formatWeekLabel(status?.currentWeekStart ?? currentWeek)}. Suggested next step: generate{" "}
          {formatWeekLabel(status?.nextWeekToGenerate ?? currentWeek)}.
        </p>
      </section>

      <section className={inner}>
        <p className="text-xs font-medium uppercase tracking-wide text-palette-slate/80">Apply</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void applyToCalendar()}
            disabled={loading || !status?.totalDraftBlocks}
            className="rounded-lg bg-palette-navy px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:brightness-110 disabled:opacity-50"
          >
            Apply AI schedule to Calendar
          </button>
          <span className="text-xs text-palette-slate">Draft events: {status?.totalDraftBlocks ?? 0}</span>
        </div>
      </section>

      {!hasCurrentPlan && (
        <p className="text-sm text-amber-800/90">You must generate the current week first before future weeks.</p>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
      {scheduleWarning && (
        <p className="rounded-xl border border-amber-200/80 bg-amber-50/90 p-3 text-sm text-amber-950">{scheduleWarning}</p>
      )}
    </div>
  );
}
