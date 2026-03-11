export type AssignmentStatus = "not_started" | "in_progress" | "done";

export interface Profile {
  id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Class {
  id: string;
  user_id: string;
  name: string;
  schedule: string;
  created_at: string;
}

export interface Assignment {
  id: string;
  user_id: string;
  title: string;
  due_date: string;
  course_name: string;
  notes: string | null;
  status: AssignmentStatus;
  created_at: string;
}

export interface AssignmentSubtask {
  id: string;
  assignment_id: string;
  title: string;
  order: number;
  completed: boolean;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  typical_duration_min: number;
  preferred_time: string | null;
  active: boolean;
  created_at?: string;
}

export interface DailyPlanBlock {
  start: string;
  end: string;
  type: "class" | "study" | "habit" | "break";
  label: string;
  details?: string;
}

export interface DailyPlan {
  date: string;
  blocks: DailyPlanBlock[];
}

export interface CheckIn {
  id: string;
  user_id: string;
  date: string;
  responses_json: Record<string, string>;
  created_at: string;
}
