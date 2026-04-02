"use client";

import { useState } from "react";
import { WEEKDAY_FULL, formatTimeHhmmssTo12h } from "@/lib/datetimeDisplay";

type HabitLike = {
  id: string;
  name: string;
  type: "fixed" | "flexible";
  active: boolean;
  habit_fixed_slots?: { day_of_week: number; start_time: string; end_time: string }[];
  habit_flexible_preferred_slots?: { day_of_week: number; start_time: string; end_time: string }[];
  habit_flexible_rules?: {
    duration_minutes: number;
    preference_mode?: "preferred_days" | "times_per_week";
    preferred_days: number[];
    times_per_week: number | null;
  }[];
};

type FixedSlotRow = { day_of_week: number; start_time: string; end_time: string };
type FlexibleSlotRow = { day_of_week: number; start_time: string; end_time: string };
type FlexiblePreferenceMode = "preferred_days" | "times_per_week";

const minuteOptions = [0, 15, 30, 45];
const timeOptions = Array.from({ length: 24 * 4 }).map((_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
});

export function HabitForm({
  habit,
  onClose,
  onSaved,
}: {
  habit?: HabitLike;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(habit?.name ?? "");
  const [type, setType] = useState<"" | "fixed" | "flexible">(habit?.type ?? "");
  const [fixedSlots, setFixedSlots] = useState<FixedSlotRow[]>(
    habit?.habit_fixed_slots?.length ? habit.habit_fixed_slots.map((s) => ({ ...s })) : []
  );

  const flex = habit?.habit_flexible_rules?.[0];
  const [durationH, setDurationH] = useState(Math.floor((flex?.duration_minutes ?? 0) / 60));
  const [durationM, setDurationM] = useState((flex?.duration_minutes ?? 0) % 60);
  const [preferenceMode, setPreferenceMode] = useState<FlexiblePreferenceMode>(flex?.preference_mode ?? "preferred_days");
  const [preferredDays, setPreferredDays] = useState<number[]>(flex?.preferred_days ?? []);
  const [timesPerWeek, setTimesPerWeek] = useState<number | "">(flex?.times_per_week ?? "");
  const [preferredSlots, setPreferredSlots] = useState<FlexibleSlotRow[]>(
    habit?.habit_flexible_preferred_slots?.length
      ? habit.habit_flexible_preferred_slots.map((s) => ({ ...s }))
      : []
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDay = (d: number) => {
    setPreferredDays((prev) => {
      if (prev.includes(d)) {
        setPreferredSlots((slots) => slots.filter((s) => s.day_of_week !== d));
        return prev.filter((x) => x !== d);
      }
      setPreferredSlots((slots) => [...slots, { day_of_week: d, start_time: "18:00:00", end_time: "19:00:00" }]);
      return [...prev, d];
    });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const url = habit ? `/api/habits/${habit.id}` : "/api/habits";
    const method = habit ? "PUT" : "POST";

    if (!type) {
      setLoading(false);
      setError("Please select a habit type");
      return;
    }

    if (type === "fixed" && fixedSlots.length > 0) {
      const incomplete = fixedSlots.some((s) => s.day_of_week < 0 || !s.start_time || !s.end_time);
      if (incomplete) {
        setLoading(false);
        setError("Please select a day, start time, and end time for each fixed slot.");
        return;
      }
    }
    if (type === "flexible") {
      const durationMinutes = durationH * 60 + durationM;
      if (durationMinutes <= 0 || durationMinutes % 15 !== 0) {
        setLoading(false);
        setError("Flexible duration must be a positive 15-minute increment.");
        return;
      }
      if (preferenceMode === "preferred_days") {
        if (preferredDays.length === 0) {
          setLoading(false);
          setError("Choose at least one preferred day.");
          return;
        }
        const daySet = new Set(preferredDays);
        const byDay = new Set(preferredSlots.map((s) => s.day_of_week));
        const missing = [...daySet].some((d) => !byDay.has(d));
        if (missing) {
          setLoading(false);
          setError("Each preferred day needs at least one preferred time range.");
          return;
        }
      } else {
        if (timesPerWeek === "" || Number(timesPerWeek) <= 0) {
          setLoading(false);
          setError("Times per week must be a positive number.");
          return;
        }
      }
      const invalidSlots = preferredSlots.some(
        (s) => s.day_of_week < 0 || s.day_of_week > 6 || !s.start_time || !s.end_time
      );
      if (invalidSlots) {
        setLoading(false);
        setError("Each preferred time row must have day, start, and end.");
        return;
      }
    }

    const payload =
      type === "fixed"
        ? {
            name,
            type,
            active: habit?.active ?? true,
            fixed_slots: fixedSlots.map((s) => ({
              day_of_week: s.day_of_week,
              start_time: s.start_time,
              end_time: s.end_time,
            })),
          }
        : {
            name,
            type,
            active: habit?.active ?? true,
            duration_minutes: durationH * 60 + durationM,
            preference_mode: preferenceMode,
            preferred_days: preferenceMode === "preferred_days" ? preferredDays : [],
            times_per_week: preferenceMode === "times_per_week" && timesPerWeek !== "" ? Number(timesPerWeek) : null,
            preferred_slots: preferredSlots,
          };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save habit");
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{habit ? "Edit habit" : "New habit"}</h3>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Habit name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800" />
        </div>
        <div>
          <label className="block text-sm font-medium">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as "" | "fixed" | "flexible")} required className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800">
            <option value="" disabled>
              Select type
            </option>
            <option value="fixed">Fixed</option>
            <option value="flexible">Flexible</option>
          </select>
        </div>
      </div>

      {type === "fixed" ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-medium">Fixed schedule</p>
          {fixedSlots.map((s, i) => (
            <div
              key={i}
              className="flex flex-wrap items-end gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-800/50"
            >
              <div className="min-w-[9.5rem] flex-1">
                <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Day</label>
                <select
                  value={s.day_of_week < 0 ? "" : String(s.day_of_week)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFixedSlots((prev) =>
                      prev.map((x, idx) => (idx === i ? { ...x, day_of_week: v === "" ? -1 : Number(v) } : x))
                    );
                  }}
                  required
                  className="w-full rounded-md border border-zinc-300 px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                >
                  <option value="" disabled>
                    Day
                  </option>
                  {WEEKDAY_FULL.map((d, idx) => (
                    <option key={d} value={idx}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[7.5rem] flex-1">
                <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Start</label>
                <select
                  value={s.start_time}
                  onChange={(e) => setFixedSlots((prev) => prev.map((x, idx) => (idx === i ? { ...x, start_time: e.target.value } : x)))}
                  required
                  className="w-full rounded-md border border-zinc-300 px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                >
                  <option value="" disabled>
                    Start time
                  </option>
                  {timeOptions.map((t) => (
                    <option key={t} value={t}>
                      {formatTimeHhmmssTo12h(t)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[7.5rem] flex-1">
                <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">End</label>
                <select
                  value={s.end_time}
                  onChange={(e) => setFixedSlots((prev) => prev.map((x, idx) => (idx === i ? { ...x, end_time: e.target.value } : x)))}
                  required
                  className="w-full rounded-md border border-zinc-300 px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                >
                  <option value="" disabled>
                    End time
                  </option>
                  {timeOptions.map((t) => (
                    <option key={`e-${t}`} value={t}>
                      {formatTimeHhmmssTo12h(t)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => setFixedSlots((prev) => prev.filter((_, idx) => idx !== i))}
                className="shrink-0 rounded-md border border-zinc-300 px-3 py-2 text-sm text-red-600 dark:border-zinc-600 dark:text-red-400"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setFixedSlots((prev) => [...prev, { day_of_week: -1, start_time: "", end_time: "" }])}
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            + Add fixed slot
          </button>
        </div>
      ) : type === "flexible" ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">Flexible target</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="block text-sm">Duration hours</label>
              <input type="number" min={0} value={durationH} onChange={(e) => setDurationH(Number(e.target.value))} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800" />
            </div>
            <div>
              <label className="block text-sm">Duration minutes</label>
              <select value={durationM} onChange={(e) => setDurationM(Number(e.target.value))} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800">
                {minuteOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm">Preference mode</label>
            <select
              value={preferenceMode}
              onChange={(e) => setPreferenceMode(e.target.value as FlexiblePreferenceMode)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
            >
              <option value="preferred_days">Preferred days</option>
              <option value="times_per_week">Times per week</option>
            </select>
          </div>
          {preferenceMode === "preferred_days" ? (
            <div className="sm:col-span-2">
              <label className="block text-sm">Preferred days</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {WEEKDAY_FULL.map((d, idx) => (
                  <button
                    type="button"
                    key={d}
                    onClick={() => toggleDay(idx)}
                    className={`rounded px-2 py-1 text-xs sm:text-sm ${preferredDays.includes(idx) ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="sm:col-span-2">
              <label className="block text-sm">Times per week</label>
              <input
                type="number"
                min={1}
                value={timesPerWeek}
                onChange={(e) => setTimesPerWeek(e.target.value === "" ? "" : Number(e.target.value))}
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
              />
            </div>
          )}
          <div className="sm:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm">Preferred hours by day</label>
              <button
                type="button"
                onClick={() => setPreferredSlots((prev) => [...prev, { day_of_week: 1, start_time: "18:00:00", end_time: "19:00:00" }])}
                className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                + Add preferred hours
              </button>
            </div>
            {preferredSlots.length === 0 ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                No preferred hours set. Scheduler will use available free time based on selected mode.
              </p>
            ) : (
              preferredSlots.map((s, i) => (
                <div key={`${s.day_of_week}-${i}`} className="grid gap-2 sm:grid-cols-4">
                  <select
                    value={s.day_of_week}
                    onChange={(e) =>
                      setPreferredSlots((prev) =>
                        prev.map((x, idx) => (idx === i ? { ...x, day_of_week: Number(e.target.value) } : x))
                      )
                    }
                    className="rounded border border-zinc-300 px-2 py-2 dark:border-zinc-600 dark:bg-zinc-800"
                  >
                    {WEEKDAY_FULL.map((d, idx) => (
                      <option key={d} value={idx}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <select
                    value={s.start_time}
                    onChange={(e) =>
                      setPreferredSlots((prev) =>
                        prev.map((x, idx) => (idx === i ? { ...x, start_time: e.target.value } : x))
                      )
                    }
                    className="rounded border border-zinc-300 px-2 py-2 dark:border-zinc-600 dark:bg-zinc-800"
                  >
                    {timeOptions.map((t) => (
                      <option key={t} value={t}>
                        {formatTimeHhmmssTo12h(t)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={s.end_time}
                    onChange={(e) =>
                      setPreferredSlots((prev) =>
                        prev.map((x, idx) => (idx === i ? { ...x, end_time: e.target.value } : x))
                      )
                    }
                    className="rounded border border-zinc-300 px-2 py-2 dark:border-zinc-600 dark:bg-zinc-800"
                  >
                    {timeOptions.map((t) => (
                      <option key={`f-${t}`} value={t}>
                        {formatTimeHhmmssTo12h(t)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setPreferredSlots((prev) => prev.filter((_, idx) => idx !== i))}
                    className="rounded border border-zinc-300 px-3 py-2 text-sm text-red-600 dark:border-zinc-600"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={loading} className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
          {loading ? "Saving..." : habit ? "Update" : "Add habit"}
        </button>
        <button type="button" onClick={onClose} className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600">
          Cancel
        </button>
      </div>
    </form>
  );
}
