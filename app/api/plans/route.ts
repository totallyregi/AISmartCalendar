import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (date) {
    const { data, error } = await supabase
      .from("daily_plans")
      .select("id, date, plan_json, created_at")
      .eq("user_id", user.id)
      .eq("date", date)
      .single();

    if (error && error.code !== "PGRST116") return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json(null, { status: 404 });
    return NextResponse.json(data);
  }

  if (startDate && endDate) {
    const { data, error } = await supabase
      .from("daily_plans")
      .select("id, date, plan_json, created_at")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  }

  return NextResponse.json({ error: "date or startDate+endDate query required" }, { status: 400 });
}
