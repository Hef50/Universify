import { useState, useEffect, useCallback } from 'react';
import {
  getScheduledEventIds,
  getAllScheduledEventIds,
  scheduleEvent,
  unscheduleEvent,
  getWeekKey,
} from '@/utils/scheduledEvents';
import {
  getScheduledEventIdsFromSupabase,
  scheduleEventInSupabase,
  unscheduleEventInSupabase,
  getAllScheduledEventIdsFromSupabase,
} from '@/lib/scheduledEventsApi';
import { isDevUserId } from '@/constants/devAccounts';

export function useScheduledEvents(rawUserId: string | undefined, weekKey: string) {
  // Dev-mode personas are not real auth.users rows — route them through the
  // local-storage path exactly like an unauthenticated visitor.
  const userId = isDevUserId(rawUserId) ? undefined : rawUserId;
  const [scheduledEventIds, setScheduledEventIds] = useState<string[]>([]);
  const [allScheduledIds, setAllScheduledIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadScheduled = useCallback(async () => {
    try {
      setIsLoading(true);
      if (userId) {
        const [weekIds, allIds] = await Promise.all([
          getScheduledEventIdsFromSupabase(userId, weekKey),
          getAllScheduledEventIdsFromSupabase(userId),
        ]);
        setScheduledEventIds(weekIds);
        setAllScheduledIds(allIds);
      } else {
        const ids = getScheduledEventIds(weekKey);
        const all = getAllScheduledEventIds();
        setScheduledEventIds(ids);
        setAllScheduledIds(all);
      }
    } catch (error) {
      console.error('Failed to load scheduled events:', error);
      const ids = getScheduledEventIds(weekKey);
      const all = getAllScheduledEventIds();
      setScheduledEventIds(ids);
      setAllScheduledIds(all);
    } finally {
      setIsLoading(false);
    }
  }, [userId, weekKey]);

  useEffect(() => {
    loadScheduled();
  }, [loadScheduled]);

  // Pins are stored per week. Callers should pass the week the event actually
  // falls in (`forWeekKey`); otherwise an event pinned while browsing another
  // week would be filed under the week being viewed and vanish from its own.
  const scheduleEventForWeek = useCallback(
    async (eventId: string, forWeekKey: string = weekKey) => {
      if (userId) {
        await scheduleEventInSupabase(userId, eventId, forWeekKey);
      } else {
        scheduleEvent(eventId, forWeekKey);
      }
      await loadScheduled();
    },
    [userId, weekKey, loadScheduled]
  );

  const unscheduleEventForWeek = useCallback(
    async (eventId: string) => {
      if (userId) {
        await unscheduleEventInSupabase(userId, eventId);
      } else {
        unscheduleEvent(eventId);
      }
      await loadScheduled();
    },
    [userId, loadScheduled]
  );

  return {
    scheduledEventIds,
    allScheduledIds,
    isLoading,
    scheduleEvent: scheduleEventForWeek,
    unscheduleEvent: unscheduleEventForWeek,
    refresh: loadScheduled,
  };
}

export { getWeekKey };
