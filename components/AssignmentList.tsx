"use client";

import { useState } from "react";
import type { Assignment, AssignmentSubtask } from "@/lib/types";
import { AssignmentForm } from "./AssignmentForm";

type AssignmentWithSubtasks = Assignment & { assignment_subtasks?: AssignmentSubtask[] };

export function AssignmentList({ assignments }: { assignments: AssignmentWithSubtasks[] }) {
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => { setAdding(true); setEditing(null); }}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Add assignment
      </button>

      {(adding || editing) && (
        <AssignmentForm
          assignment={editing ?? undefined}
          onClose={() => { setAdding(false); setEditing(null); }}
          onSaved={() => { setAdding(false); setEditing(null); window.location.reload(); }}
        />
      )}

      <ul className="space-y-3">
        {assignments.map((a) => (
          <li
            key={a.id}
            className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{a.title}</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {a.course_name} · Due {a.due_date} · {a.status}
                </p>
                {a.assignment_subtasks?.length ? (
                  <ul className="mt-2 list-inside list-disc text-sm text-zinc-600 dark:text-zinc-400">
                    {a.assignment_subtasks
                      .sort((x, y) => x.order - y.order)
                      .map((s) => (
                        <li key={s.id}>
                          {s.completed ? <s>{s.title}</s> : s.title}
                        </li>
                      ))}
                  </ul>
                ) : null}
              </div>
              <div className="flex gap-2">
                <BreakdownButton assignmentId={a.id} />
                <button
                  type="button"
                  onClick={() => { setEditing(a); setAdding(false); }}
                  className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm("Delete this assignment?")) return;
                    await fetch(`/api/assignments/${a.id}`, { method: "DELETE" });
                    window.location.reload();
                  }}
                  className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
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

function BreakdownButton({ assignmentId }: { assignmentId: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/assignments/${assignmentId}/breakdown`, { method: "POST" });
          if (res.ok) window.location.reload();
          else alert((await res.json()).error ?? "Failed to break down");
        } finally {
          setLoading(false);
        }
      }}
      className="text-sm text-zinc-600 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-100"
    >
      {loading ? "Breaking down…" : "Break down with AI"}
    </button>
  );
}
