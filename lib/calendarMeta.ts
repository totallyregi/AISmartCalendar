/** Month grid dot counts + timeline coloring for planner-applied blocks */
export type CalendarDayMeta = {
  external: number;
  classes: number;
  fixedHabits: number;
  flexibleHabits: number;
  assignments: number;
  personal: number;
  /** AI draft suggestions not yet applied (AI Calendar only) */
  generated: number;
};

export function emptyDayMeta(): CalendarDayMeta {
  return {
    external: 0,
    classes: 0,
    fixedHabits: 0,
    flexibleHabits: 0,
    assignments: 0,
    personal: 0,
    generated: 0,
  };
}

export function incrementMetaForWeeklyBlock(meta: CalendarDayMeta, blockType: string) {
  switch (blockType) {
    case "assignment":
      meta.assignments += 1;
      break;
    case "habit_flexible":
      meta.flexibleHabits += 1;
      break;
    case "habit_fixed":
      meta.fixedHabits += 1;
      break;
    case "class":
      meta.classes += 1;
      break;
    case "external":
      meta.external += 1;
      break;
    default:
      meta.assignments += 1;
  }
}

export type PlannerTimelineSource = "assignment" | "flexible_habit" | "fixed_habit" | "class" | "external";

export function timelineSourceFromWeeklyBlockType(blockType: string): PlannerTimelineSource {
  switch (blockType) {
    case "assignment":
      return "assignment";
    case "habit_flexible":
      return "flexible_habit";
    case "habit_fixed":
      return "fixed_habit";
    case "class":
      return "class";
    case "external":
      return "external";
    default:
      return "assignment";
  }
}
