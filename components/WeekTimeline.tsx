type Event = {
  starts_at: string;
  ends_at: string;
  title: string;
  source: "external" | "class" | "fixed_habit" | "generated";
};

const sourceCls: Record<Event["source"], string> = {
  external: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  class: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  fixed_habit: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  generated: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

export function WeekTimeline({ date, events }: { date: string; events: Event[] }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{date} details</h3>
      {events.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">No events for this day.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {events.map((e, idx) => (
            <li key={`${e.starts_at}-${idx}`} className="flex items-center gap-2 text-sm">
              <span className={`rounded px-1.5 py-0.5 text-xs ${sourceCls[e.source]}`}>{e.source}</span>
              <span className="text-zinc-700 dark:text-zinc-300">
                {new Date(e.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {" - "}
                {new Date(e.ends_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {" · "}
                {e.title}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
