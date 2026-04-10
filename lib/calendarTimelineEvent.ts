/** Event shape used by week timeline, day agenda, and edit/delete flows. */
export type CalendarTimelineEvent = {
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
