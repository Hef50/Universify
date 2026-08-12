/**
 * Cross-source event deduplication for the Slack bot.
 *
 * Heuristic pass: two events are likely duplicates when their titles are
 * similar (Jaccard over tokens) and their start times fall within a 2-hour
 * window. Optional LLM pass: when OPENROUTER_API_KEY is set, borderline
 * pairs (similar-ish titles) are double-checked by a small LLM call.
 *
 * Mirrors apps/client/utils/dedupe.ts and
 * apps/discord-event-bot/src/dedupe.js — keep the three in sync.
 */

export interface DedupeCandidate {
  id?: string;
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

/** Jaccard similarity over title token sets, in [0, 1]. */
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
// Below this the pair is clearly distinct; between the two the LLM (if
// configured) breaks the tie.
const LLM_GRAY_ZONE_FLOOR = 0.35;
export const TIME_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

export function isWithinTimeWindow(a: DedupeCandidate, b: DedupeCandidate): boolean {
  const startA = Date.parse(a.startTime);
  const startB = Date.parse(b.startTime);
  if (!Number.isFinite(startA) || !Number.isFinite(startB)) return false;
  return Math.abs(startA - startB) <= TIME_WINDOW_MS;
}

/** Heuristic-only check (no network). */
export function isLikelyDuplicate(a: DedupeCandidate, b: DedupeCandidate): boolean {
  if (a.id && b.id && a.id === b.id) return true;
  if (!isWithinTimeWindow(a, b)) return false;
  return titleSimilarity(a.title, b.title) >= SIMILARITY_THRESHOLD;
}

/**
 * LLM tie-break for borderline pairs via OpenRouter. Returns null when no
 * API key is configured or the call fails, so callers can fall back to the
 * heuristic verdict.
 */
async function llmSaysDuplicate(
  a: DedupeCandidate,
  b: DedupeCandidate
): Promise<boolean | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
        max_tokens: 5,
        messages: [
          {
            role: 'user',
            content:
              'Two event announcements from different chat platforms may describe the same real-world event. ' +
              `Event A: "${a.title}" starting ${a.startTime}. ` +
              `Event B: "${b.title}" starting ${b.startTime}. ` +
              'Answer with exactly one word: "yes" if they are the same event, "no" otherwise.',
          },
        ],
      }),
    });

    if (!response.ok) return null;
    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const answer = json.choices?.[0]?.message?.content?.trim().toLowerCase();
    if (answer?.startsWith('yes')) return true;
    if (answer?.startsWith('no')) return false;
    return null;
  } catch {
    return null;
  }
}

/**
 * Full duplicate check: heuristic first, LLM tie-break for the gray zone
 * when OPENROUTER_API_KEY is configured.
 */
export async function isDuplicate(
  candidate: DedupeCandidate,
  existing: DedupeCandidate[]
): Promise<boolean> {
  for (const other of existing) {
    if (candidate.id && other.id && candidate.id === other.id) continue; // same record, not a cross-source dup
    if (!isWithinTimeWindow(candidate, other)) continue;

    const similarity = titleSimilarity(candidate.title, other.title);
    if (similarity >= SIMILARITY_THRESHOLD) return true;
    if (similarity >= LLM_GRAY_ZONE_FLOOR) {
      const verdict = await llmSaysDuplicate(candidate, other);
      if (verdict === true) return true;
    }
  }
  return false;
}
