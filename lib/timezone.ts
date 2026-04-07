export function isValidTimeZone(tz: string) {
  try {
    // Throws if timezone is invalid.
    Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function partsInTimeZone(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function tzOffsetMinutesAt(date: Date, timeZone: string) {
  const p = partsInTimeZone(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return (asUtc - date.getTime()) / 60000;
}

export function zonedDateTimeToUtc(dateKey: string, hhmmss: string, timeZone: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh, mm, ss] = hhmmss.split(":").map(Number);
  const guess = Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, ss || 0);
  const offset1 = tzOffsetMinutesAt(new Date(guess), timeZone);
  const corrected = guess - offset1 * 60000;
  const offset2 = tzOffsetMinutesAt(new Date(corrected), timeZone);
  return new Date(guess - offset2 * 60000);
}

export function zonedDateKey(date: Date, timeZone: string) {
  const p = partsInTimeZone(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Calendar date (YYYY-MM-DD) for an ISO instant in the user's timezone — use for grouping events on the month grid, not UTC slice(0,10). */
export function zonedDateKeyFromIso(iso: string, timeZone: string): string {
  return zonedDateKey(new Date(iso), timeZone);
}

const DOW_LONG_EN: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

/** Day of week 0=Sun..6=Sat for civil `dateKey` interpreted in `timeZone`. */
export function dayOfWeekFromDateKey(dateKey: string, timeZone: string): number {
  const noon = zonedDateTimeToUtc(dateKey, "12:00:00", timeZone);
  const long = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long" }).format(noon);
  return DOW_LONG_EN[long] ?? 0;
}

/**
 * Add calendar days to a YYYY-MM-DD key. When `timeZone` is set, uses civil semantics in that zone (noon anchor).
 * Legacy 2-arg form uses UTC date arithmetic (avoid for user-facing week math).
 */
export function addDaysToDateKey(dateKey: string, days: number, timeZone?: string): string {
  if (timeZone) {
    const instant = zonedDateTimeToUtc(dateKey, "12:00:00", timeZone);
    const shifted = new Date(instant.getTime() + days * 86400000);
    return zonedDateKey(shifted, timeZone);
  }
  const base = new Date(`${dateKey}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

export function weekStartSundayDateKey(now: Date, timeZone: string) {
  const todayKey = zonedDateKey(now, timeZone);
  const dow = dayOfWeekFromDateKey(todayKey, timeZone);
  return addDaysToDateKey(todayKey, -dow, timeZone);
}

/** Local wall-clock time in `timeZone`, snapped to `minuteStep`, as `HH:mm:00`. */
export function zonedHhMmSs(iso: string, timeZone: string, minuteStep: 1 | 5 | 15): string {
  const p = partsInTimeZone(new Date(iso), timeZone);
  const total = p.hour * 60 + p.minute;
  const snapped = Math.min(24 * 60 - 1, Math.max(0, Math.round(total / minuteStep) * minuteStep));
  const h24 = Math.floor(snapped / 60);
  const m = snapped % 60;
  return `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}
