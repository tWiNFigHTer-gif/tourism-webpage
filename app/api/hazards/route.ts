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

const VALID_CATEGORIES = new Set(["trash", "infrastructure", "safety", "trail"]);

function normalizeCategory(raw: string): string {
  const lowered = (raw || "").toLowerCase();
  if (lowered.includes("trash")) return "trash";
  if (lowered.includes("infra") || lowered.includes("tool")) return "infrastructure";
  if (lowered.includes("safe") || lowered.includes("alert")) return "safety";
  if (lowered.includes("trail") || lowered.includes("map")) return "trail";
  return lowered;
}

export async function POST(request: NextRequest) {
  let body: {
    location_id?: string;
    category?: string;
    description?: string;
    panchayat_id?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Bad Request", message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { location_id, category: rawCategory, description, panchayat_id } = body;

  if (!location_id || !rawCategory) {
    return NextResponse.json(
      {
        error: "Bad Request",
        message: "location_id and category are required.",
      },
      { status: 400 }
    );
  }

  const category = normalizeCategory(rawCategory);

  if (!VALID_CATEGORIES.has(category)) {
    return NextResponse.json(
      {
        error: "Bad Request",
        message: `Category must be one of: trash, infrastructure, safety, trail. Received: ${rawCategory}`,
      },
      { status: 400 }
    );
  }

  const db = serverSupabase();

  // Validate location_id exists in locations table
  const { data: location, error: locError } = await db
    .from("locations")
    .select("id, panchayat_id")
    .eq("id", location_id)
    .maybeSingle();

  const id = crypto.randomUUID();
  const reported_at = new Date().toISOString();
  const resolvedPanchayatId = panchayat_id || location?.panchayat_id || "CKP-2024";
  const reportDescription = description || "";

  const newReport = {
    id,
    location_id,
    category,
    description: reportDescription,
    reported_at,
    status: "open",
    panchayat_id: resolvedPanchayatId,
  };

  const { data: inserted, error: insertError } = await db
    .from("hazard_reports")
    .insert(newReport)
    .select("*")
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: "Internal Server Error", message: insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json(inserted ?? newReport, { status: 201 });
}
