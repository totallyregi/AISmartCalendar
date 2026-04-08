/**
 * Canonical public origin for auth redirects (email confirm, password reset).
 * In production, set NEXT_PUBLIC_SITE_URL to your deployed origin, e.g. https://app.example.com
 * so confirmation links never point at localhost unless the user signed up locally.
 */
export function publicSiteUrlFromWindow(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return (process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || window.location.origin).replace(/\/$/, "");
}
