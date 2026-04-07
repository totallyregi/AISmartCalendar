"use client";

import { useMemo, useState } from "react";
import { WEEKDAY_FULL, formatClassMeetingLine } from "@/lib/datetimeDisplay";
import { HabitForm } from "./HabitForm";

type HabitRow = {
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

function HabitListItem({ h, onEdit }: { h: HabitRow; onEdit: () => void }) {
  const flexRules = h.habit_flexible_rules as unknown;
  const flex = Array.isArray(flexRules) ? flexRules[0] : flexRules;
  const slotSummary =
    h.habit_flexible_preferred_slots?.length
      ? ` · hours: ${h.habit_flexible_preferred_slots
          .map((s) => formatClassMeetingLine(s.day_of_week, s.start_time, s.end_time))
          .join(", ")}`
      : "";
  const flexSummary =
    (flex?.preference_mode ?? "preferred_days") === "times_per_week"
      ? `${flex?.duration_minutes ?? 0} min · ${flex?.times_per_week ?? 0}x/week${slotSummary}`
      : `${flex?.duration_minutes ?? 0} min` +
        `${flex?.preferred_days?.length ? ` · days: ${flex.preferred_days.map((d: number) => WEEKDAY_FULL[d]).join(", ")}` : ""}` +
        `${slotSummary}`;

  return (
    <li className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="font-medium text-zinc-900 dark:text-zinc-100">{h.name}</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {h.type === "fixed"
              ? (h.habit_fixed_slots ?? []).map((s) => formatClassMeetingLine(s.day_of_week, s.start_time, s.end_time)).join(" · ") || "No fixed slots"
              : flexSummary}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              await fetch(`/api/habits/${h.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ active: !h.active }),
              });
              window.location.reload();
            }}
            className="text-sm text-zinc-600 dark:text-zinc-400"
          >
            {h.active ? "Pause" : "Resume"}
          </button>
          <button type="button" onClick={onEdit} className="text-sm text-zinc-600 dark:text-zinc-400">
            Edit
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!confirm("Delete this habit?")) return;
              await fetch(`/api/habits/${h.id}`, { method: "DELETE" });
              window.location.reload();
            }}
            className="text-sm text-red-600"
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}

export function HabitList({ habits }: { habits: HabitRow[] }) {
  const [editing, setEditing] = useState<HabitRow | null>(null);
  const [adding, setAdding] = useState(false);

  const { fixed, flexible } = useMemo(() => {
    const f: HabitRow[] = [];
    const l: HabitRow[] = [];
    for (const h of habits) {
      if (h.type === "flexible") l.push(h);
      else f.push(h);
    }
    return { fixed: f, flexible: l };
  }, [habits]);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => {
          setAdding(true);
          setEditing(null);
        }}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Add habit
      </button>

      {(adding || editing) && (
        <HabitForm habit={editing ?? undefined} onClose={() => { setAdding(false); setEditing(null); }} onSaved={() => window.location.reload()} />
      )}

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <section aria-labelledby="habits-fixed-heading">
          <h2 id="habits-fixed-heading" className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Fixed habits
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Specific days and times</p>
          <ul className="mt-4 space-y-2">
            {fixed.length === 0 ? (
              <li className="rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
                No fixed habits yet
              </li>
            ) : (
              fixed.map((h) => (
                <HabitListItem
                  key={h.id}
                  h={h}
                  onEdit={() => {
                    setEditing(h);
                    setAdding(false);
                  }}
                />
              ))
            )}
          </ul>
        </section>

        <section aria-labelledby="habits-flexible-heading">
          <h2 id="habits-flexible-heading" className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Flexible habits
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Duration-based weekly targets</p>
          <ul className="mt-4 space-y-2">
            {flexible.length === 0 ? (
              <li className="rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
                No flexible habits yet
              </li>
            ) : (
              flexible.map((h) => (
                <HabitListItem
                  key={h.id}
                  h={h}
                  onEdit={() => {
                    setEditing(h);
                    setAdding(false);
                  }}
                />
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
