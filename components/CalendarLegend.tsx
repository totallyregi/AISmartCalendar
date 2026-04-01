export function CalendarLegend() {
  const items = [
    { label: "External", color: "bg-blue-500" },
    { label: "Classes", color: "bg-violet-500" },
    { label: "Fixed habits", color: "bg-emerald-500" },
    { label: "Generated", color: "bg-amber-500" },
  ];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap gap-4 text-xs text-zinc-600 dark:text-zinc-400">
        {items.map((i) => (
          <div key={i.label} className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${i.color}`} />
            <span>{i.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
