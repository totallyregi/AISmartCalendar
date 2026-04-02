"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFAULT_USER_TIMEZONE, WEEKDAY_FULL, formatTimeHhmmssTo12h } from "@/lib/datetimeDisplay";

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
  const [pref, setPref] = useState<Preference>(defaultPref);
  const [windows, setWindows] = useState<WindowRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newDay, setNewDay] = useState(1);
  const [newStart, setNewStart] = useState("12:00:00");
  const [newEnd, setNewEnd] = useState("20:00:00");
  const [newOverride, setNewOverride] = useState(false);

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
    loadData();
  }, []);

  const grouped = useMemo(() => {
    const out: Record<number, WindowRow[]> = {};
    for (const w of windows) {
      if (!out[w.day_of_week]) out[w.day_of_week] = [];
      out[w.day_of_week].push(w);
    }
    return out;
  }, [windows]);

  async function savePreference() {
    setLoading(true);
    setMessage(null);
    setError(null);

    const res = await fetch("/api/preferences/scheduler", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pref),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to save preferences");
      return;
    }
    setMessage("Preferences saved");
  }

  async function addWindow() {
    setLoading(true);
    setMessage(null);
    setError(null);

    const res = await fetch("/api/preferences/scheduler/windows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day_of_week: newDay, start_time: newStart, end_time: newEnd, is_override: newOverride }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to add window");
      return;
    }

    setWindows((prev) => [...prev, data]);
    setMessage("Window added");
  }

  async function removeWindow(id: string) {
    setLoading(true);
    setMessage(null);
    setError(null);

    const res = await fetch(`/api/preferences/scheduler/windows?id=${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to remove window");
      return;
    }

    setWindows((prev) => prev.filter((w) => w.id !== id));
    setMessage("Window removed");
  }

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Preferences</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Customize how AI distributes assignment work when generating suggestions.</p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Daily workload limits</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-sm text-zinc-700 dark:text-zinc-300">Min daily hours
            <input type="number" min={0} step={0.25} value={pref.min_daily_minutes / 60} onChange={(e) => setPref((p) => ({ ...p, min_daily_minutes: Math.round(Number(e.target.value) * 60) }))} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800" />
          </label>
          <label className="text-sm text-zinc-700 dark:text-zinc-300">Preferred daily hours
            <input type="number" min={0} step={0.25} value={pref.preferred_daily_minutes / 60} onChange={(e) => setPref((p) => ({ ...p, preferred_daily_minutes: Math.round(Number(e.target.value) * 60) }))} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800" />
          </label>
          <label className="text-sm text-zinc-700 dark:text-zinc-300">Max daily hours
            <input type="number" min={0.25} step={0.25} value={pref.max_daily_minutes / 60} onChange={(e) => setPref((p) => ({ ...p, max_daily_minutes: Math.round(Number(e.target.value) * 60) }))} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800" />
          </label>
          <label className="text-sm text-zinc-700 dark:text-zinc-300">Max consecutive hours
            <input type="number" min={0.25} step={0.25} value={pref.max_consecutive_minutes / 60} onChange={(e) => setPref((p) => ({ ...p, max_consecutive_minutes: Math.round(Number(e.target.value) * 60) }))} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800" />
          </label>
          <label className="text-sm text-zinc-700 dark:text-zinc-300">Break minutes
            <select value={pref.break_minutes} onChange={(e) => setPref((p) => ({ ...p, break_minutes: Number(e.target.value) }))} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800">
              {[0, 15, 30, 45, 60, 75, 90].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label className="text-sm text-zinc-700 dark:text-zinc-300">Timezone
            <div className="mt-1 flex gap-2">
              <select
                value={pref.timezone}
                onChange={(e) => setPref((p) => ({ ...p, timezone: e.target.value }))}
                className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
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
                className="rounded border border-zinc-300 px-3 py-2 text-xs dark:border-zinc-600"
              >
                Detect
              </button>
            </div>
          </label>
        </div>

        <div className="mt-4">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Preferred work days</p>
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
                  className={`rounded px-2.5 py-1 text-xs sm:text-sm ${selected ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "border border-zinc-300 text-zinc-700 dark:border-zinc-600 dark:text-zinc-300"}`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <button type="button" onClick={savePreference} disabled={loading} className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900">
            Save preferences
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Preferred work windows</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Add reusable work windows. Set override for day-specific custom windows.</p>

        <div className="mt-3 grid gap-2 sm:grid-cols-5">
          <select value={newDay} onChange={(e) => setNewDay(Number(e.target.value))} className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800">
            {WEEKDAY_FULL.map((d, idx) => (
              <option key={d} value={idx}>
                {d}
              </option>
            ))}
          </select>
          <input type="time" step={900} value={newStart.slice(0, 5)} onChange={(e) => setNewStart(`${e.target.value}:00`)} className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800" />
          <input type="time" step={900} value={newEnd.slice(0, 5)} onChange={(e) => setNewEnd(`${e.target.value}:00`)} className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800" />
          <label className="flex items-center gap-2 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600">
            <input type="checkbox" checked={newOverride} onChange={(e) => setNewOverride(e.target.checked)} />
            Day override
          </label>
          <button type="button" onClick={addWindow} disabled={loading} className="rounded bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900">
            Add window
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {WEEKDAY_FULL.map((d, idx) => {
            const rows = grouped[idx] ?? [];
            return (
              <div key={d} className="rounded border border-zinc-200 p-2 dark:border-zinc-700">
                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">{d}</p>
                {rows.length === 0 ? (
                  <p className="mt-1 text-xs text-zinc-400">No windows</p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {rows.map((r) => (
                      <li key={r.id} className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300">
                        <span>
                          {formatTimeHhmmssTo12h(r.start_time)} – {formatTimeHhmmssTo12h(r.end_time)}{" "}
                          {r.is_override ? "(override)" : ""}
                        </span>
                        <button type="button" onClick={() => removeWindow(r.id)} className="text-red-600 dark:text-red-400">Delete</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {message && <p className="text-sm text-emerald-700 dark:text-emerald-400">{message}</p>}
    </div>
  );
}
