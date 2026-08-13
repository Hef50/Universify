/**
 * Event threads: attendee chat plus host announcements.
 *
 * Announcements and messages share one ordered list so the thread reads
 * chronologically, with `kind` deciding how a post renders and who may write
 * it (announcements are the host's). When Supabase is configured these live in
 * the `event_messages` table; otherwise they are kept on the device, which is
 * what offline/demo mode and dev personas use.
 */

export type MessageKind = 'message' | 'announcement';

export interface EventMessage {
  id: string;
  eventId: string;
  userId: string;
  authorName: string;
  kind: MessageKind;
  body: string;
  createdAt: string;
}

export type MessageStore = Record<string, EventMessage[]>;

export const MESSAGE_STORAGE_KEY = 'universify_event_messages';
export const MAX_MESSAGE_LENGTH = 2000;

function isMessage(value: unknown): value is EventMessage {
  if (!value || typeof value !== 'object') return false;
  const m = value as Partial<EventMessage>;
  return (
    typeof m.id === 'string' &&
    typeof m.eventId === 'string' &&
    typeof m.userId === 'string' &&
    typeof m.authorName === 'string' &&
    (m.kind === 'message' || m.kind === 'announcement') &&
    typeof m.body === 'string' &&
    typeof m.createdAt === 'string'
  );
}

const byTime = (a: EventMessage, b: EventMessage) =>
  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

/** Parse a persisted store, dropping anything malformed. */
export function parseMessageStore(raw: string | null | undefined): MessageStore {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const store: MessageStore = {};
    for (const [eventId, list] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(list)) continue;
      const clean = list.filter(isMessage).sort(byTime);
      if (clean.length > 0) store[eventId] = clean;
    }
    return store;
  } catch {
    return {};
  }
}

export function messagesForEvent(store: MessageStore, eventId: string): EventMessage[] {
  return store[eventId] ?? [];
}

/** Return a new store with the post appended (ids are de-duplicated). */
export function addMessage(store: MessageStore, message: EventMessage): MessageStore {
  const existing = store[message.eventId] ?? [];
  if (existing.some((m) => m.id === message.id)) return store;
  return {
    ...store,
    [message.eventId]: [...existing, message].sort(byTime),
  };
}

export function removeMessage(
  store: MessageStore,
  eventId: string,
  messageId: string
): MessageStore {
  const existing = store[eventId];
  if (!existing) return store;
  const next = existing.filter((m) => m.id !== messageId);
  if (next.length === existing.length) return store;
  const updated = { ...store };
  if (next.length > 0) {
    updated[eventId] = next;
  } else {
    delete updated[eventId];
  }
  return updated;
}

/** Trim and length-cap a draft; returns null when there's nothing to post. */
export function normalizeBody(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_MESSAGE_LENGTH);
}

/**
 * Who may take part in an event's thread: anyone going or maybe, plus the
 * host. Kept next to the storage helpers so the UI and the database policy
 * (see supabase/migrations/004_event_messages.sql) state the same rule.
 */
export function canParticipate(
  rsvpStatus: string | null | undefined,
  isHost: boolean
): boolean {
  return isHost || rsvpStatus === 'going' || rsvpStatus === 'maybe';
}
