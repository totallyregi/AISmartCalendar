import { createClient } from "@/lib/supabase/server";
import { findPersonalEventConflicts, validateOrderedInstants } from "@/lib/calendarOverlap";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  const starts_at = String(body.starts_at ?? "");
  const ends_at = String(body.ends_at ?? "");
  if (!title || !starts_at || !ends_at) return NextResponse.json({ error: "title, starts_at, ends_at required" }, { status: 400 });

  const orderErr = validateOrderedInstants(starts_at, ends_at);
  if (orderErr) return NextResponse.json({ error: orderErr }, { status: 400 });

  // Overlap check uses stored intervals only (see lib/calendarOverlap). Recurring class meetings and
  // fixed habit slots expanded in the week view are not matched here — possible follow-up.
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

  const { data, error } = await supabase
    .from("user_events")
    .insert({ user_id: user.id, title, starts_at, ends_at, source: "manual", editable: true })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
