"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export type ConfirmOptions = {
  /** Short heading; defaults to "Confirm?" */
  title?: string;
  message: string;
  cancelLabel?: string;
  confirmLabel?: string;
  /** Danger styles the confirm button red (delete / destructive) */
  tone?: "default" | "danger";
};

type Pending = ConfirmOptions & { resolve: (v: boolean) => void };

const ConfirmContext = createContext<((opts: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback((result: boolean) => {
    const p = pendingRef.current;
    if (!p) return;
    pendingRef.current = null;
    setPending(null);
    p.resolve(result);
  }, []);

  const requestConfirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      const p: Pending = { ...opts, resolve };
      pendingRef.current = p;
      setPending(p);
    });
  }, []);

  useEffect(() => {
    if (!pending) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, close]);

  useEffect(() => {
    if (!pending) return;
    const previous = document.activeElement as HTMLElement | null;
    const id = requestAnimationFrame(() => cancelButtonRef.current?.focus());
    return () => {
      cancelAnimationFrame(id);
      previous?.focus?.();
    };
  }, [pending]);

  return (
    <ConfirmContext.Provider value={requestConfirm}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 dark:bg-black/55"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="app-confirm-title"
          aria-describedby="app-confirm-message"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border-[0.5px] border-palette-card-border bg-palette-card-bg p-5 shadow-lg"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2 id="app-confirm-title" className="text-base font-semibold text-palette-navy">
              {pending.title ?? "Confirm?"}
            </h2>
            <p id="app-confirm-message" className="mt-2 text-sm leading-relaxed text-palette-slate">
              {pending.message}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                ref={cancelButtonRef}
                type="button"
                className="rounded-lg border-[0.5px] border-palette-card-border bg-palette-card-bg px-4 py-2 text-sm font-medium text-palette-navy transition-colors hover:bg-palette-hover"
                onClick={() => close(false)}
              >
                {pending.cancelLabel ?? "Cancel"}
              </button>
              <button
                type="button"
                className={
                  pending.tone === "danger"
                    ? "rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700"
                    : "rounded-lg bg-palette-navy px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:brightness-110"
                }
                onClick={() => close(true)}
              >
                {pending.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmDialogProvider");
  }
  return ctx;
}
