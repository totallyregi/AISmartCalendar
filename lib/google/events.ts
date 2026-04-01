export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

export async function fetchGoogleEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string
) {
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    timeMin,
    timeMax,
    maxResults: "2500",
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) throw new Error(`Google Calendar API failed: ${res.status}`);
  const data = (await res.json()) as { items?: GoogleCalendarEvent[] };
  return data.items ?? [];
}

export function normalizeGoogleEvent(e: GoogleCalendarEvent) {
  const startRaw = e.start?.dateTime ?? e.start?.date;
  const endRaw = e.end?.dateTime ?? e.end?.date;
  if (!startRaw || !endRaw) return null;
  const allDay = !!e.start?.date && !e.start?.dateTime;
  return {
    provider_event_id: e.id,
    summary: e.summary ?? "(No title)",
    starts_at: new Date(startRaw).toISOString(),
    ends_at: new Date(endRaw).toISOString(),
    all_day: allDay,
  };
}
