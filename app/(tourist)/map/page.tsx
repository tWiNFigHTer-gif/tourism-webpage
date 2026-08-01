"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { LogOut } from "lucide-react";
import { getPlaces } from "@/lib/places";
import { getRedZones } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { isPointInPolygon, checkRouteIntersection } from "@/lib/turf";
import type { RedZone } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import { SlotBookingModal } from "@/components/slot-booking-modal";
import HazardReportDrawer from "@/components/HazardReportDrawer";
import { useSubmitHazard } from "@/lib/hooks/useSubmitHazard";

const SpatialEngineLeafletMap = dynamic(
  () => import("@/components/map/SpatialEngineLeafletMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-emerald-400 font-mono text-sm">
        Loading Spatial Map Engine...
      </div>
    ),
  }
);

const ORIGIN_POINT: [number, number] = [75.78, 11.25];

interface Attraction {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category?: string;
  description?: string;
  capacity_per_slot?: number;
}

export default function TouristMapPage() {
  const router = useRouter();
  const { user, profile, isAdmin, signOut } = useAuth();
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [redZones, setRedZones] = useState<RedZone[]>([]);
  const [selectedAttraction, setSelectedAttraction] = useState<Attraction | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === "SIGNED_OUT") {
        router.push("/login");
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!mapLoaded && loading) {
        setMapError("Map is taking too long to load.");
      }
    }, 10000);
    return () => clearTimeout(timeout);
  }, [mapLoaded, loading]);

  // Simulated Route Coordinates: [[lat, lng], [lat, lng]]
  const [simulatedRouteCoords, setSimulatedRouteCoords] = useState<[number, number][] | null>(null);

  // Route Blocked Stark Red Alert State
  const [routeBlockedAlert, setRouteBlockedAlert] = useState<{
    isOpen: boolean;
    intersectedZoneTitle: string;
    riskLevel: string;
  }>({
    isOpen: false,
    intersectedZoneTitle: "",
    riskLevel: "HIGH",
  });

  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showReportDrawer, setShowReportDrawer] = useState(false);

  const { submitHazard } = useSubmitHazard();

  // Compute live hazard status for the currently selected attraction on the map
  const selectedAttractionHazard = useMemo(() => {
    if (!selectedAttraction) return null;
    const attNameKey = selectedAttraction.name.split(" ")[0].toLowerCase();

    // 1. Direct property check from enriched places API
    const directStatus = (selectedAttraction as any).hazard_status;
    if (directStatus && directStatus !== "NORMAL") {
      return {
        isBlocked: directStatus === "CRITICAL",
        isWarning: directStatus === "WARNING",
        title: (selectedAttraction as any).hazard_zone_names?.[0] || `${selectedAttraction.name} Hazard Zone`,
        riskLevel: directStatus,
      };
    }

    // 2. Spatial or name match against active Red Zones
    if (redZones && redZones.length > 0) {
      for (const rz of redZones) {
        if (rz.is_active === false) continue;
        const rzTitle = rz.title || rz.name || "";
        const isNameMatch =
          rzTitle.toLowerCase().includes(attNameKey) ||
          (rz.description && rz.description.toLowerCase().includes(attNameKey));

        let pointInPoly = false;
        if (rz.geojson_polygon?.geometry) {
          pointInPoly = isPointInPolygon(selectedAttraction.lat, selectedAttraction.lng, rz.geojson_polygon.geometry);
        } else if (rz.coordinates && rz.coordinates.length > 0) {
          pointInPoly = isPointInPolygon(selectedAttraction.lat, selectedAttraction.lng, {
            type: "Polygon",
            coordinates: [rz.coordinates],
          });
        }

        if (isNameMatch || pointInPoly) {
          const isCritical = rz.risk_level === "CRITICAL" || rz.risk_level === "HIGH";
          return {
            isBlocked: isCritical,
            isWarning: !isCritical,
            title: rzTitle || `${selectedAttraction.name} Hazard Red Zone`,
            riskLevel: rz.risk_level || "HIGH",
          };
        }
      }
    }
    return null;
  }, [selectedAttraction, redZones]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setFetchError(null);
        const dbAttractions = await getPlaces();
        setAttractions(dbAttractions);

        const rz = await getRedZones();
        setRedZones(rz);
        setMapLoaded(true);
      } catch (err: any) {
        console.error("Locations fetch failed:", err?.message || err);
        setFetchError(err?.message || "Could not load destinations. Check your connection.");
        setAttractions([]);
      } finally {
        setLoading(false);
      }
    }

    loadData();
    if (typeof window !== "undefined") {
      window.addEventListener("storage", loadData);
      window.addEventListener("storage_sync", loadData);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", loadData);
        window.removeEventListener("storage_sync", loadData);
      }
    };
  }, []);

  const handleMarkerClick = (att: Attraction) => {
    setSelectedAttraction(att);
    const destCoords: [number, number] = [att.lng, att.lat];

    // Set route coordinates for Leaflet [[lat, lng], [lat, lng]]
    setSimulatedRouteCoords([
      [ORIGIN_POINT[1], ORIGIN_POINT[0]],
      [att.lat, att.lng],
    ]);

    let blockedZoneTitle = "";
    let blockedRisk = "HIGH";
    let isBlocked = false;

    if (redZones && redZones.length > 0) {
      for (const rz of redZones) {
        let polyFeature: any = null;
        if (rz.geojson_polygon) {
          polyFeature = rz.geojson_polygon;
        } else if (rz.coordinates && rz.coordinates.length > 0) {
          polyFeature = {
            type: "Feature",
            properties: { title: rz.name || rz.title },
            geometry: { type: "Polygon", coordinates: [rz.coordinates] },
          };
        }

        if (polyFeature) {
          const intersects = checkRouteIntersection(ORIGIN_POINT, destCoords, polyFeature);
          const pointInPoly = polyFeature.geometry ? isPointInPolygon(att.lat, att.lng, polyFeature.geometry) : false;

          if (intersects || pointInPoly) {
            isBlocked = true;
            blockedZoneTitle = rz.title || rz.name || "Environmental Hazard Polygon";
            blockedRisk = rz.risk_level || "HIGH";
            break;
          }
        }
      }
    }

    if (isBlocked) {
      setRouteBlockedAlert({
        isOpen: true,
        intersectedZoneTitle: blockedZoneTitle,
        riskLevel: blockedRisk,
      });
    } else {
      setRouteBlockedAlert({ isOpen: false, intersectedZoneTitle: "", riskLevel: "HIGH" });
    }
  };

  return (
    <div className="relative h-screen w-full bg-slate-950 text-white overflow-hidden font-sans">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between px-6 py-4 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-2xl pointer-events-auto">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3 items-center justify-center">
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          </span>
          <h1 className="text-lg font-bold text-emerald-400 font-mono tracking-wide">
            TerraPulse • TOURIST SPATIAL ENGINE
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/20 text-xs font-mono font-bold text-emerald-300 hover:bg-emerald-500/30 transition-all cursor-pointer shadow-lg shrink-0"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>← Back to TerraPulse</span>
          </Link>

          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300">
            <span className="material-symbols-outlined text-xs text-emerald-400">my_location</span>
            Origin: [75.78, 11.25]
          </span>

          <button
            onClick={() =>
              setRouteBlockedAlert({
                isOpen: true,
                intersectedZoneTitle: "Canoly Canal Runoff Red Zone",
                riskLevel: "HIGH",
              })
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-xs font-mono text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">warning</span>
            <span>RED ZONES ({redZones?.length ?? 0})</span>
          </button>

          <button
            type="button"
            aria-label="Sign out"
            onClick={async () => {
              await supabase.auth.signOut();
              await signOut();
              router.push("/login");
            }}
            className="flex items-center justify-center p-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer shadow-md"
            title="Sign out"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </header>

      {/* Loading Overlay */}
      {loading && !mapError && !fetchError && (
        <div className="fixed inset-0 z-[9995] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-emerald-400 font-mono text-sm">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
            <span>Loading Chakkittapara destinations...</span>
          </div>
        </div>
      )}

      {/* Error Fallback */}
      {(mapError || fetchError) && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center backdrop-blur-md">
          <div className="max-w-md rounded-2xl border border-red-500/30 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="h-12 w-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
              <span className="material-symbols-outlined text-2xl">error</span>
            </div>
            <h2 className="text-lg font-bold text-white">Could not load the map</h2>
            <p className="text-xs text-slate-400 font-mono">
              {mapError || fetchError || "Check your connection."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-all cursor-pointer shadow-lg"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Active Red Zone Tourist Warning Message Bar */}
      {redZones.length > 0 && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9990] w-full max-w-xl px-4 pointer-events-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-red-500/40 bg-red-950/90 backdrop-blur-md text-red-200 text-xs font-mono shadow-2xl animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-red-400 text-lg animate-pulse">warning</span>
              <div>
                <span className="font-bold text-red-300 uppercase">SPATIAL SAFETY ALERT:</span>
                <span className="ml-1 text-white">
                  {redZones.length} Active Danger Zone in Region ({redZones[0]?.name || redZones[0]?.title || "Canoly Canal Hazard"})
                </span>
              </div>
            </div>
            <button
              onClick={() =>
                setRouteBlockedAlert({
                  isOpen: true,
                  intersectedZoneTitle: redZones[0]?.name || redZones[0]?.title || "Canoly Canal Hazard",
                  riskLevel: redZones[0]?.risk_level || "HIGH",
                })
              }
              className="px-2.5 py-1 rounded-lg bg-red-500/20 border border-red-400/40 text-red-300 text-[11px] hover:bg-red-500/30 transition-all font-bold whitespace-nowrap cursor-pointer"
            >
              View Safety Notice
            </button>
          </div>
        </div>
      )}

      {/* Leaflet Spatial Engine Map */}
      <SpatialEngineLeafletMap
        attractions={attractions}
        redZones={redZones}
        selectedAttraction={selectedAttraction}
        onSelectAttraction={handleMarkerClick}
        originPoint={ORIGIN_POINT}
        simulatedRouteCoords={simulatedRouteCoords}
        isRouteBlocked={routeBlockedAlert.isOpen}
      />

      {/* Slide-Up Bottom Sheet */}
      {selectedAttraction && (
        <div className="absolute bottom-0 left-0 right-0 z-30 p-4 sm:p-6 flex justify-center pointer-events-none">
          <div className="pointer-events-auto w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-center mb-3">
              <div className="h-1.5 w-12 rounded-full bg-slate-800" />
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-block rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase text-emerald-400 mb-2">
                  {selectedAttraction.category || "attraction"}
                </span>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {selectedAttraction.name}
                </h2>
              </div>

              <button
                onClick={() => {
                  setSelectedAttraction(null);
                  setSimulatedRouteCoords(null);
                }}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              {selectedAttraction.description || "A scenic tourist destination in Kerala with capacity control & safety protection."}
            </p>

            {/* Hazard Alert Banner inside Map Bottom Sheet */}
            {selectedAttractionHazard && (
              <div
                className={`mt-3 p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                  selectedAttractionHazard.isBlocked
                    ? "bg-red-950/70 border-red-500/50 text-red-200"
                    : "bg-amber-950/70 border-amber-500/50 text-amber-200"
                }`}
              >
                <span className="material-symbols-outlined text-base shrink-0 mt-0.5">warning</span>
                <div>
                  <p className="font-bold uppercase tracking-wider text-[11px] font-mono">
                    {selectedAttractionHazard.isBlocked ? "CRITICAL HAZARD ALERT" : "SAFETY HAZARD ADVISORY"}
                  </p>
                  <p className="text-[11px] mt-0.5 opacity-90">
                    {selectedAttractionHazard.title} — Pass entry suspended due to active environmental hazard.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center gap-3">
              {selectedAttractionHazard?.isBlocked ? (
                <div
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-500/20 border border-red-500/50 px-4 py-3 text-xs font-bold text-red-400 cursor-not-allowed"
                  title="Pass booking disabled due to active environmental hazard"
                >
                  <span className="material-symbols-outlined text-base">block</span>
                  <span>Booking Suspended · Hazard Zone</span>
                </div>
              ) : selectedAttractionHazard?.isWarning ? (
                <button
                  type="button"
                  onClick={() => setShowBookingModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 font-semibold text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition-all cursor-pointer text-sm"
                >
                  <span>Book with Caution</span>
                  <span className="material-symbols-outlined text-base">warning</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowBookingModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all cursor-pointer text-sm"
                >
                  <span>Book Pass</span>
                  <span className="material-symbols-outlined text-base">confirmation_number</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowReportDrawer(true)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-3 text-xs font-semibold text-amber-400 hover:bg-slate-700 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">flag</span>
                <span>Report Issue</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stark Red Route Blocked Alert Dialog */}
      {routeBlockedAlert.isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-md cursor-pointer"
            onClick={() => setRouteBlockedAlert({ ...routeBlockedAlert, isOpen: false })}
          />

          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border-2 border-red-500 bg-red-600 text-white shadow-2xl animate-in zoom-in-95 duration-200">
            <div
              className="p-6 text-center border-b border-red-500/50"
              style={{
                background: "repeating-linear-gradient(45deg, rgba(0,0,0,0.15), rgba(0,0,0,0.15) 10px, transparent 10px, transparent 20px)",
              }}
            >
              <span className="material-symbols-outlined text-5xl mb-2 text-white animate-bounce">
                gpp_bad
              </span>
              <h2 className="text-xl font-extrabold uppercase tracking-wider font-mono text-white">
                ROUTE BLOCKED: Environmental Hazard Zone
              </h2>
            </div>

            <div className="p-6 space-y-4 bg-red-700">
              <div className="bg-red-950/60 p-4 rounded-xl border border-red-400/40 text-xs space-y-2">
                <div className="flex items-center justify-between font-mono font-semibold text-red-200">
                  <span>INTERCEPTED RED ZONE:</span>
                  <span className="px-2 py-0.5 rounded bg-red-900 border border-red-500 text-red-100 text-[10px]">
                    {routeBlockedAlert.riskLevel} SEVERITY
                  </span>
                </div>
                <p className="text-sm font-bold text-white">
                  {routeBlockedAlert.intersectedZoneTitle || "Administrative Danger Polygon"}
                </p>
                <p className="text-red-200 leading-relaxed text-[11px]">
                  Turf.js spatial intersection check detected that your direct route line intersects an active administrative danger zone. Access is strictly prohibited.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRouteBlockedAlert({ ...routeBlockedAlert, isOpen: false })}
                  className="w-full py-3 rounded-xl bg-slate-950 text-white font-bold text-xs uppercase tracking-wider shadow-lg hover:bg-slate-900 transition-all cursor-pointer border border-slate-700"
                >
                  Acknowledge &amp; Reroute
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals & Drawers */}
      <SlotBookingModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        locationName={selectedAttraction?.name ?? "Attraction Entry"}
        capacity={{ current: 28, total: 50 }}
      />

      <HazardReportDrawer
        locationId={selectedAttraction?.id ?? "att-1"}
        locationName={selectedAttraction?.name ?? "Attraction Location"}
        isOpen={showReportDrawer}
        onClose={() => setShowReportDrawer(false)}
        onSubmit={async (category, description) => {
          await submitHazard(selectedAttraction?.id ?? "att-1", category, description);
        }}
      />
    </div>
  );
}
