import * as turf from "@turf/turf";
import type { NotificationItem } from "@/components/mobile/NotificationsDrawer";
import type { Location, RedZone } from "@/lib/types";

export type HazardExposure = "none" | "near" | "inside";

export interface HazardState {
  exposure: HazardExposure;
  status: "NORMAL" | "WARNING" | "CRITICAL";
  level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | null;
  message: string;
  zoneIds: string[];
  zoneNames: string[];
  nearestDistanceKm: number | null;
}

const NEAR_THRESHOLD_KM = 1.5;

function pickZoneTitle(zone: RedZone | any) {
  return zone?.title || zone?.name || "Administrative Hazard Zone";
}

function pickZoneSeverity(zone: RedZone | any): HazardState["level"] {
  const raw = String(zone?.risk_level || "HIGH").toUpperCase();
  if (raw === "CRITICAL") return "CRITICAL";
  if (raw === "MEDIUM") return "MEDIUM";
  if (raw === "LOW") return "LOW";
  return "HIGH";
}

function severityToStatus(level: HazardState["level"], exposure: HazardExposure): HazardState["status"] {
  if (exposure === "inside" && (level === "HIGH" || level === "CRITICAL")) return "CRITICAL";
  if (exposure === "inside") return "WARNING";
  if (exposure === "near") return "WARNING";
  return "NORMAL";
}

export function normalizeRedZoneFeature(
  raw: any
): GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null {
  if (!raw) return null;

  try {
    let obj = typeof raw === "string" ? JSON.parse(raw) : raw;
    let geometry = obj.geojson_polygon || obj.geojson || obj.geometry || obj;
    let properties = { ...(obj.properties || {}) };

    if (geometry && typeof geometry === "string") {
      geometry = JSON.parse(geometry);
    }

    if (geometry?.type === "Feature") {
      properties = { ...geometry.properties, ...properties };
      geometry = geometry.geometry;
    }

    if (!geometry || !geometry.type || !Array.isArray(geometry.coordinates)) {
      return null;
    }

    if (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") {
      return null;
    }

    return {
      type: "Feature",
      properties: {
        id: obj.id || properties.id || "zone",
        name: pickZoneTitle(obj),
        severity: pickZoneSeverity(obj),
        ...properties,
      },
      geometry,
    };
  } catch {
    return null;
  }
}

function getDistanceToZone(point: [number, number], zone: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>): number {
  try {
    const boundary = turf.polygonToLine(zone as any);
    return turf.pointToLineDistance(turf.point(point), boundary as any, { units: "kilometers" });
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

export function computeHazardState(place: Pick<Location, "id" | "name" | "lat" | "lng">, redZones: RedZone[]): HazardState {
  const point = turf.point([place.lng, place.lat]);
  const activeZones = redZones
    .map(normalizeRedZoneFeature)
    .filter((zone): zone is GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> => Boolean(zone));

  const insideZones: Array<{ feature: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>; distanceKm: number }> = [];
  const nearZones: Array<{ feature: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>; distanceKm: number }> = [];

  for (const zone of activeZones) {
    const isInside = turf.booleanPointInPolygon(point, zone as any);
    const distanceKm = getDistanceToZone([place.lng, place.lat], zone);

    if (isInside) {
      insideZones.push({ feature: zone, distanceKm: 0 });
      continue;
    }

    if (distanceKm <= NEAR_THRESHOLD_KM) {
      nearZones.push({ feature: zone, distanceKm });
    }
  }

  const matched = insideZones.length > 0 ? insideZones : nearZones;
  const exposure: HazardExposure = insideZones.length > 0 ? "inside" : nearZones.length > 0 ? "near" : "none";
  const primaryZone = matched[0]?.feature ?? null;
  const level = primaryZone ? pickZoneSeverity(primaryZone.properties as any) : null;
  const status = severityToStatus(level, exposure);
  const zoneNames = matched.map(({ feature }) => pickZoneTitle(feature.properties as any));
  const zoneIds = matched.map(({ feature }) => String((feature.properties as any)?.id || feature.id || "zone"));
  const nearestDistanceKm = matched.length > 0 ? Math.min(...matched.map(({ distanceKm }) => distanceKm)) : null;

  return {
    exposure,
    status,
    level,
    message:
      exposure === "inside"
        ? `Inside ${zoneNames[0] || "an active hazard zone"}`
        : exposure === "near"
        ? `Within ${nearestDistanceKm?.toFixed(1) ?? "0.0"} km of ${zoneNames[0] || "an active hazard zone"}`
        : "No active hazard nearby",
    zoneIds,
    zoneNames,
    nearestDistanceKm,
  };
}

export function enrichLocationsWithHazards<T extends Location>(locations: T[], redZones: RedZone[]): Array<T & { hazard_status: HazardState["status"]; hazard_level: HazardState["level"]; hazard_zone_ids: string[]; hazard_zone_names: string[]; hazard_exposure: HazardExposure; hazard_message: string; hazard_distance_km: number | null; }> {
  return locations.map((place) => {
    const hazard = computeHazardState(place, redZones);
    return {
      ...place,
      hazard_status: hazard.status,
      hazard_level: hazard.level,
      hazard_zone_ids: hazard.zoneIds,
      hazard_zone_names: hazard.zoneNames,
      hazard_exposure: hazard.exposure,
      hazard_message: hazard.message,
      hazard_distance_km: hazard.nearestDistanceKm,
    };
  });
}

function formatRelativeTime(timestamp?: string | null) {
  if (!timestamp) return "Just now";
  const diffMinutes = Math.max(0, Math.round((Date.now() - new Date(timestamp).getTime()) / 60000));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} mins ago`;
  const hours = Math.round(diffMinutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function buildHazardNotifications(redZones: RedZone[], places: Location[] = []): NotificationItem[] {
  return redZones
    .filter((zone) => zone.is_active !== false)
    .map((zone) => {
      const hazard = computeHazardState(
        { id: String(zone.id), name: pickZoneTitle(zone), lat: (zone as any).lat ?? 0, lng: (zone as any).lng ?? 0 },
        [zone]
      );
      const affectedPlaces = places
        .map((place) => ({ place, hazard: computeHazardState(place, [zone]) }))
        .filter(({ hazard }) => hazard.exposure !== "none")
        .map(({ place }) => place.name)
        .slice(0, 3);

      return {
        id: `notif-rz-${zone.id}`,
        title: `⚠️ ${pickZoneTitle(zone)}`,
        message: `${zone.description || "Active hazard advisory issued by Panchayat Official."}${affectedPlaces.length ? ` Affects ${affectedPlaces.join(", ")}${affectedPlaces.length > 2 ? "..." : ""}.` : ""}`,
        time: formatRelativeTime(zone.created_at),
        type: "hazard",
        tagText: hazard.level === "CRITICAL" ? "CRITICAL HAZARD" : "SAFETY ADVISORY",
        locationId: String(zone.id),
        locationName: pickZoneTitle(zone),
        read: false,
      } satisfies NotificationItem;
    });
}
