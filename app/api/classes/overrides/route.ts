import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const class_meeting_id = String(body.class_meeting_id ?? "");
  const class_id = String(body.class_id ?? "");
  const override_date = String(body.override_date ?? "");
  const canceled = Boolean(body.canceled);
  const override_start_time = body.override_start_time ?? null;
  const override_end_time = body.override_end_time ?? null;

  if (!class_meeting_id || !class_id || !override_date) {
    return NextResponse.json({ error: "class_meeting_id, class_id, override_date required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("class_meeting_overrides")
    .upsert({
      user_id: user.id,
      class_meeting_id,
      class_id,
      override_date,
      canceled,
      override_start_time,
      override_end_time,
    }, { onConflict: "class_meeting_id,override_date" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
