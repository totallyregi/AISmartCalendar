"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Assignment } from "@/lib/types";
import { formatDueDateTime } from "@/lib/datetimeDisplay";
import { AssignmentForm } from "./AssignmentForm";

type AssignmentTab = "incomplete" | "completed";

export function AssignmentList({
  classId,
  assignments,
}: {
  classId: string;
  assignments: Assignment[];
}) {
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [adding, setAdding] = useState(false);
  const [tab, setTab] = useState<AssignmentTab>("incomplete");

  useEffect(() => {
    if (!editing) return;
    const el = document.getElementById(`class-assign-edit-${editing.id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [editing]);

  const incomplete = assignments.filter((a) => a.status !== "done");
  const completed = assignments.filter((a) => a.status === "done");

  const addModal =
    adding &&
    typeof document !== "undefined" &&
    createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
        <button
          type="button"
          className="fixed inset-0 bg-black/40"
          aria-label="Close"
          onClick={() => setAdding(false)}
        />
        <div className="relative z-[1] my-auto w-full max-w-lg">
          <AssignmentForm
            classId={classId}
            onClose={() => setAdding(false)}
            onSaved={() => window.location.reload()}
          />
        </div>
      </div>,
      document.body
    );

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
        Add assignment
      </button>

      {addModal}

      <div
        className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-100/80 p-1 dark:border-zinc-700 dark:bg-zinc-900/80"
        role="tablist"
        aria-label="Assignment status"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "incomplete"}
          id={`class-assign-tab-incomplete-${classId}`}
          onClick={() => {
            setTab("incomplete");
            setEditing(null);
          }}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            tab === "incomplete"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          Incomplete
          <span className="ml-1.5 tabular-nums text-zinc-500 dark:text-zinc-400">({incomplete.length})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "completed"}
          id={`class-assign-tab-completed-${classId}`}
          onClick={() => {
            setTab("completed");
            setEditing(null);
          }}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            tab === "completed"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          Completed
          <span className="ml-1.5 tabular-nums text-zinc-500 dark:text-zinc-400">({completed.length})</span>
        </button>
      </div>

      {tab === "incomplete" && (
      <section className="space-y-2" role="tabpanel" aria-labelledby={`class-assign-tab-incomplete-${classId}`}>
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Incomplete assignments</h3>
        {incomplete.length === 0 && <p className="text-sm text-zinc-500 dark:text-zinc-400">No incomplete assignments.</p>}
        <ul className="space-y-2">
          {incomplete.map((a) => (
            <li key={a.id} className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{a.name}</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Due {formatDueDateTime(a.due_at)} · Estimated Completion Time: {a.estimated_minutes}min
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = confirm("Mark this assignment as done? Future assignment events from now will be removed.");
                        if (!ok) return;
                        await fetch(`/api/assignments/${a.id}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status: "done" }),
                        });
                        window.location.reload();
                      }}
                      className="text-sm text-emerald-600"
                    >
                      Mark done
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(a);
                        setAdding(false);
                      }}
                      className="text-sm text-zinc-600 dark:text-zinc-400"
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
                      className="text-sm text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
              {editing?.id === a.id && (
                <div
                  id={`class-assign-edit-${a.id}`}
                  className="border-t border-zinc-200 bg-zinc-50/80 px-4 py-4 dark:border-zinc-700 dark:bg-zinc-950/40"
                >
                  <AssignmentForm
                    assignment={a}
                    classId={classId}
                    onClose={() => setEditing(null)}
                    onSaved={() => window.location.reload()}
                    className="border-0 bg-transparent p-0 shadow-none dark:bg-transparent"
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
      )}

      {tab === "completed" && (
      <section className="space-y-2" role="tabpanel" aria-labelledby={`class-assign-tab-completed-${classId}`}>
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Completed assignments</h3>
        {completed.length === 0 && <p className="text-sm text-zinc-500 dark:text-zinc-400">No completed assignments yet.</p>}
        <ul className="space-y-2">
          {completed.map((a) => (
            <li key={a.id} className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{a.name}</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Due {formatDueDateTime(a.due_at)} · Estimated Completion Time: {a.estimated_minutes}min
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(a);
                        setAdding(false);
                      }}
                      className="text-sm text-zinc-600 dark:text-zinc-400"
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
                      className="text-sm text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
              {editing?.id === a.id && (
                <div
                  id={`class-assign-edit-${a.id}`}
                  className="border-t border-zinc-200 bg-zinc-50/80 px-4 py-4 dark:border-zinc-700 dark:bg-zinc-950/40"
                >
                  <AssignmentForm
                    assignment={a}
                    classId={classId}
                    onClose={() => setEditing(null)}
                    onSaved={() => window.location.reload()}
                    className="border-0 bg-transparent p-0 shadow-none dark:bg-transparent"
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
      )}
    </div>
  );
}
