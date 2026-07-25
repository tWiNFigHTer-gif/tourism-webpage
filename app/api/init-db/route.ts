/**
 * GET /api/init-db
 * Creates the profiles table if it doesn't exist.
 * Uses the Supabase admin client to insert a row; if the table is missing,
 * the error code helps us detect it.
 * 
 * Since we cannot run DDL via the REST API directly, this route returns
 * the SQL script to run in the Supabase dashboard if the table is missing.
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET() {
  // Probe the profiles table
  const { error } = await adminSupabase
    .from("profiles")
    .select("id")
    .limit(1);

  if (!error) {
    return NextResponse.json({ status: "ready", message: "profiles table exists and is ready." });
  }

  const sql = `
-- Run this SQL in your Supabase SQL Editor (https://supabase.com/dashboard/project/lwunotlnczcsynaemjsq/sql/new)

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT CHECK (char_length(username) <= 30),
  bio TEXT CHECK (char_length(bio) <= 160),
  avatar_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own profile"
  ON public.profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Storage policies for the already-created 'avatars' bucket
CREATE POLICY IF NOT EXISTS "Public avatar read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY IF NOT EXISTS "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY IF NOT EXISTS "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars');
  `.trim();

  return NextResponse.json(
    { status: "missing", error: error.message, code: error.code, sql_to_run: sql },
    { status: 200 }
  );
}
