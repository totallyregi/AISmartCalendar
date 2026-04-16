"use client";

import { useState } from "react";
import type { Assignment, TaskCompletionRating } from "@/lib/types";
import { TimePicker12h } from "@/components/TimePicker12h";
import { localDateTimeToIsoUtc, localHhMmSsFromDate, localYyyyMmDd } from "@/lib/time12h";

const statuses = ["not_started", "in_progress", "done"] as const;
const completionRatings: TaskCompletionRating[] = ["not_started", "partially_completed", "completed"];

function toMinutes(hours: number, minutes: number) {
  return hours * 60 + minutes;
}

function initialDueFromAssignment(a?: Assignment): { date: string; time: string } {
  if (a?.due_at) {
    const d = new Date(a.due_at);
    return { date: localYyyyMmDd(d), time: localHhMmSsFromDate(d, 5) };
  }
  const now = new Date();
  return { date: localYyyyMmDd(now), time: "17:00:00" };
}

export function AssignmentForm({
  assignment,
  classId,
  onClose,
  onSaved,
  className,
  ariaTitleId,
}: {
  assignment?: Assignment;
  classId: string;
  onClose: () => void;
  onSaved: () => void;
  /** Extra classes for the form (e.g. inline under a list row). */
  className?: string;
  /** When set (e.g. in a modal), labels the form for `aria-labelledby` on the dialog. */
  ariaTitleId?: string;
}) {
  const initDue = initialDueFromAssignment(assignment);
  const [name, setName] = useState(assignment?.name ?? "");
  const [dueDate, setDueDate] = useState(initDue.date);
  const [dueTime, setDueTime] = useState(initDue.time);
  const [estHours, setEstHours] = useState(Math.floor((assignment?.estimated_minutes ?? 0) / 60));
  const [estMins, setEstMins] = useState((assignment?.estimated_minutes ?? 0) % 60);
  const [status, setStatus] = useState(assignment?.status ?? "not_started");
  const [taskCompletionRating, setTaskCompletionRating] = useState<TaskCompletionRating>(
    assignment?.task_completion_rating ?? "not_started"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const estimated_minutes = toMinutes(estHours, estMins);
    if (estimated_minutes % 15 !== 0 || estimated_minutes <= 0) {
      setError("Estimated time must be in 15-minute intervals and > 0");
      setLoading(false);
      return;
    }

    const due_at = localDateTimeToIsoUtc(dueDate, dueTime);

    const url = assignment ? `/api/assignments/${assignment.id}` : "/api/assignments";
    const method = assignment ? "PUT" : "POST";
    const payload = assignment
      ? {
          name,
          due_at,
          estimated_minutes,
          status,
          task_completion_rating: taskCompletionRating,
        }
      : {
          class_id: classId,
          name,
          due_at,
          estimated_minutes,
          task_completion_rating: taskCompletionRating,
        };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save assignment");
      return;
    }
    onSaved();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={["ds-card p-4", className].filter(Boolean).join(" ")}
    >
      <h3 id={ariaTitleId} className="font-medium text-palette-navy">
        {assignment ? "Edit assignment" : "New assignment"}
      </h3>
      <p className="mt-1 text-xs text-palette-slate">Class is locked to this class tab.</p>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-palette-navy">Assignment name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Midterm revision"
            required
            className="mt-1 w-full rounded-lg border border-palette-card-border bg-palette-card-bg px-3 py-2 text-palette-navy"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-palette-navy">Due date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-palette-card-border bg-palette-card-bg px-3 py-2 text-palette-navy"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-palette-navy">Due time</label>
          <div className="mt-1">
            <TimePicker12h idPrefix="asg-due" minuteStep={5} value={dueTime} onChange={setDueTime} />
          </div>
        </div>

        {assignment && (
          <div>
            <label className="block text-sm font-medium text-palette-navy">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Assignment["status"])}
              className="mt-1 w-full rounded-lg border border-palette-card-border bg-palette-card-bg px-3 py-2 text-palette-navy"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-palette-navy">Estimated hours</label>
          <input
            type="number"
            min={0}
            value={estHours}
            onChange={(e) => setEstHours(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-palette-card-border bg-palette-card-bg px-3 py-2 text-palette-navy"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-palette-navy">Estimated minutes</label>
          <select
            value={estMins}
            onChange={(e) => setEstMins(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-palette-card-border bg-palette-card-bg px-3 py-2 text-palette-navy"
          >
            {[0, 15, 30, 45].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-palette-navy">Task completion rating</label>
          <select
            value={taskCompletionRating}
            onChange={(e) => setTaskCompletionRating(e.target.value as TaskCompletionRating)}
            className="mt-1 w-full rounded-lg border border-palette-card-border bg-palette-card-bg px-3 py-2 text-palette-navy"
          >
            {completionRatings.map((rating) => (
              <option key={rating} value={rating}>
                {rating.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>

      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-palette-sky px-4 py-2 text-sm font-medium text-palette-ink disabled:opacity-60"
        >
          {loading ? "Saving..." : assignment ? "Update" : "Add assignment"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-palette-card-border bg-palette-card-bg px-4 py-2 text-sm text-palette-navy hover:bg-palette-hover"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
