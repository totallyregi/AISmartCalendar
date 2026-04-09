import { createClient } from "@/lib/supabase/server";
import { findPersonalEventConflicts, validateOrderedInstants } from "@/lib/calendarOverlap";
import { minutesBetween } from "@/lib/scheduler/weekly";
import { NextResponse } from "next/server";

function assignmentLoggedMinutes(startIso: string, endIso: string): { ok: true; minutes: number } | { ok: false; error: string } {
  const m = minutesBetween(new Date(startIso), new Date(endIso));
  if (m <= 0) return { ok: false, error: "Duration must be positive." };
  if (m % 15 !== 0) return { ok: false, error: "Assignment work sessions must use 15-minute steps (e.g. 30, 45, 60 minutes)." };
  return { ok: true, minutes: m };
}

function restoreMinutesFallback(startIso: string, endIso: string): number {
  const parsed = assignmentLoggedMinutes(startIso, endIso);
  if (parsed.ok) return parsed.minutes;
  const raw = minutesBetween(new Date(startIso), new Date(endIso));
  return Math.max(0, Math.floor(raw / 15) * 15);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing, error: readErr } = await supabase
    .from("user_events")
    .select("id,starts_at,ends_at,title,assignment_id,habit_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (readErr || !existing) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};
  const allowTitle = !existing.assignment_id && !existing.habit_id;
  if (typeof body.title === "string" && allowTitle) updates.title = body.title;

  const nextStarts = typeof body.starts_at === "string" ? body.starts_at : String(existing.starts_at);
  const nextEnds = typeof body.ends_at === "string" ? body.ends_at : String(existing.ends_at);

  if (typeof body.starts_at === "string") updates.starts_at = body.starts_at;
  if (typeof body.ends_at === "string") updates.ends_at = body.ends_at;

  const orderErr = validateOrderedInstants(nextStarts, nextEnds);
  if (orderErr) return NextResponse.json({ error: orderErr }, { status: 400 });

  const conflicts = await findPersonalEventConflicts(supabase, user.id, nextStarts, nextEnds, id);
  if (conflicts.length > 0) {
    return NextResponse.json(
      {
        error: "This time overlaps another event on your calendar.",
        conflicts,
      },
      { status: 409 }
    );
  }

  const assignmentId = existing.assignment_id as string | null;
  let previousRemaining: number | null = null;
  let targetRemaining: number | null = null;

  if (assignmentId) {
    const oldLogged = assignmentLoggedMinutes(String(existing.starts_at), String(existing.ends_at));
    const newLogged = assignmentLoggedMinutes(nextStarts, nextEnds);
    if (!oldLogged.ok) return NextResponse.json({ error: oldLogged.error }, { status: 400 });
    if (!newLogged.ok) return NextResponse.json({ error: newLogged.error }, { status: 400 });

    const delta = newLogged.minutes - oldLogged.minutes;
    if (delta === 0 && Object.keys(updates).length === 0) {
      return NextResponse.json(existing);
    }

    const { data: asn, error: asnErr } = await supabase
      .from("assignments")
      .select("remaining_minutes,estimated_minutes")
      .eq("id", assignmentId)
      .eq("user_id", user.id)
      .single();
    if (asnErr || !asn) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

    const remaining = Number(asn.remaining_minutes ?? 0);
    const estimated = Number(asn.estimated_minutes ?? 0);
    const newRem = remaining - delta;
    if (newRem < 0 || newRem > estimated) {
      return NextResponse.json({ error: "Updated time would make assignment minutes inconsistent with remaining work" }, { status: 400 });
    }
    previousRemaining = remaining;
    targetRemaining = newRem;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(existing);
  }

  const { data: patched, error: patchErr } = await supabase.from("user_events").update(updates).eq("id", id).eq("user_id", user.id).select().single();
  if (patchErr || !patched) return NextResponse.json({ error: patchErr?.message ?? "Update failed" }, { status: 500 });

  if (assignmentId && targetRemaining !== null && previousRemaining !== null) {
    const { error: upErr } = await supabase
      .from("assignments")
      .update({ remaining_minutes: targetRemaining })
      .eq("id", assignmentId)
      .eq("user_id", user.id);
    if (upErr) {
      await supabase
        .from("user_events")
        .update({
          starts_at: existing.starts_at,
          ends_at: existing.ends_at,
          ...(allowTitle && updates.title !== undefined ? { title: existing.title } : {}),
        })
        .eq("id", id)
        .eq("user_id", user.id);
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }
  }

  return NextResponse.json(patched);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: row, error: readErr } = await supabase
    .from("user_events")
    .select("id,assignment_id,starts_at,ends_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (readErr || !row) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const assignmentId = row.assignment_id as string | null;
  let previousRemaining: number | null = null;

  if (assignmentId) {
    const addBack = restoreMinutesFallback(String(row.starts_at), String(row.ends_at));
    const { data: asn, error: asnErr } = await supabase
      .from("assignments")
      .select("remaining_minutes,estimated_minutes")
      .eq("id", assignmentId)
      .eq("user_id", user.id)
      .single();
    if (asnErr || !asn) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

    const remaining = Number(asn.remaining_minutes ?? 0);
    const estimated = Number(asn.estimated_minutes ?? 0);
    previousRemaining = remaining;
    const restored = Math.min(estimated, remaining + addBack);

    const { error: upErr } = await supabase
      .from("assignments")
      .update({ remaining_minutes: restored })
      .eq("id", assignmentId)
      .eq("user_id", user.id);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { error: delErr } = await supabase.from("user_events").delete().eq("id", id).eq("user_id", user.id);
  if (delErr) {
    if (assignmentId && previousRemaining !== null) {
      await supabase.from("assignments").update({ remaining_minutes: previousRemaining }).eq("id", assignmentId).eq("user_id", user.id);
    }
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
