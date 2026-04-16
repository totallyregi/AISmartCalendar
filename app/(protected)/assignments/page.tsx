import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TodoAssignmentBoard } from "@/components/TodoAssignmentBoard";

type AssignmentRow = {
  id: string;
  user_id: string;
  class_id: string;
  name: string;
  due_at: string;
  estimated_minutes: number;
  remaining_minutes: number;
  status: "not_started" | "in_progress" | "done";
  task_completion_rating: "not_started" | "partially_completed" | "completed";
  task_quality_rating: number | null;
};

type ClassRow = {
  id: string;
  class_code: string;
  class_name: string;
};

export default async function AssignmentsPage() {
  const supabase = await createClient();
  const [{ data: assignments }, { data: classes }] = await Promise.all([
    supabase.from("assignments").select("*").order("due_at", { ascending: true }),
    supabase.from("class_sections").select("id,class_code,class_name"),
  ]);

  const classMap = Object.fromEntries(((classes ?? []) as ClassRow[]).map((c) => [c.id, c]));

  const items = ((assignments ?? []) as AssignmentRow[]).map((a) => {
    const cls = classMap[a.class_id];
    return {
      ...a,
      class_code: cls?.class_code ?? "Class",
      class_name: cls?.class_name ?? "Unknown",
    };
  });

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-medium text-palette-navy">To-do List</h1>
        <p className="text-sm text-palette-slate">
          All assignments across classes. Sort and manage in one place.
        </p>
      </div>
      {items.length === 0 && (
        <div className="ds-card border-dashed p-6">
          <p className="text-sm font-medium text-palette-navy">No assignments yet</p>
          <p className="mt-2 text-sm text-palette-slate">
            Assignments belong to a class. Open a class and use <strong>Add assignment</strong>, or go to{" "}
            <Link href="/classes" className="font-medium text-palette-navy underline-offset-2 hover:underline">
              Classes
            </Link>{" "}
            to set up your courses first.
          </p>
        </div>
      )}
      <TodoAssignmentBoard assignments={items} />
    </div>
  );
}
