import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ClassList } from "@/components/ClassList";

export default async function ClassesPage() {
  const supabase = await createClient();
  const { data: classes } = await supabase.from("classes").select("*").order("name");

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          My classes
        </h1>
        <ClassList classes={classes ?? []} />
      </div>
      {(!classes || classes.length === 0) && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Add a class to get started. Include schedule (e.g. Mon/Wed 10am).
        </p>
      )}
    </div>
  );
}
