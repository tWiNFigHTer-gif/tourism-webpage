import * as turf from "@turf/turf";

// ── Re-export existing helpers ──────────────────────────────────────────────
export function pointFromLatLng(lat: number, lng: number) {
  return turf.point([lng, lat]);
}

export function distanceInKm(from: [number, number], to: [number, number]): number {
  return turf.distance(from, to, { units: "kilometers" });
}

export function isPointInPolygon(
  lat: number,
  lng: number,
  polygon: GeoJSON.Polygon | GeoJSON.MultiPolygon
): boolean {
  return turf.booleanPointInPolygon(turf.point([lng, lat]), polygon);
}

export function checkRouteIntersection(
  origin: [number, number],
  destination: [number, number],
  polygon: any
): boolean {
  try {
    const routeLine = turf.lineString([origin, destination]);
    let polyFeature = polygon;
    if (polygon.type === "Polygon" || polygon.type === "MultiPolygon") {
      polyFeature = turf.feature(polygon);
    }
    return turf.booleanIntersects(routeLine, polyFeature);
  } catch (err) {
    return false;
  }
}

export { turf };

// ── Terra-Pulse Spatial Safety Engine ─────────────────────────────────────

/** Result of a route safety check against known danger zones. */
export interface SafetyCheckResult {
  isSafe: boolean;
  /** Names of every zone whose polygon the route intersects. */
  intersectedZones: string[];
  /** 'none' → clear, 'caution' → medium/low zones, 'critical' → any high/critical zone. */
  warningLevel: "none" | "caution" | "critical";
}

/**
 * Safely parses and normalizes any GeoJSON object or Supabase row into a valid
 * GeoJSON Feature<Polygon | MultiPolygon>. Returns null if invalid or unsupported geometry.
 */
export function normalizeDangerZoneFeature(
  raw: any
): GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null {
  if (!raw) return null;
  try {
    let obj = typeof raw === "string" ? JSON.parse(raw) : raw;

    let properties = { ...(obj.properties || {}) };
    let geom = obj;

    // Handle stringified inner geojson field (e.g. Supabase danger_zones table row)
    if (obj.geojson) {
      const inner = typeof obj.geojson === "string" ? JSON.parse(obj.geojson) : obj.geojson;
      properties = { id: obj.id, name: obj.name, severity: obj.severity || "high", ...properties };
      geom = inner;
    }

    if (geom && geom.type === "Feature") {
      properties = { ...geom.properties, ...properties };
      geom = geom.geometry;
    } else if (geom && geom.type === "FeatureCollection" && Array.isArray(geom.features) && geom.features.length > 0) {
      const f = geom.features[0];
      properties = { ...f.properties, ...properties };
      geom = f.geometry;
    }

    // Handle double stringified geometry
    if (typeof geom === "string") {
      try {
        geom = JSON.parse(geom);
      } catch {}
    }

    if (geom && geom.type === "Feature") {
      properties = { ...geom.properties, ...properties };
      geom = geom.geometry;
    }

    if (!geom || !geom.type || !Array.isArray(geom.coordinates)) {
      return null;
    }

    if (geom.type !== "Polygon" && geom.type !== "MultiPolygon") {
      return null;
    }

    return {
      type: "Feature",
      properties: {
        id: raw.id || properties.id || "zone",
        name: raw.name || properties.name || "Danger Zone",
        severity: raw.severity || properties.severity || "high",
        ...properties,
      },
      geometry: geom,
    };
  } catch (err) {
    console.warn("Failed to normalize danger zone geometry:", err);
    return null;
  }
}

// --------------------------------------------------------------------------
// 1. generateRoute
// --------------------------------------------------------------------------
export const isValidMapboxToken = (token?: string) =>
  Boolean(token && token.startsWith("pk.") && !token.includes("example") && !token.includes("your_"));

/**
 * Calls the Mapbox Directions (walking) API and returns the route geometry
 * as a GeoJSON LineString. Falls back to direct LineString geometry if token is invalid or API is offline.
 *
 * @param start          [longitude, latitude] of the start point
 * @param end            [longitude, latitude] of the destination
 * @param mapboxToken    A Mapbox public access token string
 */
export async function generateRoute(
  start: [number, number],
  end: [number, number],
  mapboxToken: string
): Promise<GeoJSON.LineString> {
  if (!isValidMapboxToken(mapboxToken)) {
    return turf.lineString([start, end]).geometry;
  }

  try {
    const [startLng, startLat] = start;
    const [endLng, endLat] = end;

    const url =
      `https://api.mapbox.com/directions/v5/mapbox/walking/` +
      `${startLng},${startLat};${endLng},${endLat}` +
      `?geometries=geojson&overview=full&steps=false&access_token=${mapboxToken}`;

    const response = await fetch(url);

    if (response.ok) {
      const data = (await response.json()) as {
        routes?: Array<{ geometry: GeoJSON.LineString }>;
        code?: string;
      };

      if (data.routes && data.routes.length > 0) {
        return data.routes[0].geometry;
      }
    }
  } catch (err) {
    console.warn("Mapbox directions fetch warning, falling back to local spatial line:", err);
  }

  return turf.lineString([start, end]).geometry;
}

// --------------------------------------------------------------------------
// 2. checkRouteSafety
// --------------------------------------------------------------------------
/**
 * Checks a walking route against an array of danger-zone polygons.
 *
 * @param route       A GeoJSON LineString (the walking path).
 * @param dangerZones An array of GeoJSON Polygon Features, each carrying at
 *                    minimum `properties.name` and `properties.severity`
 *                    ('low' | 'medium' | 'high' | 'critical').
 * @returns           SafetyCheckResult describing whether and how severely
 *                    the route intersects any restricted areas.
 */
export function checkRouteSafety(
  route: GeoJSON.LineString | GeoJSON.Feature<GeoJSON.LineString> | any,
  dangerZones: (GeoJSON.Feature<GeoJSON.Polygon> | any)[]
): SafetyCheckResult {
  if (!route || !dangerZones || !Array.isArray(dangerZones) || dangerZones.length === 0) {
    return { isSafe: true, intersectedZones: [], warningLevel: "none" };
  }

  let routeLine: GeoJSON.Feature<GeoJSON.LineString>;
  try {
    let coords: [number, number][] | null = null;
    if (Array.isArray(route.coordinates)) {
      coords = route.coordinates;
    } else if (route.geometry && Array.isArray(route.geometry.coordinates)) {
      coords = route.geometry.coordinates;
    } else if (typeof route === "string") {
      const parsed = JSON.parse(route);
      coords = parsed.coordinates || parsed.geometry?.coordinates;
    }

    if (!coords || !Array.isArray(coords) || coords.length < 2) {
      return { isSafe: true, intersectedZones: [], warningLevel: "none" };
    }

    routeLine = turf.lineString(coords);
  } catch (err) {
    console.warn("Invalid route passed to checkRouteSafety:", err);
    return { isSafe: true, intersectedZones: [], warningLevel: "none" };
  }

  const intersectedZones: string[] = [];
  let hasHighSeverity = false;

  for (const rawZone of dangerZones) {
    try {
      const zoneFeature = normalizeDangerZoneFeature(rawZone);
      if (!zoneFeature) continue;

      const intersects = turf.booleanIntersects(routeLine, zoneFeature);
      if (intersects) {
        const zoneName: string =
          (zoneFeature.properties?.name as string | undefined) ??
          (zoneFeature.properties?.id as string | undefined) ??
          "Unknown Zone";

        if (!intersectedZones.includes(zoneName)) {
          intersectedZones.push(zoneName);
        }

        const severity = zoneFeature.properties?.severity as string | undefined;
        if (severity === "high" || severity === "critical") {
          hasHighSeverity = true;
        }
      }
    } catch (err) {
      console.warn("Skipping danger zone during intersection check:", err);
    }
  }

  const isSafe = intersectedZones.length === 0;

  let warningLevel: SafetyCheckResult["warningLevel"] = "none";
  if (!isSafe) {
    warningLevel = hasHighSeverity ? "critical" : "caution";
  }

  return { isSafe, intersectedZones, warningLevel };
}

// --------------------------------------------------------------------------
// 3. getDistanceToZone
// --------------------------------------------------------------------------
/**
 * Returns the straight-line distance (in km) between a coordinate and the
 * geometric centroid of a danger-zone polygon.
 *
 * @param point  [longitude, latitude] of the observer.
 * @param zone   A GeoJSON Polygon Feature.
 */
export function getDistanceToZone(
  point: [number, number],
  zone: GeoJSON.Feature<GeoJSON.Polygon> | any
): number {
  try {
    const feature = normalizeDangerZoneFeature(zone);
    if (!feature) return 999;
    const centroid = turf.centroid(feature);
    return turf.distance(turf.point(point), centroid, { units: "kilometers" });
  } catch {
    return 999;
  }
}
