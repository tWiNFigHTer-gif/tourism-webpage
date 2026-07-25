import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Admin client with service role key to run DDL
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET() {
  try {
    // Create profiles table if it doesn't exist via rpc
    const { error } = await adminSupabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS public.profiles (
          id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          username    TEXT CHECK (char_length(username) <= 30),
          bio         TEXT CHECK (char_length(bio) <= 160),
          avatar_url  TEXT,
          updated_at  TIMESTAMPTZ DEFAULT now()
        );

        -- Enable RLS
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

        -- Drop policy if exists to avoid conflicts, then recreate
        DO $$
        BEGIN
          DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
        EXCEPTION WHEN OTHERS THEN NULL;
        END $$;

        CREATE POLICY "Users can manage own profile"
          ON public.profiles
          FOR ALL
          USING (auth.uid() = id)
          WITH CHECK (auth.uid() = id);
      `,
    });

    if (error) {
      // exec_sql rpc may not exist — try direct insert to detect table
      const { error: probeErr } = await adminSupabase
        .from("profiles")
        .select("id")
        .limit(1);

      if (probeErr && probeErr.code === "42P01") {
        // Table doesn't exist and we can't create it via RPC
        return NextResponse.json(
          { status: "error", message: "Please run the SQL migration manually in Supabase Dashboard.", sql: getSetupSQL() },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ status: "ok", message: "Profiles table ready." });
  } catch (e: any) {
    return NextResponse.json({ status: "error", message: e.message }, { status: 500 });
  }
}

function getSetupSQL() {
  return `
-- Run this in the Supabase SQL Editor:

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT CHECK (char_length(username) <= 30),
  bio         TEXT CHECK (char_length(bio) <= 160),
  avatar_url  TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own profile"
  ON public.profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create avatars storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public avatar read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  `.trim();
}
