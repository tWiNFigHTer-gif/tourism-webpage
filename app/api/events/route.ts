import { NextRequest, NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase-server";

// ── Auth guard (admin-only writes) ────────────────────────────────────────────
async function requireAdmin() {
  const supabase = await createClientServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ message: "Authentication required." }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = profile?.role || user.user_metadata?.role;

  if (!["panchayat_admin", "super_admin", "admin"].includes(role)) {
    return {
      error: NextResponse.json({ message: "Administrator access required." }, { status: 403 }),
    };
  }

  return { supabase, user };
}

// ── GET /api/events ───────────────────────────────────────────────────────────
// Public. Supports ?location_id=<uuid> to filter by place.
// Returns all is_active events, ordered by start_time ascending.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClientServer();
    const locationId = request.nextUrl.searchParams.get("location_id");

    let query = supabase
      .from("events")
      .select("*")
      .eq("is_active", true)
      .order("start_time", { ascending: true });

    if (locationId) {
      query = query.eq("location_id", locationId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data ?? [], { status: 200 });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

// ── POST /api/events ──────────────────────────────────────────────────────────
// Admin-only. Creates a new tourism event.
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.title) {
    return NextResponse.json({ message: "Event title is required." }, { status: 400 });
  }
  if (!body.start_time) {
    return NextResponse.json({ message: "Event start_time is required." }, { status: 400 });
  }

  const payload = {
    id: body.id || crypto.randomUUID(),
    title: body.title,
    description: body.description || null,
    location_id: body.location_id || null,
    location_name: body.location_name || null,
    start_time: body.start_time,
    end_time: body.end_time || null,
    image_url: body.image_url || null,
    is_active: body.is_active !== false,
    created_by: auth.user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await auth.supabase
    .from("events")
    .insert(payload)
    .select()
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}

// ── PATCH /api/events ─────────────────────────────────────────────────────────
// Admin-only. Updates an existing event by `id` in the body.
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
    return NextResponse.json({ message: "Event id is required." }, { status: 400 });
  }

  const allowed = [
    "title",
    "description",
    "location_id",
    "location_name",
    "start_time",
    "end_time",
    "image_url",
    "is_active",
  ];
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) payload[key] = body[key];
  }

  const { data, error } = await auth.supabase
    .from("events")
    .update(payload)
    .eq("id", body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 200 });
}

// ── DELETE /api/events ────────────────────────────────────────────────────────
// Admin-only. Accepts ?id= query param or { id } JSON body.
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const qsId = request.nextUrl.searchParams.get("id");
  let bodyId: string | undefined;
  if (!qsId) {
    try {
      const b = await request.json();
      bodyId = b?.id;
    } catch {
      bodyId = undefined;
    }
  }

  const resolvedId = qsId || bodyId;
  if (!resolvedId) {
    return NextResponse.json({ message: "Event id is required." }, { status: 400 });
  }

  const { error } = await auth.supabase.from("events").delete().eq("id", resolvedId);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  return NextResponse.json({ deleted_id: resolvedId }, { status: 200 });
}
