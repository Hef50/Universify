import { supabase } from '@/lib/supabase';

export async function getScheduledEventIdsFromSupabase(
  userId: string,
  weekKey: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_scheduled_events')
    .select('event_id')
    .eq('user_id', userId)
    .eq('week_key', weekKey);

  if (error) throw error;
  return (data || []).map((row) => row.event_id);
}

export async function scheduleEventInSupabase(
  userId: string,
  eventId: string,
  weekKey: string
): Promise<void> {
  const { error } = await supabase.from('user_scheduled_events').insert({
    user_id: userId,
    event_id: eventId,
    week_key: weekKey,
  });

  if (error) throw error;
}

export async function unscheduleEventInSupabase(
  userId: string,
  eventId: string,
  weekKey: string
): Promise<void> {
  const { error } = await supabase
    .from('user_scheduled_events')
    .delete()
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .eq('week_key', weekKey);

  if (error) throw error;
}

export async function getAllScheduledEventIdsFromSupabase(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_scheduled_events')
    .select('event_id')
    .eq('user_id', userId);

  if (error) throw error;
  return [...new Set((data || []).map((row) => row.event_id))];
}
