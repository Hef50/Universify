import { Event, RSVPStatus } from '@/types/event';

/**
 * RSVPs kept on the device.
 *
 * The app runs in offline/demo mode when no Supabase credentials are present,
 * and dev-mode personas are never real auth.users rows — in both cases an RSVP
 * has nowhere to go on a server. Without this it would live in React state
 * only and vanish on the next reload, which reads as "I signed up and the app
 * forgot". Shape: { [userId]: { [eventId]: status } }.
 */
export type LocalRsvpStore = Record<string, Record<string, Exclude<RSVPStatus, null>>>;

export const LOCAL_RSVP_STORAGE_KEY = 'universify_local_rsvps';

const COUNT_KEY = {
  going: 'going',
  maybe: 'maybe',
  'not-going': 'notGoing',
} as const;

/** Parse a persisted store, tolerating absent or corrupt values. */
export function parseRsvpStore(raw: string | null | undefined): LocalRsvpStore {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const store: LocalRsvpStore = {};
    for (const [userId, byEvent] of Object.entries(parsed as Record<string, unknown>)) {
      if (!byEvent || typeof byEvent !== 'object' || Array.isArray(byEvent)) continue;
      const clean: Record<string, Exclude<RSVPStatus, null>> = {};
      for (const [eventId, status] of Object.entries(byEvent as Record<string, unknown>)) {
        if (status === 'going' || status === 'maybe' || status === 'not-going') {
          clean[eventId] = status;
        }
      }
      if (Object.keys(clean).length > 0) store[userId] = clean;
    }
    return store;
  } catch {
    return {};
  }
}

/** The user's stored status for an event, if any. */
export function getLocalRsvp(
  store: LocalRsvpStore,
  userId: string,
  eventId: string
): RSVPStatus {
  return store[userId]?.[eventId] ?? null;
}

/** Return a new store with the user's RSVP set (or cleared when null). */
export function setLocalRsvp(
  store: LocalRsvpStore,
  userId: string,
  eventId: string,
  status: RSVPStatus
): LocalRsvpStore {
  const forUser = { ...(store[userId] ?? {}) };
  if (status) {
    forUser[eventId] = status;
  } else {
    delete forUser[eventId];
  }
  const next = { ...store };
  if (Object.keys(forUser).length > 0) {
    next[userId] = forUser;
  } else {
    delete next[userId];
  }
  return next;
}

/**
 * Apply one stored RSVP to an event, keeping the aggregate counts consistent
 * with the attendee list. Returns the event untouched when nothing changes.
 */
export function applyLocalRsvp(
  event: Event,
  userId: string,
  status: RSVPStatus,
  timestamp: string = new Date().toISOString()
): Event {
  const existing = event.attendees.find((a) => a.userId === userId)?.status ?? null;
  if (existing === status) return event;

  const rsvpCounts = { ...event.rsvpCounts };
  if (existing) {
    const key = COUNT_KEY[existing];
    rsvpCounts[key] = Math.max(0, rsvpCounts[key] - 1);
  }
  if (status) {
    const key = COUNT_KEY[status];
    rsvpCounts[key] = rsvpCounts[key] + 1;
  }

  const attendees = event.attendees.filter((a) => a.userId !== userId);
  if (status) attendees.push({ userId, status, timestamp });

  return { ...event, rsvpCounts, attendees };
}

/**
 * Layer the user's stored RSVPs over freshly loaded events, so a reload comes
 * back with the same "You're going" state the user left behind.
 */
export function applyLocalRsvps(
  events: Event[],
  store: LocalRsvpStore,
  userId: string | null | undefined,
  timestamp?: string
): Event[] {
  if (!userId) return events;
  const forUser = store[userId];
  if (!forUser || Object.keys(forUser).length === 0) return events;

  return events.map((event) => {
    const status = forUser[event.id];
    if (!status) return event;
    return applyLocalRsvp(event, userId, status, timestamp);
  });
}
