import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const DEFAULT_DAYS = [1, 2, 3, 4, 5];

async function ensurePreference(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: existing } = await supabase
    .from("scheduler_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("scheduler_preferences")
    .insert({
      user_id: userId,
      min_daily_minutes: 120,
      preferred_daily_minutes: 180,
      max_daily_minutes: 300,
      max_consecutive_minutes: 120,
      break_minutes: 30,
      default_apply_days: DEFAULT_DAYS,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return created;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const preference = await ensurePreference(supabase, user.id);
    const { data: windows, error: windowErr } = await supabase
      .from("scheduler_preferred_windows")
      .select("id,day_of_week,start_time,end_time,is_override")
      .eq("user_id", user.id)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (windowErr) return NextResponse.json({ error: windowErr.message }, { status: 500 });

    return NextResponse.json({
      preference,
      windows: windows ?? [],
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load preferences" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const min = Number(body.min_daily_minutes ?? 120);
  const preferred = Number(body.preferred_daily_minutes ?? 180);
  const max = Number(body.max_daily_minutes ?? 300);
  const maxConsecutive = Number(body.max_consecutive_minutes ?? 120);
  const breakMinutes = Number(body.break_minutes ?? 30);
  const defaultDays = Array.isArray(body.default_apply_days)
    ? (body.default_apply_days as unknown[]).map((d: unknown) => Number(d))
    : DEFAULT_DAYS;

  if ([min, preferred, max, maxConsecutive, breakMinutes].some((v) => Number.isNaN(v) || v < 0 || v % 15 !== 0)) {
    return NextResponse.json({ error: "All minute values must be non-negative and in 15-minute increments" }, { status: 400 });
  }
  if (!(min <= preferred && preferred <= max)) {
    return NextResponse.json({ error: "Require min <= preferred <= max" }, { status: 400 });
  }

  const days = [...new Set(defaultDays)].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  if (days.length === 0) {
    return NextResponse.json({ error: "At least one apply day is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("scheduler_preferences")
    .upsert(
      {
        user_id: user.id,
        min_daily_minutes: min,
        preferred_daily_minutes: preferred,
        max_daily_minutes: max,
        max_consecutive_minutes: maxConsecutive,
        break_minutes: breakMinutes,
        default_apply_days: days,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ preference: data });
}
