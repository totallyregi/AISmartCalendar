import { validateHhmmssRange } from "@/lib/calendarOverlap";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type MeetingInput = { day_of_week: number; start_time: string; end_time: string };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("class_sections")
    .select("id,user_id,class_code,class_name,created_at,class_meetings(id,day_of_week,start_time,end_time)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

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
  const class_code = typeof body.class_code === "string" ? body.class_code.trim() : undefined;
  const class_name = typeof body.class_name === "string" ? body.class_name.trim() : undefined;
  const meetings = (Array.isArray(body.meetings) ? body.meetings : []) as MeetingInput[];

  const updates: { class_code?: string; class_name?: string } = {};
  if (class_code) updates.class_code = class_code;
  if (class_name) updates.class_name = class_name;

  const { error: clsErr } = await supabase
    .from("class_sections")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id);

  if (clsErr) return NextResponse.json({ error: clsErr.message }, { status: 500 });

  await supabase.from("class_meetings").delete().eq("class_id", id);
  if (meetings.length) {
    for (const m of meetings) {
      const err = validateHhmmssRange(m.start_time, m.end_time);
      if (err) return NextResponse.json({ error: err }, { status: 400 });
    }
    const rows = meetings.map((m) => ({
      class_id: id,
      day_of_week: m.day_of_week,
      start_time: m.start_time,
      end_time: m.end_time,
    }));
    const { error: meetErr } = await supabase.from("class_meetings").insert(rows);
    if (meetErr) return NextResponse.json({ error: meetErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
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

  const { error } = await supabase.from("class_sections").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
