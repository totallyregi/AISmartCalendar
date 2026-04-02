export function CalendarLegend({ variant = "main" }: { variant?: "main" | "ai" }) {
  const mainItems = [
    { label: "External", color: "bg-indigo-500" },
    { label: "Classes", color: "bg-violet-500" },
    { label: "Fixed habits", color: "bg-green-600" },
    { label: "Flexible habits", color: "bg-fuchsia-500" },
    { label: "Assignments", color: "bg-orange-500" },
    { label: "Personal", color: "bg-rose-500" },
  ];

  const aiItems = [
    ...mainItems,
    { label: "Generated (draft)", color: "bg-amber-500" },
  ];

  const items = variant === "ai" ? aiItems : mainItems;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap gap-4 text-xs text-zinc-600 dark:text-zinc-400">
        {items.map((i) => (
          <div key={i.label} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/15 ${i.color}`} />
            <span>{i.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
