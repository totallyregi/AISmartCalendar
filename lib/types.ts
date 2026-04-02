export type AssignmentStatus = "not_started" | "in_progress" | "done";
export type HabitType = "fixed" | "flexible";
export type SchedulerMode = "intense" | "relaxed" | "lazy";

export interface ClassMeeting {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface ClassSection {
  id: string;
  user_id: string;
  class_code: string;
  class_name: string;
  created_at?: string;
  class_meetings?: ClassMeeting[];
}

export interface Assignment {
  id: string;
  user_id: string;
  class_id: string;
  name: string;
  due_at: string;
  estimated_minutes: number;
  remaining_minutes: number;
  status: AssignmentStatus;
  created_at?: string;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  type: HabitType;
  active: boolean;
  created_at?: string;
}

export interface HabitFixedSlot {
  id?: string;
  habit_id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface HabitFlexibleRule {
  habit_id?: string;
  duration_minutes: number;
  preference_mode?: "preferred_days" | "times_per_week";
  preferred_days: number[];
  times_per_week?: number | null;
  habit_flexible_preferred_slots?: HabitFlexiblePreferredSlot[];
}

export interface HabitFlexiblePreferredSlot {
  id?: string;
  habit_id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface WeeklyPlanBlock {
  id?: string;
  block_type: "assignment" | "habit_flexible" | "habit_fixed" | "class" | "external";
  title: string;
  starts_at: string;
  ends_at: string;
  assignment_id?: string | null;
  habit_id?: string | null;
  planned_minutes?: number;
}

export interface SchedulerPreference {
  id?: string;
  user_id?: string;
  min_daily_minutes: number;
  preferred_daily_minutes: number;
  max_daily_minutes: number;
  max_consecutive_minutes: number;
  break_minutes: number;
  default_apply_days: number[];
  timezone: string;
}

export interface SchedulerPreferredWindow {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_override: boolean;
}
