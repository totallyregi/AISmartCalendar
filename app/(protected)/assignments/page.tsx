import { createClient } from "@/lib/supabase/server";
import { AssignmentList } from "@/components/AssignmentList";

export default async function AssignmentsPage() {
  const supabase = await createClient();
  const { data: assignments } = await supabase
    .from("assignments")
    .select("*, assignment_subtasks(id, title, \"order\", completed)")
    .order("due_date", { ascending: true });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        Assignments
      </h1>
      <AssignmentList assignments={assignments ?? []} />
    </div>
  );
}
