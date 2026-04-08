import { createClient } from "@/lib/supabase/server";
import { REDIRECT_HELP_FIRST_LOGIN_KEY, shouldRedirectToHelpFirstLogin } from "@/lib/firstLoginHelp";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/calendar";
  const type = searchParams.get("type");

  const targetUrl = `${origin}${next.startsWith("/") ? next : `/${next}`}`;
  const loginUrl = `${origin}/login?error=auth`;

  function htmlPage(title: string, message: string, primaryHref: string, primaryText: string) {
    return new NextResponse(
      `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji','Segoe UI Emoji'; margin: 32px; color: #111827;">
    <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 12px;">${title}</h1>
    <p style="font-size: 14px; line-height: 1.5; margin: 0 0 18px;">${message}</p>
    <a href="${primaryHref}" style="display: inline-block; padding: 10px 14px; border-radius: 8px; background: #111827; color: white; text-decoration: none; font-weight: 600;">
      ${primaryText}
    </a>
    <p style="font-size: 12px; color: #6b7280; margin-top: 14px;">
      If this doesn’t work automatically, please click the button above.
    </p>
    <script>
      setTimeout(() => { window.location.href = ${JSON.stringify(primaryHref)} }, 800);
    </script>
  </body>
</html>`,
      { headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const goHelp = shouldRedirectToHelpFirstLogin(user);
      let destinationUrl = targetUrl;
      if (goHelp) {
        await supabase.auth.updateUser({
          data: { [REDIRECT_HELP_FIRST_LOGIN_KEY]: false },
        });
        destinationUrl = `${origin}/help`;
      }
      const successTitle = type === "signup" ? "Sign up successful" : "Welcome back";
      const successMessage =
        goHelp
          ? "Opening the getting-started guide…"
          : type === "signup"
            ? "Your account is confirmed. You can continue to your calendar."
            : "You’re signed in. Redirecting you to your main calendar…";
      const buttonText = goHelp ? "Open Help" : "Go to Calendar";
      return htmlPage(successTitle, successMessage, destinationUrl, buttonText);
    }
  }
  return htmlPage(
    "Sign-in link invalid",
    "The sign-in link may have expired or is malformed. Please sign in again.",
    loginUrl,
    "Go to Login"
  );
}
