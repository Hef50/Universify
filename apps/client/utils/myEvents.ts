import { Event } from '@/types/event';
import { baseEventId } from '@/utils/recurringEvents';

/**
 * Why an event belongs to a user. Ordered by how strong the relationship is:
 * hosting beats an RSVP, and an RSVP beats a plain calendar pin.
 */
export type MyEventRelation = 'created' | 'going' | 'maybe' | 'scheduled';

export interface MyEventContext {
  /** Current user id, when signed in. */
  userId?: string | null;
  /** Ids of events the user created. */
  createdIds?: readonly string[];
  /** Ids of events the user pinned to their calendar (across all weeks). */
  scheduledIds?: readonly string[];
}

/**
 * How the given event relates to the user, or null if it doesn't.
 *
 * Accepts recurring-occurrence copies ("<id>::<date>") and resolves them to
 * the base event, so an occurrence inherits the RSVP made on its series.
 */
export function relationForEvent(event: Event, ctx: MyEventContext): MyEventRelation | null {
  const id = baseEventId(event.id);

  if (ctx.createdIds?.includes(id)) return 'created';

  if (ctx.userId) {
    const status = event.attendees.find((a) => a.userId === ctx.userId)?.status;
    if (status === 'going') return 'going';
    if (status === 'maybe') return 'maybe';
  }

  if (ctx.scheduledIds?.includes(id)) return 'scheduled';

  // Explicit "not going" and everything else is not the user's event
  return null;
}

/**
 * Every event the user has a relationship with — what they're going to,
 * maybe attending, hosting, or pinned — sorted by start time.
 *
 * This is the single definition of "my events" behind the calendar, the
 * mobile agenda and the My Events screen, so an RSVP shows up everywhere
 * without each screen re-deriving its own rules.
 */
export function selectMyEvents(events: Event[], ctx: MyEventContext): Event[] {
  return events
    .filter((event) => relationForEvent(event, ctx) !== null)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

/** Events from `events` that overlap [rangeStart, rangeEnd]. */
export function eventsInRange(events: Event[], rangeStart: Date, rangeEnd: Date): Event[] {
  const start = rangeStart.getTime();
  const end = rangeEnd.getTime();
  return events.filter((event) => {
    const eventStart = new Date(event.startTime).getTime();
    const eventEnd = new Date(event.endTime).getTime();
    if (isNaN(eventStart) || isNaN(eventEnd)) return false;
    return eventStart <= end && eventEnd >= start;
  });
}
