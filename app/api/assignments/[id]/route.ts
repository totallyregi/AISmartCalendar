import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string") updates.name = body.name;
  if (typeof body.due_at === "string") updates.due_at = body.due_at;
  if (typeof body.estimated_minutes === "number") updates.estimated_minutes = body.estimated_minutes;
  if (typeof body.remaining_minutes === "number") updates.remaining_minutes = body.remaining_minutes;
  if (["not_started", "in_progress", "done"].includes(body.status)) updates.status = body.status;

  let { data, error } = await supabase
    .from("assignments")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  // Backward-compat: keep legacy `title` in sync when required.
  if (error?.message?.includes("null value in column \"title\"") || error?.message?.includes("column \"title\"")) {
    const retryUpdates = { ...updates } as Record<string, unknown>;
    if (typeof body.name === "string") retryUpdates.title = body.name;
    ({ data, error } = await supabase
      .from("assignments")
      .update(retryUpdates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const out = data as Record<string, unknown>;
  if (typeof out?.name !== "string" && typeof out?.title === "string") {
    return NextResponse.json({ ...out, name: out.title });
  }
  return NextResponse.json(out);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("assignments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
