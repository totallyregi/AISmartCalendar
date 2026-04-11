"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/ConfirmDialogProvider";
import type { CalendarTimelineEvent } from "@/lib/calendarTimelineEvent";

export type CalendarTimelineActions = {
  deleteDraft: (e: CalendarTimelineEvent) => Promise<void>;
  deleteGeneratedMain: (e: CalendarTimelineEvent) => Promise<void>;
  deleteFixedHabit: (e: CalendarTimelineEvent) => Promise<void>;
  deleteExternal: (e: CalendarTimelineEvent) => Promise<void>;
  deletePersonal: (e: CalendarTimelineEvent) => Promise<void>;
  cancelClassForDate: (e: CalendarTimelineEvent) => Promise<void>;
};

/**
 * Delete/cancel handlers shared by WeekTimeline and DayAgendaModal.
 * `overrideDateYyyyMmDd` is the calendar day key (YYYY-MM-DD) for class cancel/override.
 */
export function useCalendarTimelineActions(overrideDateYyyyMmDd: string): CalendarTimelineActions {
  const confirm = useConfirm();
  const router = useRouter();

  const deleteDraft = useCallback(
    async (e: CalendarTimelineEvent) => {
      const ok = await confirm({
        title: "Delete AI suggestion?",
        message: "Delete this AI suggestion?",
        confirmLabel: "Delete",
        tone: "danger",
      });
      if (!ok) return;
      const res = await fetch(`/api/ai-draft-blocks/${e.id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    },
    [confirm, router]
  );

  const deleteGeneratedMain = useCallback(
    async (e: CalendarTimelineEvent) => {
      const ok = await confirm({
        title: "Remove from calendar?",
        message: "Delete this generated event from Calendar?",
        confirmLabel: "Delete",
        tone: "danger",
      });
      if (!ok) return;
      const res = await fetch(`/api/weekly-plan-blocks/${e.id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    },
    [confirm, router]
  );

  const deleteFixedHabit = useCallback(
    async (e: CalendarTimelineEvent) => {
      const ok = await confirm({
        title: "Delete habit slot?",
        message: "Delete this fixed habit slot?",
        confirmLabel: "Delete",
        tone: "danger",
      });
      if (!ok) return;
      const res = await fetch(`/api/habit-fixed-slots/${e.id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    },
    [confirm, router]
  );

  const deleteExternal = useCallback(
    async (e: CalendarTimelineEvent) => {
      const ok = await confirm({
        title: "Delete imported event?",
        message: "Delete this imported event from app calendar? Sync may add it back.",
        confirmLabel: "Delete",
        tone: "danger",
      });
      if (!ok) return;
      const res = await fetch(`/api/external-events/${e.id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    },
    [confirm, router]
  );

  const deletePersonal = useCallback(
    async (e: CalendarTimelineEvent) => {
      const ok = await confirm({
        title: "Delete event?",
        message: "Delete this personal event?",
        confirmLabel: "Delete",
        tone: "danger",
      });
      if (!ok) return;
      const res = await fetch(`/api/user-events/${e.id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    },
    [confirm, router]
  );

  const cancelClassForDate = useCallback(
    async (e: CalendarTimelineEvent) => {
      if (!e.class_meeting_id || !e.class_id) return;
      const res = await fetch(`/api/classes/overrides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_meeting_id: e.class_meeting_id,
          class_id: e.class_id,
          override_date: overrideDateYyyyMmDd,
          canceled: true,
        }),
      });
      if (res.ok) router.refresh();
    },
    [overrideDateYyyyMmDd, router]
  );

  return {
    deleteDraft,
    deleteGeneratedMain,
    deleteFixedHabit,
    deleteExternal,
    deletePersonal,
    cancelClassForDate,
  };
}
