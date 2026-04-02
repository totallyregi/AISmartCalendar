"use client";

import { useState } from "react";

type HabitLike = {
  id: string;
  name: string;
  type: "fixed" | "flexible";
  active: boolean;
  habit_fixed_slots?: { day_of_week: number; start_time: string; end_time: string }[];
  habit_flexible_rules?: { duration_minutes: number; preferred_days: number[]; times_per_week: number | null }[];
};

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
  const [fixedSlots, setFixedSlots] = useState(
    habit?.habit_fixed_slots?.length
      ? habit.habit_fixed_slots
      : []
  );

  const flex = habit?.habit_flexible_rules?.[0];
  const [durationH, setDurationH] = useState(Math.floor((flex?.duration_minutes ?? 0) / 60));
  const [durationM, setDurationM] = useState((flex?.duration_minutes ?? 0) % 60);
  const [preferredDays, setPreferredDays] = useState<number[]>(flex?.preferred_days ?? []);
  const [timesPerWeek, setTimesPerWeek] = useState<number | "">(flex?.times_per_week ?? "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDay = (d: number) => {
    setPreferredDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
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

    const payload =
      type === "fixed"
        ? { name, type, active: habit?.active ?? true, fixed_slots: fixedSlots }
        : {
            name,
            type,
            active: habit?.active ?? true,
            duration_minutes: durationH * 60 + durationM,
            preferred_days: preferredDays,
            times_per_week: timesPerWeek === "" ? null : Number(timesPerWeek),
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
            <option value="" disabled>Select type</option>
            <option value="fixed">Fixed</option>
            <option value="flexible">Flexible</option>
          </select>
        </div>
      </div>

      {type === "fixed" ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">Fixed schedule</p>
          {fixedSlots.map((s, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-4">
              <select value={s.day_of_week} onChange={(e) => setFixedSlots((prev) => prev.map((x, idx) => idx === i ? { ...x, day_of_week: Number(e.target.value) } : x))} className="rounded border border-zinc-300 px-2 py-2 dark:border-zinc-600 dark:bg-zinc-800">
                {dayNames.map((d, idx) => (<option key={d} value={idx}>{d}</option>))}
              </select>
              <select value={s.start_time} onChange={(e) => setFixedSlots((prev) => prev.map((x, idx) => idx === i ? { ...x, start_time: e.target.value } : x))} className="rounded border border-zinc-300 px-2 py-2 dark:border-zinc-600 dark:bg-zinc-800">
                <option value="" disabled>Start time</option>
                {timeOptions.map((t) => <option key={t} value={t}>{t.slice(0,5)}</option>)}
              </select>
              <select value={s.end_time} onChange={(e) => setFixedSlots((prev) => prev.map((x, idx) => idx === i ? { ...x, end_time: e.target.value } : x))} className="rounded border border-zinc-300 px-2 py-2 dark:border-zinc-600 dark:bg-zinc-800">
                <option value="" disabled>End time</option>
                {timeOptions.map((t) => <option key={t} value={t}>{t.slice(0,5)}</option>)}
              </select>
              <button type="button" onClick={() => setFixedSlots((prev) => prev.filter((_, idx) => idx !== i))} className="rounded border border-zinc-300 px-3 py-2 text-sm text-red-600 dark:border-zinc-600">Remove</button>
            </div>
          ))}
          <button type="button" onClick={() => setFixedSlots((prev) => [...prev, { day_of_week: 1, start_time: "", end_time: "" }])} className="text-sm text-zinc-600 dark:text-zinc-400">+ Add fixed slot</button>
        </div>
      ) : (
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
                {minuteOptions.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm">Preferred days (optional)</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {dayNames.map((d, idx) => (
                <button type="button" key={d} onClick={() => toggleDay(idx)} className={`rounded px-2 py-1 text-xs ${preferredDays.includes(idx) ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm">Times per week (optional)</label>
            <input type="number" min={1} max={7} value={timesPerWeek} onChange={(e) => setTimesPerWeek(e.target.value === "" ? "" : Number(e.target.value))} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800" />
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={loading} className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">{loading ? "Saving..." : habit ? "Update" : "Add habit"}</button>
        <button type="button" onClick={onClose} className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600">Cancel</button>
      </div>
    </form>
  );
}
