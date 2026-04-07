import type { SupabaseClient } from "@supabase/supabase-js";

/** Two half-open intervals [aStart,aEnd) and [bStart,bEnd) overlap (touching endpoints do not). */
export function intervalsOverlapInstants(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

export function validateOrderedInstants(startIso: string, endIso: string): string | null {
  const s = new Date(startIso).getTime();
  const e = new Date(endIso).getTime();
  if (Number.isNaN(s) || Number.isNaN(e)) return "Invalid date or time.";
  if (e <= s) return "End time must be after start time.";
  return null;
}

export type CalendarConflict = { title: string; source: string };

const MAX_CONFLICTS = 3;

/**
 * Finds overlapping interval-stored events (other personal, external imports, applied weekly blocks).
 * Does not include recurring class/habit expansion — see comment in user-events routes.
 */
export async function findPersonalEventConflicts(
  supabase: SupabaseClient,
  userId: string,
  startIso: string,
  endIso: string,
  excludeUserEventId?: string
): Promise<CalendarConflict[]> {
  const out: CalendarConflict[] = [];

  let uq = supabase
    .from("user_events")
    .select("id,title,starts_at,ends_at")
    .eq("user_id", userId)
    .lt("starts_at", endIso)
    .gt("ends_at", startIso);
  if (excludeUserEventId) uq = uq.neq("id", excludeUserEventId);
  const { data: userRows } = await uq;
  for (const r of userRows ?? []) {
    if (out.length >= MAX_CONFLICTS) return out;
    const t = String((r as { title?: string }).title ?? "Event");
    out.push({ title: t, source: "personal" });
  }

  if (out.length >= MAX_CONFLICTS) return out;

  const { data: extRows } = await supabase
    .from("external_events")
    .select("summary,starts_at,ends_at")
    .eq("user_id", userId)
    .lt("starts_at", endIso)
    .gt("ends_at", startIso);
  for (const r of extRows ?? []) {
    if (out.length >= MAX_CONFLICTS) return out;
    const row = r as { summary?: string | null };
    out.push({ title: row.summary?.trim() || "Imported event", source: "external" });
  }

  if (out.length >= MAX_CONFLICTS) return out;

  const { data: wpRows } = await supabase
    .from("weekly_plan_blocks")
    .select("title,starts_at,ends_at")
    .eq("user_id", userId)
    .eq("origin", "applied")
    .lt("starts_at", endIso)
    .gt("ends_at", startIso);
  for (const r of wpRows ?? []) {
    if (out.length >= MAX_CONFLICTS) return out;
    const t = String((r as { title?: string }).title ?? "Calendar block");
    out.push({ title: t, source: "applied plan" });
  }

  return out;
}

/** Same-day HH:mm:ss strings; valid when end > start on a 24h clock (no overnight). */
export function validateHhmmssRange(start: string, end: string): string | null {
  if (start >= end) return "End time must be after start time.";
  return null;
}

export function formatConflictApiMessage(data: unknown): string {
  const d = data as { error?: string; conflicts?: CalendarConflict[] };
  let msg = typeof d.error === "string" ? d.error : "Request failed";
  if (Array.isArray(d.conflicts) && d.conflicts.length) {
    msg += ` (${d.conflicts.map((c) => `${c.title} — ${c.source}`).join("; ")})`;
  }
  return msg;
}
