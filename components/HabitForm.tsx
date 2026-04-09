"use client";

import { useState } from "react";
import { WEEKDAY_FULL } from "@/lib/datetimeDisplay";
import { TimePicker12h } from "@/components/TimePicker12h";

type HabitLike = {
  id: string;
  name: string;
  type: "fixed" | "flexible";
  active: boolean;
  habit_fixed_slots?: { day_of_week: number; start_time: string; end_time: string }[];
  habit_flexible_preferred_slots?: { day_of_week: number; start_time: string; end_time: string }[];
  habit_flexible_rules?:
    | {
        duration_minutes: number;
        preference_mode?: "preferred_days" | "times_per_week";
        preferred_days: number[];
        times_per_week: number | null;
      }
    | {
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

function normalizeSlotTimes<T extends { start_time: string; end_time: string }>(s: T): T {
  return {
    ...s,
    start_time: s.start_time || "09:00:00",
    end_time: s.end_time || "10:00:00",
  };
}

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
    habit?.habit_fixed_slots?.length ? habit.habit_fixed_slots.map((s) => normalizeSlotTimes({ ...s })) : []
  );

  const flexRules = habit?.habit_flexible_rules as unknown;
  const flex = Array.isArray(flexRules) ? flexRules[0] : flexRules;
  const [durationH, setDurationH] = useState(Math.floor((flex?.duration_minutes ?? 0) / 60));
  const [durationM, setDurationM] = useState((flex?.duration_minutes ?? 0) % 60);
  const [preferenceMode, setPreferenceMode] = useState<FlexiblePreferenceMode>(flex?.preference_mode ?? "preferred_days");
  const [preferredDays, setPreferredDays] = useState<number[]>(flex?.preferred_days ?? []);
  const [timesPerWeek, setTimesPerWeek] = useState<number | "">(flex?.times_per_week ?? "");
  const [preferredSlots, setPreferredSlots] = useState<FlexibleSlotRow[]>(
    habit?.habit_flexible_preferred_slots?.length
      ? habit.habit_flexible_preferred_slots.map((s) => normalizeSlotTimes({ ...s }))
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
      // Add a placeholder hours row for this day. User must choose start/end times.
      setPreferredSlots((slots) => [...slots, { day_of_week: d, start_time: "09:00:00", end_time: "10:00:00" }]);
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
    <form onSubmit={handleSubmit} className="ds-card p-4">
      <h3 className="font-medium text-palette-navy">{habit ? "Edit habit" : "New habit"}</h3>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-palette-navy">Habit name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full rounded-lg border border-palette-card-border bg-palette-card-bg px-3 py-2 text-palette-navy" />
        </div>
        <div>
          <label className="block text-sm font-medium text-palette-navy">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as "" | "fixed" | "flexible")} required className="mt-1 w-full rounded-lg border border-palette-card-border bg-palette-card-bg px-3 py-2 text-palette-navy">
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
          <p className="text-sm font-medium text-palette-navy">Fixed schedule</p>
          {fixedSlots.map((s, i) => (
            <div
              key={i}
              className="flex flex-wrap items-end gap-2 rounded-lg border border-palette-card-border bg-palette-cream/40 p-3"
            >
              <div className="min-w-[9.5rem] flex-1">
                <label className="mb-1 block text-xs font-medium text-palette-slate">Day</label>
                <select
                  value={s.day_of_week < 0 ? "" : String(s.day_of_week)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFixedSlots((prev) =>
                      prev.map((x, idx) => (idx === i ? { ...x, day_of_week: v === "" ? -1 : Number(v) } : x))
                    );
                  }}
                  required
                  className="w-full rounded-lg border border-palette-card-border bg-palette-card-bg px-2 py-2 text-sm text-palette-navy"
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
              <div className="min-w-[10rem] flex-1">
                <label className="mb-1 block text-xs font-medium text-palette-slate">Start</label>
                <TimePicker12h
                  idPrefix={`habit-fixed-${i}-s`}
                  minuteStep={15}
                  value={s.start_time || "09:00:00"}
                  onChange={(v) =>
                    setFixedSlots((prev) => prev.map((x, idx) => (idx === i ? { ...x, start_time: v } : x)))
                  }
                />
              </div>
              <div className="min-w-[10rem] flex-1">
                <label className="mb-1 block text-xs font-medium text-palette-slate">End</label>
                <TimePicker12h
                  idPrefix={`habit-fixed-${i}-e`}
                  minuteStep={15}
                  value={s.end_time || "10:00:00"}
                  onChange={(v) =>
                    setFixedSlots((prev) => prev.map((x, idx) => (idx === i ? { ...x, end_time: v } : x)))
                  }
                />
              </div>
              <button
                type="button"
                onClick={() => setFixedSlots((prev) => prev.filter((_, idx) => idx !== i))}
                className="shrink-0 rounded-lg border border-palette-card-border bg-palette-card-bg px-3 py-2 text-sm text-red-600 hover:bg-palette-hover"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setFixedSlots((prev) => [...prev, { day_of_week: -1, start_time: "09:00:00", end_time: "10:00:00" }])}
            className="text-sm font-medium text-palette-sky hover:text-palette-navy"
          >
            + Add fixed slot
          </button>
        </div>
      ) : type === "flexible" ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-palette-navy">Flexible target</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-palette-navy">Duration hours</label>
              <input type="number" min={0} value={durationH} onChange={(e) => setDurationH(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-palette-card-border bg-palette-card-bg px-3 py-2 text-palette-navy" />
            </div>
            <div>
              <label className="block text-sm text-palette-navy">Duration minutes</label>
              <select value={durationM} onChange={(e) => setDurationM(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-palette-card-border bg-palette-card-bg px-3 py-2 text-palette-navy">
                {minuteOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-palette-navy">Preference mode</label>
            <select
              value={preferenceMode}
              onChange={(e) => setPreferenceMode(e.target.value as FlexiblePreferenceMode)}
              className="mt-1 w-full rounded-lg border border-palette-card-border bg-palette-card-bg px-3 py-2 text-palette-navy"
            >
              <option value="preferred_days">Preferred days</option>
              <option value="times_per_week">Times per week</option>
            </select>
          </div>
          {preferenceMode === "preferred_days" ? (
            <div className="sm:col-span-2">
              <label className="block text-sm text-palette-navy">Preferred days</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {WEEKDAY_FULL.map((d, idx) => (
                  <button
                    type="button"
                    key={d}
                    onClick={() => toggleDay(idx)}
                    className={`rounded-lg px-2 py-1 text-xs sm:text-sm ${preferredDays.includes(idx) ? "bg-palette-sky font-medium text-palette-ink" : "border border-palette-card-border bg-palette-card-bg text-palette-slate hover:bg-palette-hover"}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="sm:col-span-2">
              <label className="block text-sm text-palette-navy">Times per week</label>
              <input
                type="number"
                min={1}
                value={timesPerWeek}
                onChange={(e) => setTimesPerWeek(e.target.value === "" ? "" : Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-palette-card-border bg-palette-card-bg px-3 py-2 text-palette-navy"
              />
            </div>
          )}
          <div className="sm:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm text-palette-navy">Preferred hours by day</label>
              <button
                type="button"
                onClick={() =>
                  setPreferredSlots((prev) => [
                    ...prev,
                    { day_of_week: preferredDays[0] ?? 1, start_time: "09:00:00", end_time: "10:00:00" },
                  ])
                }
                className="text-xs font-medium text-palette-sky hover:text-palette-navy"
              >
                + Add preferred hours
              </button>
            </div>
            {preferredSlots.length === 0 ? (
              <p className="text-xs text-palette-slate">
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
                    className="rounded-lg border border-palette-card-border bg-palette-card-bg px-2 py-2 text-palette-navy"
                  >
                    {WEEKDAY_FULL.map((d, idx) => (
                      <option key={d} value={idx}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <TimePicker12h
                    idPrefix={`habit-flex-${i}-s`}
                    minuteStep={15}
                    value={s.start_time || "09:00:00"}
                    onChange={(v) =>
                      setPreferredSlots((prev) =>
                        prev.map((x, idx) => (idx === i ? { ...x, start_time: v } : x))
                      )
                    }
                    className="sm:col-span-1"
                  />
                  <TimePicker12h
                    idPrefix={`habit-flex-${i}-e`}
                    minuteStep={15}
                    value={s.end_time || "10:00:00"}
                    onChange={(v) =>
                      setPreferredSlots((prev) =>
                        prev.map((x, idx) => (idx === i ? { ...x, end_time: v } : x))
                      )
                    }
                    className="sm:col-span-1"
                  />
                  <button
                    type="button"
                    onClick={() => setPreferredSlots((prev) => prev.filter((_, idx) => idx !== i))}
                    className="rounded-lg border border-palette-card-border bg-palette-card-bg px-3 py-2 text-sm text-red-600 hover:bg-palette-hover"
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
        <button type="submit" disabled={loading} className="rounded-lg bg-palette-sky px-4 py-2 text-sm font-medium text-palette-ink disabled:opacity-60">
          {loading ? "Saving..." : habit ? "Update" : "Add habit"}
        </button>
        <button type="button" onClick={onClose} className="rounded-lg border border-palette-card-border bg-palette-card-bg px-4 py-2 text-sm text-palette-navy hover:bg-palette-hover">
          Cancel
        </button>
      </div>
    </form>
  );
}
