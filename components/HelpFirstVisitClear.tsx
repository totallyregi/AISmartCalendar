"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { REDIRECT_HELP_FIRST_LOGIN_KEY } from "@/lib/firstLoginHelp";

/** Clears first-login help redirect flag if the user landed here before another path cleared it (e.g. home → /help). */
export function HelpFirstVisitClear() {
  useEffect(() => {
    void (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const meta = user?.user_metadata as Record<string, unknown> | undefined;
        if (meta?.[REDIRECT_HELP_FIRST_LOGIN_KEY] === true) {
          await supabase.auth.updateUser({
            data: { [REDIRECT_HELP_FIRST_LOGIN_KEY]: false },
          });
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);
  return null;
}
