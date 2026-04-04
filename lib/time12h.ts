/** Parse "HH:mm:ss" or "HH:mm" to 12h parts */
export function parseHhmmTo12h(hhmmss: string): { hour12: number; minute: number; isPm: boolean } {
  if (!hhmmss || !hhmmss.includes(":")) {
    return { hour12: 12, minute: 0, isPm: false };
  }
  const [hStr, mStr] = hhmmss.split(":");
  const h24 = Number(hStr);
  const minute = Number(mStr ?? 0);
  if (Number.isNaN(h24) || Number.isNaN(minute)) {
    return { hour12: 12, minute: 0, isPm: false };
  }
  const isPm = h24 >= 12;
  let hour12 = h24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute, isPm };
}

/** Build "HH:mm:00" from 12h parts (hour 1–12) */
export function toHhmmss12(hour12: number, minute: number, isPm: boolean): string {
  let h = hour12 % 12;
  if (isPm) h += 12;
  if (!isPm && hour12 === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

export function minuteOptionsForStep(step: 1 | 5 | 15): number[] {
  const out: number[] = [];
  for (let m = 0; m < 60; m += step) out.push(m);
  return out;
}

/** YYYY-MM-DD in the user's local calendar (browser). */
export function localYyyyMmDd(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

/** HH:mm:00 from local clock, snapping total minutes to `step`. */
export function localHhMmSsFromDate(d: Date, minuteStep: 1 | 5 | 15): string {
  const totalMin = d.getHours() * 60 + d.getMinutes();
  const snapped = Math.min(24 * 60 - 1, Math.max(0, Math.round(totalMin / minuteStep) * minuteStep));
  const h24 = Math.floor(snapped / 60);
  const m = snapped % 60;
  return `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

/** Parse `YYYY-MM-DD` + `HH:mm:ss` (or `HH:mm`) as local time and return ISO UTC. */
export function localDateTimeToIsoUtc(dateYmd: string, hhmmss: string): string {
  const parts = hhmmss.split(":");
  const h = String(Number(parts[0] ?? 0)).padStart(2, "0");
  const m = String(Number(parts[1] ?? 0)).padStart(2, "0");
  const secRaw = parts[2] ?? "00";
  const s = String(Number(String(secRaw).replace(/\D.*/, "") || 0)).padStart(2, "0");
  return new Date(`${dateYmd}T${h}:${m}:${s}`).toISOString();
}
