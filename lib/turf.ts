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

// --------------------------------------------------------------------------
// 1. generateRoute
// --------------------------------------------------------------------------
/**
 * Calls the Mapbox Directions (walking) API and returns the route geometry
 * as a GeoJSON LineString.
 *
 * @param start          [longitude, latitude] of the start point
 * @param end            [longitude, latitude] of the destination
 * @param mapboxToken    A valid Mapbox public access token
 */
export async function generateRoute(
  start: [number, number],
  end: [number, number],
  mapboxToken: string
): Promise<GeoJSON.LineString> {
  const [startLng, startLat] = start;
  const [endLng, endLat] = end;

  const url =
    `https://api.mapbox.com/directions/v5/mapbox/walking/` +
    `${startLng},${startLat};${endLng},${endLat}` +
    `?geometries=geojson&overview=full&steps=false&access_token=${mapboxToken}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Mapbox Directions API error: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as {
    routes?: Array<{ geometry: GeoJSON.LineString }>;
    code?: string;
    message?: string;
  };

  if (data.code && data.code !== "Ok") {
    throw new Error(`Mapbox Directions returned code="${data.code}": ${data.message}`);
  }

  if (!data.routes || data.routes.length === 0) {
    throw new Error("No routes returned by Mapbox Directions API.");
  }

  // The first route is always the primary/optimal one.
  return data.routes[0].geometry;
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
  route: GeoJSON.LineString,
  dangerZones: GeoJSON.Feature<GeoJSON.Polygon>[]
): SafetyCheckResult {
  const routeLine = turf.lineString(route.coordinates as [number, number][]);

  const intersectedZones: string[] = [];
  let hasHighSeverity = false;

  for (const zone of dangerZones) {
    const intersects = turf.booleanIntersects(routeLine, zone);
    if (intersects) {
      // Collect the zone name (fall back to id if no name property).
      const zoneName: string =
        (zone.properties?.name as string | undefined) ??
        (zone.properties?.id as string | undefined) ??
        "Unknown Zone";

      intersectedZones.push(zoneName);

      // Check severity for warning level escalation.
      const severity = zone.properties?.severity as string | undefined;
      if (severity === "high" || severity === "critical") {
        hasHighSeverity = true;
      }
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
  zone: GeoJSON.Feature<GeoJSON.Polygon>
): number {
  const centroid = turf.centroid(zone);
  // turf.distance accepts GeoJSON Points or [lng, lat] tuples directly.
  return turf.distance(turf.point(point), centroid, { units: "kilometers" });
}
