import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import { Event, RSVPStatus, EventFormData } from '@/types/event';
import mockEventsData from '@/data/mockEvents.json';
import currentWeekEvents from '@/data/currentWeekEvents.json';
import allEventsData from '@/data/allEvents.json';

// Mock localStorage for React Native
const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    }
  },
};

const EVENTS_STORAGE_KEY = 'universify_events';

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
      // Always start with events from allEvents.json as the base
      const baseEvents = allEventsData as Event[];
      const baseEventIds = new Set(baseEvents.map(e => e.id));
      
      // Try to load user-created events from localStorage
      const storedEvents = await storage.getItem(EVENTS_STORAGE_KEY);
      let userCreatedEvents: Event[] = [];
      
      if (storedEvents) {
        try {
          const parsed = JSON.parse(storedEvents);
          if (Array.isArray(parsed)) {
            // Only include events from localStorage that aren't in allEvents.json
            // (these would be user-created events)
            userCreatedEvents = parsed.filter((e: Event) => !baseEventIds.has(e.id));
          }
        } catch (e) {
          console.error('Failed to parse stored events:', e);
        }
      }
      
      // Merge base events with user-created events
      const allEvents = [...baseEvents, ...userCreatedEvents];
      console.log(`Loaded ${allEvents.length} events (${baseEvents.length} from allEvents.json, ${userCreatedEvents.length} user-created)`);
      setEvents(allEvents);
      
      // Update localStorage with merged events
      await storage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(allEvents));
    } catch (error) {
      console.error('Failed to load events:', error);
      // Always fallback to allEvents.json
      const allEvents = allEventsData as Event[];
      setEvents(allEvents);
    } finally {
      setIsLoading(false);
    }
  };

  const saveEvents = async (updatedEvents: Event[]) => {
    try {
      await storage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(updatedEvents));
      setEvents(updatedEvents);
    } catch (error) {
      console.error('Failed to save events:', error);
    }
  };

  const createEvent = async (eventData: EventFormData, userId: string): Promise<Event> => {
    const newEvent: Event = {
      id: `evt-${Date.now()}`,
      title: eventData.title,
      description: eventData.description,
      startTime: `${eventData.startDate}T${eventData.startTime}:00Z`,
      endTime: `${eventData.endDate}T${eventData.endTime}:00Z`,
      location: eventData.location,
      categories: eventData.categories,
      organizer: {
        id: userId,
        name: 'Current User',
        type: 'individual',
      },
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedEvents = [...events, newEvent];
    await saveEvents(updatedEvents);
    return newEvent;
  };

  const updateEvent = async (eventId: string, updates: Partial<Event>) => {
    const updatedEvents = events.map((event) =>
      event.id === eventId
        ? { ...event, ...updates, updatedAt: new Date().toISOString() }
        : event
    );
    await saveEvents(updatedEvents);
  };

  const deleteEvent = async (eventId: string) => {
    const updatedEvents = events.filter((event) => event.id !== eventId);
    await saveEvents(updatedEvents);
  };

  const updateRSVP = async (eventId: string, userId: string, status: RSVPStatus) => {
    const updatedEvents = events.map((event) => {
      if (event.id !== eventId) return event;

      // Remove existing RSVP
      const filteredAttendees = event.attendees.filter((a) => a.userId !== userId);

      // Update counts
      const newCounts = { ...event.rsvpCounts };
      const existingAttendee = event.attendees.find((a) => a.userId === userId);
      
      if (existingAttendee?.status === 'going') newCounts.going--;
      if (existingAttendee?.status === 'maybe') newCounts.maybe--;
      if (existingAttendee?.status === 'not-going') newCounts.notGoing--;

      // Add new RSVP
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

      return {
        ...event,
        rsvpCounts: newCounts,
        attendees: filteredAttendees,
        updatedAt: new Date().toISOString(),
      };
    });

    await saveEvents(updatedEvents);
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

