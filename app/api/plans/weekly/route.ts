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

  const { data: blocks } = await supabase
    .from("weekly_plan_blocks")
    .select("*")
    .eq("user_id", user.id)
    .gte("starts_at", `${weekStart}T00:00:00.000Z`)
    .lte("starts_at", `${weekStart}T23:59:59.999Z`)
    .order("starts_at", { ascending: true });

  const { data: draftBlocks } = await supabase
    .from("ai_draft_blocks")
    .select("*")
    .eq("user_id", user.id)
    .eq("week_start_date", weekStart)
    .eq("applied", false)
    .order("starts_at", { ascending: true });

  return NextResponse.json({ weekStart, plan: plan ?? null, blocks: blocks ?? [], draftBlocks: draftBlocks ?? [] });
}
