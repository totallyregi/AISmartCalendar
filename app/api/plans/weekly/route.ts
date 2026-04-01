import { createClient } from "@/lib/supabase/server";
import { weekStartSunday } from "@/lib/scheduler/weekly";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const qs = new URL(request.url).searchParams;
  const weekStartInput = qs.get("weekStart");
  const weekStart = weekStartInput
    ? weekStartSunday(new Date(`${weekStartInput}T00:00:00`)).toISOString().slice(0, 10)
    : weekStartSunday(new Date()).toISOString().slice(0, 10);

  const { data: plan } = await supabase
    .from("weekly_plans")
    .select("*")
    .eq("user_id", user.id)
    .eq("week_start_date", weekStart)
    .single();

  if (!plan) return NextResponse.json({ weekStart, plan: null, blocks: [] });

  const { data: blocks, error } = await supabase
    .from("weekly_plan_blocks")
    .select("*")
    .eq("weekly_plan_id", plan.id)
    .eq("user_id", user.id)
    .order("starts_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ weekStart, plan, blocks: blocks ?? [] });
}
