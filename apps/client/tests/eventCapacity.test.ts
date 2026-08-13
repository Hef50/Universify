import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAvailableSpots, getClaimedSpots, isEventFull } from '../utils/eventHelpers';
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

test('spots left never goes negative when an event is over-subscribed', () => {
  const oversold = makeEvent({
    id: 'e1',
    capacity: 50,
    rsvpCounts: { going: 60, maybe: 12, notGoing: 3 },
  });
  assert.equal(getAvailableSpots(oversold), 0);
  assert.equal(isEventFull(oversold), true);
});

test('spots left counts going and maybe against capacity', () => {
  const event = makeEvent({
    id: 'e1',
    capacity: 20,
    rsvpCounts: { going: 12, maybe: 3, notGoing: 40 },
  });
  assert.equal(getClaimedSpots(event), 15);
  assert.equal(getAvailableSpots(event), 5);
  assert.equal(isEventFull(event), false);
});

test('an event exactly at capacity is full with zero spots left', () => {
  const event = makeEvent({
    id: 'e1',
    capacity: 10,
    rsvpCounts: { going: 7, maybe: 3, notGoing: 0 },
  });
  assert.equal(getAvailableSpots(event), 0);
  assert.equal(isEventFull(event), true);
});

test('events without a capacity have no spot count and are never full', () => {
  const event = makeEvent({ id: 'e1', rsvpCounts: { going: 900, maybe: 5, notGoing: 0 } });
  assert.equal(getAvailableSpots(event), null);
  assert.equal(isEventFull(event), false);

  const zeroCapacity = makeEvent({ id: 'e2', capacity: 0 });
  assert.equal(getAvailableSpots(zeroCapacity), null);
  assert.equal(isEventFull(zeroCapacity), false);
});

test('negative stored counts cannot inflate the spots left', () => {
  const event = makeEvent({
    id: 'e1',
    capacity: 10,
    rsvpCounts: { going: -5, maybe: 2, notGoing: 0 },
  });
  assert.equal(getClaimedSpots(event), 2);
  assert.equal(getAvailableSpots(event), 8);
});
