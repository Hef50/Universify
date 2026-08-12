import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  expandRecurringEvent,
  expandRecurringEvents,
  baseEventId,
} from '../utils/recurringEvents';
import type { Event } from '../types/event';

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'evt-1',
    title: 'Weekly Standup',
    description: '',
    startTime: '2026-08-03T14:00:00.000Z', // a Monday
    endTime: '2026-08-03T15:00:00.000Z',
    location: 'Gates',
    categories: ['Tech'],
    organizer: { id: 'org', name: 'Org', type: 'club' },
    color: '#FF6B6B',
    rsvpEnabled: true,
    rsvpCounts: { going: 0, maybe: 0, notGoing: 0 },
    attendees: [],
    attendeeVisibility: 'public',
    isClubEvent: true,
    isSocialEvent: false,
    tags: [],
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

test('baseEventId strips occurrence suffixes and leaves plain ids alone', () => {
  assert.equal(baseEventId('evt-1::2026-08-10'), 'evt-1');
  assert.equal(baseEventId('evt-1'), 'evt-1');
});

test('non-recurring events produce no occurrences', () => {
  const occurrences = expandRecurringEvent(
    makeEvent(),
    new Date('2026-08-01T00:00:00Z'),
    new Date('2026-08-31T00:00:00Z')
  );
  assert.equal(occurrences.length, 0);
});

test('weekly recurrence generates one occurrence per week, skipping the original', () => {
  const event = makeEvent({ recurring: { frequency: 'weekly', interval: 1 } });
  const occurrences = expandRecurringEvent(
    event,
    new Date('2026-08-01T00:00:00Z'),
    new Date('2026-08-31T23:59:59Z')
  );
  // Aug 3 is the original; occurrences: Aug 10, 17, 24, 31
  assert.deepEqual(
    occurrences.map((o) => o.startTime.slice(0, 10)),
    ['2026-08-10', '2026-08-17', '2026-08-24', '2026-08-31']
  );
  // Duration preserved (1 hour)
  for (const o of occurrences) {
    assert.equal(Date.parse(o.endTime) - Date.parse(o.startTime), 60 * 60 * 1000);
  }
  // Synthetic ids map back to the base event
  for (const o of occurrences) {
    assert.equal(baseEventId(o.id), 'evt-1');
  }
});

test('recurrence respects the pattern end date', () => {
  const event = makeEvent({
    recurring: { frequency: 'weekly', interval: 1, endDate: '2026-08-17' },
  });
  const occurrences = expandRecurringEvent(
    event,
    new Date('2026-08-01T00:00:00Z'),
    new Date('2026-08-31T23:59:59Z')
  );
  assert.deepEqual(
    occurrences.map((o) => o.startTime.slice(0, 10)),
    ['2026-08-10', '2026-08-17']
  );
});

test('daily recurrence with interval 2 skips alternate days', () => {
  const event = makeEvent({ recurring: { frequency: 'daily', interval: 2 } });
  const occurrences = expandRecurringEvent(
    event,
    new Date('2026-08-03T00:00:00Z'),
    new Date('2026-08-09T23:59:59Z')
  );
  assert.deepEqual(
    occurrences.map((o) => o.startTime.slice(0, 10)),
    ['2026-08-05', '2026-08-07', '2026-08-09']
  );
});

test('monthly recurrence clamps to shorter months', () => {
  const event = makeEvent({
    startTime: '2026-01-31T18:00:00.000Z',
    endTime: '2026-01-31T19:00:00.000Z',
    recurring: { frequency: 'monthly', interval: 1 },
  });
  const occurrences = expandRecurringEvent(
    event,
    new Date('2026-02-01T00:00:00Z'),
    new Date('2026-03-31T23:59:59Z')
  );
  // Feb has 28 days in 2026
  assert.deepEqual(
    occurrences.map((o) => o.startTime.slice(0, 10)),
    ['2026-02-28', '2026-03-31']
  );
});

test('expandRecurringEvents keeps originals and appends occurrences', () => {
  const recurring = makeEvent({ recurring: { frequency: 'weekly', interval: 1 } });
  const plain = makeEvent({ id: 'evt-2', recurring: undefined });
  const result = expandRecurringEvents(
    [recurring, plain],
    new Date('2026-08-01T00:00:00Z'),
    new Date('2026-08-16T23:59:59Z')
  );
  const ids = result.map((e) => e.id);
  assert.ok(ids.includes('evt-1'));
  assert.ok(ids.includes('evt-2'));
  assert.ok(ids.includes('evt-1::2026-08-10'));
  assert.equal(result.length, 3); // two originals + the Aug 10 occurrence
});
