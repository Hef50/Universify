import { Event } from '@/types/event';

/**
 * Separator between a base event id and an occurrence date in synthetic
 * occurrence ids, e.g. "evt-123::2026-08-19". Occurrences are display-only
 * copies; strip the suffix to get back to the real event.
 */
export const OCCURRENCE_ID_SEPARATOR = '::';

/** Map a (possibly synthetic occurrence) id back to its base event id. */
export function baseEventId(id: string): string {
  const index = id.indexOf(OCCURRENCE_ID_SEPARATOR);
  return index === -1 ? id : id.slice(0, index);
}

const DAY_MS = 24 * 60 * 60 * 1000;
// Hard cap per event so a malformed pattern can never hang the UI
const MAX_OCCURRENCES = 366;

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const targetDay = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  // Clamp to the last day of the target month (Jan 31 + 1 month -> Feb 28/29)
  const daysInMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(targetDay, daysInMonth));
  return result;
}

function makeOccurrence(event: Event, start: Date, durationMs: number): Event {
  const end = new Date(start.getTime() + durationMs);
  const dateKey = start.toISOString().slice(0, 10);
  return {
    ...event,
    id: `${event.id}${OCCURRENCE_ID_SEPARATOR}${dateKey}`,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  };
}

/**
 * Generate the occurrences of a single recurring event that overlap
 * [rangeStart, rangeEnd]. The original occurrence (the event's own
 * start/end) is NOT included — callers already have the base event.
 */
export function expandRecurringEvent(
  event: Event,
  rangeStart: Date,
  rangeEnd: Date
): Event[] {
  const pattern = event.recurring;
  if (!pattern) return [];

  const interval = Math.max(1, Math.floor(pattern.interval || 1));
  const firstStart = new Date(event.startTime);
  const firstEnd = new Date(event.endTime);
  if (isNaN(firstStart.getTime()) || isNaN(firstEnd.getTime())) return [];
  const durationMs = Math.max(firstEnd.getTime() - firstStart.getTime(), 0);

  // Recurrence stops at the pattern end date (inclusive) or the range end
  const patternEnd = pattern.endDate ? new Date(`${pattern.endDate}T23:59:59.999Z`) : null;
  const hardEnd = patternEnd && patternEnd < rangeEnd ? patternEnd : rangeEnd;
  if (hardEnd < firstStart) return [];

  const occurrences: Event[] = [];

  const pushIfInRange = (start: Date) => {
    if (start.getTime() === firstStart.getTime()) return; // skip the original
    const end = new Date(start.getTime() + durationMs);
    if (end >= rangeStart && start <= hardEnd) {
      occurrences.push(makeOccurrence(event, start, durationMs));
    }
  };

  if (pattern.frequency === 'daily') {
    for (let i = 1; i <= MAX_OCCURRENCES; i++) {
      const start = new Date(firstStart.getTime() + i * interval * DAY_MS);
      if (start > hardEnd) break;
      pushIfInRange(start);
    }
  } else if (pattern.frequency === 'weekly') {
    const daysOfWeek =
      pattern.daysOfWeek && pattern.daysOfWeek.length > 0
        ? pattern.daysOfWeek
        : [firstStart.getDay()];
    // Walk week by week from the first occurrence's week
    for (let week = 0; week <= MAX_OCCURRENCES; week += interval) {
      let anyInFuture = false;
      for (const dow of daysOfWeek) {
        const dayOffset = (dow - firstStart.getDay() + 7) % 7;
        const start = new Date(firstStart.getTime() + (week * 7 + dayOffset) * DAY_MS);
        if (start <= hardEnd) anyInFuture = true;
        if (start > hardEnd) continue;
        pushIfInRange(start);
      }
      if (!anyInFuture && week > 0) break;
      if (occurrences.length >= MAX_OCCURRENCES) break;
    }
  } else if (pattern.frequency === 'monthly') {
    for (let i = 1; i <= MAX_OCCURRENCES; i++) {
      const start = addMonths(firstStart, i * interval);
      if (start > hardEnd) break;
      pushIfInRange(start);
    }
  }

  return occurrences.slice(0, MAX_OCCURRENCES);
}

/**
 * Expand every recurring event in `events` into display occurrences that
 * overlap [rangeStart, rangeEnd], returning the original list plus the
 * generated occurrences.
 */
export function expandRecurringEvents(
  events: Event[],
  rangeStart: Date,
  rangeEnd: Date
): Event[] {
  const expanded: Event[] = [...events];
  for (const event of events) {
    if (event.recurring) {
      expanded.push(...expandRecurringEvent(event, rangeStart, rangeEnd));
    }
  }
  return expanded;
}
