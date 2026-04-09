export const THEME_STORAGE_KEY = "aismartcalendar-theme";

export type ThemeMode = "light" | "dark";

export function getStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "dark" || v === "light") return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function applyThemeClass(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", mode === "dark");
}
