import { createClient } from "@/lib/supabase/server";
import { addDays, buildDaySlots, mergeIntervals, removeBusy, weekStartSunday, type Interval } from "@/lib/scheduler/weekly";
import { NextResponse } from "next/server";

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function toDateTimeLocalIso(date: Date, hhmmss: string) {
  return new Date(`${toIsoDate(date)}T${hhmmss}`);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const requested = typeof body.weekStart === "string" ? new Date(`${body.weekStart}T00:00:00`) : weekStartSunday(new Date());
  const weekStart = weekStartSunday(requested);
  const weekEnd = addDays(weekStart, 7);

  const currentWeekStart = weekStartSunday(new Date());
  if (weekStart.getTime() < currentWeekStart.getTime()) {
    return NextResponse.json({ error: "Cannot generate past weeks" }, { status: 400 });
  }

  if (weekStart.getTime() > currentWeekStart.getTime()) {
    const prevStart = addDays(weekStart, -7).toISOString().slice(0, 10);
    const { data: prevPlan } = await supabase
      .from("weekly_plans")
      .select("id")
      .eq("user_id", user.id)
      .eq("week_start_date", prevStart)
      .single();
    if (!prevPlan) {
      return NextResponse.json({ error: `Must generate previous week first (${prevStart})` }, { status: 400 });
    }
  }

  const [extRes, classRes, fixedHabitRes, flexHabitRes, assignmentRes] = await Promise.all([
    supabase.from("external_events").select("starts_at,ends_at").eq("user_id", user.id).gte("starts_at", weekStart.toISOString()).lt("starts_at", weekEnd.toISOString()),
    supabase.from("class_sections").select("class_code,class_name,class_meetings(day_of_week,start_time,end_time)").eq("user_id", user.id),
    supabase.from("habits").select("id,name,habit_fixed_slots(day_of_week,start_time,end_time)").eq("user_id", user.id).eq("type", "fixed").eq("active", true),
    supabase.from("habits").select("id,name,habit_flexible_rules(duration_minutes,preferred_days,times_per_week)").eq("user_id", user.id).eq("type", "flexible").eq("active", true),
    supabase.from("assignments").select("*").eq("user_id", user.id).neq("status", "done").order("due_at", { ascending: true }),
  ]);

  const busy: Interval[] = [];

  (extRes.data ?? []).forEach((e) => {
    busy.push({ start: new Date(e.starts_at as string), end: new Date(e.ends_at as string) });
  });

  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    const dow = day.getDay();

    (classRes.data ?? []).forEach((c) => {
      (c.class_meetings ?? []).forEach((m: { day_of_week: number; start_time: string; end_time: string }) => {
        if (m.day_of_week === dow) {
          busy.push({ start: toDateTimeLocalIso(day, m.start_time), end: toDateTimeLocalIso(day, m.end_time) });
        }
      });
    });

    (fixedHabitRes.data ?? []).forEach((h) => {
      (h.habit_fixed_slots ?? []).forEach((s: { day_of_week: number; start_time: string; end_time: string }) => {
        if (s.day_of_week === dow) {
          busy.push({ start: toDateTimeLocalIso(day, s.start_time), end: toDateTimeLocalIso(day, s.end_time) });
        }
      });
    });
  }

  const mergedBusy = mergeIntervals(busy);
  const freeSlots: Interval[] = [];
  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    freeSlots.push(...removeBusy(buildDaySlots(day), mergedBusy));
  }

  const blocks: { block_type: string; title: string; starts_at: string; ends_at: string; assignment_id?: string; habit_id?: string }[] = [];
  const slotUsed = new Set<number>();

  // Assignment allocation: 30-min chunks before due date.
  const assignments = (assignmentRes.data ?? []) as {
    id: string;
    class_id: string;
    name: string;
    due_at: string;
    remaining_minutes: number;
  }[];

  for (const a of assignments) {
    let needed = Math.max(0, Number(a.remaining_minutes ?? 0));
    if (!needed) continue;
    const due = new Date(a.due_at);

    for (let i = 0; i < freeSlots.length - 1 && needed >= 30; i++) {
      if (slotUsed.has(i) || slotUsed.has(i + 1)) continue;
      const s1 = freeSlots[i];
      const s2 = freeSlots[i + 1];
      const contiguous = s1.end.getTime() === s2.start.getTime();
      const blockEnd = contiguous ? s2.end : s1.end;
      const blockMins = contiguous ? 30 : 15;
      if (blockMins < 30) continue;
      if (s1.start >= due) continue;

      slotUsed.add(i);
      slotUsed.add(i + 1);
      blocks.push({
        block_type: "assignment",
        title: `Assignment: ${a.name}`,
        starts_at: s1.start.toISOString(),
        ends_at: blockEnd.toISOString(),
        assignment_id: a.id,
      });
      needed -= 30;
    }
  }

  // Flexible habits allocation.
  const flexHabits = (flexHabitRes.data ?? []) as {
    id: string;
    name: string;
    habit_flexible_rules: { duration_minutes: number; preferred_days: number[]; times_per_week: number | null }[];
  }[];

  for (const h of flexHabits) {
    const rule = h.habit_flexible_rules?.[0];
    if (!rule) continue;
    const duration = Math.max(15, Number(rule.duration_minutes || 60));
    const timesPerWeek = Number(rule.times_per_week ?? (rule.preferred_days?.length || 1));
    const targetDays = (rule.preferred_days ?? []).length ? new Set(rule.preferred_days) : null;

    let placed = 0;
    for (let i = 0; i < freeSlots.length && placed < timesPerWeek; i++) {
      if (slotUsed.has(i)) continue;
      const s = freeSlots[i];
      const dow = s.start.getDay();
      if (targetDays && !targetDays.has(dow)) continue;

      const needSlots = Math.max(1, Math.floor(duration / 15));
      let can = true;
      for (let k = 0; k < needSlots; k++) {
        if (!freeSlots[i + k] || slotUsed.has(i + k)) {
          can = false;
          break;
        }
        if (k > 0 && freeSlots[i + k - 1].end.getTime() !== freeSlots[i + k].start.getTime()) {
          can = false;
          break;
        }
      }
      if (!can) continue;

      for (let k = 0; k < needSlots; k++) slotUsed.add(i + k);
      blocks.push({
        block_type: "habit_flexible",
        title: `Habit: ${h.name}`,
        starts_at: freeSlots[i].start.toISOString(),
        ends_at: freeSlots[i + needSlots - 1].end.toISOString(),
        habit_id: h.id,
      });
      placed += 1;
    }
  }

  const weekStartDate = weekStart.toISOString().slice(0, 10);
  const { data: plan, error: planErr } = await supabase
    .from("weekly_plans")
    .upsert({ user_id: user.id, week_start_date: weekStartDate, status: "generated" }, { onConflict: "user_id,week_start_date" })
    .select()
    .single();

  if (planErr || !plan) return NextResponse.json({ error: planErr?.message ?? "Failed to save weekly plan" }, { status: 500 });

  await supabase.from("weekly_plan_blocks").delete().eq("weekly_plan_id", plan.id);
  if (blocks.length) {
    const { error: blockErr } = await supabase.from("weekly_plan_blocks").insert(
      blocks.map((b) => ({
        weekly_plan_id: plan.id,
        user_id: user.id,
        ...b,
      }))
    );
    if (blockErr) return NextResponse.json({ error: blockErr.message }, { status: 500 });
  }

  // Update assignment remaining minutes based on scheduled assignment blocks.
  const minutesByAssignment: Record<string, number> = {};
  for (const b of blocks) {
    if (!b.assignment_id) continue;
    const mins = Math.round((new Date(b.ends_at).getTime() - new Date(b.starts_at).getTime()) / 60000);
    minutesByAssignment[b.assignment_id] = (minutesByAssignment[b.assignment_id] ?? 0) + mins;
  }

  for (const a of assignments) {
    const used = minutesByAssignment[a.id] ?? 0;
    if (!used) continue;
    const nextRemaining = Math.max(0, Number(a.remaining_minutes) - used);
    await supabase
      .from("assignments")
      .update({ remaining_minutes: nextRemaining, status: nextRemaining === 0 ? "done" : "in_progress" })
      .eq("id", a.id)
      .eq("user_id", user.id);
  }

  return NextResponse.json({ ok: true, weekStart: weekStartDate, blocks: blocks.length });
}
