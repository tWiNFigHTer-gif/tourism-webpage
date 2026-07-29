"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/lib/supabase";
import type { DangerZone, Location } from "@/lib/types";
import {
  generateRoute,
  checkRouteSafety,
  type SafetyCheckResult,
} from "@/lib/turf";
import { useCapacity } from "@/lib/hooks/useCapacity";
import { HazardAlertModal } from "@/components/hazard-alert-modal";
import { SlotBookingModal } from "@/components/slot-booking-modal";
import { RouteSafetyPanel } from "@/components/map/RouteSafetyPanel";
import HazardReportDrawer from "@/components/HazardReportDrawer";
import { useSubmitHazard } from "@/lib/hooks/useSubmitHazard";

const MAP_CENTER: [number, number] = [75.93, 11.43];
const MAP_STYLE = "mapbox://styles/mapbox/navigation-night-v1";
const MAP_BG = "#0a0e13";

type LocationRow = Location & { is_active: boolean };
type DangerZoneRow = DangerZone & { is_active: boolean };

/* ── Selected location state ───────────────────────────────────────────── */
interface SelectedLocation {
  name: string;
  description: string;
  capacity: { current: number; total: number };
  lat: number;
  lng: number;
}

const DEMO_LOCATION: SelectedLocation = {
  name: "Pambadum Shola National Park",
  description:
    "The smallest national park in Kerala, offering a unique high-altitude shola forest ecosystem. Known for frequent sightings of the Nilgiri Marten.",
  capacity: { current: 36, total: 50 },
  lat: 11.43,
  lng: 75.93,
};

/* ── Mapbox helpers ─────────────────────────────────────────────────────── */
function shouldHideStyleLayer(layerId: string): boolean {
  const id = layerId.toLowerCase();
  if (id.includes("poi")) return true;
  if (id.includes("label") && !id.includes("road")) return true;
  return false;
}

function applyDarkPoiFilter(map: mapboxgl.Map) {
  const style = map.getStyle();
  if (!style?.layers) return;
  for (const layer of style.layers) {
    if (shouldHideStyleLayer(layer.id)) {
      map.setLayoutProperty(layer.id, "visibility", "none");
    }
  }
}

function locationsToGeoJSON(
  locations: LocationRow[]
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: locations.map((loc) => ({
      type: "Feature",
      properties: {
        id: loc.id,
        name: loc.name,
        description: loc.description,
        category: loc.category,
        capacity_per_slot: loc.capacity_per_slot,
        panchayat_id: loc.panchayat_id,
      },
      geometry: { type: "Point", coordinates: [loc.lng, loc.lat] },
    })),
  };
}

function dangerZoneToFeature(zone: DangerZoneRow): GeoJSON.Feature<GeoJSON.Polygon> {
  const { geojson } = zone;
  let feature: GeoJSON.Feature;
  if (geojson.type === "Feature") {
    feature = {
      ...geojson,
      properties: { ...geojson.properties, id: zone.id, name: zone.name, severity: zone.severity },
    };
  } else if (geojson.type === "FeatureCollection" && geojson.features.length > 0) {
    const f = geojson.features[0];
    feature = {
      ...f,
      properties: { ...f.properties, id: zone.id, name: zone.name, severity: zone.severity },
    };
  } else {
    throw new Error(`Danger zone ${zone.id} has no valid polygon geometry`);
  }
  // Caller guarantees polygon geometry from DB — cast is safe.
  return feature as GeoJSON.Feature<GeoJSON.Polygon>;
}

function addHiddenGemsLayers(
  map: mapboxgl.Map,
  data: GeoJSON.FeatureCollection
) {
  if (map.getSource("hidden-gems")) {
    (map.getSource("hidden-gems") as mapboxgl.GeoJSONSource).setData(data);
    return;
  }
  map.addSource("hidden-gems", { type: "geojson", data });
  map.addLayer({
    id: "hidden-gems-glow",
    type: "circle",
    source: "hidden-gems",
    paint: { "circle-radius": 18, "circle-color": "#10b981", "circle-opacity": 0.12 },
  });
  map.addLayer({
    id: "hidden-gems",
    type: "circle",
    source: "hidden-gems",
    paint: {
      "circle-radius": 6,
      "circle-color": "#10b981",
      "circle-opacity": 0.9,
      "circle-stroke-width": 2,
      "circle-stroke-color": "rgba(16,185,129,0.4)",
    },
  });
}

function addDangerZoneLayers(map: mapboxgl.Map, zone: DangerZoneRow) {
  const sourceId = `danger-zone-${zone.id}`;
  const fillId   = `danger-zone-fill-${zone.id}`;
  const lineId   = `danger-zone-line-${zone.id}`;
  if (map.getSource(sourceId)) {
    (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(dangerZoneToFeature(zone));
    return;
  }
  map.addSource(sourceId, { type: "geojson", data: dangerZoneToFeature(zone) });
  map.addLayer({ id: fillId, type: "fill",   source: sourceId, paint: { "fill-color": "#ef4444",  "fill-opacity": 0.12 } });
  map.addLayer({ id: lineId, type: "line",   source: sourceId, paint: { "line-color": "#ef4444", "line-width": 1.5, "line-dasharray": [4, 4] } });
}

/**
 * Loads location + danger zone data from Supabase, renders map layers,
 * and returns the typed danger zone features for client-side safety checks.
 */
async function loadMapData(
  map: mapboxgl.Map
): Promise<GeoJSON.Feature<GeoJSON.Polygon>[]> {
  const [locRes, dzRes] = await Promise.all([
    supabase.from("locations").select("*").eq("is_active", true),
    supabase.from("danger_zones").select("*").eq("is_active", true),
  ]);
  if (!locRes.error && locRes.data?.length) {
    addHiddenGemsLayers(map, locationsToGeoJSON(locRes.data as LocationRow[]));
  }
  const polygons: GeoJSON.Feature<GeoJSON.Polygon>[] = [];
  if (!dzRes.error && dzRes.data?.length) {
    for (const zone of dzRes.data as DangerZoneRow[]) {
      addDangerZoneLayers(map, zone);
      try {
        polygons.push(dangerZoneToFeature(zone));
      } catch {
        // skip zones with unexpected geometry
      }
    }
  }
  return polygons;
}

/* ── Bottom Sheet (location info panel) ────────────────────────────────── */
const TIME_SLOTS_DISPLAY = [
  { time: "08:00", status: "available" },
  { time: "10:00", status: "selected"  },
  { time: "12:00", status: "available" },
  { time: "14:00", status: "full"      },
] as const;

/**
 * Derive a colour + label from the fill percentage.
 * ≥90% → critical red, ≥70% → amber caution, <70% → emerald safe.
 */
function capacityTheme(pct: number) {
  if (pct >= 90) return { bar: "bg-danger",  shadow: "shadow-[0_0_8px_rgba(239,68,68,0.5)]",   pill: "border-danger/30 bg-danger-dim text-danger",     label: "Critical" };
  if (pct >= 70) return { bar: "bg-secondary", shadow: "shadow-[0_0_8px_rgba(255,185,95,0.4)]", pill: "border-secondary/30 bg-amber-dim text-secondary", label: "Busy" };
  return         { bar: "bg-primary",  shadow: "shadow-[0_0_8px_rgba(16,185,129,0.5)]",   pill: "border-primary/30 bg-emerald-dim text-primary",   label: "Available" };
}

function BottomSheet({
  location,
  onClose,
  onBook,
  onNavigate,
  onReportHazard,
}: {
  location: SelectedLocation;
  onClose: () => void;
  onBook: () => void;
  /** Triggered when the user taps "Navigate Here"; parent kicks off safety check. */
  onNavigate?: () => void;
  /** Triggered when the user taps "Report a problem". */
  onReportHazard?: () => void;
}) {
  const [activeSlot, setActiveSlot] = useState("10:00");

  // ── Live capacity via useCapacity hook (polls every 30 s) ──────────────
  // location.id may be undefined for demo locations; fall back gracefully.
  const locationId = (location as SelectedLocation & { id?: string }).id ?? "";
  const { data: liveCapacity, isLoading: capacityLoading } = useCapacity(
    locationId,
    activeSlot
  );

  // Prefer live data; fall back to the prop passed from the map click handler.
  const issuedCount = liveCapacity?.issued_count ?? location.capacity.current;
  const totalCapacity = liveCapacity?.capacity ?? location.capacity.total;
  const capacityPct = Math.min(100, Math.round((issuedCount / totalCapacity) * 100));
  const slotsRemaining = liveCapacity
    ? liveCapacity.capacity - liveCapacity.issued_count
    : location.capacity.total - location.capacity.current;
  const isFull = slotsRemaining <= 0;
  const theme = capacityTheme(capacityPct);

  return (
    <div className="absolute bottom-6 left-1/2 z-30 w-[420px] max-w-[calc(100%-3rem)] -translate-x-1/2 overflow-hidden rounded-xl border border-border-subtle bg-bg-surface shadow-2xl">
      {/* Drag handle */}
      <div className="flex w-full cursor-grab justify-center pb-1 pt-3">
        <div className="h-1 w-12 rounded-full bg-border-subtle" />
      </div>

      <div className="p-panel-padding">
        {/* Header */}
        <div className="mb-2 flex items-start justify-between">
          <h2
            className="text-text-primary"
            style={{
              fontFamily: "var(--font-space-grotesk)",
              fontSize: "22px",
              lineHeight: "28px",
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            {location.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted transition-colors hover:text-on-surface"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>close</span>
          </button>
        </div>
        <p className="mb-6 text-sm leading-relaxed text-text-muted">
          {location.description}
        </p>

        {/* ── Live Capacity ──────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between gap-2">
            {/* Section label */}
            <span
              className="uppercase tracking-wider text-text-muted"
              style={{ fontFamily: "var(--font-inter)", fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em" }}
            >
              Current Capacity
            </span>

            {/* Right side: loading skeleton OR live data pill */}
            {capacityLoading && !liveCapacity ? (
              <div className="h-4 w-28 animate-pulse rounded bg-bg-raised" />
            ) : (
              <div className="flex items-center gap-2">
                {/* Status pill */}
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${theme.pill}`}
                  style={{ fontFamily: "var(--font-inter)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}
                >
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
                  {theme.label}
                </span>
                {/* Numeric */}
                <span
                  className="text-text-muted"
                  style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "12px" }}
                >
                  {capacityPct}%
                  {" · "}
                  <span className={isFull ? "text-danger" : "text-primary"}>
                    {isFull ? "Full" : `${slotsRemaining} left`}
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {capacityLoading && !liveCapacity ? (
            <div className="h-1.5 w-full animate-pulse rounded-full bg-bg-raised" />
          ) : (
            <div className="h-1.5 w-full overflow-hidden rounded-full border border-border-subtle bg-bg-deep">
              <div
                className={`h-full rounded-full transition-all duration-500 ${theme.bar} ${theme.shadow}`}
                style={{ width: `${capacityPct}%` }}
              />
            </div>
          )}
        </div>

        {/* Time slots */}
        <div className="mb-6">
          <span
            className="mb-3 block uppercase tracking-wider text-text-muted"
            style={{ fontFamily: "var(--font-inter)", fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em" }}
          >
            Available Slots
          </span>
          <div className="flex gap-2">
            {TIME_SLOTS_DISPLAY.map(({ time, status }) => {
              const isFull     = status === "full";
              const isSelected = activeSlot === time && !isFull;
              return (
                <button
                  key={time}
                  type="button"
                  disabled={isFull}
                  onClick={() => !isFull && setActiveSlot(time)}
                  className={`relative flex-1 overflow-hidden rounded py-1.5 text-center transition-all duration-200 ${
                    isFull
                      ? "cursor-not-allowed border border-border-subtle text-text-muted/30"
                      : isSelected
                        ? "border border-primary/50 bg-bg-raised text-primary shadow-[0_0_8px_rgba(16,185,129,0.1)]"
                        : "border border-border-subtle bg-bg-deep text-text-muted hover:border-border-medium"
                  }`}
                  style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "12px" }}
                >
                  {isFull && (
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{ background: "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.05) 4px, rgba(255,255,255,0.05) 8px)" }}
                    />
                  )}
                  <span className="relative z-10">{time}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBook}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-3 font-medium text-on-primary transition-colors hover:bg-primary-fixed"
          >
            <span>Book Entry Pass</span>
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>arrow_forward</span>
          </button>
          {onNavigate && (
            <button
              type="button"
              onClick={onNavigate}
              title="Check route safety"
              className="flex items-center justify-center gap-1.5 rounded-lg border border-border-medium px-3 text-on-surface transition-colors hover:border-primary/40 hover:text-primary"
              style={{ fontFamily: "var(--font-inter)", fontSize: "12px" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px", fontVariationSettings: "'FILL' 0" }}>near_me</span>
              Navigate
            </button>
          )}
          <button
            type="button"
            className="flex items-center justify-center rounded-lg border border-border-medium px-3 text-on-surface transition-colors hover:border-primary/30 hover:text-primary"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>share</span>
          </button>
        </div>

        {/* Report a problem text button below action row */}
        {onReportHazard && (
          <div className="mt-3 flex justify-center border-t border-border-subtle pt-3">
            <button
              type="button"
              onClick={onReportHazard}
              className="flex items-center gap-1.5 text-xs text-amber-500/80 hover:text-amber-400 transition-colors cursor-pointer"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              <span className="material-symbols-outlined text-amber-500/80" style={{ fontSize: "16px", fontVariationSettings: "'FILL' 0" }}>
                flag
              </span>
              <span>Report a problem</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Glowing landmark nodes (SVG overlay) ───────────────────────────────── */
function LandmarkNodes({ onSelect }: { onSelect: (loc: SelectedLocation) => void }) {
  const nodes = [
    { id: "pambadum",  x: "50%", y: "33%", label: "Pambadum Shola",  active: true,  loc: DEMO_LOCATION },
    { id: "mattupetty", x: "33%", y: "66%", label: "Mattupetty Dam", active: false, loc: { ...DEMO_LOCATION, name: "Mattupetty Dam", description: "A picturesque reservoir in the Idukki district of Kerala." } },
  ];

  return (
    <>
      {nodes.map((node) => (
        <div
          key={node.id}
          className="absolute z-20 -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
          style={{ left: node.x, top: node.y }}
          onClick={() => node.active && onSelect(node.loc)}
        >
          {/* Three-ring marker system */}
          <div className="relative flex h-7 w-7 items-center justify-center">
            {/* Outer halo — animated */}
            {node.active && (
              <div className="absolute h-7 w-7 rounded-full bg-primary-container/10 pulse-halo" />
            )}
            {/* Middle ring */}
            <div
              className={`absolute h-[14px] w-[14px] rounded-full border-[1.5px] transition-transform group-hover:scale-110 ${
                node.active
                  ? "border-primary-container/30"
                  : "border-text-muted/30 group-hover:border-primary-container/30"
              }`}
            />
            {/* Inner dot */}
            <div
              className={`relative z-10 h-1.5 w-1.5 rounded-full ${
                node.active
                  ? "bg-primary-container shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                  : "bg-text-muted group-hover:bg-primary-container"
              } transition-colors`}
            />
          </div>

          {/* Label tooltip */}
          <div
            className={`absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded border px-2 py-1 shadow-lg transition-opacity ${
              node.active
                ? "border-primary/30 bg-bg-surface opacity-100"
                : "border-border-subtle bg-bg-surface opacity-0 group-hover:opacity-100"
            }`}
          >
            <span
              className={node.active ? "text-primary" : "text-text-muted"}
              style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "11px", fontWeight: 500 }}
            >
              {node.label}
            </span>
          </div>
        </div>
      ))}
    </>
  );
}

/* ── Danger zone SVG overlay ────────────────────────────────────────────── */
function DangerZoneOverlay() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M 600 200 L 750 180 L 800 350 L 550 400 Z"
        fill="rgba(239,68,68,0.05)"
        stroke="#ef4444"
        strokeWidth="1.5"
        className="dash-anim"
      />
      <text
        x="660"
        y="290"
        fill="#ef4444"
        fontFamily="'JetBrains Mono', monospace"
        fontSize="10"
        opacity="0.8"
      >
        DANGER ZONE
      </text>
    </svg>
  );
}

/* ── Loading spinner ────────────────────────────────────────────────────── */
function LoadingOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-bg-deep/80">
      <div className="flex flex-col items-center gap-3">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-border-subtle border-t-primary" />
        </div>
        <span
          className="text-text-muted"
          style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "11px" }}
        >
          LOADING MAP DATA…
        </span>
      </div>
    </div>
  );
}

/* ── Main MapCanvas ──────────────────────────────────────────────────────── */
export type MapCanvasRef = mapboxgl.Map | null;

export const MapCanvas = forwardRef<MapCanvasRef>(function MapCanvas(_, ref) {
  const containerRef       = useRef<HTMLDivElement>(null);
  const mapRef             = useRef<mapboxgl.Map | null>(null);
  /** Danger zone polygons cached after initial Supabase load. */
  const dangerZonesRef     = useRef<GeoJSON.Feature<GeoJSON.Polygon>[]>([]);

  const [isLoading,        setIsLoading]        = useState(true);
  const [selectedLoc,      setSelectedLoc]      = useState<SelectedLocation | null>(null);
  const [showHazard,       setShowHazard]       = useState(false);
  const [showBooking,      setShowBooking]      = useState(false);
  const [isReportDrawerOpen, setIsReportDrawerOpen] = useState(false);

  const { submitHazard } = useSubmitHazard();

  // ── Route safety state ────────────────────────────────────────────
  const [isCheckingRoute,  setIsCheckingRoute]  = useState(false);
  const [safetyResult,     setSafetyResult]     = useState<SafetyCheckResult | null>(null);

  useImperativeHandle(ref, () => mapRef.current as any);

  const handleBook = useCallback(() => {
    setSelectedLoc(null);
    setShowBooking(true);
  }, []);

  /**
   * Called when the user taps "Navigate" on the BottomSheet.
   * Uses the map's current centre as the user's position (fallback when
   * Geolocation is unavailable) and the selected location as the destination.
   */
  const handleNavigate = useCallback(async () => {
    if (!selectedLoc) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error("NEXT_PUBLIC_MAPBOX_TOKEN missing — cannot call Directions API.");
      return;
    }

    // Hide the bottom sheet while we compute.
    setSafetyResult(null);
    setIsCheckingRoute(true);

    // Use map centre as user position, or a small offset from the destination
    // as a sensible demo fallback.
    const centre = mapRef.current?.getCenter();
    const userLngLat: [number, number] = centre
      ? [centre.lng, centre.lat]
      : [selectedLoc.lng - 0.02, selectedLoc.lat - 0.02];
    const destLngLat: [number, number] = [selectedLoc.lng, selectedLoc.lat];

    try {
      const routeGeometry = await generateRoute(userLngLat, destLngLat, token);
      const result = checkRouteSafety(routeGeometry, dangerZonesRef.current);
      setSafetyResult(result);
    } catch (err) {
      console.error("Route safety check failed:", err);
      // Treat API failure as safe so navigation is never hard-blocked.
      setSafetyResult({ isSafe: true, intersectedZones: [], warningLevel: "none" });
    } finally {
      setIsCheckingRoute(false);
    }
  }, [selectedLoc]);

  /** Reset safety state and re-show the location sheet so user can pick elsewhere. */
  const handleChooseDifferentRoute = useCallback(() => {
    setSafetyResult(null);
    setIsCheckingRoute(false);
    // Keep selectedLoc open so the user sees the bottom sheet again.
  }, []);

  /** User acknowledged (safe or overridden) → dismiss safety UI. */
  const handleAcknowledgeSafety = useCallback(() => {
    setSafetyResult(null);
    // Optionally: trigger actual navigation here (e.g. draw route on map).
  }, []);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!containerRef.current || !token) {
      if (!token) console.error("NEXT_PUBLIC_MAPBOX_TOKEN is not set");
      setIsLoading(false);
      return;
    }

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: MAP_CENTER,
      zoom: 13,
      pitch: 30,
      antialias: true,
    });
    mapRef.current = map;

    map.on("load", async () => {
      applyDarkPoiFilter(map);
      map.getCanvas().style.backgroundColor = MAP_BG;
      // Load data and cache danger zone polygons for client-side safety checks.
      const loadedZones = await loadMapData(map);
      dangerZonesRef.current = loadedZones;
      // Click on hidden-gems layer → open bottom sheet
      map.on("click", "hidden-gems", (e) => {
        const props = e.features?.[0]?.properties;
        if (!props) return;
        setSafetyResult(null);
        setSelectedLoc({
          name: props.name,
          description: props.description || DEMO_LOCATION.description,
          capacity: { current: Math.floor(Math.random() * 40) + 5, total: props.capacity_per_slot || 50 },
          lat: (e.lngLat as mapboxgl.LngLat).lat,
          lng: (e.lngLat as mapboxgl.LngLat).lng,
        });
      });
      map.on("mouseenter", "hidden-gems", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "hidden-gems", () => { map.getCanvas().style.cursor = ""; });
      setIsLoading(false);
    });

    return () => {
      mapRef.current = null;
      map.remove();
    };
  }, []);

  const zoomIn  = () => mapRef.current?.zoomIn();
  const zoomOut = () => mapRef.current?.zoomOut();

  const showDemoSheet = () => setSelectedLoc(DEMO_LOCATION);

  return (
    <main className="relative flex-1 overflow-hidden bg-bg-deep map-grid">
      {/* Mapbox container */}
      <div ref={containerRef} className="absolute inset-0" aria-label="Map" />

      {/* CSS landmark nodes (show when map not ready or for demo) */}
      <LandmarkNodes onSelect={setSelectedLoc} />

      {/* Danger zone SVG */}
      <DangerZoneOverlay />

      {/* Loading */}
      {isLoading && <LoadingOverlay />}

      {/* ── Zoom controls (top-left) ──────────────────────────── */}
      <div className="absolute left-6 top-6 z-20">
        <div className="flex flex-col overflow-hidden rounded border border-border-subtle bg-bg-surface/80 shadow-lg backdrop-blur-md">
          <button
            type="button"
            aria-label="Zoom in"
            onClick={zoomIn}
            className="flex items-center justify-center p-2 text-text-muted transition-colors hover:bg-surface-variant/50 hover:text-primary border-b border-border-subtle"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>add</span>
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={zoomOut}
            className="flex items-center justify-center p-2 text-text-muted transition-colors hover:bg-surface-variant/50 hover:text-primary"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>remove</span>
          </button>
        </div>
      </div>

      {/* ── Hazard Alert button (top-right) ───────────────────── */}
      <button
        type="button"
        aria-label="View hazard alert"
        onClick={() => setShowHazard(true)}
        className="absolute right-6 top-6 z-20 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-danger transition-colors hover:bg-danger/20"
        style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "11px" }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: "16px", fontVariationSettings: "'FILL' 1" }}>warning</span>
        RED ZONE ALERT
      </button>

      {/* ── Demo: click to open bottom sheet ──────────────────── */}
      {!selectedLoc && (
        <button
          type="button"
          onClick={showDemoSheet}
          className="absolute bottom-6 left-1/2 z-20 w-80 -translate-x-1/2 cursor-pointer rounded-xl border border-border-subtle bg-bg-surface p-4 text-left transition-colors hover:border-border-medium"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-bg-deep text-primary">
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>explore</span>
            </span>
            <div>
              <p className="text-sm font-medium text-on-surface">Tap a location to explore</p>
              <p className="mt-0.5 text-xs text-text-muted">
                Click a marker or here to view details
              </p>
            </div>
          </div>
        </button>
      )}

      {/* ── Bottom sheet ───────────────────────────────────────── */}
      {selectedLoc && !isCheckingRoute && !safetyResult && (
        <BottomSheet
          location={selectedLoc}
          onClose={() => { setSelectedLoc(null); setSafetyResult(null); }}
          onBook={handleBook}
          onNavigate={handleNavigate}
          onReportHazard={() => setIsReportDrawerOpen(true)}
        />
      )}

      {/* ── Route Safety Panel ─────────────────────────────────── */}
      <RouteSafetyPanel
        safetyResult={safetyResult}
        isChecking={isCheckingRoute}
        onAcknowledge={handleAcknowledgeSafety}
        onChooseDifferentRoute={handleChooseDifferentRoute}
      />

      {/* ── Hazard Alert Modal ─────────────────────────────────── */}
      <HazardAlertModal
        isOpen={showHazard}
        onClose={() => setShowHazard(false)}
      />

      {/* ── Slot Booking Modal ─────────────────────────────────── */}
      <SlotBookingModal
        isOpen={showBooking}
        onClose={() => setShowBooking(false)}
        locationName={selectedLoc?.name ?? DEMO_LOCATION.name}
        capacity={DEMO_LOCATION.capacity}
      />

      {/* ── Hazard Report Drawer ────────────────────────────────── */}
      <HazardReportDrawer
        locationId={(selectedLoc as SelectedLocation & { id?: string })?.id ?? "location-pambadum-1"}
        locationName={selectedLoc?.name ?? DEMO_LOCATION.name}
        isOpen={isReportDrawerOpen}
        onClose={() => setIsReportDrawerOpen(false)}
        onSubmit={async (category, description) => {
          const locId = (selectedLoc as SelectedLocation & { id?: string })?.id ?? "location-pambadum-1";
          await submitHazard(locId, category, description);
        }}
      />
    </main>
  );
});
