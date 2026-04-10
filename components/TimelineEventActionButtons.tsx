"use client";

import type { CalendarTimelineEvent } from "@/lib/calendarTimelineEvent";
import type { CalendarTimelineActions } from "@/hooks/useCalendarTimelineActions";

type Variant = "palette" | "zinc";

export function TimelineEventActionButtons({
  event: e,
  mode,
  onEdit,
  actions,
  variant = "palette",
}: {
  event: CalendarTimelineEvent;
  mode: "main" | "ai";
  onEdit: () => void;
  actions: CalendarTimelineActions;
  variant?: Variant;
}) {
  const editCls =
    variant === "zinc"
      ? "rounded-lg border border-zinc-300 px-2 py-1 text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
      : "rounded border-[0.5px] border-palette-card-border px-2 py-1 text-palette-navy hover:bg-palette-hover";
  const delCls =
    variant === "zinc"
      ? "rounded-lg border border-red-300 px-2 py-1 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
      : "rounded border border-red-300 px-2 py-1 text-red-600";

  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {mode === "ai" && e.source === "generated" && (
        <>
          <button type="button" onClick={onEdit} className={editCls}>
            Edit
          </button>
          <button type="button" onClick={() => void actions.deleteDraft(e)} className={delCls}>
            Delete
          </button>
        </>
      )}
      {mode === "main" && e.source === "personal" && (
        <>
          <button type="button" onClick={onEdit} className={editCls}>
            Edit
          </button>
          <button type="button" onClick={() => void actions.deletePersonal(e)} className={delCls}>
            Delete
          </button>
        </>
      )}
      {mode === "main" && e.source === "class" && e.class_meeting_id && e.class_id && (
        <>
          <button type="button" onClick={onEdit} className={editCls}>
            Edit
          </button>
          <button type="button" onClick={() => void actions.cancelClassForDate(e)} className={delCls}>
            Delete
          </button>
        </>
      )}
      {mode === "main" && e.fromWeeklyPlan && (
        <>
          <button type="button" onClick={onEdit} className={editCls}>
            Edit
          </button>
          <button type="button" onClick={() => void actions.deleteGeneratedMain(e)} className={delCls}>
            Delete
          </button>
        </>
      )}
      {mode === "main" && e.source === "fixed_habit" && !e.fromWeeklyPlan && (
        <>
          <button type="button" onClick={onEdit} className={editCls}>
            Edit
          </button>
          <button type="button" onClick={() => void actions.deleteFixedHabit(e)} className={delCls}>
            Delete
          </button>
        </>
      )}
      {mode === "main" && e.source === "external" && (
        <>
          <button type="button" onClick={onEdit} className={editCls}>
            Edit
          </button>
          <button type="button" onClick={() => void actions.deleteExternal(e)} className={delCls}>
            Delete
          </button>
        </>
      )}
    </div>
  );
}
