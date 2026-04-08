"use client";

import { useMemo, useState } from "react";
import { WEEKDAY_FULL, compareDayTimeSlots } from "@/lib/datetimeDisplay";
import { HabitForm } from "./HabitForm";
import { ScheduleSlotList } from "./ScheduleSlotList";

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

function FlexibleHabitMeta({ h, flex }: { h: HabitRow; flex: Record<string, unknown> | null | undefined }) {
  const mode = (flex?.preference_mode ?? "preferred_days") as "preferred_days" | "times_per_week";
  const prefDays = (flex?.preferred_days as number[] | undefined)?.filter((d) => d >= 0 && d <= 6) ?? [];
  const sortedDays = [...prefDays].sort((a, b) => a - b);
  const slots = h.habit_flexible_preferred_slots ?? [];

  return (
    <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
      <p>
        <span className="font-medium text-zinc-800 dark:text-zinc-200">{Number(flex?.duration_minutes ?? 0)} min</span>
        {mode === "times_per_week" ? (
          <span className="text-zinc-500 dark:text-zinc-400"> · {Number(flex?.times_per_week ?? 0)}× per week</span>
        ) : null}
      </p>
      {mode === "preferred_days" && sortedDays.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {sortedDays.map((d) => (
            <span
              key={d}
              className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-xs font-medium text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
            >
              {WEEKDAY_FULL[d]}
            </span>
          ))}
        </div>
      ) : null}
      {slots.length > 0 ? (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Preferred windows</p>
          <ScheduleSlotList slots={slots} dense />
        </div>
      ) : null}
    </div>
  );
}

function HabitListItem({ h, onEdit }: { h: HabitRow; onEdit: () => void }) {
  const flexRules = h.habit_flexible_rules as unknown;
  const flex = Array.isArray(flexRules) ? flexRules[0] : flexRules;
  const fixedSlots = [...(h.habit_fixed_slots ?? [])].sort(compareDayTimeSlots);

  return (
    <li className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-zinc-900 dark:text-zinc-100">{h.name}</p>
          {h.type === "fixed" ? (
            fixedSlots.length > 0 ? (
              <ScheduleSlotList slots={fixedSlots} />
            ) : (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">No fixed slots</p>
            )
          ) : (
            <div className="mt-2">
              <FlexibleHabitMeta h={h} flex={flex as Record<string, unknown> | undefined} />
            </div>
          )}
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
