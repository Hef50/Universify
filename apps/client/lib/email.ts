/**
 * Email bot API helpers for the Universify client.
 *
 * Communicates with the email-bot REST API to check health,
 * trigger imports, and fetch parsed newsletter events.
 */

import { Event, EventCategory } from '@/types/event';

// ─── Types ─────────────────────────────────────────────────────────────

export interface EmailHealthResponse {
  status: string;
  service: string;
  eventsInStore: number;
  timestamp: string;
}

export interface EmailEventsResponse {
  ok: boolean;
  events: any[];
  count: number;
  error?: string;
}

export interface EmailImportResponse {
  ok: boolean;
  newEvents: number;
  totalEvents: number;
  message: string;
  error?: string;
}

// ─── API helpers ────────────────────────────────────────────────────────

/**
 * Check if the email bot is running and reachable.
 */
export async function checkEmailBotHealth(botUrl: string): Promise<EmailHealthResponse | null> {
  try {
    const response = await fetch(`${botUrl}/api/email/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Fetch all cached events from the email bot store.
 */
export async function fetchCachedEmailEvents(botUrl: string): Promise<Event[]> {
  try {
    const response = await fetch(`${botUrl}/api/email/events`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: EmailEventsResponse = await response.json();
    if (!data.ok) {
      throw new Error(data.error || 'Failed to fetch email events');
    }

    return convertEmailResponseToEvents(data.events);
  } catch (error) {
    console.error('Error fetching cached email events:', error);
    throw error;
  }
}

/**
 * Trigger a manual email import on the bot server.
 * @param days - How many days back to scan the inbox (default 7, max 30)
 */
export async function triggerEmailImport(
  botUrl: string,
  days = 7
): Promise<EmailImportResponse> {
  const response = await fetch(`${botUrl}/api/email/import?days=${days}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data: EmailImportResponse = await response.json();
  if (!data.ok) {
    throw new Error(data.error || 'Import failed');
  }

  return data;
}

// ─── Data conversion ────────────────────────────────────────────────────

const VALID_CATEGORIES: EventCategory[] = [
  'Career', 'Food', 'Fun', 'Afternoon', 'Events',
  'Academic', 'Networking', 'Social', 'Sports', 'Arts', 'Tech', 'Wellness',
];

/**
 * Convert raw event objects from the email bot API into properly-typed Event objects.
 */
export function convertEmailResponseToEvents(rawEvents: any[]): Event[] {
  if (!Array.isArray(rawEvents)) return [];

  return rawEvents
    .filter((e) => e && e.id && e.title)
    .map((e): Event => ({
      id: e.id,
      title: e.title || 'Untitled Newsletter Event',
      description: e.description || '',
      startTime: e.startTime || new Date().toISOString(),
      endTime: e.endTime || new Date().toISOString(),
      location: e.location || '',
      categories: Array.isArray(e.categories)
        ? e.categories.filter((c: string) => VALID_CATEGORIES.includes(c as EventCategory))
        : ['Events'],
      organizer: {
        id: e.organizer?.id || 'email-unknown',
        name: e.organizer?.name || 'Newsletter',
        type: e.organizer?.type === 'individual' ? 'individual' : 'club',
      },
      color: e.color || '#1a73e8',
      rsvpEnabled: e.rsvpEnabled ?? false,
      rsvpCounts: e.rsvpCounts || { going: 0, maybe: 0, notGoing: 0 },
      attendees: Array.isArray(e.attendees) ? e.attendees : [],
      attendeeVisibility: e.attendeeVisibility || 'public',
      isClubEvent: e.isClubEvent ?? true,
      isSocialEvent: e.isSocialEvent ?? false,
      capacity: e.capacity,
      tags: Array.isArray(e.tags) ? e.tags : ['Email', 'Newsletter'],
      createdAt: e.createdAt || new Date().toISOString(),
      updatedAt: e.updatedAt || new Date().toISOString(),
      imageUrl: e.imageUrl,
    }));
}
