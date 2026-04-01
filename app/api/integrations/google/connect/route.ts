import { buildGoogleAuthUrl, generateState } from "@/lib/google/oauth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = generateState();
  const redirect = buildGoogleAuthUrl(url.origin, state);
  const res = NextResponse.redirect(redirect);
  res.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
  });
  return res;
}
