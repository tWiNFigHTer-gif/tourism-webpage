import { supabase } from "@/lib/supabase";
import type { HazardReport, RedZone, UserRole, TourismEvent, LocalBusiness } from "@/lib/types";
import { buildHazardNotifications, enrichLocationsWithHazards } from "@/lib/hazards";

/**
 * Typed database query helpers for Terra-Pulse.
 * All UI components & hooks import from here instead of calling Supabase directly.
 */

export const DEFAULT_LOCATIONS = [
  {
    id: "canoly-canal",
    name: "Canoly Canal & Sarovaram Eco Park (Eco Park & Canal Walkway)",
    description: "Lush mangrove ecosystem and canal walkway right in Kozhikode city featuring wooden boardwalks & butterfly park.",
    category: "eco",
    lat: 11.2720,
    lng: 75.7950,
    capacity_per_slot: 50,
    district: "Kozhikode",
    region: "Kozhikode City",
    panchayat_id: "CKP-2026",
    is_active: true,
    status: "active",
    image_url: "https://upload.wikimedia.org/wikipedia/commons/3/30/Kerala_backwaters.jpg",
  },
  {
    id: "kadalundi-birds",
    name: "Kadalundi Bird Sanctuary & Mangrove Trail (Estuary & Wildlife Reserve)",
    description: "Serene estuarine sanctuary where Kadalundi River meets Arabian sea ideal for birdwatching and kayaking.",
    category: "wildlife",
    lat: 11.1278,
    lng: 75.8286,
    capacity_per_slot: 50,
    district: "Kozhikode",
    region: "Kadalundi",
    panchayat_id: "KDL-2026",
    is_active: true,
    status: "active",
    image_url: "https://upload.wikimedia.org/wikipedia/commons/3/30/Kerala_backwaters.jpg",
  },
  {
    id: "janakikattu-eco",
    name: "Janakikattu Eco Tourism & River Path (River Canopy & Forest Trail)",
    description: "Protected evergreen forest ecosystem rich in medicinal flora along the Kuttiyadi riverbank.",
    category: "forests",
    lat: 11.6215,
    lng: 75.7892,
    capacity_per_slot: 30,
    district: "Kozhikode",
    region: "Perambra",
    panchayat_id: "PRM-2026",
    is_active: true,
    status: "active",
    image_url: "https://upload.wikimedia.org/wikipedia/commons/6/67/Muthanga_Wildlife_Sanctuary.jpg",
  },
  {
    id: "kakkayam-dam",
    name: "Kakkayam Dam & Elephant Corridor (Dam Reserve & Trekking Peak)",
    description: "Picturesque dam site and waterfall trek in Kozhikode district surrounded by dense Malabar forests.",
    category: "eco",
    lat: 11.5542,
    lng: 75.9211,
    capacity_per_slot: 45,
    district: "Kozhikode",
    region: "Koorachundu",
    panchayat_id: "KRC-2027",
    is_active: true,
    status: "active",
    image_url: "https://upload.wikimedia.org/wikipedia/commons/3/30/Kerala_backwaters.jpg",
  },
  {
    id: "vellar-craft",
    name: "Vellar Craft Village & Cultural Park (Artisan Hub & Cultural Plaza)",
    description: "Dedicated artisan village in Kovalam showcasing traditional Kerala crafts, handlooms, and a Kalaripayattu academy.",
    category: "eco",
    lat: 8.3848,
    lng: 76.9859,
    capacity_per_slot: 100,
    district: "Thiruvananthapuram",
    region: "Kovalam",
    panchayat_id: "KVL-2026",
    is_active: true,
    status: "active",
    image_url: "https://upload.wikimedia.org/wikipedia/commons/3/30/Kerala_backwaters.jpg",
  },
  {
    id: "mavoor-wetlands",
    name: "Mavoor Wetlands & Bird Habitat (Wetland Ecology & Marshland)",
    description: "Famous eco-wetland habitat near Kozhikode home to migratory waterbirds and peaceful bamboo trails.",
    category: "eco",
    lat: 11.2619,
    lng: 75.9412,
    capacity_per_slot: 50,
    district: "Kozhikode",
    region: "Mavoor",
    panchayat_id: "MVR-2026",
    is_active: true,
    status: "active",
    image_url: "https://upload.wikimedia.org/wikipedia/commons/3/30/Kerala_backwaters.jpg",
  },
];

export async function getAttractions() {
  try {
    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (!error && data && data.length > 0) {
      return data;
    }
  } catch {}
  return DEFAULT_LOCATIONS;
}

export async function getLocations() {
  return await getAttractions();
}

export async function getDangerZones(): Promise<any[]> {
  const { data, error } = await supabase
    .from("danger_zones")
    .select("*")
    .eq("is_active", true);

  if (error) {
    console.error("Danger zones fetch error:", error);
    return [];
  }
  return data ?? [];
}

async function requestRedZoneMutation<T>(method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>) {
  const response = await fetch("/api/red-zones", {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Unable to save red zone.");
  }

  return data as T;
}

function persistHazardSnapshot(snapshot: { redZones?: RedZone[]; places?: any[]; notifications?: any[] } | null | undefined) {
  if (typeof window === "undefined" || !snapshot) return;

  try {
    if (snapshot.redZones) {
      localStorage.setItem("terra_red_zones", JSON.stringify(snapshot.redZones));
    }
    if (snapshot.places) {
      localStorage.setItem("terra_hazard_places", JSON.stringify(snapshot.places));
    }
    if (snapshot.notifications) {
      localStorage.setItem("terra_notifications", JSON.stringify(snapshot.notifications));
    }
    window.dispatchEvent(new CustomEvent("storage_sync", { detail: { key: "red_zones" } }));
  } catch {
    // Ignore cache write failures; the API response is still authoritative.
  }
}


export async function getRedZones(): Promise<RedZone[]> {
  try {
    const { data, error } = await supabase
      .from("red_zones")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (!error && data && data.length > 0) return data;
  } catch (e) {}

  try {
    const { data: dzData, error: dzErr } = await supabase
      .from("danger_zones")
      .select("*")
      .eq("is_active", true);

    if (!dzErr && dzData && dzData.length > 0) {
      return dzData.map((dz: any) => {
        const geo = dz.geojson || dz.geojson_polygon;
        return {
          id: dz.id,
          title: dz.name || dz.title || "Danger Zone",
          name: dz.name || dz.title || "Danger Zone",
          risk_level: dz.severity?.toUpperCase() || dz.risk_level || "HIGH",
          description: dz.description || "",
          coordinates: geo?.geometry?.coordinates?.[0] || dz.coordinates || [],
          geojson_polygon: geo,
          is_active: dz.is_active !== false,
        };
      });
    }
  } catch (e) {}
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

export async function insertRedZone(payload: Omit<RedZone, "id" | "created_at">) {
  try {
    const data = await requestRedZoneMutation<{ data?: RedZone; sync?: { redZones?: RedZone[]; places?: any[]; notifications?: any[] } }>("POST", payload as Record<string, unknown>);
    persistHazardSnapshot(data.sync);
    return data.data ?? data;
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
      localStorage.setItem("terra_notifications", JSON.stringify(buildHazardNotifications(updated as RedZone[])));
      window.dispatchEvent(new CustomEvent("storage_sync", { detail: { key: "red_zones" } }));
    }
    return newZone;
  }
}

export async function updateRedZone(id: string, payload: Partial<Omit<RedZone, "id" | "created_at">>) {
  try {
    const data = await requestRedZoneMutation<{ data?: RedZone; sync?: { redZones?: RedZone[]; places?: any[]; notifications?: any[] } }>("PATCH", { id, ...payload });
    persistHazardSnapshot(data.sync);
    return data.data ?? data;
  } catch (e) {
    const existing = await getRedZones();
    const updated = existing.map((zone) => (zone.id === id ? { ...zone, ...payload } as RedZone : zone));
    if (typeof window !== "undefined") {
      localStorage.setItem("terra_red_zones", JSON.stringify(updated));
      localStorage.setItem("terra_notifications", JSON.stringify(buildHazardNotifications(updated as RedZone[])));
      window.dispatchEvent(new CustomEvent("storage_sync", { detail: { key: "red_zones" } }));
    }
    return updated.find((zone) => zone.id === id) ?? null;
  }
}

export async function deleteRedZone(id: string) {
  try {
    const data = await requestRedZoneMutation<{ sync?: { redZones?: RedZone[]; places?: any[]; notifications?: any[] } }>("DELETE", { id });
    persistHazardSnapshot(data.sync);
  } catch (e) {
    const existing = await getRedZones();
    const updated = existing.filter((z) => z.id !== id);
    if (typeof window !== "undefined") {
      localStorage.setItem("terra_red_zones", JSON.stringify(updated));
      localStorage.setItem("terra_notifications", JSON.stringify(buildHazardNotifications(updated as RedZone[])));
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
  location_name?: string;
  holder_name?: string;
  visitor_name?: string;
  time_slot: string;
  visit_date?: string;
  num_visitors?: number;
  pass_token: string;
}) {
  const insertData = {
    location_id: payload.location_id,
    location_name: payload.location_name || "Kerala Eco Destination",
    holder_name: payload.holder_name || payload.visitor_name || "Tourist Explorer",
    time_slot: payload.time_slot,
    visit_date: payload.visit_date || new Date().toISOString().split("T")[0],
    num_visitors: payload.num_visitors || 1,
    pass_token: payload.pass_token,
    status: "VALID",
  };
  const { data, error } = await supabase
    .from("passes")
    .insert(insertData)
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
    // Fetch from both tables in parallel: civic_reports (staff-entered) and
    // hazard_reports (tourist-submitted via IssueReportDrawer → Supabase insert)
    const [civicResult, hazardResult] = await Promise.all([
      supabase
        .from("civic_reports")
        .select("*, locations(name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("hazard_reports")
        .select("*, locations(name)")
        .eq("status", "open")
        .order("reported_at", { ascending: false }),
    ]);

    const civicRows = (civicResult.data ?? []) as HazardReport[];

    // Normalize hazard_reports rows to match HazardReport shape
    const hazardRows: HazardReport[] = (hazardResult.data ?? []).map((r: any) => ({
      id: r.id,
      location_id: r.location_id,
      location_name: r.locations?.name ?? r.location_id ?? "Unknown",
      category: r.category,
      description: r.description ?? "",
      reported_at: r.reported_at,
      reporter_name: r.reporter_name ?? undefined,
      lat: r.lat ?? 0,
      lng: r.lng ?? 0,
      status: r.status === "open" ? "pending" : (r.status as HazardReport["status"]),
      panchayat_id: r.panchayat_id ?? "CKP-2024",
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    // Merge and de-duplicate by id, sorted newest first
    const seen = new Set<string>();
    const merged = [...civicRows, ...hazardRows]
      .filter((r) => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      })
      .sort((a, b) => {
        const aTime = new Date(a.reported_at ?? a.created_at ?? 0).getTime();
        const bTime = new Date(b.reported_at ?? b.created_at ?? 0).getTime();
        return bTime - aTime;
      });

    if (merged.length > 0) return merged;
    throw new Error("No data");
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
      .from("locations")
      .select("*", { count: "exact", head: true });
    if (!error && count !== null && count > 0) return count;
  } catch {}
  return 11; // fallback count of locations
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

export async function getUserHazardReports(userId?: string): Promise<HazardReport[]> {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from("civic_reports")
      .select("*")
      .eq("reporter_id", userId)
      .order("created_at", { ascending: false });
    if (!error && data) return data as HazardReport[];
  } catch {}

  const userKey = `terra_civic_reports_${userId}`;
  const raw = typeof window !== "undefined" ? localStorage.getItem(userKey) : null;
  if (raw) {
    try { return JSON.parse(raw); } catch {}
  }
  return [];
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

// ── Tourism Events CRUD ─────────────────────────────────────────────────────

/**
 * Fetch active events. Pass a locationId to restrict to a single place.
 * Falls back to an empty array if the table does not exist yet.
 */
export async function getEvents(locationId?: string): Promise<TourismEvent[]> {
  try {
    const url = locationId
      ? `/api/events?location_id=${encodeURIComponent(locationId)}`
      : "/api/events";
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    return (await res.json()) as TourismEvent[];
  } catch {
    return [];
  }
}

export async function insertEvent(
  payload: Omit<TourismEvent, "id" | "created_at" | "updated_at" | "created_by">
): Promise<TourismEvent | null> {
  const res = await fetch("/api/events", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.message || "Failed to create event.");
  return body?.data ?? null;
}

export async function updateEvent(
  id: string,
  patch: Partial<Omit<TourismEvent, "id" | "created_at" | "created_by">>
): Promise<TourismEvent | null> {
  const res = await fetch("/api/events", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...patch }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.message || "Failed to update event.");
  return body?.data ?? null;
}

export async function deleteEvent(id: string): Promise<void> {
  const res = await fetch(`/api/events?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || "Failed to delete event.");
  }
}

// ── Businesses, Guides & Services CRUD ────────────────────────────────────────

/**
 * Fetch local businesses/guides. Pass locationId to restrict to a single place.
 * Pass includeHidden = true to fetch pending/hidden items for admin view.
 */
export async function getBusinesses(
  locationId?: string,
  includeHidden = false
): Promise<LocalBusiness[]> {
  try {
    const params = new URLSearchParams();
    if (locationId) params.set("location_id", locationId);
    if (includeHidden) params.set("admin", "true");
    const qs = params.toString();
    const url = qs ? `/api/businesses?${qs}` : "/api/businesses";

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    return (await res.json()) as LocalBusiness[];
  } catch {
    return [];
  }
}

export async function insertBusiness(
  payload: Omit<LocalBusiness, "id" | "created_at" | "updated_at" | "created_by">
): Promise<LocalBusiness | null> {
  const res = await fetch("/api/businesses", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.message || "Failed to create business entry.");

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("storage_sync", { detail: { key: "businesses" } }));
  }
  return body?.data ?? null;
}

export async function updateBusiness(
  id: string,
  patch: Partial<Omit<LocalBusiness, "id" | "created_at" | "created_by">>
): Promise<LocalBusiness | null> {
  const res = await fetch("/api/businesses", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...patch }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.message || "Failed to update business entry.");

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("storage_sync", { detail: { key: "businesses" } }));
  }
  return body?.data ?? null;
}

export async function deleteBusiness(id: string): Promise<void> {
  const res = await fetch(`/api/businesses?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || "Failed to delete business entry.");
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("storage_sync", { detail: { key: "businesses" } }));
  }
}

// ── Pass & Booking Management Helpers ─────────────────────────────────────────

export async function getAllPasses(): Promise<any[]> {
  try {
    const res = await fetch("/api/passes?all=true", { cache: "no-store" });
    if (!res.ok) return [];
    return (await res.json()) as any[];
  } catch {
    return [];
  }
}

export async function updatePassStatus(
  id: string,
  status: "VALID" | "CHECKED_IN" | "REVOKED" | "EXPIRED"
): Promise<any> {
  const res = await fetch("/api/passes", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, status }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.message || "Failed to update pass status.");

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("storage_sync", { detail: { key: "passes" } }));
  }
  return body?.data ?? null;
}

export async function uploadAvatar(userId: string, file: File): Promise<{ url?: string; error?: string }> {
  try {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });

    if (uploadError) {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      return { url: dataUrl };
    }

    const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(path);
    return { url: publicData.publicUrl };
  } catch (e: any) {
    return { error: e.message || "Avatar upload failed." };
  }
}

