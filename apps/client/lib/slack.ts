/**
 * Slack API helpers for the Universify client.
 *
 * Communicates with the slack-bot REST API to fetch channels and events.
 */

import { Event, EventCategory } from '@/types/event';

// ─── Types ─────────────────────────────────────────────────────────────

export interface SlackChannel {
  id: string;
  name: string;
  topic: string;
  purpose: string;
  memberCount: number;
  isPrivate: boolean;
}

export interface SlackChannelsResponse {
  ok: boolean;
  channels: SlackChannel[];
  error?: string;
}

export interface SlackEventsResponse {
  ok: boolean;
  events: Event[];
  count: number;
  channel?: { id: string; name: string };
  error?: string;
}

export interface SlackHealthResponse {
  status: string;
  service: string;
  eventsInStore: number;
  timestamp: string;
}

// ─── API helpers ───────────────────────────────────────────────────────

/**
 * Check if the Slack bot is running and reachable.
 */
export async function checkSlackBotHealth(botUrl: string): Promise<SlackHealthResponse | null> {
  try {
    const response = await fetch(`${botUrl}/api/slack/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Slack bot health check failed:', error);
    return null;
  }
}

/**
 * Fetch the list of Slack channels the bot can access.
 */
export async function fetchSlackChannels(botUrl: string): Promise<SlackChannel[]> {
  try {
    const response = await fetch(`${botUrl}/api/slack/channels`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: SlackChannelsResponse = await response.json();
    if (!data.ok) {
      throw new Error(data.error || 'Failed to fetch channels');
    }

    return data.channels;
  } catch (error) {
    console.error('Error fetching Slack channels:', error);
    throw error;
  }
}

/**
 * Fetch and parse events from a specific Slack channel.
 */
export async function fetchSlackEventsFromChannel(
  botUrl: string,
  channelId: string,
  limit: number = 50
): Promise<Event[]> {
  try {
    const params = new URLSearchParams({
      channel: channelId,
      limit: limit.toString(),
    });

    const response = await fetch(`${botUrl}/api/slack/events?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: SlackEventsResponse = await response.json();
    if (!data.ok) {
      throw new Error(data.error || 'Failed to fetch events');
    }

    // Ensure the response events conform to the Event type
    return convertSlackResponseToEvents(data.events);
  } catch (error) {
    console.error(`Error fetching Slack events from channel ${channelId}:`, error);
    throw error;
  }
}

/**
 * Fetch all cached events from the Slack bot (across all channels).
 */
export async function fetchAllCachedSlackEvents(botUrl: string): Promise<Event[]> {
  try {
    const response = await fetch(`${botUrl}/api/slack/cached`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: SlackEventsResponse = await response.json();
    if (!data.ok) {
      throw new Error(data.error || 'Failed to fetch cached events');
    }

    return convertSlackResponseToEvents(data.events);
  } catch (error) {
    console.error('Error fetching cached Slack events:', error);
    throw error;
  }
}

// ─── Data conversion ───────────────────────────────────────────────────

const VALID_CATEGORIES: EventCategory[] = [
  'Career', 'Food', 'Fun', 'Afternoon', 'Events',
  'Academic', 'Networking', 'Social', 'Sports', 'Arts', 'Tech', 'Wellness',
];

/**
 * Convert raw event objects from the Slack bot API into properly-typed Event objects.
 * Ensures all required fields are present with sensible defaults.
 */
export function convertSlackResponseToEvents(rawEvents: any[]): Event[] {
  if (!Array.isArray(rawEvents)) return [];

  return rawEvents
    .filter((e) => e && e.id && e.title)
    .map((e): Event => ({
      id: e.id,
      title: e.title || 'Untitled Slack Event',
      description: e.description || '',
      startTime: e.startTime || new Date().toISOString(),
      endTime: e.endTime || new Date().toISOString(),
      location: e.location || '',
      categories: Array.isArray(e.categories)
        ? e.categories.filter((c: string) => VALID_CATEGORIES.includes(c as EventCategory))
        : ['Events'],
      organizer: {
        id: e.organizer?.id || 'slack-unknown',
        name: e.organizer?.name || 'Slack',
        type: e.organizer?.type === 'individual' ? 'individual' : 'club',
      },
      color: e.color || '#611f69',
      rsvpEnabled: e.rsvpEnabled ?? false,
      rsvpCounts: e.rsvpCounts || { going: 0, maybe: 0, notGoing: 0 },
      attendees: Array.isArray(e.attendees) ? e.attendees : [],
      attendeeVisibility: e.attendeeVisibility || 'public',
      isClubEvent: e.isClubEvent ?? true,
      isSocialEvent: e.isSocialEvent ?? false,
      capacity: e.capacity,
      tags: Array.isArray(e.tags) ? e.tags : ['Slack'],
      createdAt: e.createdAt || new Date().toISOString(),
      updatedAt: e.updatedAt || new Date().toISOString(),
      imageUrl: e.imageUrl,
    }));
}
