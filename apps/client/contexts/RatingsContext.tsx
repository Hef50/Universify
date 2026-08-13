import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { storage } from '@/lib/storage';
import {
  EventRating,
  RATING_STORAGE_KEY,
  RatingStore,
  averageStars,
  getRating,
  parseRatingStore,
  setRating as setRatingInStore,
} from '@/utils/eventRatings';

interface RatingsContextType {
  /** The signed-in user's rating for an event, if they left one. */
  ratingFor: (eventId: string) => EventRating | null;
  /** Save (or clear, by passing null stars) the user's rating. */
  rateEvent: (eventId: string, stars: number | null, note?: string) => void;
  /** How many events the user has rated. */
  ratedCount: number;
  /** Average of the user's own ratings, or null if they've rated nothing. */
  averageRating: number | null;
  isLoading: boolean;
}

const RatingsContext = createContext<RatingsContextType | undefined>(undefined);

/**
 * Ratings people leave on events they attended. Kept on the device — there is
 * no ratings table on the server yet, and in demo mode there is no server at
 * all — so this is deliberately a personal record, not a public score.
 */
export const RatingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [store, setStore] = useState<RatingStore>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    storage
      .getItem(RATING_STORAGE_KEY)
      .then((raw) => setStore(parseRatingStore(raw)))
      .catch((error) => console.error('Failed to load ratings:', error))
      .finally(() => setIsLoading(false));
  }, []);

  const userId = currentUser?.id;

  const ratingFor = useCallback(
    (eventId: string) => getRating(store, userId, eventId),
    [store, userId]
  );

  const rateEvent = useCallback(
    (eventId: string, stars: number | null, note?: string) => {
      if (!userId) return;
      setStore((prev) => {
        const next = setRatingInStore(prev, userId, eventId, stars, note);
        storage
          .setItem(RATING_STORAGE_KEY, JSON.stringify(next))
          .catch((error) => console.error('Failed to save rating:', error));
        return next;
      });
    },
    [userId]
  );

  const value = useMemo<RatingsContextType>(
    () => ({
      ratingFor,
      rateEvent,
      ratedCount: userId ? Object.keys(store[userId] ?? {}).length : 0,
      averageRating: averageStars(store, userId),
      isLoading,
    }),
    [ratingFor, rateEvent, store, userId, isLoading]
  );

  return <RatingsContext.Provider value={value}>{children}</RatingsContext.Provider>;
};

export const useRatings = (): RatingsContextType => {
  const context = useContext(RatingsContext);
  if (context === undefined) {
    throw new Error('useRatings must be used within a RatingsProvider');
  }
  return context;
};
