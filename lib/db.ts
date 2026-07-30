import { supabase } from "@/lib/supabase";
import type { HazardReport, RedZone, UserRole } from "@/lib/types";

/**
 * Typed database query helpers for Terra-Pulse.
 * All UI components & hooks import from here instead of calling Supabase directly.
 */

export async function getAttractions() {
  try {
    const { data, error } = await supabase
      .from("attractions")
      .select("*")
      .eq("is_active", true);
    if (!error && data && data.length > 0) return data;
    throw error || new Error("No data");
  } catch (e) {
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("is_active", true);
      if (!error && data && data.length > 0) return data;
    } catch {}

    // Fallback Kerala Attractions
    return [
      { id: "att-1", name: "Canoly Canal & Sarovaram Eco Park", category: "eco", lat: 11.2720, lng: 75.7950, capacity_per_slot: 50, district: "Kozhikode", is_active: true, description: "Lush mangrove ecosystem and canal walkway in Kozhikode city." },
      { id: "att-2", name: "Mavoor Wetlands & Bird Sanctuary", category: "eco", lat: 11.2619, lng: 75.9412, capacity_per_slot: 50, district: "Kozhikode", is_active: true, description: "Famous eco-wetland habitat home to migratory waterbirds." },
      { id: "att-3", name: "Kadalundi Estuary & Mangrove Trail", category: "wildlife", lat: 11.1278, lng: 75.8286, capacity_per_slot: 50, district: "Kozhikode", is_active: true, description: "Serene estuarine sanctuary where Kadalundi River meets Arabian sea." },
      { id: "att-4", name: "Kakkayam Dam & Eco Valley", category: "waterfalls", lat: 11.5432, lng: 75.9211, capacity_per_slot: 50, district: "Kozhikode", is_active: true, description: "Picturesque dam site and waterfall trek in Kozhikode district." },
      { id: "att-5", name: "Thusharagiri Waterfalls & Trek", category: "waterfalls", lat: 11.4700, lng: 76.0500, capacity_per_slot: 50, district: "Kozhikode", is_active: true, description: "Cascading jungle streams forming three waterfalls." },
      { id: "att-6", name: "Janakikkadu Eco Forest", category: "forests", lat: 11.5800, lng: 75.7500, capacity_per_slot: 50, district: "Kozhikode", is_active: true, description: "Protected evergreen forest ecosystem rich in medicinal flora." },
      { id: "att-7", name: "Chembra Peak & Heart Lake", category: "viewpoints", lat: 11.5467, lng: 76.0890, capacity_per_slot: 50, district: "Wayanad", is_active: true, description: "Highest peak in Wayanad with a natural heart-shaped lake." },
      { id: "att-8", name: "Banasura Sagar Eco Dam", category: "viewpoints", lat: 11.6711, lng: 75.9575, capacity_per_slot: 60, district: "Wayanad", is_active: true, description: "Largest earth dam in India offering boat rides." },
      { id: "att-9", name: "Kuruva Dweep Mangrove Island", category: "eco", lat: 11.8219, lng: 76.0911, capacity_per_slot: 45, district: "Wayanad", is_active: true, description: "Protected river delta island on the Kabini river." },
      { id: "att-10", name: "Silent Valley National Park", category: "forests", lat: 11.0758, lng: 76.4703, capacity_per_slot: 50, district: "Palakkad", is_active: true, description: "Pristine high-altitude shola evergreen rainforest." },
      { id: "att-11", name: "Athirappilly Waterfalls", category: "waterfalls", lat: 10.2850, lng: 76.5698, capacity_per_slot: 75, district: "Thrissur", is_active: true, description: "Niagara of India cascading 80 feet down Sholayar forest range." },
    ];
  }
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
