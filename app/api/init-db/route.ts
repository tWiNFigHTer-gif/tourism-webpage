/**
 * GET /api/init-db
 * Checks database tables (profiles, attractions, red_zones) and returns SQL setup script.
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET() {
  // Probe database tables
  const { error: profileErr } = await adminSupabase.from("profiles").select("id").limit(1);
  const { error: attractionErr } = await adminSupabase.from("attractions").select("id").limit(1);
  const { error: redZoneErr } = await adminSupabase.from("red_zones").select("id").limit(1);

  const isReady = !profileErr && !attractionErr && !redZoneErr;

  const sql = `
-- Run this SQL in your Supabase SQL Editor (https://supabase.com/dashboard/project/lwunotlnczcsynaemjsq/sql/new)

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'tourist' CHECK (role IN ('admin', 'tourist', 'panchayat_admin', 'super_admin')),
  username TEXT CHECK (char_length(username) <= 50),
  panchayat_name TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Attractions Table (Floating lat/lng for speed)
CREATE TABLE IF NOT EXISTS public.attractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  lat FLOAT8 NOT NULL,
  lng FLOAT8 NOT NULL,
  capacity_per_slot INT4 DEFAULT 50,
  district TEXT,
  region TEXT,
  panchayat_id TEXT,
  is_active BOOLEAN DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Red Zones Table (JSONB storing Polygon GeoJSON coordinates)
CREATE TABLE IF NOT EXISTS public.red_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  name TEXT,
  risk_level TEXT DEFAULT 'HIGH',
  description TEXT,
  coordinates JSONB,
  geojson_polygon JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create Alias Views if locations/danger_zones are referenced
CREATE OR REPLACE VIEW public.locations AS SELECT * FROM public.attractions;
CREATE OR REPLACE VIEW public.danger_zones AS SELECT * FROM public.red_zones;

-- Enable RLS & Set Open Policies for MVP
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.red_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users edit own profiles" ON public.profiles FOR ALL USING (auth.uid() = id);

CREATE POLICY "Public read attractions" ON public.attractions FOR SELECT USING (true);
CREATE POLICY "Public read red_zones" ON public.red_zones FOR SELECT USING (true);
CREATE POLICY "Public insert red_zones" ON public.red_zones FOR INSERT WITH CHECK (true);
`.trim();

  return NextResponse.json({
    status: isReady ? "ready" : "schema_script_available",
    tables: {
      profiles: !profileErr,
      attractions: !attractionErr,
      red_zones: !redZoneErr,
    },
    sql_to_run: sql,
  });
}
