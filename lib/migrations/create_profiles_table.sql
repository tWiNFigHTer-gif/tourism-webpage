-- Terra-Pulse: Profiles Table SQL Migration
-- Run this migration in Supabase SQL editor or via /api/init-db.

CREATE TABLE IF NOT EXISTS public.profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username       TEXT CHECK (char_length(username) <= 30),
  bio            TEXT CHECK (char_length(bio) <= 160),
  avatar_url     TEXT,
  role           TEXT NOT NULL DEFAULT 'tourist', -- 'tourist', 'panchayat_admin', 'super_admin'
  panchayat_name TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Profiles select public or own"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "Users manage own profile"
  ON public.profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
