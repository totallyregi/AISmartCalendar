/** Set at in-app signup; cleared after first successful landing on Help (or earlier on login/callback). */
export const REDIRECT_HELP_FIRST_LOGIN_KEY = "redirect_help_first_login" as const;

export function shouldRedirectToHelpFirstLogin(user: { user_metadata?: Record<string, unknown> } | null): boolean {
  return user?.user_metadata?.[REDIRECT_HELP_FIRST_LOGIN_KEY] === true;
}
