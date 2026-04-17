"use client";

import { useConfirm } from "@/components/ConfirmDialogProvider";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Assignment } from "@/lib/types";
import { formatDueDateTime } from "@/lib/datetimeDisplay";
import { AssignmentForm } from "./AssignmentForm";
import { TaskQualityModal } from "./TaskQualityModal";
import { useToast } from "@/components/ToastProvider";

type AssignmentTab = "incomplete" | "completed";

function formatTaskCompletionRating(rating: Assignment["task_completion_rating"] | null | undefined) {
  return (rating ?? "not_started").replaceAll("_", " ");
}

export function AssignmentList({
  classId,
  assignments,
}: {
  classId: string;
  assignments: Assignment[];
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const addAssignmentTriggerRef = useRef<HTMLButtonElement>(null);
  const prevAddingRef = useRef(false);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [adding, setAdding] = useState(false);
  const [tab, setTab] = useState<AssignmentTab>("incomplete");
  const [ratingTarget, setRatingTarget] = useState<Assignment | null>(null);
  const [ratingLoading, setRatingLoading] = useState(false);
  const addTitleId = `assignment-add-title-${classId}`;

  useEffect(() => {
    if (!editing) return;
    const el = document.getElementById(`class-assign-edit-${editing.id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [editing]);

  useEffect(() => {
    if (!adding) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAdding(false);
    };
    window.addEventListener("keydown", onKey);
    const tid = window.setTimeout(() => {
      document.getElementById(addTitleId)?.closest("form")?.querySelector<HTMLInputElement>("input")?.focus();
    }, 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(tid);
    };
  }, [adding, addTitleId]);

  useEffect(() => {
    if (prevAddingRef.current && !adding) {
      requestAnimationFrame(() => addAssignmentTriggerRef.current?.focus());
    }
    prevAddingRef.current = adding;
  }, [adding]);

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
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={addTitleId}
          className="relative z-[1] my-auto w-full max-w-lg outline-none"
          tabIndex={-1}
        >
          <AssignmentForm
            classId={classId}
            ariaTitleId={addTitleId}
            onClose={() => setAdding(false)}
            onSaved={() => {
              setAdding(false);
              router.refresh();
            }}
          />
        </div>
      </div>,
      document.body
    );

  return (
    <div className="space-y-4">
      <button
        ref={addAssignmentTriggerRef}
        type="button"
        onClick={() => {
          setAdding(true);
          setEditing(null);
        }}
        className="rounded-lg bg-palette-sky px-4 py-2 text-sm font-medium text-palette-ink"
      >
        Add assignment
      </button>

      {addModal}
      <TaskQualityModal
        open={!!ratingTarget}
        assignmentName={ratingTarget?.name ?? ""}
        loading={ratingLoading}
        onClose={() => {
          if (!ratingLoading) setRatingTarget(null);
        }}
        onSubmit={async (quality) => {
          if (!ratingTarget) return;
          setRatingLoading(true);
          const res = await fetch(`/api/assignments/${ratingTarget.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: "done",
              task_completion_rating: "completed",
              task_quality_rating: quality,
            }),
          });
          setRatingLoading(false);
          if (res.ok) {
            setRatingTarget(null);
            router.refresh();
          } else {
            const data = await res.json().catch(() => ({}));
            showToast((data as { error?: string }).error ?? "Failed to mark assignment done", "error");
          }
        }}
      />

      <div
        className="flex gap-1 rounded-card border border-palette-card-border bg-palette-cream/70 p-1 shadow-[0_1px_2px_rgba(27,42,74,0.06)]"
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
              ? "bg-palette-card-bg text-palette-navy shadow-sm ring-1 ring-palette-card-border"
              : "text-palette-slate hover:text-palette-navy"
          }`}
        >
          Incomplete
          <span className="ml-1.5 tabular-nums text-palette-slate">({incomplete.length})</span>
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
              ? "bg-palette-card-bg text-palette-navy shadow-sm ring-1 ring-palette-card-border"
              : "text-palette-slate hover:text-palette-navy"
          }`}
        >
          Completed
          <span className="ml-1.5 tabular-nums text-palette-slate">({completed.length})</span>
        </button>
      </div>

      {tab === "incomplete" && (
      <section className="space-y-2" role="tabpanel" aria-labelledby={`class-assign-tab-incomplete-${classId}`}>
        <h3 className="text-sm font-medium text-palette-navy">Incomplete assignments</h3>
        {incomplete.length === 0 && <p className="text-sm text-palette-slate">No incomplete assignments.</p>}
        <ul className="space-y-2">
          {incomplete.map((a) => (
            <li key={a.id} className="ds-card p-4">
              <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-palette-navy">{a.name}</p>
                    <p className="text-sm text-palette-slate">
                      Due {formatDueDateTime(a.due_at)} · Estimated Completion Time: {a.estimated_minutes}min
                    </p>
                    <p className="text-xs text-palette-slate">
                      Completion: {formatTaskCompletionRating(a.task_completion_rating)} · Quality: {a.task_quality_rating ?? "Not rated"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        setRatingTarget(a);
                      }}
                      className="text-sm font-medium text-palette-green"
                    >
                      Mark done
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(a);
                        setAdding(false);
                      }}
                      className="text-sm text-palette-slate hover:text-palette-navy"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const delOk = await confirm({
                          title: "Delete assignment?",
                          message: "Delete this assignment? This cannot be undone.",
                          confirmLabel: "Delete",
                          tone: "danger",
                        });
                        if (!delOk) return;
                        const res = await fetch(`/api/assignments/${a.id}`, { method: "DELETE" });
                        if (res.ok) router.refresh();
                      }}
                      className="text-sm text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              {editing?.id === a.id && (
                <div
                  id={`class-assign-edit-${a.id}`}
                  className="mt-4 border-t border-palette-card-border bg-palette-cream/40 pt-4"
                >
                  <AssignmentForm
                    assignment={a}
                    classId={classId}
                    onClose={() => setEditing(null)}
                    onSaved={() => {
                      setEditing(null);
                      router.refresh();
                    }}
                    className="border-0 bg-transparent p-0 shadow-none"
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
        <h3 className="text-sm font-medium text-palette-navy">Completed assignments</h3>
        {completed.length === 0 && <p className="text-sm text-palette-slate">No completed assignments yet.</p>}
        <ul className="space-y-2">
          {completed.map((a) => (
            <li key={a.id} className="ds-card p-4">
              <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-palette-navy">{a.name}</p>
                    <p className="text-sm text-palette-slate">
                      Due {formatDueDateTime(a.due_at)} · Estimated Completion Time: {a.estimated_minutes}min
                    </p>
                    <p className="text-xs text-palette-slate">
                      Completion: {formatTaskCompletionRating(a.task_completion_rating)} · Quality: {a.task_quality_rating ?? "Not rated"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(a);
                        setAdding(false);
                      }}
                      className="text-sm text-palette-slate hover:text-palette-navy"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const delOk = await confirm({
                          title: "Delete assignment?",
                          message: "Delete this assignment? This cannot be undone.",
                          confirmLabel: "Delete",
                          tone: "danger",
                        });
                        if (!delOk) return;
                        const res = await fetch(`/api/assignments/${a.id}`, { method: "DELETE" });
                        if (res.ok) router.refresh();
                      }}
                      className="text-sm text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              {editing?.id === a.id && (
                <div
                  id={`class-assign-edit-${a.id}`}
                  className="mt-4 border-t border-palette-card-border bg-palette-cream/40 pt-4"
                >
                  <AssignmentForm
                    assignment={a}
                    classId={classId}
                    onClose={() => setEditing(null)}
                    onSaved={() => {
                      setEditing(null);
                      router.refresh();
                    }}
                    className="border-0 bg-transparent p-0 shadow-none"
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
