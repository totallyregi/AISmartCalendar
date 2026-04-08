/** Matches `Date.getDay()` / DB `day_of_week`: 0 = Sunday … 6 = Saturday */
export const WEEKDAY_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export type DayTimeSlot = { day_of_week: number; start_time: string; end_time: string };

/** Calendar order: Sunday → Saturday, then start time. */
export function compareDayTimeSlots(a: DayTimeSlot, b: DayTimeSlot): number {
  if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
  return a.start_time.localeCompare(b.start_time);
}

/**
 * Default IANA zone for new preferences and scheduler defaults.
 * US Central Time — covers New Orleans, Chicago, and other Central cities.
 */
export const DEFAULT_USER_TIMEZONE = "America/Chicago";

/** Formats `HH:mm:ss` or `HH:mm` as locale 12-hour time, e.g. `9:30 AM`. */
export function formatTimeHhmmssTo12h(hhmmss: string): string {
  if (!hhmmss) return "";
  const [hStr, mStr] = hhmmss.split(":");
  const h = Number(hStr);
  const m = Number(mStr ?? 0);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmmss;
  const d = new Date(2000, 0, 1, h, m, 0);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

/** One class/habit meeting line for list subtitles, e.g. `Tuesday 9:30 AM – 10:45 AM`. */
export function formatClassMeetingLine(dayOfWeek: number, start: string, end: string): string {
  const day = WEEKDAY_FULL[dayOfWeek] ?? "";
  return `${day} ${formatTimeHhmmssTo12h(start)} – ${formatTimeHhmmssTo12h(end)}`;
}

/** Tighter line for sidebars, e.g. `Tue 9:30 AM–10:45 AM`. */
export function formatClassMeetingLineCompact(dayOfWeek: number, start: string, end: string): string {
  const day = WEEKDAY_SHORT[dayOfWeek] ?? "";
  return `${day} ${formatTimeHhmmssTo12h(start)}–${formatTimeHhmmssTo12h(end)}`;
}

/** Due date/time for assignments: full weekday, long month, 12-hour clock. */
export function formatDueDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
