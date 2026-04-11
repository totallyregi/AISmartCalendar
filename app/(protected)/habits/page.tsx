import { createClient } from "@/lib/supabase/server";
import { HabitList } from "@/components/HabitList";

export default async function HabitsPage() {
  const supabase = await createClient();
  const { data: habits } = await supabase
    .from("habits")
    .select("*,habit_fixed_slots(*),habit_flexible_rules(*),habit_flexible_preferred_slots(*)")
    .order("name");

  const list = (habits ?? []) as never[];

  return (
    <div className="space-y-6 animate-in">
      <h1 className="text-2xl font-medium text-palette-navy">Habits</h1>
      <p className="text-sm text-palette-slate">
        Use fixed habits for specific day/time routines and flexible habits for duration-based weekly targets.
      </p>
      {list.length === 0 && (
        <div className="ds-card border-dashed p-6">
          <p className="text-sm font-medium text-palette-navy">No habits yet</p>
          <p className="mt-2 text-sm text-palette-slate">
            Create routines the scheduler can work around. Use <strong>Add habit</strong> below to add your first fixed or flexible habit.
          </p>
        </div>
      )}
      <HabitList habits={list} />
    </div>
  );
}
