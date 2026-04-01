"use client";

import { useState } from "react";
import type { Assignment } from "@/lib/types";
import { AssignmentForm } from "./AssignmentForm";

export function AssignmentList({
  classId,
  assignments,
}: {
  classId: string;
  assignments: Assignment[];
}) {
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4">
      <button type="button" onClick={() => { setAdding(true); setEditing(null); }} className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
        Add assignment
      </button>

      {(adding || editing) && (
        <AssignmentForm
          assignment={editing ?? undefined}
          classId={classId}
          onClose={() => { setAdding(false); setEditing(null); }}
          onSaved={() => window.location.reload()}
        />
      )}

      <ul className="space-y-2">
        {assignments.map((a) => (
          <li key={a.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{a.name}</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Due {new Date(a.due_at).toLocaleString()} · {a.estimated_minutes} min est · remaining {a.remaining_minutes} min · {a.status}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setEditing(a); setAdding(false); }} className="text-sm text-zinc-600 dark:text-zinc-400">Edit</button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm("Delete this assignment?")) return;
                    await fetch(`/api/assignments/${a.id}`, { method: "DELETE" });
                    window.location.reload();
                  }}
                  className="text-sm text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
