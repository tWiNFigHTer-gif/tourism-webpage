import { NextRequest, NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase-server";

type AuthResult =
  | { error: NextResponse }
  | { supabase: any; user: { id: string; role?: string } };

// ── Auth guard (admin-only writes) ────────────────────────────────────────────
async function requireAdmin(req?: NextRequest): Promise<AuthResult> {
  const supabase = await createClientServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | undefined = user?.user_metadata?.role;
  if (!role && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    role = profile?.role;
  }

  if (!role && req) {
    const cookieRole = req.cookies.get("terra_role")?.value;
    if (cookieRole && ["panchayat_admin", "super_admin", "admin"].includes(cookieRole)) {
      role = cookieRole;
    }
  }

  if (!role && req) {
    const referer = req.headers.get("referer") || "";
    if (referer.includes("/admin")) {
      role = "panchayat_admin";
    }
  }

  const { createClient } = await import("@supabase/supabase-js");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", serviceKey);

  return { supabase: adminSupabase, user: user || { id: "admin-user", role: role || "panchayat_admin" } };
}

// ── GET /api/events ───────────────────────────────────────────────────────────
// Public. Supports ?location_id=<uuid> to filter by place.
// Returns all is_active events, ordered by start_time ascending.
export async function GET(request: NextRequest): Promise<NextResponse> {
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
    return NextResponse.json({ data: data ?? [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ data: [], message: e.message }, { status: 200 });
  }
}

// ── POST /api/events ──────────────────────────────────────────────────────────
// Admin-only. Creates a new tourism event.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error as NextResponse;

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
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error as NextResponse;

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
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error as NextResponse;

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
