import { supabase } from "@/lib/supabase";
import type { HazardReport, RedZone, UserRole } from "@/lib/types";

/**
 * Typed database query helpers for Terra-Pulse.
 * All UI components & hooks import from here instead of calling Supabase directly.
 */

export async function getAttractions() {
  const { data, error } = await supabase.from("locations").select("*").eq("is_active", true).eq("status", "active");
  if (error) throw error;
  return data ?? [];
}

export async function getLocations() {
  return await getAttractions();
}

export async function getDangerZones(): Promise<any[]> {
  const rz = await getRedZones();
  return rz.map((z) => ({
    id: z.id,
    title: z.title || z.name,
    name: z.name || z.title,
    risk_level: z.risk_level,
    description: z.description,
    coordinates: z.coordinates,
    geojson_polygon: z.geojson_polygon,
    is_active: z.is_active,
  }));
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
        title: "Canoly Canal High Water Hazard",
        name: "Canoly Canal High Water Hazard",
        risk_level: "HIGH",
        description: "Monsoonal surge & unstable canal banks near Sarovaram Eco Walkway",
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
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("storage_sync", { detail: { key: "red_zones" } }));
    }
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
      window.dispatchEvent(new CustomEvent("storage_sync", { detail: { key: "red_zones" } }));
    }
    return newZone;
  }
}

export async function deleteRedZone(id: string) {
  try {
    const { error } = await supabase
      .from("red_zones")
      .delete()
      .eq("id", id);
    if (error) throw error;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("storage_sync", { detail: { key: "red_zones" } }));
    }
  } catch (e) {
    const existing = await getRedZones();
    const updated = existing.filter((z) => z.id !== id);
    if (typeof window !== "undefined") {
      localStorage.setItem("terra_red_zones", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("storage_sync", { detail: { key: "red_zones" } }));
    }
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
      window.dispatchEvent(new CustomEvent("storage_sync", { detail: { key: "civic_reports" } }));
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
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("storage_sync", { detail: { key: "civic_reports" } }));
    }
  } catch (e) {
    const reports = await getCivicReports();
    const updated = reports.map((r) => (r.id === id ? { ...r, status } : r));
    if (typeof window !== "undefined") {
      localStorage.setItem("terra_civic_reports", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("storage_sync", { detail: { key: "civic_reports" } }));
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

export async function getPassesCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("passes")
      .select("*", { count: "exact", head: true });
    if (!error && count !== null && count > 0) return count;
  } catch {}
  const raw = typeof window !== "undefined" ? localStorage.getItem("terra_my_passes") : null;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.length;
    } catch {}
  }
  return 12;
}

export interface ActivityItem {
  id: string;
  type: "pass" | "red_zone" | "report" | "check_in";
  title: string;
  description: string;
  timestamp: string;
  status?: string;
  icon: string;
  color: string;
}

export async function getLocationsCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("attractions")
      .select("*", { count: "exact", head: true });
    if (!error && count !== null && count > 0) return count;
  } catch {}
  return 11; // fallback count of attractions
}

export async function getRecentActivity(): Promise<ActivityItem[]> {
  const activities: ActivityItem[] = [];

  // 1. Fetch Red Zones
  try {
    const zones = await getRedZones();
    zones.forEach((z) => {
      activities.push({
        id: `act-rz-${z.id}`,
        type: "red_zone",
        title: `Red Zone Created`,
        description: `Panchayat Admin created a ${z.risk_level} alert at ${z.name || z.title}`,
        timestamp: z.created_at || new Date().toISOString(),
        icon: "polyline",
        color: z.risk_level === "CRITICAL" ? "#EF4444" : "#F59E0B",
      });
    });
  } catch {}

  // 2. Fetch Civic Reports
  try {
    const reports = await getCivicReports();
    reports.forEach((r) => {
      activities.push({
        id: `act-rep-${r.id}`,
        type: "report",
        title: `Civic Report Logged`,
        description: `Hazard "${r.category}" reported at ${r.location_name} by ${r.reporter_name || "Tourist"}`,
        timestamp: r.created_at || r.reported_at || new Date().toISOString(),
        status: r.status,
        icon: "warning",
        color: r.status === "pending" ? "#EF4444" : r.status === "in_progress" ? "#F59E0B" : "#10B981",
      });
    });
  } catch {}

  // 3. Fetch Passes / Check-Ins
  try {
    const { data: dbPasses } = await supabase
      .from("passes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
      
    if (dbPasses && dbPasses.length > 0) {
      dbPasses.forEach((p) => {
        const isScanned = p.status === "scanned" || p.status === "scanned_in" || p.status === "checked_in" || p.status === "CHECKED_IN" || p.status === "VISITED";
        activities.push({
          id: `act-pass-${p.id}`,
          type: isScanned ? "check_in" : "pass",
          title: isScanned ? `Tourist Checked In` : `Pass Booked`,
          description: isScanned 
            ? `Tourist ${p.holder_name || "Explorer"} checked in at ${p.location_name}`
            : `Tourist ${p.holder_name || "Explorer"} booked entry to ${p.location_name}`,
          timestamp: p.created_at || new Date().toISOString(),
          icon: isScanned ? "login" : "qr_code",
          color: "#4EDEA3",
        });
      });
    } else {
      const raw = typeof window !== "undefined" ? localStorage.getItem("terra_my_passes") : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((p: any) => {
            const isScanned = p.status === "VISITED" || p.status === "CHECKED_IN" || p.status === "scanned" || p.status === "checked_in";
            activities.push({
              id: `act-pass-${p.id}`,
              type: isScanned ? "check_in" : "pass",
              title: isScanned ? `Tourist Checked In` : `Pass Booked`,
              description: isScanned 
                ? `Tourist ${p.visitor_name || p.tourist_name || "Explorer"} checked in at ${p.location_name}`
                : `Tourist ${p.visitor_name || p.tourist_name || "Explorer"} booked slot ${p.slot_time || p.time_slot || "entry"} at ${p.location_name}`,
              timestamp: p.booked_at || p.issued_at || p.created_at || new Date().toISOString(),
              icon: isScanned ? "login" : "qr_code",
              color: "#4EDEA3",
            });
          });
        }
      }
    }
  } catch {}

  // Sort by timestamp desc
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return activities.slice(0, 10);
}

export async function getDashboardData() {
  const [reports, redZones, passesCount, locationsCount, recentActivity] = await Promise.all([
    getCivicReports(),
    getRedZones(),
    getPassesCount(),
    getLocationsCount(),
    getRecentActivity(),
  ]);
  
  const pendingCount = reports.filter((r) => r.status === "pending").length;
  const inProgressCount = reports.filter((r) => r.status === "in_progress").length;
  const resolvedCount = reports.filter((r) => r.status === "resolved").length;

  return {
    totalPasses: passesCount,
    activeZones: redZones.length,
    pendingReports: pendingCount,
    inProgressReports: inProgressCount,
    resolvedReports: resolvedCount,
    totalLocations: locationsCount,
    reports,
    redZones,
    recentActivity,
  };
}


export async function getLiveNotifications(): Promise<any[]> {
  try {
    const redZones = await getRedZones();
    const hazardNotifs = redZones.map((rz, i) => ({
      id: `notif-rz-${rz.id || i}`,
      title: `⚠️ ${rz.name || rz.title}`,
      message: rz.description || "Active hazard advisory issued by Panchayat Official.",
      time: "Just now",
      type: "hazard",
      tagText: rz.risk_level === "CRITICAL" ? "CRITICAL HAZARD" : "SAFETY ADVISORY",
      locationId: rz.name?.toLowerCase().includes("canoly") ? "canoly-canal" : "kadalundi-birds",
      read: false,
    }));
    return hazardNotifs;
  } catch {
    return [];
  }
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
