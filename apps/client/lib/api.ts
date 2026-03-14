import { supabase } from '@/lib/supabase';
import { Event, EventFormData } from '@/types/event';

function transformDbEventToEvent(dbEvent: Record<string, unknown>): Event {
  return {
    id: dbEvent.id as string,
    title: dbEvent.title as string,
    description: (dbEvent.description as string) || '',
    startTime: dbEvent.start_time as string,
    endTime: dbEvent.end_time as string,
    location: (dbEvent.location as string) || '',
    categories: (dbEvent.categories as string[]) || [],
    organizer: {
      id: (dbEvent.organizer_id as string) || '',
      name: (dbEvent.organizer_name as string) || '',
      type: ((dbEvent.organizer_type as string) as 'club' | 'individual') || 'individual',
    },
    color: (dbEvent.color as string) || '#FF6B6B',
    rsvpEnabled: (dbEvent.rsvp_enabled as boolean) ?? true,
    rsvpCounts: (dbEvent.rsvp_counts as { going: number; maybe: number; notGoing: number }) || {
      going: 0,
      maybe: 0,
      notGoing: 0,
    },
    attendees: (dbEvent.attendees as Event['attendees']) || [],
    attendeeVisibility: ((dbEvent.attendee_visibility as string) as 'public' | 'private') || 'public',
    isClubEvent: (dbEvent.is_club_event as boolean) || false,
    isSocialEvent: (dbEvent.is_social_event as boolean) || false,
    capacity: dbEvent.capacity as number | undefined,
    recurring: dbEvent.recurring as Event['recurring'],
    tags: (dbEvent.tags as string[]) || [],
    createdAt: dbEvent.created_at as string,
    updatedAt: dbEvent.updated_at as string,
    imageUrl: dbEvent.image_url as string | undefined,
  };
}

function transformEventFormToDb(eventData: EventFormData, userId: string, organizerName: string) {
  const startTime = new Date(`${eventData.startDate}T${eventData.startTime}:00Z`);
  const endTime = new Date(`${eventData.endDate}T${eventData.endTime}:00Z`);

  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    title: eventData.title,
    description: eventData.description,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    location: eventData.location,
    categories: eventData.categories,
    organizer_id: userId,
    organizer_name: organizerName,
    organizer_type: eventData.isClubEvent ? 'club' : 'individual',
    color: eventData.color,
    rsvp_enabled: eventData.rsvpEnabled,
    rsvp_counts: { going: 0, maybe: 0, notGoing: 0 },
    attendees: [],
    attendee_visibility: eventData.attendeeVisibility,
    is_club_event: eventData.isClubEvent,
    is_social_event: eventData.isSocialEvent,
    capacity: eventData.capacity,
    recurring: eventData.recurring,
    tags: eventData.tags,
  };
}

function transformEventToDb(updates: Partial<Event>): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if (updates.title !== undefined) db.title = updates.title;
  if (updates.description !== undefined) db.description = updates.description;
  if (updates.startTime !== undefined) db.start_time = updates.startTime;
  if (updates.endTime !== undefined) db.end_time = updates.endTime;
  if (updates.location !== undefined) db.location = updates.location;
  if (updates.categories !== undefined) db.categories = updates.categories;
  if (updates.color !== undefined) db.color = updates.color;
  if (updates.rsvpEnabled !== undefined) db.rsvp_enabled = updates.rsvpEnabled;
  if (updates.rsvpCounts !== undefined) db.rsvp_counts = updates.rsvpCounts;
  if (updates.attendees !== undefined) db.attendees = updates.attendees;
  if (updates.attendeeVisibility !== undefined) db.attendee_visibility = updates.attendeeVisibility;
  if (updates.isClubEvent !== undefined) db.is_club_event = updates.isClubEvent;
  if (updates.isSocialEvent !== undefined) db.is_social_event = updates.isSocialEvent;
  if (updates.capacity !== undefined) db.capacity = updates.capacity;
  if (updates.recurring !== undefined) db.recurring = updates.recurring;
  if (updates.tags !== undefined) db.tags = updates.tags;
  if (updates.imageUrl !== undefined) db.image_url = updates.imageUrl;
  if (updates.organizer !== undefined) {
    db.organizer_id = updates.organizer.id;
    db.organizer_name = updates.organizer.name;
    db.organizer_type = updates.organizer.type;
  }
  return db;
}

export const fetchEvents = async (): Promise<Event[]> => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('start_time', { ascending: true });

  if (error) throw error;
  return (data || []).map((row) => transformDbEventToEvent(row as Record<string, unknown>));
};

export const createEventAPI = async (
  eventData: EventFormData,
  userId: string,
  organizerName: string = 'Current User'
): Promise<Event> => {
  const dbEvent = transformEventFormToDb(eventData, userId, organizerName);

  const { data, error } = await supabase.from('events').insert([dbEvent]).select().single();

  if (error) throw error;
  return transformDbEventToEvent(data as Record<string, unknown>);
};

export const updateEventAPI = async (eventId: string, updates: Partial<Event>): Promise<void> => {
  const dbUpdates = transformEventToDb(updates);
  const { error } = await supabase.from('events').update(dbUpdates).eq('id', eventId);

  if (error) throw error;
};

export const deleteEventAPI = async (eventId: string): Promise<void> => {
  const { error } = await supabase.from('events').delete().eq('id', eventId);

  if (error) throw error;
};
