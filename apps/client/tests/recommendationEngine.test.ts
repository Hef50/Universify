import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeEvents,
  rankEventsForUser,
  getSuggestionsForTimeRange,
} from '../utils/recommendationEngine';
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

test('analyzeEvents mines title n-grams and categories weighted by popularity', () => {
  const engaged = [
    makeEvent({
      id: 'a',
      title: 'Poker Tournament Finals',
      categories: ['Fun'],
      rsvpCounts: { going: 50, maybe: 0, notGoing: 0 },
    }),
    makeEvent({ id: 'b', title: 'Poker Practice', categories: ['Fun'] }),
  ];
  const { top, categories } = analyzeEvents(engaged);
  assert.ok(top.length > 0, 'expected some interests');
  const labels = top.map((i) => i.label);
  assert.ok(labels.includes('poker'), `expected "poker" among ${labels.join(', ')}`);
  assert.equal(categories[0]?.label, 'fun');
});

test('rankEventsForUser puts interest matches above popular strangers', () => {
  const engaged = [
    makeEvent({ id: 'seen-1', title: 'Chess Club Meetup', categories: ['Fun'] }),
    makeEvent({ id: 'seen-2', title: 'Chess Tournament', categories: ['Fun'] }),
  ];
  const { top } = analyzeEvents(engaged);

  const candidates = [
    makeEvent({
      id: 'popular-unrelated',
      title: 'Career Fair Kickoff',
      categories: ['Career'],
      rsvpCounts: { going: 40, maybe: 0, notGoing: 0 },
    }),
    makeEvent({ id: 'chess-match', title: 'Late Night Chess', categories: ['Fun'] }),
  ];

  const ranked = rankEventsForUser(candidates, top, []);
  assert.equal(ranked[0].id, 'chess-match');
});

test('explicit category preference beats mined profile alone', () => {
  const candidates = [
    makeEvent({ id: 'tech-talk', title: 'Systems Talk', categories: ['Tech'] }),
    makeEvent({ id: 'brunch', title: 'Sunday Brunch', categories: ['Food'] }),
  ];
  const ranked = rankEventsForUser(candidates, [], ['Tech']);
  assert.equal(ranked[0].id, 'tech-talk');
});

test('getSuggestionsForTimeRange only returns overlapping events, capped at limit', () => {
  const events = [
    makeEvent({
      id: 'in-range',
      startTime: '2026-08-14T19:00:00.000Z',
      endTime: '2026-08-14T20:00:00.000Z',
      title: 'In Range',
    }),
    makeEvent({
      id: 'out-of-range',
      startTime: '2026-08-15T19:00:00.000Z',
      endTime: '2026-08-15T20:00:00.000Z',
      title: 'Out Of Range',
    }),
  ];
  const suggestions = getSuggestionsForTimeRange(
    events,
    [],
    '2026-08-14T18:00:00.000Z',
    '2026-08-14T22:00:00.000Z',
    5
  );
  assert.deepEqual(suggestions.map((e) => e.id), ['in-range']);
});
