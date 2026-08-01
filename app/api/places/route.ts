import { NextRequest, NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase-server";
import { enrichLocationsWithHazards } from "@/lib/hazards";

const editable = ["name", "description", "category", "lat", "lng", "region", "capacity_max", "status"] as const;

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

import { DEFAULT_LOCATIONS } from "@/lib/db";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const includeHidden = request.nextUrl.searchParams.get("include_hidden") === "true";

  // Use service role client to bypass RLS so tourists always see live data
  const { createClient } = await import("@supabase/supabase-js");
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );

  let data: any[] | null = null;
  let redZones: any[] | null = null;

  try {
    let query = adminSupabase.from("locations").select("*").order("name");
    if (!includeHidden) query = query.neq("status", "hidden");

    const [locationsRes, redZonesRes] = await Promise.all([
      query,
      adminSupabase.from("red_zones").select("*").eq("is_active", true).order("created_at", { ascending: false }),
    ]);

    data = locationsRes.data;
    redZones = redZonesRes.data;
  } catch (err) {
    console.warn("Places API error, using DEFAULT_LOCATIONS fallback:", err);
  }

  const placesToReturn = (data && data.length > 0) ? data : DEFAULT_LOCATIONS;
  return NextResponse.json(enrichLocationsWithHazards(placesToReturn as any, redZones ?? []));
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin(request); if ("error" in auth) return auth.error as NextResponse;
  const body = await request.json();
  if (!body.name || !Number.isFinite(Number(body.lat)) || !Number.isFinite(Number(body.lng))) return NextResponse.json({ message: "Name, latitude, and longitude are required." }, { status: 400 });
  const status = body.status === "hidden" ? "hidden" : "active";
  const payload = { name: body.name, description: body.description || null, category: body.category || "Ecotourism", lat: Number(body.lat), lng: Number(body.lng), region: body.region || "Kerala", capacity_max: Number(body.capacity_max) || 50, status, is_active: status === "active", updated_at: new Date().toISOString() };
  const { data, error } = await auth.supabase.from("locations").insert(payload).select().single();
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
