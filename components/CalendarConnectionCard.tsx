"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function CalendarConnectionCard() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refreshStatus() {
    const res = await fetch("/api/integrations/google/status");
    const data = await res.json().catch(() => ({}));
    setConnected(!!data.connected);
    setEmail(data.accountEmail ?? null);
  }

  useEffect(() => {
    queueMicrotask(() => {
      void refreshStatus();
    });
  }, []);

  function connectGoogle() {
    window.location.href = "/api/integrations/google/connect";
  }

  async function syncGoogle() {
    setLoading(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/integrations/google/sync", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Sync failed");
      return;
    }
    setMessage(`Google sync complete (${data.imported ?? 0} events)`);
    router.refresh();
  }

  async function disconnectGoogle() {
    setLoading(true);
    setError(null);
    setMessage(null);
    await fetch("/api/integrations/google/disconnect", { method: "POST" });
    await refreshStatus();
    setLoading(false);
    setMessage("Google calendar disconnected");
  }

  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Google Calendar Connection</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Connect and sync external calendar events into your main Calendar.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!connected ? (
          <button type="button" onClick={connectGoogle} className="rounded bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
            Connect Google Calendar
          </button>
        ) : (
          <button type="button" disabled className="cursor-default rounded bg-emerald-600 px-3 py-2 text-sm text-white">
            Google Calendar Connected
          </button>
        )}
        <button type="button" onClick={syncGoogle} disabled={loading || !connected} className="rounded border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-600">
          Sync now
        </button>
        {connected && (
          <button type="button" onClick={disconnectGoogle} disabled={loading} className="rounded border border-red-300 px-3 py-2 text-sm text-red-600 dark:border-red-700 dark:text-red-400">
            Disconnect
          </button>
        )}
        {email && <span className="text-xs text-zinc-500 dark:text-zinc-400">{email}</span>}
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {message && <p className="text-sm text-emerald-700 dark:text-emerald-400">{message}</p>}
    </div>
  );
}
