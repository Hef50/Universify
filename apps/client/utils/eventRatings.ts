/**
 * Ratings people leave on events they attended.
 *
 * Stored per user on the device: there is no ratings table on the server (and
 * in offline/demo mode no server at all), so this is the record. Shape:
 * { [userId]: { [eventId]: { stars, note, ratedAt } } }.
 */

export interface EventRating {
  /** 1–5 */
  stars: number;
  /** Optional free-text note the rater left */
  note?: string;
  /** ISO timestamp of the last edit */
  ratedAt: string;
}

export type RatingStore = Record<string, Record<string, EventRating>>;

export const RATING_STORAGE_KEY = 'universify_event_ratings';
export const MIN_STARS = 1;
export const MAX_STARS = 5;
export const MAX_NOTE_LENGTH = 280;

/** Clamp to a whole number of stars inside the allowed range. */
export function clampStars(stars: number): number {
  if (!Number.isFinite(stars)) return MIN_STARS;
  return Math.min(MAX_STARS, Math.max(MIN_STARS, Math.round(stars)));
}

/** Parse a persisted store, dropping anything malformed. */
export function parseRatingStore(raw: string | null | undefined): RatingStore {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const store: RatingStore = {};
    for (const [userId, byEvent] of Object.entries(parsed as Record<string, unknown>)) {
      if (!byEvent || typeof byEvent !== 'object' || Array.isArray(byEvent)) continue;
      const clean: Record<string, EventRating> = {};
      for (const [eventId, value] of Object.entries(byEvent as Record<string, unknown>)) {
        if (!value || typeof value !== 'object') continue;
        const { stars, note, ratedAt } = value as Partial<EventRating>;
        if (typeof stars !== 'number' || !Number.isFinite(stars)) continue;
        clean[eventId] = {
          stars: clampStars(stars),
          ...(typeof note === 'string' && note.trim()
            ? { note: note.slice(0, MAX_NOTE_LENGTH) }
            : {}),
          ratedAt: typeof ratedAt === 'string' ? ratedAt : new Date(0).toISOString(),
        };
      }
      if (Object.keys(clean).length > 0) store[userId] = clean;
    }
    return store;
  } catch {
    return {};
  }
}

export function getRating(
  store: RatingStore,
  userId: string | null | undefined,
  eventId: string
): EventRating | null {
  if (!userId) return null;
  return store[userId]?.[eventId] ?? null;
}

/** Return a new store with the rating set, or removed when stars is null. */
export function setRating(
  store: RatingStore,
  userId: string,
  eventId: string,
  stars: number | null,
  note?: string,
  ratedAt: string = new Date().toISOString()
): RatingStore {
  const forUser = { ...(store[userId] ?? {}) };
  if (stars === null) {
    delete forUser[eventId];
  } else {
    const trimmed = note?.trim().slice(0, MAX_NOTE_LENGTH);
    forUser[eventId] = {
      stars: clampStars(stars),
      ...(trimmed ? { note: trimmed } : {}),
      ratedAt,
    };
  }
  const next = { ...store };
  if (Object.keys(forUser).length > 0) {
    next[userId] = forUser;
  } else {
    delete next[userId];
  }
  return next;
}

/** Average of the user's own ratings, or null when they've rated nothing. */
export function averageStars(
  store: RatingStore,
  userId: string | null | undefined
): number | null {
  if (!userId) return null;
  const ratings = Object.values(store[userId] ?? {});
  if (ratings.length === 0) return null;
  const total = ratings.reduce((sum, rating) => sum + rating.stars, 0);
  return Math.round((total / ratings.length) * 10) / 10;
}
