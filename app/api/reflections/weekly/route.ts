import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  let startDate = body.startDate ?? body.start_date;
  let endDate = body.endDate ?? body.end_date;
  const now = new Date();
  if (!startDate) {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    startDate = d.toISOString().slice(0, 10);
  }
  if (!endDate) endDate = now.toISOString().slice(0, 10);

  const [checkInsRes, plansRes] = await Promise.all([
    supabase.from("check_ins").select("date, responses_json").eq("user_id", user.id).gte("date", startDate).lte("date", endDate).order("date"),
    supabase.from("daily_plans").select("date, plan_json").eq("user_id", user.id).gte("date", startDate).lte("date", endDate).order("date"),
  ]);

  const checkIns = checkInsRes.data ?? [];
  const plans = plansRes.data ?? [];

  const context = `
You are a supportive productivity coach for a college student. Write a short, encouraging weekly reflection. No guilt, no punishment. Acknowledge what went well and gently note what could be adjusted.

Date range: ${startDate} to ${endDate}

Check-ins (user's own notes):
${checkIns.map((c) => `- ${c.date}: ${JSON.stringify(c.responses_json)}`).join("\n") || "None"}

Days with plans: ${plans.length}. Plan dates: ${plans.map((p) => p.date).join(", ") || "None"}

Return ONLY plain text (2–4 sentences). No bullet points or headers. Supportive and realistic.`;

  let text: string;
  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: context }],
    });
    text = completion.choices[0]?.message?.content?.trim() ?? "No reflection generated.";
  } catch (e) {
    const err = e as Error;
    return NextResponse.json({ error: err.message ?? "OpenAI failed" }, { status: 500 });
  }

  return NextResponse.json({ startDate, endDate, reflection: text });
}
