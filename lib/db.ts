import { supabase } from "@/lib/supabase";
import type { HazardReport, RedZone, UserRole } from "@/lib/types";

/**
 * Typed database query helpers for Terra-Pulse.
 * All UI components & hooks import from here instead of calling Supabase directly.
 */

export async function getLocations() {
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("is_active", true);
  if (error) throw error;
  return data;
}

export async function getDangerZones() {
  const { data, error } = await supabase
    .from("danger_zones")
    .select("*")
    .eq("is_active", true);
  if (error) throw error;
  return data;
}

export async function getRedZones(): Promise<RedZone[]> {
  try {
    const { data, error } = await supabase
      .from("red_zones")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  } catch (e) {
    // Return local mock fallback if table doesn't exist yet
    const raw = typeof window !== "undefined" ? localStorage.getItem("terra_red_zones") : null;
    if (raw) {
      try { return JSON.parse(raw); } catch {}
    }
    return [
      {
        id: "rz-demo-1",
        name: "Canoly Canal High Water Hazard",
        risk_level: "HIGH",
        description: "Unstable banks due to monsoon runoff",
        coordinates: [
          [75.770, 11.250],
          [75.775, 11.250],
          [75.775, 11.255],
          [75.770, 11.255],
          [75.770, 11.250],
        ],
        is_active: true,
        created_at: new Date().toISOString(),
      },
    ];
  }
}

export async function insertRedZone(payload: Omit<RedZone, "id" | "created_at">) {
  try {
    const { data, error } = await supabase
      .from("red_zones")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    // Local storage fallback for offline/demo
    const existing = await getRedZones();
    const newZone: RedZone = {
      ...payload,
      id: `rz-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    const updated = [newZone, ...existing];
    if (typeof window !== "undefined") {
      localStorage.setItem("terra_red_zones", JSON.stringify(updated));
    }
    return newZone;
  }
}

export async function getPassCount(locationId: string, timeSlot: string) {
  const { count, error } = await supabase
    .from("passes")
    .select("*", { count: "exact", head: true })
    .eq("location_id", locationId)
    .eq("time_slot", timeSlot);
  if (error) throw error;
  return count ?? 0;
}

export async function insertPass(payload: {
  location_id: string;
  time_slot: string;
  panchayat_id: string;
  pass_token: string;
}) {
  const { data, error } = await supabase
    .from("passes")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function insertCivicReport(payload: {
  reporter_name?: string;
  location_name: string;
  category: string;
  description: string;
  lat: number;
  lng: number;
  photo_url?: string;
  panchayat_id?: string;
}) {
  try {
    const { data, error } = await supabase
      .from("civic_reports")
      .insert({ ...payload, status: "pending" })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    // Fallback to local storage
    const raw = typeof window !== "undefined" ? localStorage.getItem("terra_civic_reports") : null;
    const current: HazardReport[] = raw ? JSON.parse(raw) : [];
    const newReport: HazardReport = {
      id: `rep-${Date.now()}`,
      location_name: payload.location_name,
      category: payload.category,
      description: payload.description,
      reported_at: new Date().toISOString(),
      reporter_name: payload.reporter_name || "Tourist Explorer",
      lat: payload.lat,
      lng: payload.lng,
      status: "pending",
      photo_url: payload.photo_url,
      panchayat_id: payload.panchayat_id || "CKP-2024",
    };
    const updated = [newReport, ...current];
    if (typeof window !== "undefined") {
      localStorage.setItem("terra_civic_reports", JSON.stringify(updated));
    }
    return newReport;
  }
}

export async function getCivicReports(): Promise<HazardReport[]> {
  try {
    const { data, error } = await supabase
      .from("civic_reports")
      .select("*")
      .order("created_at", { ascending: false });
    if (error || !data) throw error;
    return data as HazardReport[];
  } catch (e) {
    const raw = typeof window !== "undefined" ? localStorage.getItem("terra_civic_reports") : null;
    if (raw) {
      try { return JSON.parse(raw); } catch {}
    }
    return [
      {
        id: "cr-1",
        location_name: "Canoly Canal Trail",
        category: "Flooding / Erosion",
        description: "Trail boardwalk partially submerged due to heavy tide.",
        reported_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        reporter_name: "Ananya R.",
        lat: 11.252,
        lng: 75.772,
        status: "pending",
        panchayat_id: "CKP-2024",
      },
      {
        id: "cr-2",
        location_name: "Kadalundi Bird Sanctuary",
        category: "Overcrowding",
        description: "Unmanaged parking queue overflowing onto narrow causeway.",
        reported_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        reporter_name: "Rahul M.",
        lat: 11.127,
        lng: 75.828,
        status: "in_progress",
        panchayat_id: "CKP-2024",
      },
      {
        id: "cr-3",
        location_name: "Janakikattu Eco Tourism",
        category: "Fallen Tree / Debris",
        description: "Large bamboo cluster blocking western river trail path.",
        reported_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
        reporter_name: "Siddharth K.",
        lat: 11.605,
        lng: 75.810,
        status: "resolved",
        panchayat_id: "CKP-2024",
      },
    ];
  }
}

export async function updateCivicReportStatus(id: string, status: "pending" | "in_progress" | "resolved") {
  try {
    const { error } = await supabase
      .from("civic_reports")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  } catch (e) {
    const reports = await getCivicReports();
    const updated = reports.map((r) => (r.id === id ? { ...r, status } : r));
    if (typeof window !== "undefined") {
      localStorage.setItem("terra_civic_reports", JSON.stringify(updated));
    }
  }
}

export async function insertExperience(payload: {
  location_id: string;
  pass_token: string;
  caption: string;
  mood_tag: string;
  photo_url: string | null;
  panchayat_id: string;
}) {
  const { data, error } = await supabase
    .from("experiences")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getExperiences(locationId: string) {
  const { data, error } = await supabase
    .from("experiences")
    .select("*")
    .eq("location_id", locationId)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  return data;
}

export async function getDashboardData() {
  const [reports, redZones] = await Promise.all([
    getCivicReports(),
    getRedZones(),
  ]);
  
  const pendingCount = reports.filter((r) => r.status === "pending").length;
  const inProgressCount = reports.filter((r) => r.status === "in_progress").length;
  const resolvedCount = reports.filter((r) => r.status === "resolved").length;

  return {
    totalPasses: 142,
    activeZones: redZones.length,
    pendingReports: pendingCount,
    inProgressReports: inProgressCount,
    resolvedReports: resolvedCount,
    reports,
    redZones,
  };
}

export async function resolveHazard(id: string) {
  await updateCivicReportStatus(id, "resolved");
}

export async function getUserHazardReports(userId?: string) {
  return await getCivicReports();
}

export async function upsertLocationRating(locationId: string, rating: number, userId?: string) {
  try {
    const { data, error } = await supabase
      .from("location_ratings")
      .upsert({ location_id: locationId, user_id: userId, rating, updated_at: new Date().toISOString() }, { onConflict: "location_id,user_id" })
      .select()
      .single();
    if (error) {
      console.warn("Supabase rating save warning:", error.message);
    }
    return data;
  } catch (e) {
    console.warn("Rating saved to local fallback");
    return null;
  }
}
