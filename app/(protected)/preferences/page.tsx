"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_USER_TIMEZONE, WEEKDAY_FULL, formatTimeHhmmssTo12h } from "@/lib/datetimeDisplay";
import { AppearanceTheme } from "@/components/AppearanceTheme";
import { TimePicker12h } from "@/components/TimePicker12h";
import { useToast } from "@/components/ToastProvider";
import { createClient } from "@/lib/supabase/client";

type Preference = {
  min_daily_minutes: number;
  preferred_daily_minutes: number;
  max_daily_minutes: number;
  max_consecutive_minutes: number;
  break_minutes: number;
  default_apply_days: number[];
  timezone: string;
};

type WindowRow = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_override: boolean;
};

const TIMEZONES = [
  { value: "UTC", label: "UTC+00:00 (UTC, London winter)" },
  { value: "America/Los_Angeles", label: "UTC-08:00 (Los Angeles, Vancouver)" },
  { value: "America/Denver", label: "UTC-07:00 (Denver, Phoenix*)" },
  { value: "America/Chicago", label: "US Central — New Orleans, Chicago (DST-aware)" },
  { value: "America/New_York", label: "UTC-05:00 (New York, Toronto)" },
  { value: "America/Toronto", label: "UTC-05:00 (Toronto)" },
  { value: "Europe/London", label: "UTC+00:00 (London)" },
  { value: "Europe/Paris", label: "UTC+01:00 (Paris)" },
  { value: "Europe/Berlin", label: "UTC+01:00 (Berlin)" },
  { value: "Asia/Bangkok", label: "UTC+07:00 (Bangkok, Jakarta)" },
  { value: "Asia/Shanghai", label: "UTC+08:00 (Beijing, Shanghai)" },
  { value: "Asia/Singapore", label: "UTC+08:00 (Singapore, Kuala Lumpur)" },
  { value: "Asia/Kuala_Lumpur", label: "UTC+08:00 (Kuala Lumpur)" },
  { value: "Asia/Seoul", label: "UTC+09:00 (Seoul)" },
  { value: "Asia/Tokyo", label: "UTC+09:00 (Tokyo)" },
  { value: "Australia/Sydney", label: "UTC+10:00 (Sydney)" },
  { value: "Asia/Kolkata", label: "UTC+05:30 (India - Kolkata)" },
];

const defaultPref: Preference = {
  min_daily_minutes: 120,
  preferred_daily_minutes: 180,
  max_daily_minutes: 300,
  max_consecutive_minutes: 120,
  break_minutes: 30,
  default_apply_days: [1, 2, 3, 4, 5],
  timezone: DEFAULT_USER_TIMEZONE,
};

export default function PreferencesPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [pref, setPref] = useState<Preference>(defaultPref);
  const [windows, setWindows] = useState<WindowRow[]>([]);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [windowBusy, setWindowBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [highlightWindowId, setHighlightWindowId] = useState<string | null>(null);

  const [newDay, setNewDay] = useState<number | "">("");
  const [newStart, setNewStart] = useState("09:00:00");
  const [newEnd, setNewEnd] = useState("17:00:00");
  const [showAddWindowForm, setShowAddWindowForm] = useState(false);

  async function loadData() {
    const res = await fetch("/api/preferences/scheduler");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Failed to load preferences");
      return;
    }
    setPref({ ...defaultPref, ...(data.preference ?? {}) });
    setWindows(Array.isArray(data.windows) ? data.windows : []);
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadData();
    });
  }, []);

  useEffect(() => {
    if (!highlightWindowId) return;
    const el = document.getElementById(`pref-work-window-${highlightWindowId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const t = window.setTimeout(() => setHighlightWindowId(null), 2800);
    return () => window.clearTimeout(t);
  }, [highlightWindowId]);

  const grouped = useMemo(() => {
    const out: Record<number, WindowRow[]> = {};
    for (const w of windows) {
      if (!out[w.day_of_week]) out[w.day_of_week] = [];
      out[w.day_of_week].push(w);
    }
    return out;
  }, [windows]);

  async function savePreference() {
    setPrefsSaving(true);
    setMessage(null);
    setError(null);

    const res = await fetch("/api/preferences/scheduler", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pref),
    });
    const data = await res.json().catch(() => ({}));
    setPrefsSaving(false);
    if (!res.ok) {
      const msg = data.error ?? "Failed to save preferences";
      setError(msg);
      showToast(msg, "error");
      return;
    }
    setMessage("Preferences saved");
    showToast("Preferences saved", "success");
    router.refresh();
    try {
      await createClient().auth.updateUser({ data: { timezone_set: true } });
    } catch {
      /* non-fatal */
    }
  }

  async function addWindow() {
    if (newDay === "") {
      const msg = "Choose a day for this work window.";
      setError(msg);
      showToast(msg, "error");
      return;
    }
    setWindowBusy(true);
    setMessage(null);
    setError(null);

    const res = await fetch("/api/preferences/scheduler/windows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day_of_week: newDay, start_time: newStart, end_time: newEnd }),
    });
    const data = await res.json().catch(() => ({}));
    setWindowBusy(false);
    if (!res.ok) {
      const msg = data.error ?? "Failed to add window";
      setError(msg);
      showToast(msg, "error");
      return;
    }

    const row: WindowRow = {
      id: String(data.id),
      day_of_week: Number(data.day_of_week),
      start_time: String(data.start_time),
      end_time: String(data.end_time),
      is_override: Boolean(data.is_override),
    };
    setWindows((prev) => [...prev, row]);
    setHighlightWindowId(row.id);
    setMessage(
      `Added ${WEEKDAY_FULL[row.day_of_week]} window (${formatTimeHhmmssTo12h(row.start_time)} – ${formatTimeHhmmssTo12h(row.end_time)}).`
    );
    showToast("Work window added", "success");
    router.refresh();
    setNewStart("09:00:00");
    setNewEnd("17:00:00");
    setShowAddWindowForm(false);
  }

  async function removeWindow(id: string) {
    setWindowBusy(true);
    setMessage(null);
    setError(null);

    const res = await fetch(`/api/preferences/scheduler/windows?id=${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setWindowBusy(false);
    if (!res.ok) {
      const msg = data.error ?? "Failed to remove window";
      setError(msg);
      showToast(msg, "error");
      return;
    }

    setWindows((prev) => prev.filter((w) => w.id !== id));
    setMessage("Window removed");
    showToast("Window removed", "success");
    router.refresh();
  }

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-medium text-palette-navy">Preferences</h1>
        <p className="text-sm text-palette-slate">Customize how AI distributes assignment work when generating suggestions.</p>
      </div>

      <AppearanceTheme />

      <div className="ds-card p-4 sm:p-5">
        <h2 className="text-sm font-medium text-palette-navy">Daily workload limits</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-medium text-palette-navy">Min daily hours
            <input type="number" min={0} step={0.25} value={pref.min_daily_minutes / 60} onChange={(e) => setPref((p) => ({ ...p, min_daily_minutes: Math.round(Number(e.target.value) * 60) }))} className="mt-1 w-full rounded-lg border border-palette-card-border bg-palette-card-bg px-3 py-2 font-normal text-palette-navy" />
          </label>
          <label className="text-sm font-medium text-palette-navy">Preferred daily hours
            <input type="number" min={0} step={0.25} value={pref.preferred_daily_minutes / 60} onChange={(e) => setPref((p) => ({ ...p, preferred_daily_minutes: Math.round(Number(e.target.value) * 60) }))} className="mt-1 w-full rounded-lg border border-palette-card-border bg-palette-card-bg px-3 py-2 font-normal text-palette-navy" />
          </label>
          <label className="text-sm font-medium text-palette-navy">Max daily hours
            <input type="number" min={0.25} step={0.25} value={pref.max_daily_minutes / 60} onChange={(e) => setPref((p) => ({ ...p, max_daily_minutes: Math.round(Number(e.target.value) * 60) }))} className="mt-1 w-full rounded-lg border border-palette-card-border bg-palette-card-bg px-3 py-2 font-normal text-palette-navy" />
          </label>
          <label className="text-sm font-medium text-palette-navy">Max consecutive hours
            <input type="number" min={0.25} step={0.25} value={pref.max_consecutive_minutes / 60} onChange={(e) => setPref((p) => ({ ...p, max_consecutive_minutes: Math.round(Number(e.target.value) * 60) }))} className="mt-1 w-full rounded-lg border border-palette-card-border bg-palette-card-bg px-3 py-2 font-normal text-palette-navy" />
          </label>
          <label className="text-sm font-medium text-palette-navy">Break minutes
            <select value={pref.break_minutes} onChange={(e) => setPref((p) => ({ ...p, break_minutes: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border border-palette-card-border bg-palette-card-bg px-3 py-2 font-normal text-palette-navy">
              {[0, 15, 30, 45, 60, 75, 90].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-palette-navy">Timezone
            <div className="mt-1 flex gap-2">
              <select
                value={pref.timezone}
                onChange={(e) => setPref((p) => ({ ...p, timezone: e.target.value }))}
                className="w-full rounded-lg border border-palette-card-border bg-palette-card-bg px-3 py-2 font-normal text-palette-navy"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setPref((p) => ({ ...p, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_USER_TIMEZONE }))}
                className="rounded-lg border border-palette-card-border bg-palette-card-bg px-3 py-2 text-xs font-medium text-palette-navy hover:bg-palette-hover"
              >
                Detect
              </button>
            </div>
          </label>
        </div>

        <div className="mt-4">
          <p className="text-sm font-medium text-palette-navy">Preferred work days</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {WEEKDAY_FULL.map((d, idx) => {
              const selected = pref.default_apply_days.includes(idx);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setPref((p) => ({
                    ...p,
                    default_apply_days: selected ? p.default_apply_days.filter((x) => x !== idx) : [...p.default_apply_days, idx].sort((a, b) => a - b),
                  }))}
                  className={`rounded-lg px-2.5 py-1 text-xs sm:text-sm ${selected ? "bg-palette-sky font-medium text-palette-ink" : "border border-palette-card-border bg-palette-card-bg text-palette-slate hover:bg-palette-hover"}`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button type="button" onClick={savePreference} disabled={prefsSaving} className="rounded-lg bg-palette-sky px-4 py-2 text-sm font-medium text-palette-ink disabled:opacity-60">
            {prefsSaving ? "Saving…" : "Save preferences"}
          </button>
        </div>
      </div>

      <div className="ds-card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-medium text-palette-navy">Preferred work windows</h2>
            <p className="mt-1 text-xs text-palette-slate">Add your available work windows for each day.</p>
          </div>
          {!showAddWindowForm && (
            <button
              type="button"
              onClick={() => setShowAddWindowForm(true)}
              className="shrink-0 rounded-lg border border-palette-card-border bg-palette-card-bg px-3 py-1.5 text-sm font-medium text-palette-navy hover:bg-palette-hover"
            >
              Add work window
            </button>
          )}
        </div>

        {windows.length === 0 && (
          <p className="mt-3 rounded-lg border border-dashed border-palette-card-border bg-palette-cream/40 px-3 py-2 text-xs text-palette-slate">
            AI scheduling uses your work windows to place focused blocks. Add at least one window with{" "}
            <span className="font-medium text-palette-navy">Add work window</span> above.
          </p>
        )}

        {showAddWindowForm && (
          <div className="mt-3 rounded-lg border border-palette-card-border bg-palette-cream/50 p-3">
            <div className="grid gap-2 sm:grid-cols-4">
              <select value={newDay === "" ? "" : String(newDay)} onChange={(e) => setNewDay(e.target.value === "" ? "" : Number(e.target.value))} className="rounded-lg border border-palette-card-border bg-palette-card-bg px-3 py-2 text-palette-navy">
                <option value="" disabled>
                  Day
                </option>
                {WEEKDAY_FULL.map((d, idx) => (
                  <option key={d} value={idx}>
                    {d}
                  </option>
                ))}
              </select>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-palette-slate">Start</span>
                <TimePicker12h idPrefix="pref-win-s" minuteStep={15} value={newStart} onChange={setNewStart} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-palette-slate">End</span>
                <TimePicker12h idPrefix="pref-win-e" minuteStep={15} value={newEnd} onChange={setNewEnd} />
              </div>
              <div className="flex flex-col justify-end gap-2 sm:flex-row sm:items-end">
                <button
                  type="button"
                  onClick={() => void addWindow()}
                  disabled={windowBusy || newDay === ""}
                  className="rounded-lg bg-palette-sky px-3 py-2 text-sm font-medium text-palette-ink disabled:opacity-60"
                >
                  {windowBusy ? "Adding…" : "Add window"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddWindowForm(false)}
                  disabled={windowBusy}
                  className="rounded-lg border border-palette-card-border bg-palette-card-bg px-3 py-2 text-sm text-palette-navy hover:bg-palette-hover disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 space-y-3">
          {WEEKDAY_FULL.map((d, idx) => {
            const rows = grouped[idx] ?? [];
            return (
              <div key={d} className="rounded-lg border border-palette-card-border bg-palette-card-bg p-3">
                <p className="text-xs font-medium text-palette-navy">{d}</p>
                {rows.length === 0 ? (
                  <p className="mt-1 text-xs text-palette-slate">No windows</p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {rows.map((r) => (
                      <li
                        key={r.id}
                        id={`pref-work-window-${r.id}`}
                        className={`flex items-center justify-between rounded-md px-1.5 py-0.5 text-xs text-palette-slate transition-[box-shadow] ${
                          highlightWindowId === r.id ? "bg-palette-sky/15 ring-2 ring-palette-sky/80 ring-offset-1 ring-offset-palette-card-bg" : ""
                        }`}
                      >
                        <span>
                          {formatTimeHhmmssTo12h(r.start_time)} – {formatTimeHhmmssTo12h(r.end_time)}
                        </span>
                        <button
                          type="button"
                          onClick={() => void removeWindow(r.id)}
                          disabled={windowBusy}
                          className="font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm font-medium text-palette-green">{message}</p>}
    </div>
  );
}
