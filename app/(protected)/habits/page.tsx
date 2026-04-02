import { createClient } from "@/lib/supabase/server";
import { HabitList } from "@/components/HabitList";

export default async function HabitsPage() {
  const supabase = await createClient();
  const { data: habits } = await supabase
    .from("habits")
    .select("*,habit_fixed_slots(*),habit_flexible_rules(*),habit_flexible_preferred_slots(*)")
    .order("name");

  return (
    <div className="space-y-6 animate-in">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Habits</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Use fixed habits for specific day/time routines and flexible habits for duration-based weekly targets.
      </p>
      <HabitList habits={(habits ?? []) as never[]} />
    </div>
  );
}
