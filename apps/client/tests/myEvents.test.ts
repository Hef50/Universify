import { test } from 'node:test';
import assert from 'node:assert/strict';
import { relationForEvent, selectMyEvents, eventsInRange } from '../utils/myEvents';
import type { Event } from '../types/event';

function makeEvent(overrides: Partial<Event> & { id: string }): Event {
  return {
    title: 'Untitled',
    description: '',
    startTime: '2026-08-14T19:00:00.000Z',
    endTime: '2026-08-14T20:00:00.000Z',
    location: '',
    categories: [],
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

test('an RSVP alone makes an event one of mine', () => {
  const event = makeEvent({
    id: 'evt-1',
    attendees: [{ userId: 'u1', status: 'going', timestamp: '' }],
  });
  assert.equal(relationForEvent(event, { userId: 'u1' }), 'going');
  assert.deepEqual(
    selectMyEvents([event], { userId: 'u1' }).map((e) => e.id),
    ['evt-1']
  );
});

test('maybe counts, not-going does not', () => {
  const maybe = makeEvent({
    id: 'maybe',
    attendees: [{ userId: 'u1', status: 'maybe', timestamp: '' }],
  });
  const declined = makeEvent({
    id: 'declined',
    attendees: [{ userId: 'u1', status: 'not-going', timestamp: '' }],
  });
  assert.equal(relationForEvent(maybe, { userId: 'u1' }), 'maybe');
  assert.equal(relationForEvent(declined, { userId: 'u1' }), null);
  assert.deepEqual(
    selectMyEvents([maybe, declined], { userId: 'u1' }).map((e) => e.id),
    ['maybe']
  );
});

test("another user's RSVP is not mine", () => {
  const event = makeEvent({
    id: 'evt-1',
    attendees: [{ userId: 'someone-else', status: 'going', timestamp: '' }],
  });
  assert.equal(relationForEvent(event, { userId: 'u1' }), null);
});

test('hosting outranks an RSVP, and an RSVP outranks a pin', () => {
  const hosted = makeEvent({
    id: 'evt-1',
    attendees: [{ userId: 'u1', status: 'going', timestamp: '' }],
  });
  assert.equal(
    relationForEvent(hosted, { userId: 'u1', createdIds: ['evt-1'], scheduledIds: ['evt-1'] }),
    'created'
  );

  const rsvped = makeEvent({
    id: 'evt-2',
    attendees: [{ userId: 'u1', status: 'going', timestamp: '' }],
  });
  assert.equal(relationForEvent(rsvped, { userId: 'u1', scheduledIds: ['evt-2'] }), 'going');

  const pinned = makeEvent({ id: 'evt-3' });
  assert.equal(relationForEvent(pinned, { userId: 'u1', scheduledIds: ['evt-3'] }), 'scheduled');
});

test('a recurring occurrence inherits the relationship of its series', () => {
  const occurrence = makeEvent({
    id: 'evt-1::2026-08-21',
    attendees: [{ userId: 'u1', status: 'going', timestamp: '' }],
  });
  assert.equal(relationForEvent(occurrence, { userId: 'u1' }), 'going');

  const pinnedOccurrence = makeEvent({ id: 'evt-9::2026-08-21' });
  assert.equal(
    relationForEvent(pinnedOccurrence, { userId: 'u1', scheduledIds: ['evt-9'] }),
    'scheduled'
  );
});

test('signed-out users have no events of their own', () => {
  const event = makeEvent({
    id: 'evt-1',
    attendees: [{ userId: 'u1', status: 'going', timestamp: '' }],
  });
  assert.deepEqual(selectMyEvents([event], {}), []);
});

test('selectMyEvents returns events in start-time order', () => {
  const later = makeEvent({
    id: 'later',
    startTime: '2026-08-20T19:00:00.000Z',
    endTime: '2026-08-20T20:00:00.000Z',
    attendees: [{ userId: 'u1', status: 'going', timestamp: '' }],
  });
  const sooner = makeEvent({
    id: 'sooner',
    startTime: '2026-08-13T19:00:00.000Z',
    endTime: '2026-08-13T20:00:00.000Z',
    attendees: [{ userId: 'u1', status: 'going', timestamp: '' }],
  });
  assert.deepEqual(
    selectMyEvents([later, sooner], { userId: 'u1' }).map((e) => e.id),
    ['sooner', 'later']
  );
});

test('eventsInRange keeps anything overlapping the window', () => {
  const before = makeEvent({
    id: 'before',
    startTime: '2026-08-01T10:00:00.000Z',
    endTime: '2026-08-01T11:00:00.000Z',
  });
  const spanning = makeEvent({
    id: 'spanning',
    startTime: '2026-08-09T23:00:00.000Z',
    endTime: '2026-08-10T02:00:00.000Z',
  });
  const inside = makeEvent({
    id: 'inside',
    startTime: '2026-08-12T10:00:00.000Z',
    endTime: '2026-08-12T11:00:00.000Z',
  });
  const after = makeEvent({
    id: 'after',
    startTime: '2026-09-01T10:00:00.000Z',
    endTime: '2026-09-01T11:00:00.000Z',
  });

  const kept = eventsInRange(
    [before, spanning, inside, after],
    new Date('2026-08-10T00:00:00.000Z'),
    new Date('2026-08-16T23:59:59.999Z')
  ).map((e) => e.id);

  assert.deepEqual(kept, ['spanning', 'inside']);
});
