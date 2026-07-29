-- ============================================================================
-- TerraPulse DPI Spatial Tourism & Admin Portal Schema
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- 1. Enable PostGIS Extension for Spatial Telemetry
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. User Roles Enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('tourist', 'panchayat_admin', 'super_admin');
  END IF;
END $$;

-- 3. Extend Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  role user_role NOT NULL DEFAULT 'tourist',
  panchayat_name TEXT DEFAULT 'CKP-2024',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Locations Table with Spatial Geometry
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'Kerala',
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Ecotourism',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  geom GEOMETRY(Point, 4326),
  capacity_max INT NOT NULL DEFAULT 50,
  capacity_current INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  rich_details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Civic Hazard Reports Table
CREATE TABLE IF NOT EXISTS public.civic_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_name TEXT DEFAULT 'Anonymous Tourist',
  location_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'resolved'
  photo_url TEXT,
  panchayat_id TEXT DEFAULT 'CKP-2024',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Spatial Red Zones (Danger/Hazard Polygons)
CREATE TABLE IF NOT EXISTS public.red_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'HIGH', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  description TEXT,
  coordinates JSONB NOT NULL, -- GeoJSON Polygon coordinates array [[lng, lat], ...]
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Experiences Feed Table
CREATE TABLE IF NOT EXISTS public.experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panchayat_id VARCHAR NOT NULL DEFAULT 'CKP-2024',
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  pass_token VARCHAR NOT NULL,
  caption TEXT,
  mood_tag VARCHAR CHECK (mood_tag IN ('Peaceful','Exciting','Hidden Gem','Must Return')),
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Spatial GIST Index
CREATE INDEX IF NOT EXISTS locations_geom_idx ON public.locations USING GIST (geom);

-- 9. Row Level Security Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civic_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.red_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are readable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Locations Policies
CREATE POLICY "Locations are readable by everyone" ON public.locations FOR SELECT USING (true);
CREATE POLICY "Only admins can edit locations" ON public.locations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'panchayat_admin')
);

-- Civic Reports Policies
CREATE POLICY "Anyone authenticated can report civic hazards" ON public.civic_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Civic reports visible to all authenticated" ON public.civic_reports FOR SELECT USING (true);
CREATE POLICY "Admins can update civic reports status" ON public.civic_reports FOR UPDATE USING (true);

-- Red Zones Policies
CREATE POLICY "Red zones readable by everyone" ON public.red_zones FOR SELECT USING (true);
CREATE POLICY "Admins can write red zones" ON public.red_zones FOR ALL USING (true);

-- Experiences Policies
CREATE POLICY "Anyone can read experiences" ON public.experiences FOR SELECT USING (true);
CREATE POLICY "Anyone can insert experiences" ON public.experiences FOR INSERT WITH CHECK (true);
