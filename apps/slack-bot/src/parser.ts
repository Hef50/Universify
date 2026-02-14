/**
 * Slack Message → Universify Event Parser
 *
 * Converts raw Slack messages into Universify-shaped Event objects.
 * Uses regex patterns to extract date/time, location, and other fields.
 */

// Mirror the Event type from apps/client/types/event.ts
// We duplicate it here so the backend has no dependency on the Expo client package.
export type EventCategory =
  | 'Career'
  | 'Food'
  | 'Fun'
  | 'Afternoon'
  | 'Events'
  | 'Academic'
  | 'Networking'
  | 'Social'
  | 'Sports'
  | 'Arts'
  | 'Tech'
  | 'Wellness';

export interface UniversifyEvent {
  id: string;
  title: string;
  description: string;
  startTime: string;   // ISO 8601
  endTime: string;     // ISO 8601
  location: string;
  categories: EventCategory[];
  organizer: {
    id: string;
    name: string;
    type: 'club' | 'individual';
  };
  color: string;
  rsvpEnabled: boolean;
  rsvpCounts: { going: number; maybe: number; notGoing: number };
  attendees: Array<{ userId: string; status: string; timestamp: string }>;
  attendeeVisibility: 'public' | 'private';
  isClubEvent: boolean;
  isSocialEvent: boolean;
  capacity?: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
}

// Slack purple color for imported events
const SLACK_EVENT_COLOR = '#611f69';

// ─── Date / Time extraction helpers ────────────────────────────────────

const MONTH_NAMES: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Try to extract a date from the text.
 * Supports:
 *   - MM/DD/YYYY, MM/DD/YY, MM-DD-YYYY
 *   - "December 5, 2025", "Dec 5 2025", "December 5th"
 */
function extractDate(text: string): Date | null {
  // Pattern 1: MM/DD/YYYY or MM-DD-YYYY
  const slashDate = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (slashDate) {
    const month = parseInt(slashDate[1], 10) - 1;
    const day = parseInt(slashDate[2], 10);
    let year = parseInt(slashDate[3], 10);
    if (year < 100) year += 2000;
    return new Date(year, month, day);
  }

  // Pattern 2: "Month Day, Year" or "Month Day Year" or "Month Day" (assumes current year)
  const namedDate = text.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?(?:[,\s]+(\d{4}))?\b/i
  );
  if (namedDate) {
    const month = MONTH_NAMES[namedDate[1].toLowerCase()];
    const day = parseInt(namedDate[2], 10);
    const year = namedDate[3] ? parseInt(namedDate[3], 10) : new Date().getFullYear();
    if (month !== undefined) {
      return new Date(year, month, day);
    }
  }

  return null;
}

/**
 * Try to extract a time (or time range) from the text.
 * Supports:
 *   - "3:00 PM", "3pm", "15:00"
 *   - "3-5pm", "3:00 PM - 5:00 PM"
 * Returns { startHour, startMinute, endHour, endMinute } in 24-hour format.
 */
function extractTime(text: string): {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
} | null {
  // Pattern: time range  "3:00 PM - 5:00 PM" or "3-5pm" or "3pm-5pm"
  const rangePattern =
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–to]+\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
  const rangeMatch = text.match(rangePattern);
  if (rangeMatch) {
    let startH = parseInt(rangeMatch[1], 10);
    const startM = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : 0;
    const startMeridian = (rangeMatch[3] || rangeMatch[6] || '').toLowerCase(); // inherit end meridian
    let endH = parseInt(rangeMatch[4], 10);
    const endM = rangeMatch[5] ? parseInt(rangeMatch[5], 10) : 0;
    const endMeridian = (rangeMatch[6] || '').toLowerCase();

    // Convert to 24h
    if (endMeridian === 'pm' && endH < 12) endH += 12;
    if (endMeridian === 'am' && endH === 12) endH = 0;

    // If start meridian not given, infer from end
    const effectiveStartMeridian = startMeridian || endMeridian;
    if (effectiveStartMeridian === 'pm' && startH < 12) startH += 12;
    if (effectiveStartMeridian === 'am' && startH === 12) startH = 0;

    // Edge case: "9-11am" → if start > end after conversion, start was actually AM
    if (startH > endH) {
      // Recalculate without PM bump
      startH = parseInt(rangeMatch[1], 10);
    }

    return { startHour: startH, startMinute: startM, endHour: endH, endMinute: endM };
  }

  // Pattern: single time "3:00 PM" or "3pm" or "15:00"
  const singlePattern = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
  const singleMatch = text.match(singlePattern);
  if (singleMatch) {
    let hour = parseInt(singleMatch[1], 10);
    const minute = singleMatch[2] ? parseInt(singleMatch[2], 10) : 0;
    const meridian = (singleMatch[3] || '').toLowerCase();

    if (meridian === 'pm' && hour < 12) hour += 12;
    if (meridian === 'am' && hour === 12) hour = 0;

    // Default to 1 hour duration
    return {
      startHour: hour,
      startMinute: minute,
      endHour: hour + 1,
      endMinute: minute,
    };
  }

  return null;
}

// ─── Location extraction ───────────────────────────────────────────────

function extractLocation(text: string): string {
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();

    // "Location: XYZ" or "Where: XYZ"
    const labelMatch = trimmed.match(/^(?:location|where|place|venue)\s*[:]\s*(.+)/i);
    if (labelMatch) return labelMatch[1].trim();

    // "at The Cut" or "@ Wiegand"  (must be start of line or after punctuation)
    const atMatch = trimmed.match(/^(?:at|@)\s+(.{3,})/i);
    if (atMatch) return atMatch[1].trim();
  }
  return '';
}

// ─── Category inference ────────────────────────────────────────────────

function inferCategories(text: string): EventCategory[] {
  const lower = text.toLowerCase();
  const categories: EventCategory[] = [];

  if (/career|job|interview|hiring|recruit/.test(lower)) categories.push('Career');
  if (/food|lunch|dinner|breakfast|pizza|snack|coffee|tea|boba/.test(lower)) categories.push('Food');
  if (/fun|party|game night|trivia|karaoke/.test(lower)) categories.push('Fun');
  if (/academic|class|lecture|study|homework|exam|office hours/.test(lower)) categories.push('Academic');
  if (/network|meetup|mixer/.test(lower)) categories.push('Networking');
  if (/social|hangout|meet people|casual/.test(lower)) categories.push('Social');
  if (/sport|fitness|gym|basketball|soccer|volleyball|yoga|run|pickup/.test(lower)) categories.push('Sports');
  if (/art|music|theater|theatre|dance|paint|drawing|creative/.test(lower)) categories.push('Arts');
  if (/tech|code|coding|hackathon|workshop|programming|ai|ml/.test(lower)) categories.push('Tech');
  if (/wellness|health|meditation|mindful|self[- ]care/.test(lower)) categories.push('Wellness');

  return categories.length > 0 ? categories : ['Events'];
}

// ─── Main parser ───────────────────────────────────────────────────────

export interface SlackMessage {
  text: string;
  ts: string;          // Slack message timestamp (e.g. "1701234567.123456")
  user?: string;        // Slack user ID who posted
  channel?: string;     // Channel ID
  username?: string;    // Display name if available
}

/**
 * Parse a Slack message into a Universify Event.
 *
 * @param message  - The raw Slack message object
 * @param channelName - Human-readable channel name (e.g. "announcements")
 * @param channelId   - Slack channel ID
 */
export function parseSlackMessage(
  message: SlackMessage,
  channelName: string,
  channelId: string
): UniversifyEvent | null {
  const text = (message.text || '').trim();
  if (!text) return null;

  // Skip system / join / leave messages
  if (text.startsWith('has joined the channel') || text.startsWith('has left the channel')) {
    return null;
  }

  // ── Title: first non-empty line, truncated ──
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const title = (lines[0] || 'Untitled Slack Event').substring(0, 100);

  // ── Date / Time ──
  const extractedDate = extractDate(text);
  const extractedTime = extractTime(text);

  // Default: tomorrow at noon if nothing found
  const baseDate = extractedDate || (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  })();

  const startHour = extractedTime?.startHour ?? 12;
  const startMinute = extractedTime?.startMinute ?? 0;
  const endHour = extractedTime?.endHour ?? startHour + 1;
  const endMinute = extractedTime?.endMinute ?? 0;

  const startTime = new Date(baseDate);
  startTime.setHours(startHour, startMinute, 0, 0);

  const endTime = new Date(baseDate);
  endTime.setHours(endHour, endMinute, 0, 0);

  // If end is before start (e.g. parsing error), add 1 hour
  if (endTime <= startTime) {
    endTime.setTime(startTime.getTime() + 60 * 60 * 1000);
  }

  // ── Location ──
  const location = extractLocation(text);

  // ── Categories ──
  const categories = inferCategories(text);

  // ── Build event ──
  const now = new Date().toISOString();

  const event: UniversifyEvent = {
    id: `slack-${channelId}-${message.ts}`,
    title,
    description: text,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    location,
    categories,
    organizer: {
      id: `slack-user-${message.user || 'unknown'}`,
      name: message.username || channelName,
      type: 'club',
    },
    color: SLACK_EVENT_COLOR,
    rsvpEnabled: false,
    rsvpCounts: { going: 0, maybe: 0, notGoing: 0 },
    attendees: [],
    attendeeVisibility: 'public',
    isClubEvent: true,
    isSocialEvent: false,
    tags: ['Slack', channelName],
    createdAt: now,
    updatedAt: now,
  };

  return event;
}
