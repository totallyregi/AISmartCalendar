import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: assignment, error: fetchErr } = await supabase
    .from("assignments")
    .select("id, title, due_date, course_name, notes")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchErr || !assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const openai = getOpenAIClient();
  const prompt = `You are helping a college student break down an assignment into smaller, manageable subtasks. Be concrete and ordered.

Assignment: ${assignment.title}
Course: ${assignment.course_name}
Due: ${assignment.due_date}
${assignment.notes ? `Notes: ${assignment.notes}` : ""}

Return ONLY a JSON array of strings, each string is one subtask title. Example: ["Research sources","Outline main sections","Draft introduction","Draft body","Draft conclusion","Proofread and cite"]. No other text.`;

  let titles: string[];
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as Record<string, unknown> | unknown[];
    if (Array.isArray(parsed)) {
      titles = parsed.filter((x): x is string => typeof x === "string");
    } else if (parsed && typeof parsed === "object") {
      const arr = (parsed as Record<string, unknown>).subtasks ?? (parsed as Record<string, unknown>).tasks;
      titles = Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
    } else {
      titles = [];
    }
  } catch (e) {
    const err = e as Error;
    return NextResponse.json({ error: err.message ?? "OpenAI failed" }, { status: 500 });
  }

  await supabase.from("assignment_subtasks").delete().eq("assignment_id", id);
  if (titles.length) {
    const rows = titles.map((title, order) => ({ assignment_id: id, title: String(title), order, completed: false }));
    await supabase.from("assignment_subtasks").insert(rows);
  }

  return NextResponse.json({ ok: true, count: titles.length });
}
