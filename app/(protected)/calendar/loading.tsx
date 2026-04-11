export default function CalendarLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading calendar">
      <div className="h-8 w-48 rounded-lg bg-palette-card-border/60" />
      <div className="h-4 w-full max-w-xl rounded bg-palette-card-border/50" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="ds-card h-24 p-4" />
        <div className="ds-card h-24 p-4" />
      </div>
      <div className="ds-card h-32 p-4" />
      <div className="ds-card h-[28rem] p-4 sm:h-[32rem]" />
    </div>
  );
}
