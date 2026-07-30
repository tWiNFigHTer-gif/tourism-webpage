import { NextRequest, NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase-server";

async function requireAdmin() {
  const supabase = await createClientServer(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ message: "Authentication required." }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(); const role = profile?.role || user.user_metadata?.role;
  if (!["panchayat_admin", "super_admin", "admin"].includes(role)) return { error: NextResponse.json({ message: "Administrator access required." }, { status: 403 }) };
  return { supabase };
}
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(); if ("error" in auth) return auth.error; const body = await request.json(); const { id } = await params;
  const payload: Record<string, unknown> = {}; for (const key of ["name", "description", "category", "lat", "lng", "region", "capacity_max", "status"]) if (key in body) payload[key] = body[key];
  if (payload.status) payload.is_active = payload.status === "active"; payload.updated_at = new Date().toISOString();
  const { data, error } = await auth.supabase.from("locations").update(payload).eq("id", id).select().single(); if (error) return NextResponse.json({ message: error.message }, { status: 500 }); return NextResponse.json(data);
}
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(); if ("error" in auth) return auth.error; const { id } = await params;
  const { error } = await auth.supabase.from("locations").delete().eq("id", id); if (error) return NextResponse.json({ message: error.message }, { status:500 }); return NextResponse.json({ deleted: true });
}
