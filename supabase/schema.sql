-- ============================================================================
-- Supabase Schema: Experiences Table & RLS Policies
-- Run this in your Supabase Project SQL Editor
-- ============================================================================

CREATE TABLE IF NOT EXISTS experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panchayat_id VARCHAR NOT NULL DEFAULT 'CKP-2024',
  location_id UUID REFERENCES locations(id),
  pass_token VARCHAR NOT NULL,
  caption TEXT,
  mood_tag VARCHAR CHECK (mood_tag IN
    ('Peaceful','Exciting','Hidden Gem','Must Return')),
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read & write access
CREATE POLICY "Anyone can insert experiences"
  ON experiences FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anyone can read experiences"
  ON experiences FOR SELECT TO anon USING (true);

-- ============================================================================
-- Supabase Storage: Avatars Bucket Policies
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can upload an avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anyone can update an avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars');

