/**
 * Calendar export + share helpers for events.
 *
 * IMPORTANT: this module is imported by node-run unit tests (tsx --test), so
 * it must stay free of react-native imports. Web-only behavior is detected
 * with `typeof document !== 'undefined'` instead of Platform.OS.
 */
import type { Event } from '../types/event';

/**
 * Escape text for RFC 5545 TEXT values: backslash first, then semicolons,
 * commas, and newlines (rendered as a literal "\n").
 */
const escapeIcsText = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');

/** Convert an ISO 8601 timestamp to UTC basic format: YYYYMMDDTHHMMSSZ. */
export const toUtcBasic = (isoString: string): string =>
  new Date(isoString).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

const slugify = (value: string): string => {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'event';
};

/** Build a valid VCALENDAR/VEVENT document (CRLF line endings) for an event. */
export function buildIcs(event: Event): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CMUnify//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.id}@cmunify`,
    `DTSTAMP:${toUtcBasic(new Date().toISOString())}`,
    `DTSTART:${toUtcBasic(event.startTime)}`,
    `DTEND:${toUtcBasic(event.endTime)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    `LOCATION:${escapeIcsText(event.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n') + '\r\n';
}

/** Prefilled "add to Google Calendar" URL for an event. */
export function googleCalendarUrl(event: Event): string {
  const params: [string, string][] = [
    ['action', 'TEMPLATE'],
    ['text', event.title],
    ['dates', `${toUtcBasic(event.startTime)}/${toUtcBasic(event.endTime)}`],
    ['details', event.description],
    ['location', event.location],
  ];
  const query = params
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  return `https://calendar.google.com/calendar/render?${query}`;
}

/**
 * Trigger a browser download of the event as an .ics file.
 * No-op outside the web (no `document`).
 */
export function downloadIcs(event: Event): void {
  if (
    typeof document === 'undefined' ||
    typeof Blob === 'undefined' ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  ) {
    return;
  }
  const blob = new Blob([buildIcs(event)], { type: 'text/calendar' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = `${slugify(event.title)}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}

/**
 * Share an event link via the Web Share API, falling back to copying the
 * URL to the clipboard. Returns which path succeeded so callers can show
 * matching feedback ("Link copied", etc.).
 */
export async function shareEvent(
  event: Event,
  url: string
): Promise<'shared' | 'copied' | 'unavailable'> {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;

  if (nav && typeof nav.share === 'function') {
    try {
      await nav.share({ title: event.title, text: event.title, url });
      return 'shared';
    } catch (error) {
      // User dismissed the native share sheet — don't surprise them with a
      // clipboard write; report unavailable so callers stay silent.
      if (error instanceof Error && error.name === 'AbortError') {
        return 'unavailable';
      }
      // Otherwise fall through to the clipboard fallback.
    }
  }

  if (nav?.clipboard && typeof nav.clipboard.writeText === 'function') {
    try {
      await nav.clipboard.writeText(url);
      return 'copied';
    } catch {
      return 'unavailable';
    }
  }

  return 'unavailable';
}
