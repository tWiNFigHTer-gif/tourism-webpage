import { NextRequest, NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase-server";

const editable = ["name", "description", "category", "lat", "lng", "region", "capacity_max", "status"] as const;

async function requireAdmin() {
  const supabase = await createClientServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ message: "Authentication required." }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = profile?.role || user.user_metadata?.role;
  if (role !== "panchayat_admin" && role !== "super_admin" && role !== "admin") return { error: NextResponse.json({ message: "Administrator access required." }, { status: 403 }) };
  return { supabase, user };
}

export async function GET(request: NextRequest) {
  const supabase = await createClientServer();
  const includeHidden = request.nextUrl.searchParams.get("include_hidden") === "true";
  let query = supabase.from("locations").select("*").order("name");
  if (!includeHidden) query = query.eq("is_active", true).eq("status", "active");
  const { data, error } = await query;
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(); if ("error" in auth) return auth.error;
  const body = await request.json();
  if (!body.name || !Number.isFinite(Number(body.lat)) || !Number.isFinite(Number(body.lng))) return NextResponse.json({ message: "Name, latitude, and longitude are required." }, { status: 400 });
  const status = body.status === "hidden" ? "hidden" : "active";
  const payload = { name: body.name, description: body.description || null, category: body.category || "Ecotourism", lat: Number(body.lat), lng: Number(body.lng), region: body.region || "Kerala", capacity_max: Number(body.capacity_max) || 50, status, is_active: status === "active", updated_at: new Date().toISOString() };
  const { data, error } = await auth.supabase.from("locations").insert(payload).select().single();
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
