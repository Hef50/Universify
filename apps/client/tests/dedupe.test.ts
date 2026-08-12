import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeTitle,
  titleSimilarity,
  isLikelyDuplicate,
  dedupeAgainst,
} from '../utils/dedupe';

test('normalizeTitle strips punctuation and collapses whitespace', () => {
  assert.equal(normalizeTitle('Poker Night @ Wiegand!!'), 'poker night wiegand');
  assert.equal(normalizeTitle('  Hello   World  '), 'hello world');
  assert.equal(normalizeTitle(''), '');
});

test('titleSimilarity is 1 for identical titles and 0 for disjoint ones', () => {
  assert.equal(titleSimilarity('Poker Night', 'poker night'), 1);
  assert.equal(titleSimilarity('Poker Night', 'Chess Club'), 0);
});

test('titleSimilarity is high for reworded duplicates', () => {
  const sim = titleSimilarity('Poker Night @ Wiegand', 'Poker Night Wiegand Gym');
  assert.ok(sim >= 0.5, `expected >= 0.5, got ${sim}`);
});

test('isLikelyDuplicate requires both title similarity and time proximity', () => {
  const base = { id: 'a', title: 'Poker Night', startTime: '2026-08-14T19:00:00Z' };
  const sameSoon = { id: 'b', title: 'Poker night!', startTime: '2026-08-14T19:30:00Z' };
  const sameNextDay = { id: 'c', title: 'Poker night!', startTime: '2026-08-15T19:00:00Z' };
  const differentSoon = { id: 'd', title: 'Robotics Demo', startTime: '2026-08-14T19:00:00Z' };

  assert.equal(isLikelyDuplicate(base, sameSoon), true);
  assert.equal(isLikelyDuplicate(base, sameNextDay), false);
  assert.equal(isLikelyDuplicate(base, differentSoon), false);
});

test('same id is always a duplicate', () => {
  const a = { id: 'x', title: 'A', startTime: 'invalid' };
  const b = { id: 'x', title: 'B', startTime: 'also invalid' };
  assert.equal(isLikelyDuplicate(a, b), true);
});

test('dedupeAgainst drops cross-source duplicates and internal repeats', () => {
  const existing = [{ id: 'slack-1', title: 'Poker Night', startTime: '2026-08-14T19:00:00Z' }];
  const incoming = [
    { id: 'disc-1', title: 'Poker Night!', startTime: '2026-08-14T19:15:00Z' }, // dup of existing
    { id: 'disc-2', title: 'Robotics Demo', startTime: '2026-08-14T18:00:00Z' }, // fresh
    { id: 'disc-3', title: 'Robotics demo', startTime: '2026-08-14T18:30:00Z' }, // dup of disc-2
  ];
  const kept = dedupeAgainst(existing, incoming);
  assert.deepEqual(kept.map((e) => e.id), ['disc-2']);
});
