"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Stored on the user at signup; cleared after Skip/Done so only first post-signup session sees the tour. */
const META_PENDING_KEY = "pending_first_login_tutorial" as const;

const STEPS = [
  {
    title: "Calendar",
    body: "Use Calendar for your real schedule: classes, habits, imports, personal events, and applied AI blocks.",
  },
  {
    title: "AI Calendar",
    body: "Open AI Calendar to generate weekly drafts, review suggestions, and apply them when you are ready.",
  },
  {
    title: "Preferences",
    body: "Set work windows and daily limits under Preferences so scheduling stays inside the times you actually want.",
  },
  {
    title: "Classes, assignments, habits",
    body: "Add classes and assignments for due dates and estimates; habits capture fixed or flexible routines the planner respects.",
  },
];

export function AppTutorialModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    function maybeOpenFromUser(user: { user_metadata?: Record<string, unknown> } | null) {
      const meta = user?.user_metadata as Record<string, unknown> | undefined;
      if (meta?.[META_PENDING_KEY] === true) {
        setStep(0);
        setOpen(true);
      }
    }

    void supabase.auth.getUser().then(({ data: { user } }) => {
      maybeOpenFromUser(user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      maybeOpenFromUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function dismiss() {
    try {
      const supabase = createClient();
      await supabase.auth.updateUser({
        data: { [META_PENDING_KEY]: false },
      });
    } catch {
      /* still close UI */
    }
    try {
      window.localStorage.removeItem("show_app_tutorial");
    } catch {
      /* legacy key from older builds */
    }
    setOpen(false);
  }

  if (!open) return null;

  const last = step >= STEPS.length - 1;
  const content = STEPS[step];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close tutorial" onClick={() => void dismiss()} />
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 id="tutorial-title" className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {content.title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{content.body}</p>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => void dismiss()}
            className="rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Skip
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (last) void dismiss();
                else setStep((s) => s + 1);
              }}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              {last ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
