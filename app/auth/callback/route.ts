import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { REDIRECT_HELP_FIRST_LOGIN_KEY, shouldRedirectToHelpFirstLogin } from "@/lib/firstLoginHelp";

type CookiePair = { name: string; value: string; options?: CookieOptions };

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const loginUrl = new URL("/login?error=auth", origin);

  if (!code) {
    return NextResponse.redirect(loginUrl);
  }

  const cookieJar: CookiePair[] = [];

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const c of cookiesToSet) {
          cookieJar.push({ name: c.name, value: c.value ?? "", options: c.options });
        }
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(loginUrl);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const goHelp = shouldRedirectToHelpFirstLogin(user);

  if (goHelp) {
    await supabase.auth.updateUser({
      data: { [REDIRECT_HELP_FIRST_LOGIN_KEY]: false },
    });
  }

  const welcome = new URL("/auth/welcome", origin);
  welcome.searchParams.set("dest", goHelp ? "help" : "calendar");

  const response = NextResponse.redirect(welcome);
  for (const c of cookieJar) {
    response.cookies.set(c.name, c.value, c.options ?? {});
  }
  return response;
}
