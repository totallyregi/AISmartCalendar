"use client";

import { useState } from "react";
import { EventEditModal } from "@/components/EventEditModal";

type Event = {
  id: string;
  starts_at: string;
  ends_at: string;
  title: string;
  source:
    | "external"
    | "class"
    | "fixed_habit"
    | "flexible_habit"
    | "assignment"
    | "generated"
    | "personal";
  class_meeting_id?: string;
  class_id?: string;
  /** Weekly plan / applied AI block — edit via `/api/weekly-plan-blocks` */
  fromWeeklyPlan?: boolean;
};

const sourceCls: Record<Event["source"], string> = {
  external: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/35 dark:text-indigo-300",
  class: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  fixed_habit: "bg-green-100 text-green-800 dark:bg-green-900/35 dark:text-green-300",
  flexible_habit: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/35 dark:text-fuchsia-300",
  assignment: "bg-orange-100 text-orange-800 dark:bg-orange-900/35 dark:text-orange-300",
  generated: "bg-cyan-100 text-cyan-900 dark:bg-cyan-900/35 dark:text-cyan-300",
  personal: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

export function WeekTimeline({ date, events, mode, timeZone = "UTC" }: { date: string; events: Event[]; mode: "main" | "ai"; timeZone?: string }) {
  const [editing, setEditing] = useState<Event | null>(null);

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

  const sortedEvents = [...events].sort((a, b) => {
    const byLocalTime = localMinutesOfDay(a.starts_at) - localMinutesOfDay(b.starts_at);
    if (byLocalTime !== 0) return byLocalTime;
    return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
  });

  async function deleteDraft(e: Event) {
    if (!confirm("Delete this AI suggestion?")) return;
    await fetch(`/api/ai-draft-blocks/${e.id}`, { method: "DELETE" });
    window.location.reload();
  }

  async function deleteGeneratedMain(e: Event) {
    if (!confirm("Delete this generated event from Calendar?")) return;
    await fetch(`/api/weekly-plan-blocks/${e.id}`, { method: "DELETE" });
    window.location.reload();
  }

  async function deleteFixedHabit(e: Event) {
    if (!confirm("Delete this fixed habit slot?")) return;
    await fetch(`/api/habit-fixed-slots/${e.id}`, { method: "DELETE" });
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

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{date} details</h3>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {events.length} item{events.length === 1 ? "" : "s"}
        </span>
      </div>
      {sortedEvents.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">No events for this day.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {sortedEvents.map((e, idx) => (
            <li key={`${e.id}-${idx}`} className="space-y-1 rounded border border-zinc-200 p-2 dark:border-zinc-700">
              <div className="flex items-center gap-2 text-sm">
                <span className={`rounded px-1.5 py-0.5 text-xs capitalize ${sourceCls[e.source]}`}>{e.source.replace(/_/g, " ")}</span>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {new Date(e.starts_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone })}
                  {" – "}
                  {new Date(e.ends_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone })}
                  {" · "}
                  {e.title}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {mode === "ai" && e.source === "generated" && (
                  <>
                    <button type="button" onClick={() => setEditing(e)} className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-600">
                      Edit
                    </button>
                    <button type="button" onClick={() => deleteDraft(e)} className="rounded border border-red-300 px-2 py-1 text-red-600 dark:border-red-700">
                      Delete
                    </button>
                  </>
                )}
                {mode === "main" && e.source === "personal" && (
                  <>
                    <button type="button" onClick={() => setEditing(e)} className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-600">
                      Edit
                    </button>
                    <button type="button" onClick={() => deletePersonal(e)} className="rounded border border-red-300 px-2 py-1 text-red-600 dark:border-red-700">
                      Delete
                    </button>
                  </>
                )}
                {mode === "main" && e.source === "class" && e.class_meeting_id && e.class_id && (
                  <>
                    <button type="button" onClick={() => setEditing(e)} className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-600">
                      Edit
                    </button>
                    <button type="button" onClick={() => cancelClassForDate(e)} className="rounded border border-red-300 px-2 py-1 text-red-600 dark:border-red-700">
                      Delete
                    </button>
                  </>
                )}
                {mode === "main" && e.fromWeeklyPlan && (
                  <>
                    <button type="button" onClick={() => setEditing(e)} className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-600">
                      Edit
                    </button>
                    <button type="button" onClick={() => deleteGeneratedMain(e)} className="rounded border border-red-300 px-2 py-1 text-red-600 dark:border-red-700">
                      Delete
                    </button>
                  </>
                )}
                {mode === "main" && e.source === "fixed_habit" && !e.fromWeeklyPlan && (
                  <>
                    <button type="button" onClick={() => setEditing(e)} className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-600">
                      Edit
                    </button>
                    <button type="button" onClick={() => deleteFixedHabit(e)} className="rounded border border-red-300 px-2 py-1 text-red-600 dark:border-red-700">
                      Delete
                    </button>
                  </>
                )}
                {mode === "main" && e.source === "external" && (
                  <>
                    <button type="button" onClick={() => setEditing(e)} className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-600">
                      Edit
                    </button>
                    <button type="button" onClick={() => deleteExternal(e)} className="rounded border border-red-300 px-2 py-1 text-red-600 dark:border-red-700">
                      Delete
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <EventEditModal open={!!editing} event={editing} mode={mode} timeZone={timeZone} onClose={() => setEditing(null)} />
    </div>
  );
}
