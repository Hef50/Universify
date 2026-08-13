import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  averageStars,
  clampStars,
  getRating,
  parseRatingStore,
  setRating,
} from '../utils/eventRatings';

test('stars are clamped to whole numbers between 1 and 5', () => {
  assert.equal(clampStars(0), 1);
  assert.equal(clampStars(-4), 1);
  assert.equal(clampStars(3.4), 3);
  assert.equal(clampStars(3.6), 4);
  assert.equal(clampStars(9), 5);
  assert.equal(clampStars(NaN), 1);
});

test('parseRatingStore drops malformed entries', () => {
  assert.deepEqual(parseRatingStore(null), {});
  assert.deepEqual(parseRatingStore('nonsense'), {});
  assert.deepEqual(parseRatingStore('{"u1":{"e1":{"stars":"five"}}}'), {});

  const parsed = parseRatingStore(
    '{"u1":{"e1":{"stars":7,"note":"great","ratedAt":"2026-08-01T00:00:00.000Z"}}}'
  );
  assert.deepEqual(parsed, {
    u1: { e1: { stars: 5, note: 'great', ratedAt: '2026-08-01T00:00:00.000Z' } },
  });
});

test('setRating stores, replaces and clears per user', () => {
  let store = setRating({}, 'u1', 'e1', 4, 'solid', 'now');
  assert.deepEqual(getRating(store, 'u1', 'e1'), {
    stars: 4,
    note: 'solid',
    ratedAt: 'now',
  });

  // Another user's rating of the same event is independent
  store = setRating(store, 'u2', 'e1', 2, undefined, 'now');
  assert.equal(getRating(store, 'u2', 'e1')?.stars, 2);
  assert.equal(getRating(store, 'u1', 'e1')?.stars, 4);

  // Re-rating replaces
  store = setRating(store, 'u1', 'e1', 5, undefined, 'later');
  assert.deepEqual(getRating(store, 'u1', 'e1'), { stars: 5, ratedAt: 'later' });

  // Clearing removes the entry, and the user when it was their last one
  store = setRating(store, 'u1', 'e1', null);
  assert.equal(getRating(store, 'u1', 'e1'), null);
  assert.ok(!('u1' in store));
  assert.equal(getRating(store, 'u2', 'e1')?.stars, 2);
});

test('blank notes are not stored, long notes are capped', () => {
  const blank = setRating({}, 'u1', 'e1', 3, '   ', 'now');
  assert.equal(getRating(blank, 'u1', 'e1')?.note, undefined);

  const long = setRating({}, 'u1', 'e1', 3, 'x'.repeat(400), 'now');
  assert.equal(getRating(long, 'u1', 'e1')?.note?.length, 280);
});

test('averageStars reflects only the given user', () => {
  let store = setRating({}, 'u1', 'e1', 5, undefined, 'now');
  store = setRating(store, 'u1', 'e2', 4, undefined, 'now');
  store = setRating(store, 'u2', 'e1', 1, undefined, 'now');

  assert.equal(averageStars(store, 'u1'), 4.5);
  assert.equal(averageStars(store, 'u2'), 1);
  assert.equal(averageStars(store, 'nobody'), null);
  assert.equal(averageStars(store, undefined), null);
});

test('signed-out lookups never return a rating', () => {
  const store = setRating({}, 'u1', 'e1', 5, undefined, 'now');
  assert.equal(getRating(store, null, 'e1'), null);
});
