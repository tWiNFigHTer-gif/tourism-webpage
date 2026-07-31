import { NextRequest, NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase-server";
import { buildHazardNotifications, enrichLocationsWithHazards } from "@/lib/hazards";

async function requireAdmin() {
  const supabase = await createClientServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ message: "Authentication required." }, { status: 401 }) };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = profile?.role || user.user_metadata?.role;

  if (!["panchayat_admin", "super_admin", "admin"].includes(role)) {
    return { error: NextResponse.json({ message: "Administrator access required." }, { status: 403 }) };
  }

  return { supabase, user };
}

async function buildSyncPayload(supabase: Awaited<ReturnType<typeof createClientServer>>) {
  const [{ data: redZones }, { data: places }] = await Promise.all([
    supabase.from("red_zones").select("*").order("created_at", { ascending: false }),
    supabase.from("locations").select("*").order("name"),
  ]);

  const safeRedZones = redZones ?? [];
  const safePlaces = places ?? [];

  return {
    redZones: safeRedZones,
    places: enrichLocationsWithHazards(safePlaces, safeRedZones),
    notifications: buildHazardNotifications(safeRedZones, safePlaces),
  };
}

export async function GET() {
  try {
    // Use service role to bypass RLS for public tourist reads
    const { createClient } = await import("@supabase/supabase-js");
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
    );
    const { data, error } = await adminSupabase.from("red_zones").select("*").order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data ?? [], { status: 200 });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  const name = body.name || body.title;
  if (!name) {
    return NextResponse.json({ message: "Zone title or name is required." }, { status: 400 });
  }

  const payload = {
    id: body.id || crypto.randomUUID(),
    title: body.title || name,
    name,
    risk_level: body.risk_level || "HIGH",
    description: body.description || "Administrative safety polygon.",
    coordinates: body.coordinates || [],
    geojson_polygon: body.geojson_polygon || null,
    is_active: body.is_active !== false,
    created_by: auth.user.id,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await auth.supabase.from("red_zones").insert(payload).select().single();
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  const sync = await buildSyncPayload(auth.supabase);
  return NextResponse.json({ data, sync }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ message: "Red zone id is required." }, { status: 400 });
  }

  const payload: Record<string, unknown> = {};
  for (const key of ["title", "name", "risk_level", "description", "coordinates", "geojson_polygon", "is_active"]) {
    if (key in body) payload[key] = body[key];
  }

  const { data, error } = await auth.supabase
    .from("red_zones")
    .update(payload)
    .eq("id", body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  const sync = await buildSyncPayload(auth.supabase);
  return NextResponse.json({ data, sync }, { status: 200 });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");

  let bodyId: string | undefined;
  if (!id) {
    try {
      const body = await request.json();
      bodyId = body?.id;
    } catch {
      bodyId = undefined;
    }
  }

  const resolvedId = id || bodyId;
  if (!resolvedId) {
    return NextResponse.json({ message: "Red zone id is required." }, { status: 400 });
  }

  const { error } = await auth.supabase.from("red_zones").delete().eq("id", resolvedId);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  const sync = await buildSyncPayload(auth.supabase);
  return NextResponse.json({ deleted_id: resolvedId, sync }, { status: 200 });
}
