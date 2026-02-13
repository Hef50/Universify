# Complete Database Setup Guide for Universify

## Overview

This guide will walk you through setting up a Supabase database for Universify. The app currently uses **localStorage** for data persistence, but we'll migrate it to use Supabase for a production-ready database.

## Prerequisites

✅ **Supabase is already installed** - The app already has `@supabase/supabase-js` installed  
✅ **Supabase project exists** - Create or select your project at [app.supabase.com](https://app.supabase.com)  
✅ **Google OAuth configured** - Already set up for Google Calendar integration

---

## Step 1: Access Your Supabase Dashboard

1. Go to: [app.supabase.com](https://app.supabase.com) and open your project
2. Sign in to your Supabase account
3. You should see your project dashboard

---

## Step 2: Create Database Tables

We need to create tables for:
- **Events** - Store all Universify events
- **Users** - Store user profiles (optional, if you want to extend beyond Google Auth)
- **RSVPs** - Track event RSVPs (optional, can be stored in events table)

### 2.1: Create Events Table

1. In Supabase Dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Paste the following SQL and click **Run**:

```sql
-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  categories TEXT[] DEFAULT '{}',
  organizer_id TEXT,
  organizer_name TEXT,
  organizer_type TEXT CHECK (organizer_type IN ('club', 'individual')),
  color TEXT,
  rsvp_enabled BOOLEAN DEFAULT true,
  rsvp_counts JSONB DEFAULT '{"going": 0, "maybe": 0, "notGoing": 0}',
  attendees JSONB DEFAULT '[]',
  attendee_visibility TEXT CHECK (attendee_visibility IN ('public', 'private')) DEFAULT 'public',
  is_club_event BOOLEAN DEFAULT false,
  is_social_event BOOLEAN DEFAULT false,
  capacity INTEGER,
  recurring JSONB,
  tags TEXT[] DEFAULT '{}',
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_categories ON events USING GIN(categories);

-- Enable Row Level Security (RLS)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create policy: Anyone can read events (public events)
CREATE POLICY "Events are viewable by everyone"
  ON events FOR SELECT
  USING (true);

-- Create policy: Authenticated users can insert events
CREATE POLICY "Authenticated users can create events"
  ON events FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Create policy: Users can update their own events
CREATE POLICY "Users can update their own events"
  ON events FOR UPDATE
  USING (auth.uid()::text = organizer_id);

-- Create policy: Users can delete their own events
CREATE POLICY "Users can delete their own events"
  ON events FOR DELETE
  USING (auth.uid()::text = organizer_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 2.2: (Optional) Create Users Table

If you want to store additional user information beyond what Supabase Auth provides:

```sql
-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  university TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all profiles
CREATE POLICY "User profiles are viewable by everyone"
  ON user_profiles FOR SELECT
  USING (true);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);
```

### 2.3: (Optional) Create RSVPs Table

If you want to track RSVPs separately (alternative to storing in events.attendees):

```sql
-- Create RSVPs table
CREATE TABLE IF NOT EXISTS rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  status TEXT CHECK (status IN ('going', 'maybe', 'not-going')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rsvps_event_id ON rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_user_id ON rsvps(user_id);

-- Enable RLS
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all RSVPs
CREATE POLICY "RSVPs are viewable by everyone"
  ON rsvps FOR SELECT
  USING (true);

-- Policy: Users can create their own RSVPs
CREATE POLICY "Users can create their own RSVPs"
  ON rsvps FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Users can update their own RSVPs
CREATE POLICY "Users can update their own RSVPs"
  ON rsvps FOR UPDATE
  USING (auth.uid()::text = user_id);
```

---

## Step 3: Update Environment Configuration

1. Navigate to `Universify/apps/client/`
2. Create a `.env` file (if it doesn't exist):

```bash
# Supabase Configuration - get these from Project Settings -> API in your Supabase dashboard
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key_here
```

Copy `apps/client/.env.example` to `apps/client/.env` and fill in your project's values.

**Note:** The Supabase client is already configured in `lib/supabase.ts` with these values, but using environment variables is better practice.

---

## Step 4: Update Code to Use Supabase

### 4.1: Update `lib/api.ts`

Replace the localStorage implementation with Supabase queries:

```typescript
import { supabase } from '@/lib/supabase';
import { Event, EventFormData } from '@/types/event';

/**
 * Fetch all events from Supabase
 */
export const fetchEvents = async (): Promise<Event[]> => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('start_time', { ascending: true });

    if (error) throw error;

    // Transform database format to Event type
    return (data || []).map(transformDbEventToEvent);
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
    const dbEvent = transformEventFormToDb(eventData, userId);
    
    const { data, error } = await supabase
      .from('events')
      .insert([dbEvent])
      .select()
      .single();

    if (error) throw error;
    return transformDbEventToEvent(data);
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
    const dbUpdates = transformEventToDb(updates);
    
    const { error } = await supabase
      .from('events')
      .update(dbUpdates)
      .eq('id', eventId);

    if (error) throw error;
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
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
};

/**
 * Transform database event to Event type
 */
function transformDbEventToEvent(dbEvent: any): Event {
  return {
    id: dbEvent.id,
    title: dbEvent.title,
    description: dbEvent.description || '',
    startTime: dbEvent.start_time,
    endTime: dbEvent.end_time,
    location: dbEvent.location || '',
    categories: dbEvent.categories || [],
    organizer: {
      id: dbEvent.organizer_id || '',
      name: dbEvent.organizer_name || '',
      type: (dbEvent.organizer_type as 'club' | 'individual') || 'individual',
    },
    color: dbEvent.color || '#FF6B6B',
    rsvpEnabled: dbEvent.rsvp_enabled ?? true,
    rsvpCounts: dbEvent.rsvp_counts || { going: 0, maybe: 0, notGoing: 0 },
    attendees: dbEvent.attendees || [],
    attendeeVisibility: (dbEvent.attendee_visibility as 'public' | 'private') || 'public',
    isClubEvent: dbEvent.is_club_event || false,
    isSocialEvent: dbEvent.is_social_event || false,
    capacity: dbEvent.capacity,
    recurring: dbEvent.recurring,
    tags: dbEvent.tags || [],
    createdAt: dbEvent.created_at,
    updatedAt: dbEvent.updated_at,
    imageUrl: dbEvent.image_url,
  };
}

/**
 * Transform EventFormData to database format
 */
function transformEventFormToDb(eventData: EventFormData, userId: string): any {
  const startTime = new Date(`${eventData.startDate}T${eventData.startTime}`);
  const endTime = new Date(`${eventData.endDate}T${eventData.endTime}`);

  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: eventData.title,
    description: eventData.description,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    location: eventData.location,
    categories: eventData.categories,
    organizer_id: userId,
    organizer_name: '', // Will be populated from user profile
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
    image_url: eventData.imageUrl,
  };
}

/**
 * Transform Event updates to database format
 */
function transformEventToDb(event: Partial<Event>): any {
  const dbEvent: any = {};
  
  if (event.title !== undefined) dbEvent.title = event.title;
  if (event.description !== undefined) dbEvent.description = event.description;
  if (event.startTime !== undefined) dbEvent.start_time = event.startTime;
  if (event.endTime !== undefined) dbEvent.end_time = event.endTime;
  if (event.location !== undefined) dbEvent.location = event.location;
  if (event.categories !== undefined) dbEvent.categories = event.categories;
  if (event.color !== undefined) dbEvent.color = event.color;
  if (event.rsvpEnabled !== undefined) dbEvent.rsvp_enabled = event.rsvpEnabled;
  if (event.rsvpCounts !== undefined) dbEvent.rsvp_counts = event.rsvpCounts;
  if (event.attendees !== undefined) dbEvent.attendees = event.attendees;
  if (event.attendeeVisibility !== undefined) dbEvent.attendee_visibility = event.attendeeVisibility;
  if (event.isClubEvent !== undefined) dbEvent.is_club_event = event.isClubEvent;
  if (event.isSocialEvent !== undefined) dbEvent.is_social_event = event.isSocialEvent;
  if (event.capacity !== undefined) dbEvent.capacity = event.capacity;
  if (event.recurring !== undefined) dbEvent.recurring = event.recurring;
  if (event.tags !== undefined) dbEvent.tags = event.tags;
  if (event.imageUrl !== undefined) dbEvent.image_url = event.imageUrl;

  return dbEvent;
}
```

### 4.2: Update `contexts/EventsContext.tsx`

Replace the `loadEvents` function to use the API:

```typescript
import { fetchEvents, createEventAPI, updateEventAPI, deleteEventAPI } from '@/lib/api';

// In EventsProvider component:
const loadEvents = async () => {
  try {
    setIsLoading(true);
    
    // Try to fetch from Supabase
    const fetchedEvents = await fetchEvents();
    
    if (fetchedEvents.length > 0) {
      setEvents(fetchedEvents);
    } else {
      // Fallback to mock data if database is empty
      const allEvents = [...(mockEventsData as Event[]), ...(currentWeekEvents as Event[])];
      const filteredEvents = allEvents.filter((event: Event) => !event.id.startsWith('gcal-'));
      setEvents(filteredEvents);
      
      // Optionally: Seed database with mock data
      // await seedDatabase(filteredEvents);
    }
  } catch (error) {
    console.error('Failed to load events from database:', error);
    // Fallback to localStorage/mock data
    const storedEvents = await storage.getItem(EVENTS_STORAGE_KEY);
    if (storedEvents) {
      const parsed = JSON.parse(storedEvents);
      setEvents(parsed.filter((event: Event) => !event.id.startsWith('gcal-')));
    } else {
      const allEvents = [...(mockEventsData as Event[]), ...(currentWeekEvents as Event[])];
      const filteredEvents = allEvents.filter((event: Event) => !event.id.startsWith('gcal-'));
      setEvents(filteredEvents);
    }
  } finally {
    setIsLoading(false);
  }
};

// Update createEvent to use API
const createEvent = async (eventData: EventFormData, userId: string): Promise<Event> => {
  try {
    const newEvent = await createEventAPI(eventData, userId);
    setEvents(prev => [...prev, newEvent]);
    return newEvent;
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
};

// Update updateEvent to use API
const updateEvent = async (eventId: string, updates: Partial<Event>): Promise<void> => {
  try {
    await updateEventAPI(eventId, updates);
    setEvents(prev => prev.map(event => 
      event.id === eventId ? { ...event, ...updates } : event
    ));
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
};

// Update deleteEvent to use API
const deleteEvent = async (eventId: string): Promise<void> => {
  try {
    await deleteEventAPI(eventId);
    setEvents(prev => prev.filter(event => event.id !== eventId));
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
};
```

---

## Step 5: Seed Database with Mock Data (Optional)

If you want to populate the database with the existing mock events:

```sql
-- This would be done via a migration script or manually
-- You can export your mockEvents.json and import via Supabase dashboard
-- Or create a seed script in your codebase
```

Or create a seed script:

```typescript
// scripts/seedDatabase.ts
import { supabase } from '@/lib/supabase';
import mockEventsData from '@/data/mockEvents.json';
import { Event } from '@/types/event';

async function seedDatabase() {
  const events = mockEventsData as Event[];
  
  for (const event of events) {
    const dbEvent = {
      id: event.id,
      title: event.title,
      description: event.description,
      start_time: event.startTime,
      end_time: event.endTime,
      location: event.location,
      categories: event.categories,
      organizer_id: event.organizer.id,
      organizer_name: event.organizer.name,
      organizer_type: event.organizer.type,
      color: event.color,
      rsvp_enabled: event.rsvpEnabled,
      rsvp_counts: event.rsvpCounts,
      attendees: event.attendees,
      attendee_visibility: event.attendeeVisibility,
      is_club_event: event.isClubEvent,
      is_social_event: event.isSocialEvent,
      capacity: event.capacity,
      recurring: event.recurring,
      tags: event.tags,
      image_url: event.imageUrl,
    };

    const { error } = await supabase.from('events').insert([dbEvent]);
    if (error) {
      console.error(`Error seeding event ${event.id}:`, error);
    }
  }
  
  console.log('Database seeded successfully!');
}
```

---

## Step 6: Test the Setup

1. **Start your app:**
   ```bash
   cd Universify/apps/client
   npm start
   ```

2. **Check Supabase Dashboard:**
   - Go to **Table Editor** → **events**
   - You should see events being created/updated

3. **Test CRUD operations:**
   - Create a new event in the app
   - Check if it appears in Supabase
   - Update an event
   - Delete an event

---

## Troubleshooting

### Issue: "Row Level Security policy violation"

**Solution:** Make sure you're authenticated. The RLS policies require authentication for INSERT/UPDATE/DELETE operations.

### Issue: "Events not loading"

**Solution:** 
1. Check browser console for errors
2. Verify Supabase URL and key are correct
3. Check RLS policies allow SELECT operations
4. Verify table name is `events` (lowercase)

### Issue: "Permission denied"

**Solution:** 
1. Check that RLS policies are set up correctly
2. Verify user is authenticated: `await supabase.auth.getSession()`
3. Check that `organizer_id` matches authenticated user's ID for UPDATE/DELETE

### Issue: "Column does not exist"

**Solution:** 
1. Verify table schema matches the SQL above
2. Check column names (snake_case in DB, camelCase in TypeScript)
3. Run the table creation SQL again

---

## Next Steps

1. ✅ Database tables created
2. ✅ Code updated to use Supabase
3. ⏳ Test all CRUD operations
4. ⏳ Set up real-time subscriptions (optional)
5. ⏳ Add database backups
6. ⏳ Set up monitoring/alerts

---

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

**Need Help?** Check the Supabase dashboard logs or browser console for detailed error messages.

