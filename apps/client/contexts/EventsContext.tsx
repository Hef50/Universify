import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Event, RSVPStatus, EventFormData } from '@/types/event';
import { fetchEvents, createEventAPI, updateEventAPI, deleteEventAPI } from '@/lib/api';
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
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

export const EventsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const fetchedEvents = await fetchEvents();

      if (fetchedEvents.length > 0) {
        setEvents(fetchedEvents.filter((e) => !e.id.startsWith('gcal-')));
      } else {
        const fallbackEvents = (allEventsData as Event[]).filter((e) => !e.id.startsWith('gcal-'));
        setEvents(fallbackEvents);
      }
    } catch (error) {
      console.error('Failed to load events from Supabase:', error);
      const fallbackEvents = (allEventsData as Event[]).filter((e) => !e.id.startsWith('gcal-'));
      setEvents(fallbackEvents);
    } finally {
      setIsLoading(false);
    }
  };

  const createEvent = async (eventData: EventFormData, userId: string): Promise<Event> => {
    const organizerName = 'Current User';
    const newEvent = await createEventAPI(eventData, userId, organizerName);
    setEvents((prev) => [...prev, newEvent]);
    return newEvent;
  };

  const updateEvent = async (eventId: string, updates: Partial<Event>) => {
    await updateEventAPI(eventId, updates);
    setEvents((prev) =>
      prev.map((event) =>
        event.id === eventId ? { ...event, ...updates, updatedAt: new Date().toISOString() } : event
      )
    );
  };

  const deleteEvent = async (eventId: string) => {
    await deleteEventAPI(eventId);
    setEvents((prev) => prev.filter((event) => event.id !== eventId));
  };

  const updateRSVP = async (eventId: string, userId: string, status: RSVPStatus) => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return;

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

    await updateEventAPI(eventId, {
      rsvpCounts: newCounts,
      attendees: filteredAttendees,
    });
    setEvents((prev) =>
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
