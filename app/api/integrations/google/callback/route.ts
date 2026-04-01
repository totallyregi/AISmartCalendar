import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens } from "@/lib/google/oauth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const cookieState = cookieStore.get("google_oauth_state")?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(`${url.origin}/dashboard?google=error_state`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${url.origin}/login`);

  try {
    const tokens = await exchangeCodeForTokens(code, url.origin);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const meRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const me = (await meRes.json().catch(() => ({}))) as { email?: string };

    const { error } = await supabase
      .from("external_calendars")
      .upsert(
        {
          user_id: user.id,
          provider: "google",
          provider_account_email: me.email ?? null,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token ?? null,
          token_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" }
      );

    if (error) throw new Error(error.message);
    cookieStore.delete("google_oauth_state");
    return NextResponse.redirect(`${url.origin}/dashboard?google=connected`);
  } catch {
    return NextResponse.redirect(`${url.origin}/dashboard?google=error_oauth`);
  }
}
