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

export function useScheduledEvents(userId: string | undefined, weekKey: string) {
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

  const scheduleEventForWeek = useCallback(
    async (eventId: string) => {
      if (userId) {
        await scheduleEventInSupabase(userId, eventId, weekKey);
      } else {
        scheduleEvent(eventId, weekKey);
      }
      await loadScheduled();
    },
    [userId, weekKey, loadScheduled]
  );

  const unscheduleEventForWeek = useCallback(
    async (eventId: string) => {
      if (userId) {
        await unscheduleEventInSupabase(userId, eventId, weekKey);
      } else {
        unscheduleEvent(eventId, weekKey);
      }
      await loadScheduled();
    },
    [userId, weekKey, loadScheduled]
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
