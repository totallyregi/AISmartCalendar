import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title : undefined;
  const starts_at = typeof body.starts_at === "string" ? body.starts_at : undefined;
  const ends_at = typeof body.ends_at === "string" ? body.ends_at : undefined;

  const payload: Record<string, string> = {};
  if (title) payload.title = title;
  if (starts_at) payload.starts_at = starts_at;
  if (ends_at) payload.ends_at = ends_at;
  if (!Object.keys(payload).length) return NextResponse.json({ error: "No fields to update" }, { status: 400 });

  const { data, error } = await supabase
    .from("weekly_plan_blocks")
    .update(payload)
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("editable", true)
    .select("id,title,starts_at,ends_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data: block, error: readErr } = await supabase
    .from("weekly_plan_blocks")
    .select("id,assignment_id,starts_at,ends_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("editable", true)
    .single();
  if (readErr || !block) return NextResponse.json({ error: readErr?.message ?? "Block not found" }, { status: 404 });

  const { error } = await supabase.from("weekly_plan_blocks").delete().eq("id", id).eq("user_id", user.id).eq("editable", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (block.assignment_id) {
    const restoredMinutes = Math.max(
      0,
      Math.round((new Date(String(block.ends_at)).getTime() - new Date(String(block.starts_at)).getTime()) / 60000)
    );
    const { data: assignment } = await supabase
      .from("assignments")
      .select("id,remaining_minutes,estimated_minutes")
      .eq("id", String(block.assignment_id))
      .eq("user_id", user.id)
      .single();

    if (assignment) {
      const currentRemaining = Number(assignment.remaining_minutes ?? 0);
      const estimated = Number(assignment.estimated_minutes ?? currentRemaining);
      const nextRemaining = Math.min(estimated, currentRemaining + restoredMinutes);

      await supabase
        .from("assignments")
        .update({ remaining_minutes: nextRemaining })
        .eq("id", String(block.assignment_id))
        .eq("user_id", user.id);
    }
  }

  return NextResponse.json({ ok: true });
}

