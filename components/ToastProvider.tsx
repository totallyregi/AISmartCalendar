"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";

export type ToastTone = "success" | "error";

type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DISMISS_MS = 4000;

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const regionId = useId();

  const dismiss = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const showToast = useCallback((message: string, tone: ToastTone = "success") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [...prev, { id, message, tone }]);
    const tid = setTimeout(() => dismiss(id), DISMISS_MS);
    timers.current.set(id, tid);
  }, [dismiss]);

  useEffect(() => {
    return () => {
      timers.current.forEach((t) => clearTimeout(t));
      timers.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        id={regionId}
        className="pointer-events-none fixed bottom-4 right-4 z-[90] flex max-w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 sm:bottom-6 sm:right-6"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            aria-live={t.tone === "error" ? "assertive" : "polite"}
            className={`pointer-events-auto flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${
              t.tone === "error"
                ? "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/90 dark:text-red-100"
                : "border-palette-green/50 bg-palette-green/15 text-palette-navy shadow-[0_6px_28px_rgba(107,174,138,0.35)] ring-1 ring-palette-green/25 dark:border-palette-green/45 dark:bg-palette-green/18 dark:text-emerald-50 dark:shadow-[0_6px_28px_rgba(123,200,164,0.2)] dark:ring-palette-green/30"
            }`}
          >
            <div className="flex min-w-0 flex-1 items-start gap-3">
              {t.tone === "success" && (
                <span
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-palette-green text-white shadow-sm dark:text-palette-navy"
                  aria-hidden
                >
                  <svg className="h-4 w-4" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <path
                      d="M2.5 6L5 8.5L9.5 3.5"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              )}
              <span className="min-w-0 flex-1 pt-0.5 font-medium leading-snug">{t.message}</span>
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium opacity-70 hover:opacity-100 ${
                t.tone === "error" ? "" : "text-palette-navy hover:bg-palette-green/25 dark:text-emerald-100 dark:hover:bg-palette-green/25"
              }`}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
