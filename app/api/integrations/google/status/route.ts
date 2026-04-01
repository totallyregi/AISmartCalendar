import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ connected: false }, { status: 401 });

  const { data } = await supabase
    .from("external_calendars")
    .select("provider_account_email,updated_at")
    .eq("user_id", user.id)
    .eq("provider", "google")
    .single();

  return NextResponse.json({
    connected: !!data,
    accountEmail: data?.provider_account_email ?? null,
    updatedAt: data?.updated_at ?? null,
  });
}
