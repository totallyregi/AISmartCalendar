"use client";

import { useCallback, useEffect, useState } from "react";
import { TimePicker12h } from "@/components/TimePicker12h";
import { formatConflictApiMessage, validateOrderedInstants } from "@/lib/calendarOverlap";
import { localDateTimeToIsoUtc } from "@/lib/time12h";

type Category = "personal" | "assignment" | "flexible_habit";

type ClassRow = { id: string; class_code: string; class_name: string };
type AssignmentRow = { id: string; name?: string; title?: string; remaining_minutes: number; status: string };
type HabitRow = { id: string; name: string; type: string; active: boolean };

export function AddEventForm({ defaultDate }: { defaultDate: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("personal");
  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [habitId, setHabitId] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("12:00:00");
  const [endTime, setEndTime] = useState("13:00:00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [flexHabits, setFlexHabits] = useState<HabitRow[]>([]);
  const [listsLoading, setListsLoading] = useState(false);

  const minuteStep = category === "assignment" ? 15 : 5;

  const loadClasses = useCallback(async () => {
    setListsLoading(true);
    try {
      const res = await fetch("/api/classes");
      const data = await res.json().catch(() => []);
      if (res.ok && Array.isArray(data)) setClasses(data as ClassRow[]);
    } finally {
      setListsLoading(false);
    }
  }, []);

  const loadAssignments = useCallback(async (cid: string) => {
    if (!cid) {
      setAssignments([]);
      return;
    }
    setListsLoading(true);
    try {
      const res = await fetch(`/api/assignments?classId=${encodeURIComponent(cid)}`);
      const data = await res.json().catch(() => []);
      if (res.ok && Array.isArray(data)) {
        const openRows = (data as AssignmentRow[]).filter(
          (a) => a.status !== "done" && Number(a.remaining_minutes ?? 0) > 0
        );
        setAssignments(openRows);
      } else setAssignments([]);
    } finally {
      setListsLoading(false);
    }
  }, []);

  const loadFlexHabits = useCallback(async () => {
    setListsLoading(true);
    try {
      const res = await fetch("/api/habits");
      const data = await res.json().catch(() => []);
      if (res.ok && Array.isArray(data)) {
        setFlexHabits(
          (data as HabitRow[]).filter((h) => h.type === "flexible" && h.active)
        );
      }
    } finally {
      setListsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (category === "assignment") void loadClasses();
  }, [open, category, loadClasses]);

  useEffect(() => {
    if (!open || category !== "assignment") return;
    void loadAssignments(classId);
  }, [open, category, classId, loadAssignments]);

  useEffect(() => {
    if (!open || category !== "flexible_habit") return;
    void loadFlexHabits();
  }, [open, category, loadFlexHabits]);

  function resetForm() {
    setCategory("personal");
    setTitle("");
    setClassId("");
    setAssignmentId("");
    setHabitId("");
    setDate(defaultDate);
    setStartTime("12:00:00");
    setEndTime("13:00:00");
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const starts_at = localDateTimeToIsoUtc(date, startTime);
    const ends_at = localDateTimeToIsoUtc(date, endTime);
    const orderErr = validateOrderedInstants(starts_at, ends_at);
    if (orderErr) {
      setError(orderErr);
      return;
    }

    if (category === "personal" && !title.trim()) {
      setError("Title is required.");
      return;
    }
    if (category === "assignment" && !assignmentId) {
      setError("Choose a class and assignment.");
      return;
    }
    if (category === "flexible_habit" && !habitId) {
      setError("Choose a flexible habit.");
      return;
    }

    const body: Record<string, unknown> = { category, starts_at, ends_at };
    if (category === "personal") body.title = title.trim();
    if (category === "assignment") body.assignment_id = assignmentId;
    if (category === "flexible_habit") body.habit_id = habitId;

    setLoading(true);
    const res = await fetch("/api/user-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(formatConflictApiMessage(data));
      return;
    }
    window.location.reload();
  }

  const selectedHabit = flexHabits.find((h) => h.id === habitId);
  const selectedAssignment = assignments.find((a) => a.id === assignmentId);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          resetForm();
          setDate(defaultDate);
          setOpen(true);
        }}
        className="rounded-lg bg-palette-sky px-3 py-2 text-sm font-medium text-palette-ink"
      >
        Add Event
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="ds-card p-3">
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <p className="mb-2 text-xs text-palette-slate">
        Classes, fixed habits, and imported events are managed elsewhere—this form is for personal blocks, assignment work
        sessions, and one-off flexible habit times.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-palette-slate">Category</label>
          <select
            value={category}
            onChange={(e) => {
              const c = e.target.value as Category;
              setCategory(c);
              setAssignmentId("");
              setClassId("");
              setHabitId("");
              setError(null);
            }}
            className="w-full rounded-lg border-[0.5px] border-palette-card-border bg-palette-card-bg px-2 py-2 text-palette-navy"
          >
            <option value="personal">Personal</option>
            <option value="assignment">Assignment work session</option>
            <option value="flexible_habit">Flexible habit session</option>
          </select>
        </div>

        {category === "personal" && (
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-palette-slate">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              required
              className="w-full rounded-lg border-[0.5px] border-palette-card-border bg-palette-card-bg px-2 py-2 text-palette-navy"
            />
          </div>
        )}

        {category === "assignment" && (
          <>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-palette-slate">Class</label>
              <select
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setAssignmentId("");
                }}
                required
                className="w-full rounded-lg border-[0.5px] border-palette-card-border bg-palette-card-bg px-2 py-2 text-palette-navy"
              >
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.class_code} — {c.class_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-palette-slate">Assignment</label>
              <select
                value={assignmentId}
                onChange={(e) => setAssignmentId(e.target.value)}
                required
                disabled={!classId}
                className="w-full rounded-lg border-[0.5px] border-palette-card-border bg-palette-card-bg px-2 py-2 text-palette-navy disabled:opacity-60"
              >
                <option value="">{classId ? "Select assignment" : "Pick a class first"}</option>
                {assignments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {(a.name ?? a.title ?? "Assignment").trim()} ({a.remaining_minutes} min left)
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {category === "flexible_habit" && (
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="mb-1 block text-xs font-medium text-palette-slate">Habit</label>
            <select
              value={habitId}
              onChange={(e) => setHabitId(e.target.value)}
              required
              className="w-full rounded-lg border-[0.5px] border-palette-card-border bg-palette-card-bg px-2 py-2 text-palette-navy"
            >
              <option value="">Select flexible habit</option>
              {flexHabits.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
            {selectedHabit && (
              <p className="mt-1 text-xs text-palette-slate">Title on calendar: {selectedHabit.name}</p>
            )}
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-palette-slate">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full rounded-lg border-[0.5px] border-palette-card-border bg-palette-card-bg px-2 py-2 text-palette-navy"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-palette-slate">Start</label>
          <TimePicker12h idPrefix="ae-s" minuteStep={minuteStep} value={startTime} onChange={setStartTime} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-palette-slate">End</label>
          <TimePicker12h idPrefix="ae-e" minuteStep={minuteStep} value={endTime} onChange={setEndTime} />
        </div>
      </div>

      {listsLoading && <p className="mt-2 text-xs text-palette-slate">Loading options…</p>}
      {category === "assignment" && selectedAssignment && (
        <p className="mt-2 text-xs text-palette-slate">
          This session subtracts from remaining time on:{" "}
          <span className="font-medium text-palette-navy">
            {(selectedAssignment.name ?? selectedAssignment.title ?? "Assignment").trim()}
          </span>
          . Use 15-minute steps.
        </p>
      )}

      <div className="mt-2 flex gap-2">
        <button
          disabled={loading}
          className="rounded-lg bg-palette-sky px-3 py-2 text-sm font-medium text-palette-ink disabled:opacity-60"
        >
          {loading ? "Adding…" : "Add"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border-[0.5px] border-palette-card-border px-3 py-2 text-sm text-palette-navy hover:bg-palette-hover"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
