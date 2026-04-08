import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type Dest = "help" | "calendar";

function destToHref(dest: string | undefined): Dest {
  return dest === "help" ? "help" : "calendar";
}

export default async function AuthWelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ dest?: string }>;
}) {
  const { dest: raw } = await searchParams;
  const dest = destToHref(raw);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?error=session");
  }

  const primaryHref = dest === "help" ? "/help" : "/calendar";
  const primaryLabel = dest === "help" ? "Open getting-started guide" : "Go to Calendar";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
          <svg viewBox="0 0 24 24" className="h-7 w-7 text-emerald-700 dark:text-emerald-300" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-center text-xl font-semibold text-zinc-900 dark:text-zinc-100">You&apos;re signed in</h1>
        <p className="mt-2 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Your email is confirmed and your session is active. Continue into the app when you&apos;re ready.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={primaryHref}
            className="inline-flex justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {primaryLabel}
          </Link>
          <Link
            href={dest === "help" ? "/calendar" : "/dashboard"}
            className="inline-flex justify-center rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {dest === "help" ? "Calendar" : "AI Calendar"}
          </Link>
        </div>
        <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
          New here? The guide explains every tab and the AI workflow.
        </p>
      </div>
    </div>
  );
}
