import { createClient } from "@/lib/supabase/server";
import { findPersonalEventConflicts, validateOrderedInstants } from "@/lib/calendarOverlap";
import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing, error: readErr } = await supabase
    .from("user_events")
    .select("id,starts_at,ends_at,title")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (readErr || !existing) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};
  if (typeof body.title === "string") updates.title = body.title;

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

  const { data, error } = await supabase.from("user_events").update(updates).eq("id", id).eq("user_id", user.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("user_events").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
