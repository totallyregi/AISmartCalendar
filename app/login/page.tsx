"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { REDIRECT_HELP_FIRST_LOGIN_KEY } from "@/lib/firstLoginHelp";
import { publicSiteUrlFromWindow } from "@/lib/siteUrl";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/calendar";

  const RESET_COOLDOWN_MS = 2 * 60 * 1000; // avoid spamming Supabase reset emails
  const RESET_AT_KEY = "aismartcalendar:lastPasswordResetAt";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const meta = user?.user_metadata as Record<string, unknown> | undefined;
    if (meta?.[REDIRECT_HELP_FIRST_LOGIN_KEY] === true) {
      await supabase.auth.updateUser({
        data: { [REDIRECT_HELP_FIRST_LOGIN_KEY]: false },
      });
      router.push("/help");
    } else {
      router.push(next);
    }
    router.refresh();
  }

  async function handleForgotPassword() {
    setResetLoading(true);
    setResetError(null);
    setResetMessage(null);

    // Client-side throttle to prevent Supabase "email rate limit exceeded".
    const now = Date.now();
    if (typeof window !== "undefined") {
      const lastAt = Number(window.localStorage.getItem(RESET_AT_KEY) ?? "0");
      const remaining = RESET_COOLDOWN_MS - (now - lastAt);
      if (lastAt > 0 && remaining > 0) {
        const secs = Math.ceil(remaining / 1000);
        setResetLoading(false);
        setResetError(`Too many password reset requests. Please wait ${secs}s and try again.`);
        return;
      }
    }

    const supabase = createClient();
    const siteUrl = publicSiteUrlFromWindow();
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/login`,
    });

    setResetLoading(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(RESET_AT_KEY, String(Date.now()));
    }

    if (resetErr) {
      const msg = resetErr.message ?? "Failed to request reset email";
      if (msg.toLowerCase().includes("rate limit")) {
        setResetError("Too many password reset requests. Please wait a few minutes and try again.");
        return;
      }
      setResetError(msg);
      return;
    }

    // Avoid leaking whether the email exists.
    setResetMessage("If that email exists, you’ll receive a password reset link shortly.");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Sign in
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Rhythm — your calendar-aware productivity assistant
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {error}
            </p>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-zinc-900 py-2 font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          {resetError && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {resetError}
            </p>
          )}
          {resetMessage && (
            <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              {resetMessage}
            </p>
          )}
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={resetLoading || !email}
            className="mt-3 w-full rounded border border-zinc-300 bg-white py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {resetLoading ? "Sending…" : "Forgot password?"}
          </button>
          <p className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
            Uses the email above. You’ll receive a reset link by email.
          </p>
        </div>
        <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No account?{" "}
          <Link href="/signup" className="font-medium text-zinc-900 dark:text-zinc-100 underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
