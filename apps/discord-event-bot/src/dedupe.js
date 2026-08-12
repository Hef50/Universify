/**
 * Cross-source event deduplication for the Discord bot.
 *
 * Two events are treated as likely duplicates when their titles are similar
 * (Jaccard over tokens) and their start times fall within a 2-hour window.
 *
 * Mirrors apps/client/utils/dedupe.ts and apps/slack-bot/src/dedupe.ts —
 * keep the three in sync.
 */

const SIMILARITY_THRESHOLD = 0.6;
const TIME_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

/** Lowercase, strip punctuation/emoji, collapse whitespace. */
function normalizeTitle(title) {
  return (title || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Jaccard similarity over title token sets, in [0, 1]. */
function titleSimilarity(a, b) {
  const tokensA = new Set(normalizeTitle(a).split(" ").filter(Boolean));
  const tokensB = new Set(normalizeTitle(b).split(" ").filter(Boolean));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const t of tokensA) if (tokensB.has(t)) intersection++;
  const union = tokensA.size + tokensB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * True when `candidate` ({title, startTime}) probably duplicates one of
 * `existing` ([{id, title, startTime}]).
 */
function isDuplicate(candidate, existing) {
  const candidateStart = Date.parse(candidate.startTime);
  if (!Number.isFinite(candidateStart)) return false;

  for (const other of existing) {
    const otherStart = Date.parse(other.startTime);
    if (!Number.isFinite(otherStart)) continue;
    if (Math.abs(candidateStart - otherStart) > TIME_WINDOW_MS) continue;
    if (titleSimilarity(candidate.title, other.title) >= SIMILARITY_THRESHOLD) {
      return true;
    }
  }
  return false;
}

module.exports = {
  normalizeTitle,
  titleSimilarity,
  isDuplicate,
  TIME_WINDOW_MS,
  SIMILARITY_THRESHOLD,
};
