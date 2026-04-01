export type Interval = { start: Date; end: Date };

export function weekStartSunday(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function clampTo15(minutes: number) {
  return Math.floor(minutes / 15) * 15;
}

export function intervalsOverlap(a: Interval, b: Interval) {
  return a.start < b.end && b.start < a.end;
}

export function buildDaySlots(day: Date, startHour = 8, endHour = 22): Interval[] {
  const slots: Interval[] = [];
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += 15) {
      const s = new Date(day);
      s.setHours(h, m, 0, 0);
      const e = new Date(s.getTime() + 15 * 60 * 1000);
      slots.push({ start: s, end: e });
    }
  }
  return slots;
}

export function removeBusy(slots: Interval[], busy: Interval[]) {
  return slots.filter((slot) => !busy.some((b) => intervalsOverlap(slot, b)));
}

export function mergeIntervals(list: Interval[]) {
  const sorted = [...list].sort((a, b) => a.start.getTime() - b.start.getTime());
  const out: Interval[] = [];
  for (const it of sorted) {
    const last = out[out.length - 1];
    if (!last || it.start > last.end) out.push({ ...it });
    else if (it.end > last.end) last.end = it.end;
  }
  return out;
}
