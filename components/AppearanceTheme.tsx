"use client";

import { useEffect, useState } from "react";
import { THEME_STORAGE_KEY, applyThemeClass, type ThemeMode } from "@/lib/theme";

export function AppearanceTheme() {
  const [mode, setMode] = useState<ThemeMode>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored =
      typeof window !== "undefined" ? (localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null) : null;
    setMode(stored === "dark" ? "dark" : "light");
    setReady(true);
  }, []);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== THEME_STORAGE_KEY || !e.newValue) return;
      const next = e.newValue === "dark" ? "dark" : "light";
      setMode(next);
      applyThemeClass(next);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function choose(next: ThemeMode) {
    setMode(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    applyThemeClass(next);
  }

  return (
    <div className="ds-card p-4 sm:p-5">
      <h2 className="text-sm font-medium text-palette-navy">Appearance</h2>
      <p className="mt-1 text-xs text-palette-slate">
        Choose a light or dark look for Rhythm. This applies on this device only.
      </p>
      <div
        className="mt-4 flex gap-1 rounded-card border border-palette-card-border bg-palette-muted-panel/80 p-1"
        role="radiogroup"
        aria-label="Color theme"
      >
        {(
          [
            { id: "light" as const, label: "Light" },
            { id: "dark" as const, label: "Dark" },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={mode === id}
            disabled={!ready}
            onClick={() => choose(id)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              mode === id
                ? "bg-palette-card-bg text-palette-navy shadow-sm ring-1 ring-palette-card-border"
                : "text-palette-slate hover:text-palette-navy"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
