export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading AI calendar">
      <div className="h-8 w-56 rounded-lg bg-palette-card-border/60" />
      <div className="h-4 w-full max-w-2xl rounded bg-palette-card-border/50" />
      <div className="ds-card h-64 p-5" />
      <div className="h-6 w-40 rounded bg-palette-card-border/50" />
      <div className="ds-card h-[28rem] p-4 sm:h-[32rem]" />
    </div>
  );
}
