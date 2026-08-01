import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const adminAccounts = [
    { email: "admin@chakkittapara.in", password: "Admin@2024", role: "panchayat_admin", name: "Chakkittapara Admin" },
    { email: "admin.panchayat@terrapulse.kerala.gov.in", password: "PanchayatAdmin2026!", role: "panchayat_admin", name: "Panchayat Official" },
  ];

  const results: any[] = [];

  for (const account of adminAccounts) {
    try {
      const { data, error } = await adminSupabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: { role: account.role, full_name: account.name },
      });

      if (data?.user) {
        // Upsert into profiles table
        await adminSupabase.from("profiles").upsert({
          id: data.user.id,
          username: account.name,
          role: account.role,
          panchayat_name: "Chakkittapara GP",
          updated_at: new Date().toISOString(),
        });

        results.push({ email: account.email, status: "created", id: data.user.id });
      } else if (error) {
        results.push({ email: account.email, status: "error", message: error.message });
      }
    } catch (err: any) {
      results.push({ email: account.email, status: "exception", message: err.message });
    }
  }

  return NextResponse.json({ success: true, accounts: results });
}
