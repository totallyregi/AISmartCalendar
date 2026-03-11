import { createClient } from "@/lib/supabase/server";
import { HabitList } from "@/components/HabitList";

export default async function HabitsPage() {
  const supabase = await createClient();
  const { data: habits } = await supabase.from("habits").select("*").order("name");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        Habits
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Add workouts, gym sessions, reading, etc. The daily plan will schedule 1–2 of these around your classes and study time.
      </p>
      <HabitList habits={habits ?? []} />
    </div>
  );
}
