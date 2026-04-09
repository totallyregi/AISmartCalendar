"use client";

import { minuteOptionsForStep, parseHhmmTo12h, toHhmmss12 } from "@/lib/time12h";

export function TimePicker12h({
  value,
  onChange,
  minuteStep = 15,
  idPrefix = "t",
  className = "",
}: {
  value: string;
  onChange: (hhmmss: string) => void;
  minuteStep?: 1 | 5 | 15;
  idPrefix?: string;
  className?: string;
}) {
  const { hour12, minute, isPm } = parseHhmmTo12h(value || "12:00:00");
  const minutes = minuteOptionsForStep(minuteStep);

  function setParts(next: { hour12?: number; minute?: number; isPm?: boolean }) {
    const h = next.hour12 ?? hour12;
    const m = next.minute ?? minute;
    const pm = next.isPm ?? isPm;
    const snapped = Math.round(m / minuteStep) * minuteStep;
    const minClamped = Math.min(59, Math.max(0, snapped));
    onChange(toHhmmss12(h, minClamped, pm));
  }

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      <select
        id={`${idPrefix}-h`}
        value={hour12}
        onChange={(e) => setParts({ hour12: Number(e.target.value) })}
        className="rounded-lg border-[0.5px] border-palette-card-border bg-palette-card-bg px-2 py-1.5 text-sm text-palette-navy"
        aria-label="Hour"
      >
        {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="text-palette-slate">:</span>
      <select
        id={`${idPrefix}-m`}
        value={minutes.includes(minute) ? minute : minutes[0]}
        onChange={(e) => setParts({ minute: Number(e.target.value) })}
        className="rounded-lg border-[0.5px] border-palette-card-border bg-palette-card-bg px-2 py-1.5 text-sm text-palette-navy"
        aria-label="Minute"
      >
        {minutes.map((m) => (
          <option key={m} value={m}>
            {String(m).padStart(2, "0")}
          </option>
        ))}
      </select>
      <select
        id={`${idPrefix}-ap`}
        value={isPm ? "PM" : "AM"}
        onChange={(e) => setParts({ isPm: e.target.value === "PM" })}
        className="rounded-lg border-[0.5px] border-palette-card-border bg-palette-card-bg px-2 py-1.5 text-sm text-palette-navy"
        aria-label="AM or PM"
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}
