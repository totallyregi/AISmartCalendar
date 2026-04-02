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
  const { error } = await supabase.from("weekly_plan_blocks").delete().eq("id", id).eq("user_id", user.id).eq("editable", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

