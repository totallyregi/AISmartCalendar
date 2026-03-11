"use client";

import { useState } from "react";
import type { Class } from "@/lib/types";
import { ClassForm } from "./ClassForm";

export function ClassList({ classes }: { classes: Class[] }) {
  const [editing, setEditing] = useState<Class | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => { setAdding(true); setEditing(null); }}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Add class
      </button>

      {(adding || editing) && (
        <ClassForm
          class={editing ?? undefined}
          onClose={() => { setAdding(false); setEditing(null); }}
          onSaved={() => { setAdding(false); setEditing(null); window.location.reload(); }}
        />
      )}

      <ul className="space-y-2">
        {classes.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">{c.name}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{c.schedule}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setEditing(c); setAdding(false); }}
                className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!confirm("Delete this class?")) return;
                  await fetch(`/api/classes/${c.id}`, { method: "DELETE" });
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
