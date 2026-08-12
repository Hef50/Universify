/**
 * Cross-source event deduplication.
 *
 * Events arrive from multiple ingestion paths (app, Slack bot, Discord bot).
 * The same announcement posted in two places produces two events with
 * different ids, so id-based dedup is not enough. Two events are treated as
 * likely duplicates when their titles are similar AND their start times are
 * close together.
 *
 * The same algorithm is mirrored in apps/slack-bot/src/dedupe.ts and
 * apps/discord-event-bot/src/dedupe.js — keep the three in sync.
 */

export interface DedupeCandidate {
  id: string;
  title: string;
  startTime: string; // ISO 8601
}

/** Lowercase, strip punctuation/emoji, collapse whitespace. */
export function normalizeTitle(title: string): string {
  return (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Jaccard similarity over title token sets, in [0, 1].
 * "Poker Night @ Wiegand" vs "poker night wiegand gym" -> high.
 */
export function titleSimilarity(a: string, b: string): number {
  const tokensA = new Set(normalizeTitle(a).split(' ').filter(Boolean));
  const tokensB = new Set(normalizeTitle(b).split(' ').filter(Boolean));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const t of tokensA) if (tokensB.has(t)) intersection++;
  const union = tokensA.size + tokensB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const SIMILARITY_THRESHOLD = 0.6;
const TIME_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

/** True when two events probably describe the same real-world announcement. */
export function isLikelyDuplicate(a: DedupeCandidate, b: DedupeCandidate): boolean {
  if (a.id === b.id) return true;

  const startA = Date.parse(a.startTime);
  const startB = Date.parse(b.startTime);
  if (!Number.isFinite(startA) || !Number.isFinite(startB)) return false;
  if (Math.abs(startA - startB) > TIME_WINDOW_MS) return false;

  return titleSimilarity(a.title, b.title) >= SIMILARITY_THRESHOLD;
}

/**
 * Return the subset of `incoming` that does not duplicate anything in
 * `existing` (by id or by title/time similarity), and does not duplicate an
 * earlier entry of `incoming` itself.
 */
export function dedupeAgainst<T extends DedupeCandidate>(
  existing: DedupeCandidate[],
  incoming: T[]
): T[] {
  const kept: T[] = [];
  for (const candidate of incoming) {
    const duplicatesExisting = existing.some((e) => isLikelyDuplicate(e, candidate));
    const duplicatesKept = kept.some((e) => isLikelyDuplicate(e, candidate));
    if (!duplicatesExisting && !duplicatesKept) kept.push(candidate);
  }
  return kept;
}
