-- Universify Initial Schema
-- Run this in Supabase SQL Editor when setting up a new project

-- ============================================
-- EVENTS TABLE
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_categories ON events USING GIN(categories);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are viewable by everyone"
  ON events FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create events"
  ON events FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own events"
  ON events FOR UPDATE
  USING (auth.uid()::text = organizer_id);

CREATE POLICY "Users can delete their own events"
  ON events FOR DELETE
  USING (auth.uid()::text = organizer_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- USER PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  university TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User profiles are viewable by everyone"
  ON user_profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- USER SCHEDULED EVENTS TABLE (calendar pins)
-- ============================================
CREATE TABLE IF NOT EXISTS user_scheduled_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  week_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id, week_key)
);

CREATE INDEX IF NOT EXISTS idx_user_scheduled_events_user ON user_scheduled_events(user_id);

ALTER TABLE user_scheduled_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scheduled events"
  ON user_scheduled_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can schedule events for themselves"
  ON user_scheduled_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unschedule their own events"
  ON user_scheduled_events FOR DELETE
  USING (auth.uid() = user_id);
