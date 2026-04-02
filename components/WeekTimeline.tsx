"use client";

import { useMemo } from "react";

type Event = {
  id: string;
  starts_at: string;
  ends_at: string;
  title: string;
  source: "external" | "class" | "fixed_habit" | "generated" | "personal";
  class_meeting_id?: string;
  class_id?: string;
};

const sourceCls: Record<Event["source"], string> = {
  external: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  class: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  fixed_habit: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  generated: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  personal: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

export function WeekTimeline({ date, events, mode, timeZone = "UTC" }: { date: string; events: Event[]; mode: "main" | "ai"; timeZone?: string }) {
  function localMinutesOfDay(iso: string) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(new Date(iso));
    const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    const h = Number(map.hour ?? "0");
    const m = Number(map.minute ?? "0");
    return h * 60 + m;
  }

  const sortedEvents = useMemo(
    () =>
      [...events].sort((a, b) => {
        const byLocalTime = localMinutesOfDay(a.starts_at) - localMinutesOfDay(b.starts_at);
        if (byLocalTime !== 0) return byLocalTime;
        return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
      }),
    [events, timeZone]
  );

  async function editDraft(e: Event) {
    const title = prompt("Edit title", e.title) ?? e.title;
    const starts = prompt("Start datetime (ISO)", e.starts_at) ?? e.starts_at;
    const ends = prompt("End datetime (ISO)", e.ends_at) ?? e.ends_at;
    await fetch(`/api/ai-draft-blocks/${e.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, starts_at: starts, ends_at: ends }),
    });
    window.location.reload();
  }

  async function deleteDraft(e: Event) {
    if (!confirm("Delete this AI suggestion?")) return;
    await fetch(`/api/ai-draft-blocks/${e.id}`, { method: "DELETE" });
    window.location.reload();
  }

  async function editPersonal(e: Event) {
    const title = prompt("Event title", e.title) ?? e.title;
    const starts = prompt("Start datetime (ISO)", e.starts_at) ?? e.starts_at;
    const ends = prompt("End datetime (ISO)", e.ends_at) ?? e.ends_at;
    await fetch(`/api/user-events/${e.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, starts_at: starts, ends_at: ends }),
    });
    window.location.reload();
  }

  async function editGeneratedMain(e: Event) {
    const title = prompt("Edit title", e.title) ?? e.title;
    const starts = prompt("Start datetime (ISO)", e.starts_at) ?? e.starts_at;
    const ends = prompt("End datetime (ISO)", e.ends_at) ?? e.ends_at;
    await fetch(`/api/weekly-plan-blocks/${e.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, starts_at: starts, ends_at: ends }),
    });
    window.location.reload();
  }

  async function deleteGeneratedMain(e: Event) {
    if (!confirm("Delete this generated event from Calendar?")) return;
    await fetch(`/api/weekly-plan-blocks/${e.id}`, { method: "DELETE" });
    window.location.reload();
  }

  async function editFixedHabit(e: Event) {
    const start = prompt("Start time HH:MM:SS", "12:00:00") ?? "12:00:00";
    const end = prompt("End time HH:MM:SS", "13:00:00") ?? "13:00:00";
    await fetch(`/api/habit-fixed-slots/${e.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start_time: start, end_time: end }),
    });
    window.location.reload();
  }

  async function deleteFixedHabit(e: Event) {
    if (!confirm("Delete this fixed habit slot?")) return;
    await fetch(`/api/habit-fixed-slots/${e.id}`, { method: "DELETE" });
    window.location.reload();
  }

  async function editExternal(e: Event) {
    const summary = prompt("Event title", e.title) ?? e.title;
    const starts = prompt("Start datetime (ISO)", e.starts_at) ?? e.starts_at;
    const ends = prompt("End datetime (ISO)", e.ends_at) ?? e.ends_at;
    await fetch(`/api/external-events/${e.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary, starts_at: starts, ends_at: ends }),
    });
    window.location.reload();
  }

  async function deleteExternal(e: Event) {
    if (!confirm("Delete this imported event from app calendar? (Sync may add it back)")) return;
    await fetch(`/api/external-events/${e.id}`, { method: "DELETE" });
    window.location.reload();
  }

  async function deletePersonal(e: Event) {
    if (!confirm("Delete personal event?")) return;
    await fetch(`/api/user-events/${e.id}`, { method: "DELETE" });
    window.location.reload();
  }

  async function cancelClassForDate(e: Event) {
    if (!e.class_meeting_id || !e.class_id) return;
    await fetch(`/api/classes/overrides`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ class_meeting_id: e.class_meeting_id, class_id: e.class_id, override_date: date, canceled: true }),
    });
    window.location.reload();
  }

  async function editClassForDate(e: Event) {
    if (!e.class_meeting_id || !e.class_id) return;
    const start = prompt("Override start time HH:MM:SS", "10:00:00") ?? "10:00:00";
    const end = prompt("Override end time HH:MM:SS", "11:00:00") ?? "11:00:00";
    await fetch(`/api/classes/overrides`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        class_meeting_id: e.class_meeting_id,
        class_id: e.class_id,
        override_date: date,
        canceled: false,
        override_start_time: start,
        override_end_time: end,
      }),
    });
    window.location.reload();
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{date} details</h3>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{events.length} item{events.length === 1 ? "" : "s"}</span>
      </div>
      {sortedEvents.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">No events for this day.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {sortedEvents.map((e, idx) => (
            <li key={`${e.id}-${idx}`} className="space-y-1 rounded border border-zinc-200 p-2 dark:border-zinc-700">
              <div className="flex items-center gap-2 text-sm">
                <span className={`rounded px-1.5 py-0.5 text-xs capitalize ${sourceCls[e.source]}`}>{e.source.replace("_", " ")}</span>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {new Date(e.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone })}
                  {" - "}
                  {new Date(e.ends_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone })}
                  {" · "}
                  {e.title}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {mode === "ai" && e.source === "generated" && (
                  <>
                    <button onClick={() => editDraft(e)} className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-600">Edit</button>
                    <button onClick={() => deleteDraft(e)} className="rounded border border-red-300 px-2 py-1 text-red-600 dark:border-red-700">Delete</button>
                  </>
                )}
                {mode === "main" && e.source === "personal" && (
                  <>
                    <button onClick={() => editPersonal(e)} className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-600">Edit</button>
                    <button onClick={() => deletePersonal(e)} className="rounded border border-red-300 px-2 py-1 text-red-600 dark:border-red-700">Delete</button>
                  </>
                )}
                {mode === "main" && e.source === "class" && e.class_meeting_id && (
                  <>
                    <button onClick={() => editClassForDate(e)} className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-600">Edit</button>
                    <button onClick={() => cancelClassForDate(e)} className="rounded border border-red-300 px-2 py-1 text-red-600 dark:border-red-700">Delete</button>
                  </>
                )}
                {mode === "main" && e.source === "generated" && (
                  <>
                    <button onClick={() => editGeneratedMain(e)} className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-600">Edit</button>
                    <button onClick={() => deleteGeneratedMain(e)} className="rounded border border-red-300 px-2 py-1 text-red-600 dark:border-red-700">Delete</button>
                  </>
                )}
                {mode === "main" && e.source === "fixed_habit" && (
                  <>
                    <button onClick={() => editFixedHabit(e)} className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-600">Edit</button>
                    <button onClick={() => deleteFixedHabit(e)} className="rounded border border-red-300 px-2 py-1 text-red-600 dark:border-red-700">Delete</button>
                  </>
                )}
                {mode === "main" && e.source === "external" && (
                  <>
                    <button onClick={() => editExternal(e)} className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-600">Edit</button>
                    <button onClick={() => deleteExternal(e)} className="rounded border border-red-300 px-2 py-1 text-red-600 dark:border-red-700">Delete</button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
