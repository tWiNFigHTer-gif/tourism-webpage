import { createClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key";

/**
 * Singleton anonymous client — used for public reads and non-admin operations.
 */
export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Session-aware browser client — uses @supabase/ssr to read/write auth cookies.
 * Use this in admin components and any code that needs the authenticated session.
 *
 * Example:
 *   import { getSupabaseBrowserClient } from '@/lib/supabase'
 *   const supabase = getSupabaseBrowserClient()
 */
export function getSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl, supabaseKey);
}
