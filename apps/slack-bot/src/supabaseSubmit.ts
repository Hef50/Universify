/**
 * Persist parsed Slack events into the shared Supabase `events` table (the
 * same table the Expo client and the Discord bot use).
 *
 * Uses the service-role key so RLS does not block inserts. When Supabase env
 * vars are missing the module degrades gracefully: events stay in the
 * in-memory store only, exactly like the pre-persistence behavior.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UniversifyEvent } from './parser';
import { isDuplicate, TIME_WINDOW_MS } from './dedupe';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
// A dedicated bot user's auth.users UUID; ownership of Slack-imported events
const SUPABASE_ORGANIZER_ID = process.env.SUPABASE_ORGANIZER_ID;

let client: SupabaseClient | null = null;

export function isPersistenceConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function getClient(): SupabaseClient | null {
  if (!isPersistenceConfigured()) return null;
  if (!client) {
    client = createClient(SUPABASE_URL as string, SUPABASE_SERVICE_ROLE_KEY as string);
  }
  return client;
}

function eventToRow(event: UniversifyEvent) {
  const tags = [...(event.tags || [])];
  if (!tags.includes('slack')) tags.push('slack');

  return {
    id: event.id,
    title: event.title,
    description: event.description || null,
    start_time: event.startTime,
    end_time: event.endTime,
    location: event.location || null,
    categories: event.categories || [],
    organizer_id: SUPABASE_ORGANIZER_ID || null,
    organizer_name: event.organizer?.name || 'Slack',
    organizer_type: event.organizer?.type || 'club',
    color: event.color,
    rsvp_enabled: event.rsvpEnabled ?? true,
    rsvp_counts: event.rsvpCounts || { going: 0, maybe: 0, notGoing: 0 },
    attendees: [],
    attendee_visibility: event.attendeeVisibility || 'public',
    is_club_event: event.isClubEvent ?? true,
    is_social_event: event.isSocialEvent ?? false,
    capacity: event.capacity ?? null,
    recurring: null,
    tags,
    image_url: event.imageUrl ?? null,
  };
}

export type SubmitResult =
  | { status: 'inserted' }
  | { status: 'duplicate' }
  | { status: 'skipped'; reason: string }
  | { status: 'error'; error: string };

/**
 * Insert a parsed Slack event unless an existing event (from any source)
 * within ±2h already looks like the same announcement.
 */
export async function submitSlackEvent(event: UniversifyEvent): Promise<SubmitResult> {
  const supabase = getClient();
  if (!supabase) {
    return { status: 'skipped', reason: 'Supabase env vars not configured' };
  }

  try {
    // Pull potential duplicates: events starting within the dedupe window
    const start = Date.parse(event.startTime);
    const windowStart = new Date(start - TIME_WINDOW_MS).toISOString();
    const windowEnd = new Date(start + TIME_WINDOW_MS).toISOString();

    const { data: nearby, error: queryError } = await supabase
      .from('events')
      .select('id, title, start_time')
      .gte('start_time', windowStart)
      .lte('start_time', windowEnd);

    if (queryError) {
      return { status: 'error', error: queryError.message };
    }

    const candidates = (nearby || []).map((row) => ({
      id: row.id as string,
      title: (row.title as string) || '',
      startTime: row.start_time as string,
    }));

    // Same Slack message re-imported -> treat as already stored
    if (candidates.some((c) => c.id === event.id)) {
      return { status: 'duplicate' };
    }

    if (await isDuplicate({ id: event.id, title: event.title, startTime: event.startTime }, candidates)) {
      return { status: 'duplicate' };
    }

    const { error: insertError } = await supabase.from('events').insert([eventToRow(event)]);
    if (insertError) {
      // Unique-violation race (same message processed twice) is a duplicate
      if (insertError.code === '23505') return { status: 'duplicate' };
      return { status: 'error', error: insertError.message };
    }

    return { status: 'inserted' };
  } catch (err) {
    return { status: 'error', error: err instanceof Error ? err.message : String(err) };
  }
}
