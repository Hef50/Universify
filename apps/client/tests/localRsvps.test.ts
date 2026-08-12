import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyLocalRsvp,
  applyLocalRsvps,
  getLocalRsvp,
  parseRsvpStore,
  setLocalRsvp,
} from '../utils/localRsvps';
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

test('parseRsvpStore tolerates missing and malformed values', () => {
  assert.deepEqual(parseRsvpStore(null), {});
  assert.deepEqual(parseRsvpStore(''), {});
  assert.deepEqual(parseRsvpStore('not json'), {});
  assert.deepEqual(parseRsvpStore('[1,2,3]'), {});
  assert.deepEqual(parseRsvpStore('{"u1":{"e1":"banana"}}'), {});
  assert.deepEqual(parseRsvpStore('{"u1":{"e1":"going","e2":"nope"}}'), {
    u1: { e1: 'going' },
  });
});

test('setLocalRsvp stores, replaces and clears without touching other users', () => {
  let store = setLocalRsvp({}, 'u1', 'e1', 'going');
  store = setLocalRsvp(store, 'u2', 'e1', 'maybe');
  assert.equal(getLocalRsvp(store, 'u1', 'e1'), 'going');
  assert.equal(getLocalRsvp(store, 'u2', 'e1'), 'maybe');

  store = setLocalRsvp(store, 'u1', 'e1', 'maybe');
  assert.equal(getLocalRsvp(store, 'u1', 'e1'), 'maybe');

  store = setLocalRsvp(store, 'u1', 'e1', null);
  assert.equal(getLocalRsvp(store, 'u1', 'e1'), null);
  assert.equal(getLocalRsvp(store, 'u2', 'e1'), 'maybe');
  assert.ok(!('u1' in store), 'empty users are dropped');
});

test('applying an RSVP adds the attendee and bumps the count once', () => {
  const event = makeEvent({ id: 'e1', rsvpCounts: { going: 4, maybe: 1, notGoing: 0 } });
  const going = applyLocalRsvp(event, 'u1', 'going', 'now');

  assert.deepEqual(going.rsvpCounts, { going: 5, maybe: 1, notGoing: 0 });
  assert.deepEqual(going.attendees, [{ userId: 'u1', status: 'going', timestamp: 'now' }]);
  // Re-applying the same status must not double count
  assert.equal(applyLocalRsvp(going, 'u1', 'going', 'now'), going);
});

test('changing an RSVP moves the count from one bucket to the other', () => {
  const event = makeEvent({
    id: 'e1',
    rsvpCounts: { going: 5, maybe: 1, notGoing: 0 },
    attendees: [{ userId: 'u1', status: 'going', timestamp: 'then' }],
  });
  const maybe = applyLocalRsvp(event, 'u1', 'maybe', 'now');
  assert.deepEqual(maybe.rsvpCounts, { going: 4, maybe: 2, notGoing: 0 });
  assert.deepEqual(maybe.attendees, [{ userId: 'u1', status: 'maybe', timestamp: 'now' }]);
});

test('clearing an RSVP removes the attendee and never drives a count negative', () => {
  const event = makeEvent({
    id: 'e1',
    rsvpCounts: { going: 0, maybe: 0, notGoing: 0 },
    attendees: [{ userId: 'u1', status: 'going', timestamp: 'then' }],
  });
  const cleared = applyLocalRsvp(event, 'u1', null);
  assert.deepEqual(cleared.rsvpCounts, { going: 0, maybe: 0, notGoing: 0 });
  assert.deepEqual(cleared.attendees, []);
});

test('applyLocalRsvps only touches the signed-in user’s saved events', () => {
  const events = [makeEvent({ id: 'e1' }), makeEvent({ id: 'e2' })];
  const store = setLocalRsvp(setLocalRsvp({}, 'u1', 'e1', 'going'), 'u2', 'e2', 'going');

  const forU1 = applyLocalRsvps(events, store, 'u1', 'now');
  assert.deepEqual(forU1[0].attendees, [{ userId: 'u1', status: 'going', timestamp: 'now' }]);
  assert.deepEqual(forU1[1].attendees, []);

  // Signed out: nothing is applied
  assert.equal(applyLocalRsvps(events, store, undefined), events);
});
