import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutEvents } from '../utils/eventLayout';
import type { Event } from '../types/event';

function makeEvent(id: string, startTime: string, endTime: string): Event {
  return {
    id,
    title: id,
    description: '',
    startTime,
    endTime,
    location: '',
    categories: [],
    organizer: { id: 'org', name: 'Org', type: 'club' },
    color: '#FF6B6B',
    rsvpEnabled: true,
    rsvpCounts: { going: 0, maybe: 0, notGoing: 0 },
    attendees: [],
    attendeeVisibility: 'public',
    isClubEvent: false,
    isSocialEvent: false,
    tags: [],
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  };
}

test('non-overlapping events each get the full width', () => {
  const laid = layoutEvents([
    makeEvent('a', '2026-08-14T10:00:00Z', '2026-08-14T11:00:00Z'),
    makeEvent('b', '2026-08-14T12:00:00Z', '2026-08-14T13:00:00Z'),
  ]);
  for (const event of laid) {
    assert.equal(event.totalColumns, 1, `${event.id} should be alone in its group`);
    assert.equal(event.column, 0);
  }
});

test('two overlapping events split into two columns', () => {
  const laid = layoutEvents([
    makeEvent('a', '2026-08-14T10:00:00Z', '2026-08-14T12:00:00Z'),
    makeEvent('b', '2026-08-14T11:00:00Z', '2026-08-14T13:00:00Z'),
  ]);
  const byId = Object.fromEntries(laid.map((e) => [e.id, e]));
  assert.equal(byId.a.totalColumns, 2);
  assert.equal(byId.b.totalColumns, 2);
  assert.notEqual(byId.a.column, byId.b.column, 'overlapping events must not share a column');
});

test('chain of three overlapping events shares a group', () => {
  const laid = layoutEvents([
    makeEvent('a', '2026-08-14T10:00:00Z', '2026-08-14T11:30:00Z'),
    makeEvent('b', '2026-08-14T11:00:00Z', '2026-08-14T12:30:00Z'),
    makeEvent('c', '2026-08-14T12:00:00Z', '2026-08-14T13:30:00Z'),
  ]);
  const byId = Object.fromEntries(laid.map((e) => [e.id, e]));
  // a and c don't directly overlap, so they can reuse the same column while
  // b (overlapping both) must sit in a different one
  assert.notEqual(byId.a.column, byId.b.column);
  assert.notEqual(byId.b.column, byId.c.column);
});

test('empty input produces empty output', () => {
  assert.deepEqual(layoutEvents([]), []);
});
