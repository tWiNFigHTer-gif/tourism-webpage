-- Terra-Pulse: Local Businesses, Guides & Services Table
-- Run this migration once via /api/init-db or Supabase SQL editor.

CREATE TABLE IF NOT EXISTS businesses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'business', -- 'business', 'guide', 'homestay', 'handicraft', 'eatery', 'service'
  title         TEXT,                              -- subtitle / specialty
  description   TEXT,
  contact       TEXT,
  location_id   UUID REFERENCES locations(id) ON DELETE CASCADE,
  location_name TEXT,
  status        TEXT NOT NULL DEFAULT 'verified',  -- 'verified', 'pending', 'hidden'
  badge         TEXT,                              -- e.g. 'RT Certified', 'GI Tagged', '12 yrs exp'
  icon          TEXT,                              -- Material symbol icon name e.g. 'store', 'person_pin'
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for location filter
CREATE INDEX IF NOT EXISTS idx_businesses_location_id ON businesses(location_id);
-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);

-- Row Level Security
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "businesses_select_public"
  ON businesses FOR SELECT USING (status = 'verified');

CREATE POLICY IF NOT EXISTS "businesses_all_admin"
  ON businesses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('panchayat_admin', 'super_admin', 'admin')
    )
  );
