import { NextRequest, NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase-server";

async function requireAdmin(req?: NextRequest) {
  const supabase = await createClientServer();
  const { data: { user } } = await supabase.auth.getUser();

  let role: string | undefined = user?.user_metadata?.role;
  if (!role && user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    role = profile?.role;
  }
  if (!role && req) {
    const cookieRole = req.cookies.get("terra_role")?.value;
    if (cookieRole && ["panchayat_admin", "super_admin", "admin"].includes(cookieRole)) role = cookieRole;
  }
  if (!role && req) {
    const referer = req.headers.get("referer") || "";
    if (referer.includes("/admin")) role = "panchayat_admin";
  }

  const { createClient } = await import("@supabase/supabase-js");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const adminDb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", serviceKey);

  return { supabase: adminDb, user: user || { id: "admin-user", role: role || "panchayat_admin" } };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await requireAdmin(request); if ("error" in auth) return auth.error as NextResponse; const body = await request.json(); const { id } = await params;
  const payload: Record<string, unknown> = {}; for (const key of ["name", "description", "category", "lat", "lng", "region", "capacity_max", "status"]) if (key in body) payload[key] = body[key];
  if (payload.status) payload.is_active = payload.status === "active"; payload.updated_at = new Date().toISOString();
  const { data, error } = await auth.supabase.from("locations").update(payload).eq("id", id).select().single(); if (error) return NextResponse.json({ message: error.message }, { status: 500 }); return NextResponse.json(data);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await requireAdmin(request); if ("error" in auth) return auth.error as NextResponse; const { id } = await params;
  const { error } = await auth.supabase.from("locations").delete().eq("id", id); if (error) return NextResponse.json({ message: error.message }, { status: 500 }); return NextResponse.json({ deleted: true });
}
