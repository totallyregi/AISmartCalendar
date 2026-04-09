import { createClient } from "@/lib/supabase/server";
import { findPersonalEventConflicts, validateOrderedInstants } from "@/lib/calendarOverlap";
import { minutesBetween } from "@/lib/scheduler/weekly";
import { NextResponse } from "next/server";

type Category = "personal" | "assignment" | "flexible_habit";

function categoryFromBody(body: Record<string, unknown>): Category {
  const c = String(body.category ?? "personal").trim();
  if (c === "assignment" || c === "flexible_habit") return c;
  return "personal";
}

/** Assignment logging uses the same 15-minute grid as the scheduler. */
function assignmentLoggedMinutes(startIso: string, endIso: string): { ok: true; minutes: number } | { ok: false; error: string } {
  const m = minutesBetween(new Date(startIso), new Date(endIso));
  if (m <= 0) return { ok: false, error: "Duration must be positive." };
  if (m % 15 !== 0) return { ok: false, error: "Assignment work sessions must use 15-minute steps (e.g. 30, 45, 60 minutes)." };
  return { ok: true, minutes: m };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const category = categoryFromBody(body);
  const starts_at = String(body.starts_at ?? "");
  const ends_at = String(body.ends_at ?? "");

  if (!starts_at || !ends_at) return NextResponse.json({ error: "starts_at, ends_at required" }, { status: 400 });

  const orderErr = validateOrderedInstants(starts_at, ends_at);
  if (orderErr) return NextResponse.json({ error: orderErr }, { status: 400 });

  const conflicts = await findPersonalEventConflicts(supabase, user.id, starts_at, ends_at);
  if (conflicts.length > 0) {
    return NextResponse.json(
      {
        error: "This time overlaps another event on your calendar.",
        conflicts,
      },
      { status: 409 }
    );
  }

  if (category === "personal") {
    const title = String(body.title ?? "").trim();
    if (!title) return NextResponse.json({ error: "title required for personal events" }, { status: 400 });

    const { data, error } = await supabase
      .from("user_events")
      .insert({
        user_id: user.id,
        title,
        starts_at,
        ends_at,
        source: "manual",
        editable: true,
        assignment_id: null,
        habit_id: null,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (category === "assignment") {
    const assignment_id = String(body.assignment_id ?? "").trim();
    if (!assignment_id) return NextResponse.json({ error: "assignment_id required" }, { status: 400 });

    const logged = assignmentLoggedMinutes(starts_at, ends_at);
    if (!logged.ok) return NextResponse.json({ error: logged.error }, { status: 400 });

    const { data: asn, error: asnErr } = await supabase
      .from("assignments")
      .select("id,name,title,remaining_minutes,status,user_id")
      .eq("id", assignment_id)
      .eq("user_id", user.id)
      .single();
    if (asnErr || !asn) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

    if ((asn.status as string) === "done") {
      return NextResponse.json({ error: "Cannot log time on a completed assignment" }, { status: 400 });
    }

    const remaining = Number(asn.remaining_minutes ?? 0);
    if (logged.minutes > remaining) {
      return NextResponse.json({ error: "Session is longer than remaining minutes on this assignment" }, { status: 400 });
    }

    const titleRaw = typeof asn.name === "string" && asn.name ? asn.name : String((asn as { title?: string }).title ?? "Assignment");
    const title = String(titleRaw).trim() || "Assignment";
    const nextRemaining = Math.max(0, remaining - logged.minutes);

    const { data: inserted, error: insErr } = await supabase
      .from("user_events")
      .insert({
        user_id: user.id,
        title,
        starts_at,
        ends_at,
        source: "manual",
        editable: true,
        assignment_id,
        habit_id: null,
      })
      .select()
      .single();

    if (insErr || !inserted) {
      return NextResponse.json({ error: insErr?.message ?? "Insert failed" }, { status: 500 });
    }

    const { error: upErr } = await supabase
      .from("assignments")
      .update({ remaining_minutes: nextRemaining })
      .eq("id", assignment_id)
      .eq("user_id", user.id);

    if (upErr) {
      await supabase.from("user_events").delete().eq("id", (inserted as { id: string }).id).eq("user_id", user.id);
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    return NextResponse.json(inserted);
  }

  // flexible_habit
  const habit_id = String(body.habit_id ?? "").trim();
  if (!habit_id) return NextResponse.json({ error: "habit_id required" }, { status: 400 });

  const { data: habit, error: habitErr } = await supabase
    .from("habits")
    .select("id,name,type,active,user_id")
    .eq("id", habit_id)
    .eq("user_id", user.id)
    .single();
  if (habitErr || !habit) return NextResponse.json({ error: "Habit not found" }, { status: 404 });

  if ((habit.type as string) !== "flexible" || !habit.active) {
    return NextResponse.json({ error: "Choose an active flexible habit" }, { status: 400 });
  }

  const title = String(habit.name ?? "").trim() || "Habit";

  const { data, error } = await supabase
    .from("user_events")
    .insert({
      user_id: user.id,
      title,
      starts_at,
      ends_at,
      source: "manual",
      editable: true,
      assignment_id: null,
      habit_id,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
