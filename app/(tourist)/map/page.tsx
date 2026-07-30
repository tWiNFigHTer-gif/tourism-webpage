"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Marker, Source, Layer } from "react-map-gl/mapbox";
import { MapCanvas } from "@/components/maps/MapCanvas";
import { supabase } from "@/lib/supabase";
import { getRedZones } from "@/lib/db";
import { isPointInPolygon, checkRouteIntersection } from "@/lib/turf";
import type { RedZone } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import { SlotBookingModal } from "@/components/slot-booking-modal";
import HazardReportDrawer from "@/components/HazardReportDrawer";
import { useSubmitHazard } from "@/lib/hooks/useSubmitHazard";

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

const FALLBACK_ATTRACTIONS: Attraction[] = [
  { id: "att-1", name: "Canoly Canal & Sarovaram Eco Park", lat: 11.2720, lng: 75.7950, category: "eco", description: "Lush mangrove ecosystem and canal walkway right in Kozhikode city." },
  { id: "att-2", name: "Mavoor Wetlands & Bird Sanctuary", lat: 11.2619, lng: 75.9412, category: "eco", description: "Famous eco-wetland habitat home to migratory waterbirds." },
  { id: "att-3", name: "Kadalundi Estuary & Mangrove Trail", lat: 11.1278, lng: 75.8286, category: "wildlife", description: "Serene estuarine sanctuary where Kadalundi River meets Arabian sea." },
  { id: "att-4", name: "Kakkayam Dam & Eco Valley", lat: 11.5432, lng: 75.9211, category: "waterfalls", description: "Picturesque dam site and waterfall trek in Kozhikode district." },
  { id: "att-5", name: "Thusharagiri Waterfalls & Trek", lat: 11.4700, lng: 76.0500, category: "waterfalls", description: "Cascading jungle streams forming three waterfalls." },
  { id: "att-6", name: "Janakikkadu Eco Forest", lat: 11.5800, lng: 75.7500, category: "forests", description: "Protected evergreen forest ecosystem rich in medicinal flora." },
  { id: "att-7", name: "Chembra Peak & Heart Lake", lat: 11.5467, lng: 76.0890, category: "viewpoints", description: "Highest peak in Wayanad with a natural heart-shaped lake." },
  { id: "att-8", name: "Banasura Sagar Eco Dam", lat: 11.6711, lng: 75.9575, category: "viewpoints", description: "Largest earth dam in India offering boat rides." },
];

export default function TouristMapPage() {
  const { user, profile, isAdmin } = useAuth();
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [redZones, setRedZones] = useState<RedZone[]>([]);
  const [selectedAttraction, setSelectedAttraction] = useState<Attraction | null>(null);
  const [loading, setLoading] = useState(true);

  // Simulated Route GeoJSON
  const [simulatedRoute, setSimulatedRoute] = useState<GeoJSON.Feature<GeoJSON.LineString> | null>(null);

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

  useEffect(() => {
    async function loadData() {
      try {
        const { data: dbAttractions } = await supabase
          .from("attractions")
          .select("id, name, lat, lng, category, description, capacity_per_slot");

        if (dbAttractions && dbAttractions.length > 0) {
          setAttractions(dbAttractions);
        } else {
          setAttractions(FALLBACK_ATTRACTIONS);
        }

        const rz = await getRedZones();
        setRedZones(rz);
      } catch (err) {
        console.warn("Using fallback attraction locations:", err);
        setAttractions(FALLBACK_ATTRACTIONS);
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

    const routeLineFeature: GeoJSON.Feature<GeoJSON.LineString> = {
      type: "Feature",
      properties: { name: `Route to ${att.name}` },
      geometry: {
        type: "LineString",
        coordinates: [ORIGIN_POINT, destCoords],
      },
    };
    setSimulatedRoute(routeLineFeature);

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
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 bg-slate-900/85 backdrop-blur-md border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
          <h1 className="text-lg font-bold text-emerald-400 font-mono tracking-wide">
            STOP ! • TOURIST SPATIAL ENGINE
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/mobile"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/20 text-xs font-mono font-bold text-emerald-300 hover:bg-emerald-500/30 transition-all cursor-pointer shadow-lg"
          >
            <span className="material-symbols-outlined text-sm">explore</span>
            <span>Mobile Portal</span>
          </Link>

          {(isAdmin || user?.email?.toLowerCase().includes("admin") || profile?.role === "panchayat_admin") && (
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/20 text-xs font-mono font-bold text-amber-300 hover:bg-amber-500/30 transition-all cursor-pointer shadow-lg"
            >
              <span className="material-symbols-outlined text-sm">shield_person</span>
              <span>Admin Dashboard</span>
            </Link>
          )}

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
            <span>RED ZONES ({redZones.length})</span>
          </button>
        </div>
      </header>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-emerald-400 font-mono text-sm">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
            <span>Loading Attractions &amp; Spatial Safety Grid...</span>
          </div>
        </div>
      )}

      {/* Active Red Zone Tourist Warning Message Bar */}
      {redZones.length > 0 && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 w-full max-w-xl px-4 pointer-events-auto">
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

      {/* Shared MapCanvas Component */}
      <MapCanvas
        initialViewState={{ longitude: 75.85, latitude: 11.35, zoom: 9.5, pitch: 25 }}
      >
        {/* Origin Marker */}
        <Marker latitude={ORIGIN_POINT[1]} longitude={ORIGIN_POINT[0]} anchor="center">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-500/30 border border-blue-400 shadow-[0_0_12px_#3b82f6]">
            <span className="material-symbols-outlined text-blue-300 text-sm">my_location</span>
          </div>
        </Marker>

        {/* Red Zone Polygons Layer */}
        {redZones.map((rz, idx) => {
          let geojsonFeature: GeoJSON.Feature<GeoJSON.Polygon> | null = null;
          if (rz.geojson_polygon?.geometry) {
            geojsonFeature = rz.geojson_polygon;
          } else if (rz.coordinates && rz.coordinates.length > 0) {
            const ring = rz.coordinates;
            const coords = Array.isArray(ring[0]) && typeof ring[0][0] === "number" ? [ring] : ring;
            geojsonFeature = {
              type: "Feature",
              properties: { title: rz.title || rz.name },
              geometry: { type: "Polygon", coordinates: coords as any },
            };
          }

          if (!geojsonFeature) return null;

          return (
            <Source key={`rz-src-${rz.id || idx}`} type="geojson" data={geojsonFeature}>
              <Layer
                id={`rz-fill-${rz.id || idx}`}
                type="fill"
                paint={{ "fill-color": "#EF4444", "fill-opacity": 0.4 }}
              />
              <Layer
                id={`rz-line-${rz.id || idx}`}
                type="line"
                paint={{ "line-color": "#EF4444", "line-width": 2.5, "line-dasharray": [3, 3] }}
              />
            </Source>
          );
        })}

        {/* Simulated Route Line */}
        {simulatedRoute && (
          <Source type="geojson" data={simulatedRoute}>
            <Layer
              id="route-line-bg"
              type="line"
              paint={{
                "line-color": routeBlockedAlert.isOpen ? "#EF4444" : "#4EDEA3",
                "line-width": 5,
                "line-opacity": 0.5,
              }}
            />
            <Layer
              id="route-line"
              type="line"
              paint={{
                "line-color": routeBlockedAlert.isOpen ? "#EF4444" : "#4EDEA3",
                "line-width": 2.5,
                "line-dasharray": routeBlockedAlert.isOpen ? [2, 2] : [4, 1],
              }}
            />
          </Source>
        )}

        {/* Glowing Emerald Green Attraction Markers */}
        {attractions.map((att) => (
          <Marker
            key={att.id}
            latitude={att.lat}
            longitude={att.lng}
            anchor="center"
          >
            <button
              type="button"
              onClick={() => handleMarkerClick(att)}
              aria-label={att.name}
              className="relative group cursor-pointer focus:outline-none"
            >
              <span className="absolute -inset-2 rounded-full bg-emerald-500/40 animate-ping opacity-75 group-hover:bg-emerald-400/60" />
              <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-slate-950 shadow-[0_0_15px_#10b981] border-2 border-slate-900 transition-transform group-hover:scale-125">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-950" />
              </span>
              <span className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900/90 border border-slate-700 px-2 py-1 text-[11px] font-mono text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                {att.name}
              </span>
            </button>
          </Marker>
        ))}
      </MapCanvas>

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
                  setSimulatedRoute(null);
                }}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              {selectedAttraction.description || "A scenic tourist destination in Kerala with capacity control & safety protection."}
            </p>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowBookingModal(true)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all cursor-pointer text-sm"
              >
                <span>Book Pass</span>
                <span className="material-symbols-outlined text-base">confirmation_number</span>
              </button>

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer"
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
