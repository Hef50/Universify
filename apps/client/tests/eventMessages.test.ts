import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EventMessage,
  addMessage,
  canParticipate,
  messagesForEvent,
  normalizeBody,
  parseMessageStore,
  removeMessage,
} from '../utils/eventMessages';

function makeMessage(overrides: Partial<EventMessage> & { id: string }): EventMessage {
  return {
    eventId: 'evt-1',
    userId: 'u1',
    authorName: 'Petra',
    kind: 'message',
    body: 'hello',
    createdAt: '2026-08-12T10:00:00.000Z',
    ...overrides,
  };
}

test('only people going, maybe, or hosting can take part', () => {
  assert.equal(canParticipate('going', false), true);
  assert.equal(canParticipate('maybe', false), true);
  assert.equal(canParticipate('not-going', false), false);
  assert.equal(canParticipate(null, false), false);
  assert.equal(canParticipate(undefined, false), false);
  // The host is in regardless of their own RSVP
  assert.equal(canParticipate(null, true), true);
});

test('messages stay in chronological order as they are added', () => {
  const later = makeMessage({ id: 'b', createdAt: '2026-08-12T12:00:00.000Z' });
  const earlier = makeMessage({ id: 'a', createdAt: '2026-08-12T09:00:00.000Z' });

  let store = addMessage({}, later);
  store = addMessage(store, earlier);

  assert.deepEqual(
    messagesForEvent(store, 'evt-1').map((m) => m.id),
    ['a', 'b']
  );
});

test('adding the same message twice is a no-op', () => {
  const message = makeMessage({ id: 'a' });
  const store = addMessage({}, message);
  assert.equal(addMessage(store, message), store);
});

test('messages are kept per event', () => {
  let store = addMessage({}, makeMessage({ id: 'a' }));
  store = addMessage(store, makeMessage({ id: 'b', eventId: 'evt-2' }));

  assert.equal(messagesForEvent(store, 'evt-1').length, 1);
  assert.equal(messagesForEvent(store, 'evt-2').length, 1);
  assert.deepEqual(messagesForEvent(store, 'evt-3'), []);
});

test('removing the last message drops the event key', () => {
  const store = addMessage({}, makeMessage({ id: 'a' }));
  const emptied = removeMessage(store, 'evt-1', 'a');
  assert.deepEqual(emptied, {});
  // Removing something that isn't there returns the same store
  assert.equal(removeMessage(store, 'evt-1', 'missing'), store);
});

test('parseMessageStore rejects malformed posts', () => {
  assert.deepEqual(parseMessageStore(null), {});
  assert.deepEqual(parseMessageStore('{"evt-1": "not an array"}'), {});
  assert.deepEqual(parseMessageStore('{"evt-1": [{"id": "a"}]}'), {});

  const good = JSON.stringify({ 'evt-1': [makeMessage({ id: 'a', kind: 'announcement' })] });
  assert.equal(parseMessageStore(good)['evt-1'][0].kind, 'announcement');
});

test('normalizeBody trims, rejects blanks and caps length', () => {
  assert.equal(normalizeBody('  hi  '), 'hi');
  assert.equal(normalizeBody('   '), null);
  assert.equal(normalizeBody(''), null);
  assert.equal(normalizeBody('x'.repeat(3000))?.length, 2000);
});
