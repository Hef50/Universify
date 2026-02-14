/**
 * In-memory event store for the Slack bot.
 *
 * Holds parsed Universify events keyed by their id.
 * Provides helpers to add, retrieve, and query events.
 */

import { UniversifyEvent } from './parser';

// Map<eventId, event>
const events = new Map<string, UniversifyEvent>();

// Track which channels we are monitoring
const monitoredChannels = new Set<string>();

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
 * Get events that originated from a specific Slack channel.
 * Matches events whose id starts with `slack-{channelId}-`.
 */
export function getEventsByChannel(channelId: string): UniversifyEvent[] {
  const prefix = `slack-${channelId}-`;
  return Array.from(events.values())
    .filter((e) => e.id.startsWith(prefix))
    .sort(
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

// ─── Monitored channels ────────────────────────────────────────────────

export function addMonitoredChannel(channelId: string): void {
  monitoredChannels.add(channelId);
}

export function removeMonitoredChannel(channelId: string): void {
  monitoredChannels.delete(channelId);
}

export function getMonitoredChannels(): string[] {
  return Array.from(monitoredChannels);
}

export function isChannelMonitored(channelId: string): boolean {
  return monitoredChannels.has(channelId);
}
