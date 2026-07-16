// iCalendar (RFC 5545) helpers — no external dependency needed for this volume of templating.

function escIcs(value: string): string {
  // RFC 5545 §3.3.11: escape backslash first, then semicolon, comma, newline.
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

// DTSTART/DTEND as DATE values (floating, no timezone suffix) per RFC 5545 §3.3.4.
// Using the all-day DATE form (YYYYMMDD) avoids timezone ambiguity for deadline dates.
function isoToIcsDate(iso: string): string {
  return iso.replace(/-/g, "").slice(0, 8);
}

// DTSTAMP needs to be UTC datetime per RFC 5545 §3.7.4.
function nowUtcStamp(): string {
  return new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
}

// Deterministic UID: domain + item id (or title hash for items without a db id).
function makeUid(seed: string): string {
  return `kairos-${seed.replace(/[^a-zA-Z0-9]/g, "-")}@kairos.app`;
}

export interface IcsEvent {
  id: string;
  title: string;
  due_date: string; // YYYY-MM-DD
  why_text: string;
}

function renderVevent(event: IcsEvent, stamp: string): string {
  const date = isoToIcsDate(event.due_date);
  // DTEND is exclusive for DATE values, so end = due_date + 1 day.
  const endDate = isoToIcsDate(
    new Date(new Date(event.due_date).getTime() + 86400000).toISOString().slice(0, 10)
  );
  // VALARM: trigger 1 week (7 days) before the event.
  return [
    "BEGIN:VEVENT",
    `UID:${makeUid(event.id)}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${date}`,
    `DTEND;VALUE=DATE:${endDate}`,
    `SUMMARY:${escIcs(event.title)}`,
    `DESCRIPTION:${escIcs(event.why_text)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:Reminder: ${escIcs(event.title)}`,
    "TRIGGER:-P7D",
    "END:VALARM",
    "END:VEVENT",
  ].join("\r\n");
}

export function buildSingleIcs(event: IcsEvent): string {
  const stamp = nowUtcStamp();
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kairos//Kairos App//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    renderVevent(event, stamp),
    "END:VCALENDAR",
  ].join("\r\n");
}

export function buildBulkIcs(events: IcsEvent[]): string {
  const stamp = nowUtcStamp();
  const vevents = events.map((e) => renderVevent(e, stamp)).join("\r\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kairos//Kairos App//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    vevents,
    "END:VCALENDAR",
  ].join("\r\n");
}

export function googleCalendarUrl(event: IcsEvent): string {
  const date = isoToIcsDate(event.due_date);
  const endDate = isoToIcsDate(
    new Date(new Date(event.due_date).getTime() + 86400000).toISOString().slice(0, 10)
  );
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${date}/${endDate}`,
    details: event.why_text,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadIcs(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
