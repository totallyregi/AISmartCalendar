"use client";

import { useState } from "react";
import type { Habit } from "@/lib/types";
import { HabitForm } from "./HabitForm";

export function HabitList({ habits }: { habits: Habit[] }) {
  const [editing, setEditing] = useState<Habit | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => { setAdding(true); setEditing(null); }}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Add habit
      </button>

      {(adding || editing) && (
        <HabitForm
          habit={editing ?? undefined}
          onClose={() => { setAdding(false); setEditing(null); }}
          onSaved={() => { setAdding(false); setEditing(null); window.location.reload(); }}
        />
      )}

      <ul className="space-y-2">
        {habits.map((h) => (
          <li
            key={h.id}
            className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">{h.name}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {h.typical_duration_min} min
                {h.preferred_time ? ` · Prefer ${h.preferred_time}` : ""}
                {!h.active ? " · Inactive" : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  await fetch(`/api/habits/${h.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...h, active: !h.active }),
                  });
                  window.location.reload();
                }}
                className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                {h.active ? "Pause" : "Resume"}
              </button>
              <button
                type="button"
                onClick={() => { setEditing(h); setAdding(false); }}
                className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!confirm("Delete this habit?")) return;
                  await fetch(`/api/habits/${h.id}`, { method: "DELETE" });
                  window.location.reload();
                }}
                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
