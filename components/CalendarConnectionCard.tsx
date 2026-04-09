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
    <div className="ds-card space-y-3 p-4">
      <div>
        <h2 className="text-sm font-medium text-palette-navy">Google Calendar Connection</h2>
        <p className="mt-1 text-xs text-palette-slate">Connect and sync external calendar events into your main Calendar.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!connected ? (
          <button type="button" onClick={connectGoogle} className="rounded-lg bg-palette-sky px-3 py-2 text-sm font-medium text-palette-ink">
            Connect Google Calendar
          </button>
        ) : (
          <button type="button" disabled className="cursor-default rounded-lg bg-palette-green px-3 py-2 text-sm font-medium text-white">
            Google Calendar Connected
          </button>
        )}
        <button type="button" onClick={syncGoogle} disabled={loading || !connected} className="rounded-lg border-[0.5px] border-palette-card-border px-3 py-2 text-sm text-palette-navy hover:bg-palette-hover disabled:opacity-50">
          Sync now
        </button>
        {connected && (
          <button type="button" onClick={disconnectGoogle} disabled={loading} className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600">
            Disconnect
          </button>
        )}
        {email && <span className="text-xs text-palette-slate">{email}</span>}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm font-medium text-palette-navy">{message}</p>}
    </div>
  );
}
