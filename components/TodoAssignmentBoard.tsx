"use client";

import { useEffect, useMemo, useState } from "react";
import type { Assignment } from "@/lib/types";
import { formatDueDateTime } from "@/lib/datetimeDisplay";
import { AssignmentForm } from "./AssignmentForm";

type AssignmentWithClass = Assignment & { class_code: string; class_name: string };
type SortKey = "due_asc" | "due_desc" | "alpha" | "class" | "est_desc" | "est_asc";

function sortAssignments(items: AssignmentWithClass[], sortBy: SortKey) {
  const copy = [...items];
  switch (sortBy) {
    case "due_desc":
      return copy.sort((a, b) => b.due_at.localeCompare(a.due_at));
    case "alpha":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case "class":
      return copy.sort((a, b) => {
        const byClass = `${a.class_code} ${a.class_name}`.localeCompare(`${b.class_code} ${b.class_name}`);
        if (byClass !== 0) return byClass;
        return a.due_at.localeCompare(b.due_at);
      });
    case "est_desc":
      return copy.sort((a, b) => b.estimated_minutes - a.estimated_minutes);
    case "est_asc":
      return copy.sort((a, b) => a.estimated_minutes - b.estimated_minutes);
    case "due_asc":
    default:
      return copy.sort((a, b) => a.due_at.localeCompare(b.due_at));
  }
}

type TodoTab = "incomplete" | "completed";

export function TodoAssignmentBoard({ assignments }: { assignments: AssignmentWithClass[] }) {
  const [editing, setEditing] = useState<AssignmentWithClass | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("due_asc");
  const [tab, setTab] = useState<TodoTab>("incomplete");

  const sorted = useMemo(() => sortAssignments(assignments, sortBy), [assignments, sortBy]);
  const incomplete = sorted.filter((a) => a.status !== "done");
  const completed = sorted.filter((a) => a.status === "done");

  useEffect(() => {
    if (!editing) return;
    const el = document.getElementById(`todo-assign-edit-${editing.id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [editing]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <label className="text-sm text-zinc-700 dark:text-zinc-300">
          Sort by
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
          >
            <option value="due_asc">Due date (earliest first)</option>
            <option value="due_desc">Due date (latest first)</option>
            <option value="alpha">Alphabetical</option>
            <option value="class">Class</option>
            <option value="est_desc">Estimated hours (high to low)</option>
            <option value="est_asc">Estimated hours (low to high)</option>
          </select>
        </label>
      </div>

      <div
        className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-100/80 p-1 dark:border-zinc-700 dark:bg-zinc-900/80"
        role="tablist"
        aria-label="Assignment status"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "incomplete"}
          id="todo-tab-incomplete"
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
          id="todo-tab-completed"
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
      <section className="space-y-2" role="tabpanel" aria-labelledby="todo-tab-incomplete">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Incomplete assignments</h3>
        {incomplete.length === 0 && <p className="text-sm text-zinc-500 dark:text-zinc-400">No incomplete assignments.</p>}
        <ul className="space-y-2">
          {incomplete.map((a) => (
            <li key={a.id} className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{a.name}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {a.class_code}: {a.class_name}
                    </p>
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
                    <button type="button" onClick={() => setEditing(a)} className="text-sm text-zinc-600 dark:text-zinc-400">
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
                  id={`todo-assign-edit-${a.id}`}
                  className="border-t border-zinc-200 bg-zinc-50/80 px-4 py-4 dark:border-zinc-700 dark:bg-zinc-950/40"
                >
                  <AssignmentForm
                    assignment={a}
                    classId={a.class_id}
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
      <section className="space-y-2" role="tabpanel" aria-labelledby="todo-tab-completed">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Completed assignments</h3>
        {completed.length === 0 && <p className="text-sm text-zinc-500 dark:text-zinc-400">No completed assignments yet.</p>}
        <ul className="space-y-2">
          {completed.map((a) => (
            <li key={a.id} className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{a.name}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {a.class_code}: {a.class_name}
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Due {formatDueDateTime(a.due_at)} · Estimated Completion Time: {a.estimated_minutes}min
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setEditing(a)} className="text-sm text-zinc-600 dark:text-zinc-400">
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
                  id={`todo-assign-edit-${a.id}`}
                  className="border-t border-zinc-200 bg-zinc-50/80 px-4 py-4 dark:border-zinc-700 dark:bg-zinc-950/40"
                >
                  <AssignmentForm
                    assignment={a}
                    classId={a.class_id}
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
