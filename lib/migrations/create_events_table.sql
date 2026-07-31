-- Terra-Pulse: Tourism Events Table
-- Run this migration once via /api/init-db or Supabase SQL editor.

CREATE TABLE IF NOT EXISTS events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  location_id   UUID REFERENCES locations(id) ON DELETE CASCADE,
  location_name TEXT,
  start_time    TIMESTAMPTZ NOT NULL,
  end_time      TIMESTAMPTZ,
  image_url     TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast place-filtered queries
CREATE INDEX IF NOT EXISTS idx_events_location_id ON events(location_id);
-- Index for chronological ordering
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);

-- Row Level Security: anyone can read; only admins can write
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "events_select_public"
  ON events FOR SELECT USING (is_active = TRUE);

CREATE POLICY IF NOT EXISTS "events_insert_admin"
  ON events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('panchayat_admin', 'super_admin', 'admin')
    )
  );

CREATE POLICY IF NOT EXISTS "events_update_admin"
  ON events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('panchayat_admin', 'super_admin', 'admin')
    )
  );

CREATE POLICY IF NOT EXISTS "events_delete_admin"
  ON events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('panchayat_admin', 'super_admin', 'admin')
    )
  );
