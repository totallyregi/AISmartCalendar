"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { isValidTimeZone } from "@/lib/timezone";

/**
 * Once after login: if the user has not completed timezone bootstrap, PATCH preferences
 * from the browser IANA zone (still on DB seed default server-side).
 */
export function AutoTimezoneBootstrap() {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        if ((user.user_metadata as { timezone_set?: boolean } | undefined)?.timezone_set === true) return;

        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (!tz || !isValidTimeZone(tz)) return;

        const res = await fetch("/api/preferences/scheduler", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timezone: tz }),
        });
        if (!res.ok || cancelled) return;

        await supabase.auth.updateUser({ data: { timezone_set: true } });
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
