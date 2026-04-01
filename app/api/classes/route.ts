import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type MeetingInput = { day_of_week: number; start_time: string; end_time: string };

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("class_sections")
    .select("id,user_id,class_code,class_name,created_at,class_meetings(id,day_of_week,start_time,end_time)")
    .eq("user_id", user.id)
    .order("class_code");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const class_code = String(body.class_code ?? "").trim();
  const class_name = String(body.class_name ?? "").trim();
  const meetings = (Array.isArray(body.meetings) ? body.meetings : []) as MeetingInput[];

  if (!class_code || !class_name) {
    return NextResponse.json({ error: "class_code and class_name are required" }, { status: 400 });
  }

  const { data: cls, error: clsErr } = await supabase
    .from("class_sections")
    .insert({ user_id: user.id, class_code, class_name })
    .select()
    .single();

  if (clsErr || !cls) return NextResponse.json({ error: clsErr?.message ?? "Failed" }, { status: 500 });

  if (meetings.length) {
    const meetingRows = meetings.map((m) => ({
      class_id: cls.id,
      day_of_week: m.day_of_week,
      start_time: m.start_time,
      end_time: m.end_time,
    }));

    const { error: meetErr } = await supabase.from("class_meetings").insert(meetingRows);
    if (meetErr) return NextResponse.json({ error: meetErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: cls.id });
}
