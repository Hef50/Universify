import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { EventMessage, MessageKind } from '@/utils/eventMessages';
import { Event, EventCategory, EventFormData, RSVPStatus } from '@/types/event';

/** Thrown when a network call is attempted without Supabase credentials. */
export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super('Supabase is not configured; running in offline demo mode');
    this.name = 'SupabaseNotConfiguredError';
  }
}

function requireSupabase(): void {
  if (!isSupabaseConfigured) throw new SupabaseNotConfiguredError();
}

function transformDbEventToEvent(dbEvent: Record<string, unknown>): Event {
  return {
    id: dbEvent.id as string,
    title: dbEvent.title as string,
    description: (dbEvent.description as string) || '',
    startTime: dbEvent.start_time as string,
    endTime: dbEvent.end_time as string,
    location: (dbEvent.location as string) || '',
    categories: (dbEvent.categories as EventCategory[]) || [],
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
    image_url: eventData.imageUrl ?? null,
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
  requireSupabase();
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('start_time', { ascending: true });

  if (error) throw error;
  return (data || []).map((row) => transformDbEventToEvent(row as Record<string, unknown>));
};

export const fetchCreatedEventIds = async (userId: string): Promise<string[]> => {
  requireSupabase();
  const { data, error } = await supabase
    .from('events')
    .select('id')
    .eq('organizer_id', userId);
  if (error) throw error;
  return (data || []).map((row) => row.id as string);
};

export const createEventAPI = async (
  eventData: EventFormData,
  userId: string,
  organizerName: string = 'Current User'
): Promise<Event> => {
  requireSupabase();
  const dbEvent = transformEventFormToDb(eventData, userId, organizerName);

  const { data, error } = await supabase.from('events').insert([dbEvent]).select().single();

  if (error) throw error;
  return transformDbEventToEvent(data as Record<string, unknown>);
};

export const updateEventAPI = async (eventId: string, updates: Partial<Event>): Promise<void> => {
  requireSupabase();
  const dbUpdates = transformEventToDb(updates);
  const { error } = await supabase.from('events').update(dbUpdates).eq('id', eventId);

  if (error) throw error;
};

export const deleteEventAPI = async (eventId: string): Promise<void> => {
  requireSupabase();
  const { error } = await supabase.from('events').delete().eq('id', eventId);

  if (error) throw error;
};

/**
 * Upsert (or clear) the current user's RSVP for an event.
 *
 * Writes go to the per-user event_rsvps table (which the user is allowed to
 * write under RLS); a database trigger keeps events.rsvp_counts and
 * events.attendees in sync. Passing null status removes the RSVP.
 */
export const setRSVPAPI = async (
  eventId: string,
  userId: string,
  status: RSVPStatus
): Promise<void> => {
  requireSupabase();
  if (status === null) {
    const { error } = await supabase
      .from('event_rsvps')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from('event_rsvps')
    .upsert(
      { event_id: eventId, user_id: userId, status },
      { onConflict: 'event_id,user_id' }
    );
  if (error) throw error;
};

/** Fetch the fresh server-side aggregate state of one event (counts + attendees). */
export const fetchEventAPI = async (eventId: string): Promise<Event | null> => {
  requireSupabase();
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle();
  if (error) throw error;
  return data ? transformDbEventToEvent(data as Record<string, unknown>) : null;
};

// ============================================
// EVENT THREADS (chat + host announcements)
// ============================================

interface DbEventMessage {
  id: string;
  event_id: string;
  user_id: string;
  author_name: string;
  kind: MessageKind;
  body: string;
  created_at: string;
}

const transformDbMessage = (row: DbEventMessage): EventMessage => ({
  id: row.id,
  eventId: row.event_id,
  userId: row.user_id,
  authorName: row.author_name,
  kind: row.kind,
  body: row.body,
  createdAt: row.created_at,
});

/** Thread for one event, oldest first. RLS limits this to participants. */
export const fetchEventMessagesAPI = async (eventId: string): Promise<EventMessage[]> => {
  requireSupabase();
  const { data, error } = await supabase
    .from('event_messages')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => transformDbMessage(row as DbEventMessage));
};

export const postEventMessageAPI = async (
  eventId: string,
  userId: string,
  authorName: string,
  body: string,
  kind: MessageKind = 'message'
): Promise<EventMessage> => {
  requireSupabase();
  const { data, error } = await supabase
    .from('event_messages')
    .insert({
      event_id: eventId,
      user_id: userId,
      author_name: authorName,
      kind,
      body,
    })
    .select()
    .single();
  if (error) throw error;
  return transformDbMessage(data as DbEventMessage);
};

export const deleteEventMessageAPI = async (messageId: string): Promise<void> => {
  requireSupabase();
  const { error } = await supabase.from('event_messages').delete().eq('id', messageId);
  if (error) throw error;
};
