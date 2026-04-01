import { createClient } from "@/lib/supabase/server";
import { fetchGoogleEvents, normalizeGoogleEvent } from "@/lib/google/events";
import { refreshGoogleAccessToken } from "@/lib/google/oauth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: integration, error: integErr } = await supabase
    .from("external_calendars")
    .select("*")
    .eq("user_id", user.id)
    .eq("provider", "google")
    .single();

  if (integErr || !integration) {
    return NextResponse.json({ error: "Google is not connected" }, { status: 400 });
  }

  let accessToken = integration.access_token as string;
  const tokenExpires = integration.token_expires_at
    ? new Date(integration.token_expires_at as string).getTime()
    : 0;

  if (tokenExpires && tokenExpires < Date.now() + 60_000 && integration.refresh_token) {
    const refreshed = await refreshGoogleAccessToken(integration.refresh_token as string);
    accessToken = refreshed.access_token;
    const newExpires = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
    await supabase
      .from("external_calendars")
      .update({
        access_token: accessToken,
        token_expires_at: newExpires,
        updated_at: new Date().toISOString(),
      })
      .eq("id", integration.id as string);
  }

  const body = await request.json().catch(() => ({}));
  const timeMin =
    typeof body.timeMin === "string"
      ? body.timeMin
      : new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();
  const timeMax =
    typeof body.timeMax === "string"
      ? body.timeMax
      : new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString();

  const events = await fetchGoogleEvents(accessToken, timeMin, timeMax);
  const rows = events
    .map(normalizeGoogleEvent)
    .filter(Boolean)
    .map((e) => ({
      user_id: user.id,
      provider: "google",
      ...(e as {
        provider_event_id: string;
        summary: string;
        starts_at: string;
        ends_at: string;
        all_day: boolean;
      }),
      updated_at: new Date().toISOString(),
    }));

  if (rows.length) {
    const { error } = await supabase
      .from("external_events")
      .upsert(rows, { onConflict: "user_id,provider,provider_event_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, imported: rows.length });
}
