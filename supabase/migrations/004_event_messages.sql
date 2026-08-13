-- Universify: per-event discussion and host announcements
-- Run this in Supabase SQL Editor after 001–003.
--
-- Why: an event page had no way for the people going to talk to each other,
-- and no way for the host to reach them. Both live in one table, separated by
-- `kind`, so a single query renders the thread in order.
--
-- Access rules enforced in the database, not just the UI:
--   * only people who RSVP'd (going/maybe) or the organizer can read a thread
--   * the same people can post messages
--   * announcements can only be written by the organizer

CREATE TABLE IF NOT EXISTS event_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'message' CHECK (kind IN ('message', 'announcement')),
  body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_messages_event ON event_messages(event_id, created_at);

ALTER TABLE event_messages ENABLE ROW LEVEL SECURITY;

-- True when the given user is going/maybe to the event, or hosts it.
CREATE OR REPLACE FUNCTION is_event_participant(target_event_id TEXT, target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM event_rsvps r
    WHERE r.event_id = target_event_id
      AND r.user_id = target_user_id
      AND r.status IN ('going', 'maybe')
  ) OR EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = target_event_id
      AND e.organizer_id = target_user_id::text
  );
$$;

CREATE OR REPLACE FUNCTION is_event_organizer(target_event_id TEXT, target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = target_event_id
      AND e.organizer_id = target_user_id::text
  );
$$;

CREATE POLICY "Participants can read the thread"
  ON event_messages FOR SELECT
  USING (is_event_participant(event_id, auth.uid()));

CREATE POLICY "Participants can post messages"
  ON event_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND is_event_participant(event_id, auth.uid())
    AND (kind = 'message' OR is_event_organizer(event_id, auth.uid()))
  );

CREATE POLICY "Authors can delete their own posts"
  ON event_messages FOR DELETE
  USING (auth.uid() = user_id);
