import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import type { DailyPlanBlock } from "@/lib/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const date = body.date ?? new Date().toISOString().slice(0, 10);
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date required (YYYY-MM-DD)" }, { status: 400 });
  }

  const [classesRes, assignmentsRes, habitsRes] = await Promise.all([
    supabase.from("classes").select("name, schedule").eq("user_id", user.id),
    supabase.from("assignments").select("id, title, due_date, course_name, status").eq("user_id", user.id).in("status", ["not_started", "in_progress"]),
    supabase.from("habits").select("name, typical_duration_min, preferred_time").eq("user_id", user.id).eq("active", true),
  ]);

  const classes = classesRes.data ?? [];
  const assignments = assignmentsRes.data ?? [];
  const habits = habitsRes.data ?? [];

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayOfWeek = dayNames[new Date(date + "T12:00:00").getDay()];

  const subtaskPromises = assignments.map((a) =>
    supabase.from("assignment_subtasks").select("title, order, completed").eq("assignment_id", a.id).order("order")
  );
  const subtaskResults = await Promise.all(subtaskPromises);
  const assignmentsWithSubtasks = assignments.map((a, i) => ({
    ...a,
    subtasks: (subtaskResults[i].data ?? []).filter((s: { completed: boolean }) => !s.completed).map((s: { title: string }) => s.title),
  }));

  const openai = getOpenAIClient();
  const context = `
Date: ${date} (${dayOfWeek})

Classes (name, schedule):
${classes.map((c) => `- ${c.name}: ${c.schedule}`).join("\n") || "None"}

Assignments (with remaining subtasks):
${assignmentsWithSubtasks.map((a) => `- ${a.title} (due ${a.due_date}, ${a.course_name})${a.subtasks?.length ? ` — remaining: ${a.subtasks.join("; ")}` : ""}`).join("\n") || "None"}

Active habits (name, duration in min, preferred time):
${habits.map((h) => `- ${h.name}: ${h.typical_duration_min} min${h.preferred_time ? `, prefer ${h.preferred_time}` : ""}`).join("\n") || "None"}

Create a realistic daily plan. Rules:
- Suggest specific start times (e.g. 9:00, 14:00) for study blocks based on due dates (sooner due = prioritize).
- Include 1-2 personal habits (e.g. gym, workout, reading) scheduled around classes and study.
- Do not overload: leave breaks. Use a normal waking day (e.g. 8am–10pm).
- Output ONLY valid JSON: { "blocks": [ { "start": "HH:MM", "end": "HH:MM", "type": "class"|"study"|"habit"|"break", "label": "short label", "details": "optional" } ] }. No other text.`;

  let planJson: { blocks: DailyPlanBlock[] };
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: context }],
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { blocks?: unknown[] };
    const blocks = Array.isArray(parsed.blocks)
      ? parsed.blocks.map((b: unknown) => {
          const x = b as Record<string, unknown>;
          return {
            start: String(x.start ?? ""),
            end: String(x.end ?? ""),
            type: (["class", "study", "habit", "break"].includes(String(x.type)) ? x.type : "study") as DailyPlanBlock["type"],
            label: String(x.label ?? ""),
            details: x.details != null ? String(x.details) : undefined,
          };
        })
      : [];
    planJson = { blocks };
  } catch (e) {
    const err = e as Error;
    return NextResponse.json({ error: err.message ?? "OpenAI failed" }, { status: 500 });
  }

  const { error: upsertErr } = await supabase.from("daily_plans").upsert(
    { user_id: user.id, date, plan_json: planJson },
    { onConflict: "user_id,date" }
  );
  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });

  return NextResponse.json({ date, plan: planJson });
}
