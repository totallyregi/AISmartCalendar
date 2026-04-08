import { type NextRequest, NextResponse } from "next/server";
import { shouldRedirectToHelpFirstLogin } from "@/lib/firstLoginHelp";
import { updateSession } from "@/lib/supabase/middleware";

const protectedPaths = [
  "/dashboard",
  "/calendar",
  "/classes",
  "/assignments",
  "/habits",
  "/preferences",
  "/help",
];

function isProtected(pathname: string) {
  return protectedPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/")) return response;
  if (isProtected(pathname) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if ((pathname === "/login" || pathname === "/signup") && user) {
    const url = request.nextUrl.clone();
    url.pathname = shouldRedirectToHelpFirstLogin(user) ? "/help" : "/dashboard";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
