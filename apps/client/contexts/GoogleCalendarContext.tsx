import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Platform } from 'react-native';
import { storage } from '@/lib/storage';
import { useGoogleAuth } from './GoogleAuthContext';
import { useAuth } from './AuthContext';
import {
  fetchGoogleCalendarEvents,
  convertGoogleEventToUniversifyEvent,
  createGoogleCalendarEvent,
  getWeekTimeRange,
  getTimeRangeForDates,
  GoogleCalendarEvent,
} from '@/lib/googleCalendar';
import { Event } from '@/types/event';

interface GoogleCalendarContextType {
  googleEvents: Event[];
  isLoading: boolean;
  lastSyncTime: Date | null;
  error: string | null;
  syncGoogleCalendar: () => Promise<void>;
  refreshGoogleCalendar: () => Promise<void>;
  createEventInGoogleCalendar: (event: Event) => Promise<GoogleCalendarEvent | null>;
  getGoogleEventsForWeek: (weekKey: string, weekStartDate: Date) => Event[];
  getGoogleEventsForDateRange: (startDate: Date, endDate: Date) => Promise<Event[]>;
  clearError: () => void;
}

const GoogleCalendarContext = createContext<GoogleCalendarContextType | undefined>(undefined);

// Storage keys
const GOOGLE_EVENTS_STORAGE_KEY = 'universify_google_events';
const GOOGLE_EVENTS_LAST_SYNC_KEY = 'universify_google_events_last_sync';

// Cache duration: 5 minutes
const CACHE_DURATION_MS = 5 * 60 * 1000;

export const GoogleCalendarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isGoogleAuthenticated, providerToken, refreshSession } = useGoogleAuth();
  const { currentUser } = useAuth();
  const [googleEvents, setGoogleEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load cached events on mount
  useEffect(() => {
    loadCachedEvents();
  }, []);

  // Auto-sync when authenticated
  useEffect(() => {
    if (isGoogleAuthenticated && providerToken && currentUser) {
      // Check if we need to sync (no cache or cache expired)
      const shouldSync = shouldSyncEvents();
      if (shouldSync) {
        syncGoogleCalendar();
      }
    }
  }, [isGoogleAuthenticated, providerToken, currentUser]);

  const loadCachedEvents = async () => {
    try {
      const [cachedEvents, lastSync] = await Promise.all([
        storage.getItem(GOOGLE_EVENTS_STORAGE_KEY),
        storage.getItem(GOOGLE_EVENTS_LAST_SYNC_KEY),
      ]);

      if (cachedEvents) {
        const events = JSON.parse(cachedEvents);
        setGoogleEvents(events);
      }
      if (lastSync) {
        setLastSyncTime(new Date(lastSync));
      }
    } catch (err) {
      console.error('Failed to load cached Google Calendar events:', err);
    }
  };

  const saveCachedEvents = async (events: Event[]) => {
    try {
      await storage.setItem(GOOGLE_EVENTS_STORAGE_KEY, JSON.stringify(events));
      await storage.setItem(GOOGLE_EVENTS_LAST_SYNC_KEY, new Date().toISOString());
    } catch (err) {
      console.error('Failed to cache Google Calendar events:', err);
    }
  };

  const shouldSyncEvents = (): boolean => {
    if (!lastSyncTime) return true;

    const now = new Date();
    const timeSinceLastSync = now.getTime() - lastSyncTime.getTime();
    return timeSinceLastSync > CACHE_DURATION_MS;
  };

  const syncGoogleCalendar = useCallback(async () => {
    if (!isGoogleAuthenticated || !providerToken || !currentUser) {
      setError('Not authenticated with Google Calendar');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Refresh session to ensure token is valid
      const session = await refreshSession();
      const token = session?.provider_token || providerToken;

      if (!token) {
        throw new Error('No Google access token available');
      }

      // Fetch events for the next 4 weeks (to have good coverage)
      const now = new Date();
      const fourWeeksLater = new Date();
      fourWeeksLater.setDate(now.getDate() + 28);

      const { timeMin, timeMax } = getTimeRangeForDates(now, fourWeeksLater);

      // Fetch events from Google Calendar
      const googleEvents = await fetchGoogleCalendarEvents(token, timeMin, timeMax);

      // Convert to Universify Event format
      const universifyEvents = googleEvents.map((googleEvent) =>
        convertGoogleEventToUniversifyEvent(googleEvent, currentUser.id)
      );

      // Update state and cache
      setGoogleEvents(universifyEvents);
      setLastSyncTime(new Date());
      saveCachedEvents(universifyEvents);

      console.log(`Synced ${universifyEvents.length} Google Calendar events`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync Google Calendar';
      console.error('Error syncing Google Calendar:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isGoogleAuthenticated, providerToken, currentUser, refreshSession]);

  const refreshGoogleCalendar = useCallback(async () => {
    // Force refresh by clearing cache timestamp
    setLastSyncTime(null);
    await syncGoogleCalendar();
  }, [syncGoogleCalendar]);

  const getGoogleEventsForWeek = useCallback(
    (weekKey: string, weekStartDate: Date): Event[] => {
      // Calculate week time range
      const { timeMin, timeMax } = getWeekTimeRange(weekStartDate);
      const weekStart = new Date(timeMin);
      const weekEnd = new Date(timeMax);

      // Filter events that overlap with the week
      return googleEvents.filter((event) => {
        const eventStart = new Date(event.startTime);
        const eventEnd = new Date(event.endTime);

        // Event overlaps with week if:
        // - Event starts before week ends AND event ends after week starts
        return eventStart <= weekEnd && eventEnd >= weekStart;
      });
    },
    [googleEvents]
  );

  const getGoogleEventsForDateRange = useCallback(
    async (startDate: Date, endDate: Date): Promise<Event[]> => {
      if (!isGoogleAuthenticated || !providerToken || !currentUser) {
        return [];
      }

      try {
        // Refresh session to ensure token is valid
        const session = await refreshSession();
        const token = session?.provider_token || providerToken;

        if (!token) {
          throw new Error('No Google access token available');
        }

        const { timeMin, timeMax } = getTimeRangeForDates(startDate, endDate);
        const googleEvents = await fetchGoogleCalendarEvents(token, timeMin, timeMax);

        // Convert to Universify Event format
        return googleEvents.map((googleEvent) =>
          convertGoogleEventToUniversifyEvent(googleEvent, currentUser.id)
        );
      } catch (err) {
        console.error('Error fetching Google Calendar events for date range:', err);
        return [];
      }
    },
    [isGoogleAuthenticated, providerToken, currentUser, refreshSession]
  );

  const createEventInGoogleCalendar = useCallback(async (event: Event): Promise<GoogleCalendarEvent | null> => {
    // Check authentication (same as GCal)
    if (!isGoogleAuthenticated || !providerToken) {
      console.warn('No Google access token from Supabase. Try signing in again.');
      setError('No Google access token available. Please sign in again.');
      return null;
    }

    // Don't create Google Calendar events for events that are already from Google Calendar
    if (event.id.startsWith('gcal-')) {
      console.warn('Cannot create Google Calendar event: Event is already from Google Calendar');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use providerToken directly (same as GCal - no refresh needed)
      console.log('Creating event with provider_token (GCal style):', {
        eventTitle: event.title,
        hasToken: !!providerToken,
        tokenLength: providerToken?.length,
      });

      // Create the event in Google Calendar (same approach as GCal)
      const googleEvent = await createGoogleCalendarEvent(providerToken, event);
      
      console.log('Event created successfully (GCal style):', googleEvent);
      
      // Refresh the calendar to show the new event (same as GCal's fetchWeeklySchedule)
      setTimeout(() => {
        syncGoogleCalendar();
      }, 1000);

      return googleEvent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create Google Calendar event';
      console.error('Error creating Google Calendar event:', err);
      setError(errorMessage);
      // Re-throw so caller can handle it (same as GCal)
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isGoogleAuthenticated, providerToken, syncGoogleCalendar]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: GoogleCalendarContextType = {
    googleEvents,
    isLoading,
    lastSyncTime,
    error,
    syncGoogleCalendar,
    refreshGoogleCalendar,
    createEventInGoogleCalendar,
    getGoogleEventsForWeek,
    getGoogleEventsForDateRange,
    clearError,
  };

  return (
    <GoogleCalendarContext.Provider value={value}>
      {children}
    </GoogleCalendarContext.Provider>
  );
};

export const useGoogleCalendar = (): GoogleCalendarContextType => {
  const context = useContext(GoogleCalendarContext);
  if (context === undefined) {
    throw new Error('useGoogleCalendar must be used within a GoogleCalendarProvider');
  }
  return context;
};

