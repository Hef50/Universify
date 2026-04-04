/**
 * In-memory event store for the email bot.
 *
 * Holds parsed Universify events keyed by their id.
 * Provides helpers to add, retrieve, and query events.
 */

import { UniversifyEvent } from './parser';

// Map<eventId, event>
const events = new Map<string, UniversifyEvent>();

// ─── Public API ────────────────────────────────────────────────────────

/**
 * Add or update an event in the store.
 * Returns true if the event was new, false if it was an update.
 */
export function addEvent(event: UniversifyEvent): boolean {
  const isNew = !events.has(event.id);
  events.set(event.id, event);
  return isNew;
}

/**
 * Get a single event by id.
 */
export function getEvent(id: string): UniversifyEvent | undefined {
  return events.get(id);
}

/**
 * Get all stored events, sorted by startTime descending (newest first).
 */
export function getEvents(): UniversifyEvent[] {
  return Array.from(events.values()).sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );
}

/**
 * Remove an event from the store.
 */
export function removeEvent(id: string): boolean {
  return events.delete(id);
}

/**
 * Clear all events.
 */
export function clearEvents(): void {
  events.clear();
}

/**
 * Get the total number of stored events.
 */
export function getEventCount(): number {
  return events.size;
}
