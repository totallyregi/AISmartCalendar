import {
  WEEKDAY_FULL,
  type DayTimeSlot,
  compareDayTimeSlots,
  formatTimeHhmmssTo12h,
} from "@/lib/datetimeDisplay";

type Props = {
  slots: DayTimeSlot[] | undefined;
  emptyLabel?: string;
  /** Smaller type and tighter rows (e.g. nested in cards). */
  dense?: boolean;
};

export function ScheduleSlotList({ slots, emptyLabel, dense }: Props) {
  const list = [...(slots ?? [])].sort(compareDayTimeSlots);
  if (!list.length) {
    if (!emptyLabel) return null;
    return (
      <p className={`text-zinc-500 dark:text-zinc-400 ${dense ? "text-xs" : "text-sm"}`}>{emptyLabel}</p>
    );
  }

  const ulCls = dense ? "mt-1 space-y-1" : "mt-2 space-y-1.5";
  const liCls = dense
    ? "flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-md bg-zinc-50/90 px-2 py-1 dark:bg-zinc-800/40"
    : "flex flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-lg bg-zinc-50 px-2.5 py-1.5 dark:bg-zinc-800/50";
  const dayCls = dense
    ? "min-w-[5.25rem] text-xs font-medium text-zinc-700 dark:text-zinc-300"
    : "min-w-[6.25rem] text-sm font-medium text-zinc-800 dark:text-zinc-200";
  const timeCls = dense
    ? "text-xs tabular-nums text-zinc-500 dark:text-zinc-400"
    : "text-sm tabular-nums text-zinc-600 dark:text-zinc-400";

  return (
    <ul className={ulCls}>
      {list.map((s) => (
        <li key={`${s.day_of_week}-${s.start_time}-${s.end_time}`} className={liCls}>
          <span className={dayCls}>{WEEKDAY_FULL[s.day_of_week] ?? ""}</span>
          <span className={timeCls}>
            {formatTimeHhmmssTo12h(s.start_time)} – {formatTimeHhmmssTo12h(s.end_time)}
          </span>
        </li>
      ))}
    </ul>
  );
}
