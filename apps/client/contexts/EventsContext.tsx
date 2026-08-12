import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Event, RSVPStatus, EventFormData } from '@/types/event';
import {
  fetchEvents,
  fetchEventAPI,
  createEventAPI,
  updateEventAPI,
  deleteEventAPI,
  setRSVPAPI,
  SupabaseNotConfiguredError,
} from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { dedupeAgainst } from '@/utils/dedupe';
import { isDevUserId } from '@/constants/devAccounts';
import { isSupabaseConfigured } from '@/lib/supabase';
import { storage } from '@/lib/storage';
import {
  LOCAL_RSVP_STORAGE_KEY,
  LocalRsvpStore,
  applyLocalRsvps,
  parseRsvpStore,
  setLocalRsvp,
} from '@/utils/localRsvps';
import allEventsData from '@/data/allEvents.json';

interface EventsContextType {
  events: Event[];
  isLoading: boolean;
  createEvent: (eventData: EventFormData, userId: string) => Promise<Event>;
  updateEvent: (eventId: string, updates: Partial<Event>) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  updateRSVP: (eventId: string, userId: string, status: RSVPStatus) => Promise<void>;
  getRSVPStatus: (eventId: string, userId: string) => RSVPStatus;
  getEventById: (eventId: string) => Event | undefined;
  refreshEvents: () => Promise<void>;
  addExternalEvents: (newEvents: Event[]) => void;
  removeExternalEvents: (idPrefix: string) => void;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

export const EventsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { addCreatedEvent, currentUser } = useAuth();
  const [rawEvents, setRawEvents] = useState<Event[]>([]);
  const [rsvpStore, setRsvpStore] = useState<LocalRsvpStore>({});
  const [isLoading, setIsLoading] = useState(true);

  // RSVPs have nowhere to persist when there is no Supabase project, and
  // dev-mode personas are not real auth.users rows — keep those on the device
  // so "You're going" survives a reload.
  const userId = currentUser?.id;
  const usesLocalRsvps = !isSupabaseConfigured || isDevUserId(userId);

  useEffect(() => {
    loadEvents();
    storage
      .getItem(LOCAL_RSVP_STORAGE_KEY)
      .then((raw) => setRsvpStore(parseRsvpStore(raw)))
      .catch((error) => console.error('Failed to load saved RSVPs:', error));
  }, []);

  // Locally-stored RSVPs are layered over whatever the source returned, so
  // every consumer of `events` sees one consistent answer.
  const events = useMemo(
    () => (usesLocalRsvps ? applyLocalRsvps(rawEvents, rsvpStore, userId) : rawEvents),
    [rawEvents, rsvpStore, userId, usesLocalRsvps]
  );

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const fetchedEvents = await fetchEvents();

      if (fetchedEvents.length > 0) {
        setRawEvents(fetchedEvents.filter((e) => !e.id.startsWith('gcal-')));
      } else {
        const fallbackEvents = (allEventsData as Event[]).filter((e) => !e.id.startsWith('gcal-'));
        setRawEvents(fallbackEvents);
      }
    } catch (error) {
      if (!(error instanceof SupabaseNotConfiguredError)) {
        console.error('Failed to load events from Supabase:', error);
      }
      const fallbackEvents = (allEventsData as Event[]).filter((e) => !e.id.startsWith('gcal-'));
      setRawEvents(fallbackEvents);
    } finally {
      setIsLoading(false);
    }
  };

  const createEvent = async (eventData: EventFormData, userId: string): Promise<Event> => {
    const organizerName = 'Current User';

    // Dev-mode personas create events in local state only (they are not
    // real auth.users rows, so a Supabase insert would be rejected anyway)
    if (isDevUserId(userId)) {
      const now = new Date().toISOString();
      const localEvent: Event = {
        id: `dev-evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: eventData.title,
        description: eventData.description,
        startTime: new Date(`${eventData.startDate}T${eventData.startTime}:00`).toISOString(),
        endTime: new Date(`${eventData.endDate}T${eventData.endTime}:00`).toISOString(),
        location: eventData.location,
        categories: eventData.categories,
        organizer: { id: userId, name: organizerName, type: eventData.isClubEvent ? 'club' : 'individual' },
        color: eventData.color,
        rsvpEnabled: eventData.rsvpEnabled,
        rsvpCounts: { going: 0, maybe: 0, notGoing: 0 },
        attendees: [],
        attendeeVisibility: eventData.attendeeVisibility,
        isClubEvent: eventData.isClubEvent,
        isSocialEvent: eventData.isSocialEvent,
        capacity: eventData.capacity,
        recurring: eventData.recurring,
        tags: eventData.tags,
        createdAt: now,
        updatedAt: now,
        imageUrl: eventData.imageUrl,
      };
      setRawEvents((prev) => [...prev, localEvent]);
      addCreatedEvent(localEvent.id);
      return localEvent;
    }

    const newEvent = await createEventAPI(eventData, userId, organizerName);
    setRawEvents((prev) => [...prev, newEvent]);
    addCreatedEvent(newEvent.id);
    return newEvent;
  };

  const updateEvent = async (eventId: string, updates: Partial<Event>) => {
    await updateEventAPI(eventId, updates);
    setRawEvents((prev) =>
      prev.map((event) =>
        event.id === eventId ? { ...event, ...updates, updatedAt: new Date().toISOString() } : event
      )
    );
  };

  const deleteEvent = async (eventId: string) => {
    await deleteEventAPI(eventId);
    setRawEvents((prev) => prev.filter((event) => event.id !== eventId));
  };

  const updateRSVP = async (eventId: string, userId: string, status: RSVPStatus) => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return;

    // Without a server to write to, the device is the record: persist the RSVP
    // and let the derived `events` list pick it up.
    if (!isSupabaseConfigured || isDevUserId(userId)) {
      setRsvpStore((prev) => {
        const next = setLocalRsvp(prev, userId, eventId, status);
        storage
          .setItem(LOCAL_RSVP_STORAGE_KEY, JSON.stringify(next))
          .catch((error) => console.error('Failed to save RSVP:', error));
        return next;
      });
      return;
    }

    const filteredAttendees = event.attendees.filter((a) => a.userId !== userId);
    const newCounts = { ...event.rsvpCounts };
    const existingAttendee = event.attendees.find((a) => a.userId === userId);

    if (existingAttendee?.status === 'going') newCounts.going--;
    if (existingAttendee?.status === 'maybe') newCounts.maybe--;
    if (existingAttendee?.status === 'not-going') newCounts.notGoing--;

    if (status) {
      if (status === 'going') newCounts.going++;
      if (status === 'maybe') newCounts.maybe++;
      if (status === 'not-going') newCounts.notGoing++;
      filteredAttendees.push({
        userId,
        status,
        timestamp: new Date().toISOString(),
      });
    }

    // Optimistic local update so the UI responds immediately
    setRawEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? {
              ...e,
              rsvpCounts: newCounts,
              attendees: filteredAttendees,
              updatedAt: new Date().toISOString(),
            }
          : e
      )
    );

    try {
      // Write the user's own RSVP row; a DB trigger recomputes the aggregates
      await setRSVPAPI(eventId, userId, status);
      // Pull the authoritative aggregates back (handles concurrent RSVPs)
      const fresh = await fetchEventAPI(eventId);
      if (fresh) {
        setRawEvents((prev) => prev.map((e) => (e.id === eventId ? fresh : e)));
      }
    } catch (error) {
      if (error instanceof SupabaseNotConfiguredError) {
        // Credentials disappeared mid-session: keep the optimistic state
        return;
      }
      console.error('Failed to persist RSVP, reverting:', error);
      setRawEvents((prev) => prev.map((e) => (e.id === eventId ? event : e)));
    }
  };

  const getRSVPStatus = (eventId: string, userId: string): RSVPStatus => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return null;
    const attendee = event.attendees.find((a) => a.userId === userId);
    return attendee?.status || null;
  };

  const getEventById = (eventId: string): Event | undefined => {
    return events.find((e) => e.id === eventId);
  };

  const refreshEvents = async () => {
    await loadEvents();
  };

  /**
   * Add externally-sourced events (e.g. from Slack) into the events list.
   * Same-id events are replaced; events that duplicate an existing event from
   * another source (similar title, close start time) are dropped.
   */
  const addExternalEvents = (newEvents: Event[]) => {
    setRawEvents((prev) => {
      const newIds = new Set(newEvents.map((e) => e.id));
      // Remove old versions of these events, then append the new ones
      const filtered = prev.filter((e) => !newIds.has(e.id));
      return [...filtered, ...dedupeAgainst(filtered, newEvents)];
    });
  };

  /**
   * Remove all events whose id starts with the given prefix.
   * Used to clear Slack-imported events (prefix "slack-").
   */
  const removeExternalEvents = (idPrefix: string) => {
    setRawEvents((prev) => prev.filter((e) => !e.id.startsWith(idPrefix)));
  };

  const value: EventsContextType = {
    events,
    isLoading,
    createEvent,
    updateEvent,
    deleteEvent,
    updateRSVP,
    getRSVPStatus,
    getEventById,
    refreshEvents,
    addExternalEvents,
    removeExternalEvents,
  };

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
};

export const useEvents = (): EventsContextType => {
  const context = useContext(EventsContext);
  if (context === undefined) {
    throw new Error('useEvents must be used within an EventsProvider');
  }
  return context;
};
