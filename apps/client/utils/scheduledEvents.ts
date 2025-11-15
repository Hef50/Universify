import { Platform } from 'react-native';

// Track which events are scheduled for which weeks
// Format: { weekKey: [eventId1, eventId2, ...] }
// weekKey format: "YYYY-WW" (year-week number)

const STORAGE_KEY = 'universify_scheduled_events';

type ScheduledEvents = Record<string, string[]>;

// Synchronous storage for web (localStorage), async wrapper for native
const storage = {
  getItem: (key: string): string | null => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    // For native, you'd use AsyncStorage here (would need async wrapper)
    return null;
  },
  setItem: (key: string, value: string): void => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    }
    // For native, you'd use AsyncStorage here (would need async wrapper)
  },
};

// Get week key from a date (ISO week format)
export const getWeekKey = (date: Date): string => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
};

// Get all scheduled events (synchronous for web)
export const getScheduledEvents = (): ScheduledEvents => {
  try {
    const stored = storage.getItem(STORAGE_KEY);
    if (!stored) return {};
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error loading scheduled events:', error);
    return {};
  }
};

// Save scheduled events (synchronous for web)
export const saveScheduledEvents = (scheduled: ScheduledEvents): void => {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(scheduled));
  } catch (error) {
    console.error('Error saving scheduled events:', error);
  }
};

// Check if an event is scheduled for a specific week
export const isEventScheduled = (eventId: string, weekKey: string): boolean => {
  const scheduled = getScheduledEvents();
  return scheduled[weekKey]?.includes(eventId) || false;
};

// Add an event to a week's schedule
export const scheduleEvent = (eventId: string, weekKey: string): void => {
  const scheduled = getScheduledEvents();
  if (!scheduled[weekKey]) {
    scheduled[weekKey] = [];
  }
  if (!scheduled[weekKey].includes(eventId)) {
    scheduled[weekKey].push(eventId);
    saveScheduledEvents(scheduled);
  }
};

// Remove an event from a week's schedule
export const unscheduleEvent = (eventId: string, weekKey: string): void => {
  const scheduled = getScheduledEvents();
  if (scheduled[weekKey]) {
    scheduled[weekKey] = scheduled[weekKey].filter(id => id !== eventId);
    saveScheduledEvents(scheduled);
  }
};

// Get all event IDs scheduled for a week
export const getScheduledEventIds = (weekKey: string): string[] => {
  const scheduled = getScheduledEvents();
  return scheduled[weekKey] || [];
};

