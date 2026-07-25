import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Use a server-side Supabase client (service-role key when available, anon key as fallback)
function serverSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "";
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── Shared capacity helper ──────────────────────────────────────────────────
async function getCapacity(
  supabase: ReturnType<typeof serverSupabase>,
  locationId: string,
  timeSlot: string
) {
  // Count issued passes for this slot
  const { count, error: countError } = await supabase
    .from("passes")
    .select("*", { count: "exact", head: true })
    .eq("location_id", locationId)
    .eq("time_slot", timeSlot);

  if (countError) throw countError;

  // Fetch the location's capacity_per_slot
  const { data: location, error: locError } = await supabase
    .from("locations")
    .select("capacity_per_slot")
    .eq("id", locationId)
    .single();

  if (locError) throw locError;

  const issued_count = count ?? 0;
  const capacity_per_slot: number = location?.capacity_per_slot ?? 50;
  const is_full = issued_count >= capacity_per_slot;
  const slots_remaining = Math.max(0, capacity_per_slot - issued_count);

  return { issued_count, capacity_per_slot, is_full, slots_remaining };
}

// ── GET /api/passes?location_id=&time_slot= ────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const location_id = searchParams.get("location_id");
  const time_slot = searchParams.get("time_slot");

  if (!location_id || !time_slot) {
    return NextResponse.json(
      { error: "Bad Request", message: "location_id and time_slot are required." },
      { status: 400 }
    );
  }

  try {
    const db = serverSupabase();
    const capacity = await getCapacity(db, location_id, time_slot);
    return NextResponse.json(capacity, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal Server Error", message },
      { status: 500 }
    );
  }
}

// ── POST /api/passes ───────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  let body: { location_id?: string; time_slot?: string; panchayat_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Bad Request", message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { location_id, time_slot, panchayat_id } = body;

  if (!location_id || !time_slot || !panchayat_id) {
    return NextResponse.json(
      {
        error: "Bad Request",
        message: "location_id, time_slot, and panchayat_id are required.",
      },
      { status: 400 }
    );
  }

  const db = serverSupabase();

  // ── Race-condition guard: re-check capacity before inserting ────────────
  let capacity: Awaited<ReturnType<typeof getCapacity>>;
  try {
    capacity = await getCapacity(db, location_id, time_slot);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal Server Error", message },
      { status: 500 }
    );
  }

  if (capacity.is_full) {
    return NextResponse.json(
      {
        error: "Zone Full",
        message:
          "This time slot has reached its carrying capacity. Please select a different time.",
        slots_remaining: 0,
      },
      { status: 409 }
    );
  }

  // ── Insert the new pass ─────────────────────────────────────────────────
  const pass_token = crypto.randomUUID();
  const issued_at = new Date().toISOString();

  const { data: inserted, error: insertError } = await db
    .from("passes")
    .insert({
      location_id,
      time_slot,
      panchayat_id,
      pass_token,
      issued_at,
    })
    .select("id, pass_token, location_id, time_slot, issued_at")
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: "Internal Server Error", message: insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      pass_id: inserted.id,
      pass_token: inserted.pass_token,
      location_id: inserted.location_id,
      time_slot: inserted.time_slot,
      issued_at: inserted.issued_at,
      slots_remaining: capacity.slots_remaining - 1,
    },
    { status: 201 }
  );
}
