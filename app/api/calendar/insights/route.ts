import { createClient } from "@/lib/supabase/server";
import { buildWeekSnapshot } from "@/lib/calendarInsights/buildWeekSnapshot";
import { generateCalendarInsightsFromSummary } from "@/lib/geminiInsights";
import { DEFAULT_USER_TIMEZONE } from "@/lib/datetimeDisplay";
import { isValidTimeZone } from "@/lib/timezone";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const summary = typeof body === "object" && body !== null && "summary" in body ? (body as { summary: unknown }).summary : undefined;
  if (summary === undefined || typeof summary !== "object") {
    return NextResponse.json({ error: "summary object is required" }, { status: 400 });
  }

  const summaryObj = summary as Record<string, unknown>;
  const weekStart = typeof summaryObj.weekStart === "string" ? summaryObj.weekStart : null;

  const prefRes = await supabase.from("scheduler_preferences").select("timezone").eq("user_id", user.id).single();
  const preferredTz = (prefRes.data?.timezone as string | undefined) ?? DEFAULT_USER_TIMEZONE;
  const timeZone = isValidTimeZone(preferredTz) ? preferredTz : DEFAULT_USER_TIMEZONE;

  let payload: unknown = summary;
  let usedEnriched = false;
  if (weekStart && /^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    try {
      const calendarWeek = await buildWeekSnapshot(supabase, user.id, weekStart, timeZone);
      if (calendarWeek) {
        payload = { generationSummary: summary, calendarWeek };
        usedEnriched = true;
      }
    } catch {
      payload = summary;
    }
  }

  try {
    let insights = await generateCalendarInsightsFromSummary(payload);
    if (insights.length === 0 && usedEnriched) {
      insights = await generateCalendarInsightsFromSummary(summary);
    }
    return NextResponse.json({ insights });
  } catch {
    return NextResponse.json({ insights: [] as string[] });
  }
}
