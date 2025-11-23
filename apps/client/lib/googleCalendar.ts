import { Event, EventCategory } from '@/types/event';

// Google Calendar API event types
export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string; // ISO 8601 format for timed events
    date?: string; // YYYY-MM-DD format for all-day events
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  colorId?: string;
  organizer?: {
    email: string;
    displayName?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  created?: string;
  updated?: string;
}

export interface GoogleCalendarEventsResponse {
  items: GoogleCalendarEvent[];
  nextPageToken?: string;
}

/**
 * Fetch events from Google Calendar API
 */
export async function fetchGoogleCalendarEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string
): Promise<GoogleCalendarEvent[]> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${encodeURIComponent(timeMin)}&` +
      `timeMax=${encodeURIComponent(timeMax)}&` +
      `singleEvents=true&` +
      `orderBy=startTime`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `Failed to fetch calendar events: ${response.statusText}`
      );
    }

    const data: GoogleCalendarEventsResponse = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error fetching Google Calendar events:', error);
    throw error;
  }
}

/**
 * Get time range for a specific date range
 */
export function getTimeRangeForDates(startDate: Date, endDate: Date): {
  timeMin: string;
  timeMax: string;
} {
  return {
    timeMin: startDate.toISOString(),
    timeMax: endDate.toISOString(),
  };
}

/**
 * Get time range for current week
 */
export function getWeekTimeRange(date: Date): { timeMin: string; timeMax: string } {
  const startOfWeek = new Date(date);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day; // Get Sunday of the week
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7); // Add 7 days
  endOfWeek.setHours(23, 59, 59, 999);

  return {
    timeMin: startOfWeek.toISOString(),
    timeMax: endOfWeek.toISOString(),
  };
}

/**
 * Convert Google Calendar event to Universify Event format
 */
export function convertGoogleEventToUniversifyEvent(
  googleEvent: GoogleCalendarEvent,
  userId: string
): Event {
  // Handle start time (dateTime for timed events, date for all-day events)
  const startTime = googleEvent.start.dateTime || 
    (googleEvent.start.date ? `${googleEvent.start.date}T00:00:00Z` : new Date().toISOString());
  
  // Handle end time
  const endTime = googleEvent.end.dateTime || 
    (googleEvent.end.date ? `${googleEvent.end.date}T23:59:59Z` : new Date().toISOString());

  // Extract categories from description or use default
  const categories: EventCategory[] = extractCategoriesFromEvent(googleEvent);

  // Determine color (Google Calendar uses colorId, we'll map to hex)
  const color = mapGoogleColorToHex(googleEvent.colorId);

  // Extract organizer info
  const organizerName = googleEvent.organizer?.displayName || 
    googleEvent.organizer?.email?.split('@')[0] || 
    'Google Calendar';

  return {
    id: `gcal-${googleEvent.id}`, // Prefix to distinguish from Universify events
    title: googleEvent.summary || 'Untitled Event',
    description: googleEvent.description || '',
    startTime,
    endTime,
    location: googleEvent.location || '',
    categories,
    organizer: {
      id: googleEvent.organizer?.email || userId,
      name: organizerName,
      type: 'individual',
    },
    color,
    rsvpEnabled: false, // Google Calendar events don't have RSVP in Universify sense
    rsvpCounts: {
      going: googleEvent.attendees?.length || 0,
      maybe: 0,
      notGoing: 0,
    },
    attendees: googleEvent.attendees?.map((attendee, index) => ({
      userId: `gcal-attendee-${index}`,
      status: 'going' as const,
      timestamp: new Date().toISOString(),
    })) || [],
    attendeeVisibility: 'private', // Google Calendar attendees are typically private
    isClubEvent: false,
    isSocialEvent: false,
    tags: [],
    createdAt: googleEvent.created || new Date().toISOString(),
    updatedAt: googleEvent.updated || new Date().toISOString(),
  };
}

/**
 * Extract categories from Google Calendar event
 * Tries to infer from description, title, or location
 */
function extractCategoriesFromEvent(googleEvent: GoogleCalendarEvent): EventCategory[] {
  const categories: EventCategory[] = [];
  const text = `${googleEvent.summary} ${googleEvent.description} ${googleEvent.location}`.toLowerCase();

  // Simple keyword matching
  if (text.includes('career') || text.includes('job') || text.includes('interview')) {
    categories.push('Career');
  }
  if (text.includes('food') || text.includes('lunch') || text.includes('dinner')) {
    categories.push('Food');
  }
  if (text.includes('fun') || text.includes('party') || text.includes('game')) {
    categories.push('Fun');
  }
  if (text.includes('academic') || text.includes('class') || text.includes('lecture')) {
    categories.push('Academic');
  }
  if (text.includes('networking') || text.includes('meetup')) {
    categories.push('Networking');
  }
  if (text.includes('social') || text.includes('meet')) {
    categories.push('Social');
  }
  if (text.includes('sport') || text.includes('fitness') || text.includes('gym')) {
    categories.push('Sports');
  }
  if (text.includes('art') || text.includes('music') || text.includes('theater')) {
    categories.push('Arts');
  }
  if (text.includes('tech') || text.includes('coding') || text.includes('hackathon')) {
    categories.push('Tech');
  }
  if (text.includes('wellness') || text.includes('health') || text.includes('meditation')) {
    categories.push('Wellness');
  }

  // Default to 'Events' if no categories found
  return categories.length > 0 ? categories : ['Events'];
}

/**
 * Map Google Calendar colorId to hex color
 * Google Calendar has predefined color IDs (1-11)
 */
function mapGoogleColorToHex(colorId?: string): string {
  const colorMap: Record<string, string> = {
    '1': '#A4BDFC', // Lavender
    '2': '#7AE7BF', // Sage
    '3': '#DBADFF', // Grape
    '4': '#FF887C', // Flamingo
    '5': '#FBD75B', // Banana
    '6': '#FFB878', // Tangerine
    '7': '#46D6DB', // Peacock
    '8': '#E1E1E1', // Graphite
    '9': '#5484ED', // Blueberry
    '10': '#51B749', // Basil
    '11': '#DC2127', // Tomato
  };

  return colorMap[colorId || '1'] || '#4285F4'; // Default to Google blue
}

/**
 * Create an event in Google Calendar
 */
export async function createGoogleCalendarEvent(
  accessToken: string,
  event: Event
): Promise<GoogleCalendarEvent> {
  // Exact same implementation as GCal - simple and working
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);

  const googleEvent = {
    summary: event.title,
    description: event.description,
    start: {
      dateTime: start.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  };

  // Add location if it exists (same as GCal structure)
  if (event.location) {
    (googleEvent as any).location = event.location;
  }

  try {
    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleEvent),
      }
    );

    const json = await res.json(); // Google always sends JSON on error

    if (!res.ok) {
      console.error('Google Calendar error:', json);
      throw new Error(
        json.error?.message || `Failed to create calendar event: ${res.statusText}`
      );
    }

    console.log('Created event:', json);
    return json as GoogleCalendarEvent;
  } catch (err) {
    console.error('Network error:', err);
    throw err;
  }
}

/**
 * Delete an event from Google Calendar
 */
export async function deleteGoogleCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  try {
    // Remove the 'gcal-' prefix if present
    const googleEventId = eventId.startsWith('gcal-') ? eventId.substring(5) : eventId;

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      // 404 is okay - event might already be deleted
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `Failed to delete calendar event: ${response.statusText}`
      );
    }
  } catch (error) {
    console.error('Error deleting Google Calendar event:', error);
    throw error;
  }
}

