import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { AssignmentList } from "@/components/AssignmentList";
import type { Assignment } from "@/lib/types";

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const supabase = await createClient();

  const [{ data: cls }, { data: assignments }] = await Promise.all([
    supabase
      .from("class_sections")
      .select("id,class_code,class_name,class_meetings(day_of_week,start_time,end_time)")
      .eq("id", classId)
      .single(),
    supabase
      .from("assignments")
      .select("*")
      .eq("class_id", classId)
      .order("due_at", { ascending: true }),
  ]);

  if (!cls) notFound();

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {cls.class_code} — {cls.class_name}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {(cls.class_meetings ?? [])
            .map((m) => `${dayNames[m.day_of_week]} ${m.start_time.slice(0, 5)}-${m.end_time.slice(0, 5)}`)
            .join(" · ") || "No recurring meetings"}
        </p>
      </div>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-zinc-800 dark:text-zinc-200">Assignments</h2>
        <AssignmentList classId={classId} assignments={(assignments ?? []) as Assignment[]} />
      </section>
    </div>
  );
}
