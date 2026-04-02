import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function getPreferenceId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from("scheduler_preferences")
    .select("id")
    .eq("user_id", userId)
    .single();
  return data?.id ?? null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const preferenceId = await getPreferenceId(supabase, user.id);
  if (!preferenceId) return NextResponse.json({ error: "Save preferences first" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const day = Number(body.day_of_week);
  const start = String(body.start_time ?? "");
  const end = String(body.end_time ?? "");

  if (!Number.isInteger(day) || day < 0 || day > 6 || !start || !end) {
    return NextResponse.json({ error: "day_of_week, start_time, end_time required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("scheduler_preferred_windows")
    .insert({
      preference_id: preferenceId,
      user_id: user.id,
      day_of_week: day,
      start_time: start,
      end_time: end,
      is_override: false,
    })
    .select("id,day_of_week,start_time,end_time,is_override")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id query param required" }, { status: 400 });

  const { error } = await supabase.from("scheduler_preferred_windows").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
