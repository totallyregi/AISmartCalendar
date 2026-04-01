import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  const starts_at = String(body.starts_at ?? "");
  const ends_at = String(body.ends_at ?? "");
  if (!title || !starts_at || !ends_at) return NextResponse.json({ error: "title, starts_at, ends_at required" }, { status: 400 });

  const { data, error } = await supabase
    .from("user_events")
    .insert({ user_id: user.id, title, starts_at, ends_at, source: "manual", editable: true })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
