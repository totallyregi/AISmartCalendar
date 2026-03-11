import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { title, due_date, course_name, notes, status } = body;
  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }
  if (!due_date || typeof due_date !== "string") {
    return NextResponse.json({ error: "due_date required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("assignments")
    .insert({
      user_id: user.id,
      title,
      due_date,
      course_name: course_name ?? "",
      notes: notes ?? null,
      status: status ?? "not_started",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
