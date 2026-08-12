-- Universify: per-user RSVP storage
-- Run this in Supabase SQL Editor after 001 and 002.
--
-- Why: RSVPs used to be written by updating events.rsvp_counts/attendees
-- directly from the client. The events UPDATE policy only allows the
-- organizer, so every other user's RSVP silently matched zero rows and was
-- lost on reload. This migration gives each user their own RSVP row (which
-- they are allowed to write) and keeps the denormalized JSONB on events in
-- sync via a SECURITY DEFINER trigger.

-- ============================================
-- EVENT RSVPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS event_rsvps (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('going', 'maybe', 'not-going')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_rsvps_user ON event_rsvps(user_id);

ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RSVPs are viewable by everyone"
  ON event_rsvps FOR SELECT USING (true);

CREATE POLICY "Users can create their own RSVPs"
  ON event_rsvps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own RSVPs"
  ON event_rsvps FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own RSVPs"
  ON event_rsvps FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_event_rsvps_updated_at
  BEFORE UPDATE ON event_rsvps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SYNC DENORMALIZED AGGREGATES ON EVENTS
-- ============================================
-- SECURITY DEFINER so the recount can update the events row regardless of
-- which user triggered it (the events UPDATE policy only allows organizers).
CREATE OR REPLACE FUNCTION sync_event_rsvp_aggregates()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_event_id TEXT;
BEGIN
  target_event_id := COALESCE(NEW.event_id, OLD.event_id);

  UPDATE events
  SET
    rsvp_counts = (
      SELECT jsonb_build_object(
        'going',    COUNT(*) FILTER (WHERE status = 'going'),
        'maybe',    COUNT(*) FILTER (WHERE status = 'maybe'),
        'notGoing', COUNT(*) FILTER (WHERE status = 'not-going')
      )
      FROM event_rsvps
      WHERE event_id = target_event_id
    ),
    attendees = COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'userId', user_id,
            'status', status,
            'timestamp', updated_at
          )
          ORDER BY updated_at
        )
        FROM event_rsvps
        WHERE event_id = target_event_id
      ),
      '[]'::jsonb
    )
  WHERE id = target_event_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_event_rsvp_change ON event_rsvps;
CREATE TRIGGER on_event_rsvp_change
  AFTER INSERT OR UPDATE OR DELETE ON event_rsvps
  FOR EACH ROW
  EXECUTE FUNCTION sync_event_rsvp_aggregates();

-- No backfill: pre-migration attendees JSONB only ever persisted for event
-- organizers RSVPing to their own events (all other writes were blocked by
-- RLS), so existing data is not a meaningful source of truth.
