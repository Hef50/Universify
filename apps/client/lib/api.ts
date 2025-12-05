/**
 * API Service for Events
 * 
 * This file provides a centralized API interface for event operations.
 * Currently uses localStorage, but can be easily swapped for a real database.
 * 
 * To connect to a database (e.g., Supabase):
 * 1. Install the database client library
 * 2. Replace the implementation functions below with actual API calls
 * 3. Update EventsContext.tsx to use these functions
 */

import { Event, EventFormData } from '@/types/event';

// TODO: Replace with actual API endpoint
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

/**
 * Fetch all events from the database
 */
export const fetchEvents = async (): Promise<Event[]> => {
  try {
    // TODO: Replace with actual API call
    // Example for Supabase:
    // const { data, error } = await supabase.from('events').select('*');
    // if (error) throw error;
    // return data;
    
    // For now, return empty array - events are loaded from localStorage in EventsContext
    return [];
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
};

/**
 * Create a new event
 */
export const createEventAPI = async (eventData: EventFormData, userId: string): Promise<Event> => {
  try {
    // TODO: Replace with actual API call
    // Example for Supabase:
    // const { data, error } = await supabase
    //   .from('events')
    //   .insert([{ ...eventData, organizer_id: userId }])
    //   .select()
    //   .single();
    // if (error) throw error;
    // return data;
    
    throw new Error('API not implemented - using localStorage');
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
};

/**
 * Update an existing event
 */
export const updateEventAPI = async (eventId: string, updates: Partial<Event>): Promise<void> => {
  try {
    // TODO: Replace with actual API call
    // Example for Supabase:
    // const { error } = await supabase
    //   .from('events')
    //   .update(updates)
    //   .eq('id', eventId);
    // if (error) throw error;
    
    throw new Error('API not implemented - using localStorage');
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
};

/**
 * Delete an event
 */
export const deleteEventAPI = async (eventId: string): Promise<void> => {
  try {
    // TODO: Replace with actual API call
    // Example for Supabase:
    // const { error } = await supabase
    //   .from('events')
    //   .delete()
    //   .eq('id', eventId);
    // if (error) throw error;
    
    throw new Error('API not implemented - using localStorage');
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
};

/**
 * Example Supabase setup (commented out - uncomment and configure when ready)
 * 
 * 1. Install Supabase: npm install @supabase/supabase-js
 * 2. Create a .env file with:
 *    EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
 *    EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
 * 3. Uncomment and configure:
 * 
 * import { createClient } from '@supabase/supabase-js';
 * 
 * const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
 * const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
 * 
 * export const supabase = createClient(supabaseUrl, supabaseAnonKey);
 */

