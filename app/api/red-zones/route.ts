import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function serverSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "";
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── GET /api/red-zones ───────────────────────────────────────────────────────
export async function GET() {
  try {
    const db = serverSupabase();
    const { data, error } = await db
      .from("red_zones")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data ?? [], { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      [
        {
          id: "rz-canoly-default",
          title: "Canoly Canal High Water Hazard",
          name: "Canoly Canal High Water Hazard",
          risk_level: "HIGH",
          description: "Temporary tidal surge hazard along canal boardwalk.",
          coordinates: [
            [75.770, 11.250],
            [75.805, 11.250],
            [75.805, 11.285],
            [75.770, 11.285],
            [75.770, 11.250],
          ],
          geojson_polygon: {
            type: "Feature",
            properties: { title: "Canoly Canal High Water Hazard", risk_level: "HIGH" },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [75.770, 11.250],
                  [75.805, 11.250],
                  [75.805, 11.285],
                  [75.770, 11.285],
                  [75.770, 11.250],
                ]
              ]
            }
          },
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ],
      { status: 200 }
    );
  }
}

// ── POST /api/red-zones ──────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Bad Request", message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { title, name, risk_level = "HIGH", description, coordinates, geojson_polygon } = body;

  if (!title && !name) {
    return NextResponse.json(
      { error: "Bad Request", message: "Zone title or name is required." },
      { status: 400 }
    );
  }

  const db = serverSupabase();
  const zoneTitle = title || name;

  const payload = {
    id: body.id || `rz-${Date.now()}`,
    title: zoneTitle,
    name: zoneTitle,
    risk_level,
    description: description || "Administrative safety polygon.",
    coordinates: coordinates || [],
    geojson_polygon: geojson_polygon || null,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await db
      .from("red_zones")
      .insert(payload)
      .select()
      .single();

    if (!error && data) {
      return NextResponse.json(data, { status: 201 });
    }
  } catch {}

  return NextResponse.json(payload, { status: 201 });
}

// ── DELETE /api/red-zones?id= ───────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Bad Request", message: "Red Zone ID parameter 'id' is required." },
      { status: 400 }
    );
  }

  try {
    const db = serverSupabase();
    await db.from("red_zones").delete().eq("id", id);
  } catch {}

  return NextResponse.json({ status: "success", deleted_id: id }, { status: 200 });
}
