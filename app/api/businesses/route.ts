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

// ── GET /api/businesses ───────────────────────────────────────────────────────
// Supports ?location_id=<uuid>, ?category=<cat>, and ?admin=true.
// By default (for tourists), only returns `status = 'verified'`.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClientServer();
    const locationId = request.nextUrl.searchParams.get("location_id");
    const category = request.nextUrl.searchParams.get("category");
    const isAdmin = request.nextUrl.searchParams.get("admin") === "true";

    let query = supabase
      .from("businesses")
      .select("*")
      .order("created_at", { ascending: false });

    if (!isAdmin) {
      query = query.eq("status", "verified");
    }

    if (locationId) {
      query = query.eq("location_id", locationId);
    }

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data ?? [], { status: 200 });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

// ── POST /api/businesses ──────────────────────────────────────────────────────
// Admin-only. Creates a new business / guide / service entry.
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.name) {
    return NextResponse.json({ message: "Business / Guide name is required." }, { status: 400 });
  }

  const payload = {
    id: body.id || crypto.randomUUID(),
    name: body.name,
    category: body.category || "business",
    title: body.title || null,
    description: body.description || null,
    contact: body.contact || null,
    location_id: body.location_id || null,
    location_name: body.location_name || null,
    status: body.status || "verified",
    badge: body.badge || null,
    icon: body.icon || (body.category === "guide" ? "person_pin" : "store"),
    created_by: auth.user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await auth.supabase
    .from("businesses")
    .insert(payload)
    .select()
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}

// ── PATCH /api/businesses ─────────────────────────────────────────────────────
// Admin-only. Updates listing or toggles `status` ("verified" | "pending" | "hidden").
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
    return NextResponse.json({ message: "Business id is required." }, { status: 400 });
  }

  const allowed = [
    "name",
    "category",
    "title",
    "description",
    "contact",
    "location_id",
    "location_name",
    "status",
    "badge",
    "icon",
  ];
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) payload[key] = body[key];
  }

  const { data, error } = await auth.supabase
    .from("businesses")
    .update(payload)
    .eq("id", body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 200 });
}

// ── DELETE /api/businesses ────────────────────────────────────────────────────
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
    return NextResponse.json({ message: "Business id is required." }, { status: 400 });
  }

  const { error } = await auth.supabase.from("businesses").delete().eq("id", resolvedId);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  return NextResponse.json({ deleted_id: resolvedId }, { status: 200 });
}
