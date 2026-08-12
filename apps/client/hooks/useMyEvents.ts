import { useCallback, useMemo } from 'react';
import { Event } from '@/types/event';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventsContext';
import { useScheduledEvents, getWeekKey } from '@/hooks/useScheduledEvents';
import { MyEventRelation, relationForEvent, selectMyEvents } from '@/utils/myEvents';

/**
 * Everything on the user's plate: events they RSVP'd going/maybe to, pinned to
 * their calendar, or are hosting.
 *
 * Every surface that shows "your" events reads from here, so an RSVP made on
 * the event page immediately shows up on the calendar, the mobile agenda and
 * My Events without each screen inventing its own rules.
 */
export function useMyEvents() {
  const { currentUser } = useAuth();
  const { events, isLoading: isLoadingEvents } = useEvents();
  // Any week key works here: we only read the all-weeks set.
  const thisWeek = useMemo(() => getWeekKey(new Date()), []);
  const { allScheduledIds, isLoading: isLoadingScheduled, refresh } = useScheduledEvents(
    currentUser?.id,
    thisWeek
  );

  const ctx = useMemo(
    () => ({
      userId: currentUser?.id,
      createdIds: currentUser?.createdEvents ?? [],
      scheduledIds: allScheduledIds,
    }),
    [currentUser?.id, currentUser?.createdEvents, allScheduledIds]
  );

  const myEvents = useMemo(() => selectMyEvents(events, ctx), [events, ctx]);

  const myEventIds = useMemo(() => new Set(myEvents.map((e) => e.id)), [myEvents]);

  const relationFor = useCallback(
    (event: Event): MyEventRelation | null => relationForEvent(event, ctx),
    [ctx]
  );

  return {
    myEvents,
    myEventIds,
    relationFor,
    scheduledIds: allScheduledIds,
    isLoading: isLoadingEvents || isLoadingScheduled,
    refresh,
  };
}
