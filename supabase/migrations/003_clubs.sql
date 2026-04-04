-- Clubs table for Universify
-- Stores club data with membership, integrations, and optional password protection

CREATE TABLE IF NOT EXISTS clubs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  password TEXT,
  admin_ids TEXT[] DEFAULT '{}',
  member_ids TEXT[] DEFAULT '{}',
  integrations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clubs_name ON clubs(name);

ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clubs are viewable by everyone"
  ON clubs FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create clubs"
  ON clubs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Club admins can update their clubs"
  ON clubs FOR UPDATE
  USING (auth.uid()::text = ANY(admin_ids));

CREATE POLICY "Club admins can delete their clubs"
  ON clubs FOR DELETE
  USING (auth.uid()::text = ANY(admin_ids));

CREATE TRIGGER update_clubs_updated_at
  BEFORE UPDATE ON clubs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
