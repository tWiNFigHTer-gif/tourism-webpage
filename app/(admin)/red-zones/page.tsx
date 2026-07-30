"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getRedZones, insertRedZone, deleteRedZone } from "@/lib/db";
import type { RedZone } from "@/lib/types";

// Dynamic import for shared MapCanvas & MapboxDrawControl to prevent SSR window issues
const SharedMapCanvasWithDraw = dynamic(
  async () => {
    const { MapCanvas } = await import("@/components/maps/MapCanvas");
    const { MapboxDrawControl } = await import("@/components/maps/MapboxDrawControl");
    const { Source, Layer } = await import("react-map-gl/mapbox");

    return function DynamicAdminMap({
      redZones,
      onPolygonCreated,
    }: {
      redZones: RedZone[];
      onPolygonCreated: (feature: any, coords: [number, number][]) => void;
    }) {
      return (
        <div className="relative w-full h-[460px] rounded-xl overflow-hidden border border-white/10 shadow-2xl">
          <MapCanvas initialViewState={{ longitude: 75.775, latitude: 11.252, zoom: 13, pitch: 20 }}>
            {/* Pass MapboxDrawControl as a child to the shared MapCanvas */}
            <MapboxDrawControl onPolygonCreated={onPolygonCreated} />

            {/* Render existing Red Zones */}
            {redZones.map((rz, idx) => {
              let geojson: GeoJSON.Feature<GeoJSON.Polygon> | null = null;
              if (rz.geojson_polygon) {
                geojson = rz.geojson_polygon;
              } else if (rz.coordinates && rz.coordinates.length > 0) {
                geojson = {
                  type: "Feature",
                  properties: { title: rz.name || rz.title },
                  geometry: { type: "Polygon", coordinates: [rz.coordinates] },
                };
              }

              if (!geojson) return null;

              return (
                <Source key={`admin-rz-src-${rz.id || idx}`} type="geojson" data={geojson}>
                  <Layer
                    id={`admin-rz-fill-${rz.id || idx}`}
                    type="fill"
                    paint={{ "fill-color": "#EF4444", "fill-opacity": 0.25 }}
                  />
                  <Layer
                    id={`admin-rz-line-${rz.id || idx}`}
                    type="line"
                    paint={{ "line-color": "#EF4444", "line-width": 2, "line-dasharray": [3, 3] }}
                  />
                </Source>
              );
            })}
          </MapCanvas>
          <div className="absolute bottom-3 left-3 bg-[#0F172A]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-emerald-500/30 text-[11px] text-emerald-400 font-mono flex items-center gap-2 z-10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Shared MapCanvas + @mapbox/mapbox-gl-draw Active
          </div>
        </div>
      );
    };
  },
  {
    ssr: false,
    loading: () => (
      <div className="h-[460px] bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-center text-emerald-400 font-mono text-xs">
        Loading Shared MapCanvas with Polygon Drawer...
      </div>
    ),
  }
);

export default function AdminRedZonesPage() {
  const [redZones, setRedZones] = useState<RedZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [riskLevel, setRiskLevel] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("HIGH");
  const [description, setDescription] = useState("");
  const [drawnFeature, setDrawnFeature] = useState<any>(null);
  const [drawnCoords, setDrawnCoords] = useState<[number, number][]>([
    [75.770, 11.250],
    [75.778, 11.250],
    [75.778, 11.258],
    [75.770, 11.258],
    [75.770, 11.250],
  ]);
  const [saving, setSaving] = useState(false);

  const fetchZones = async () => {
    try {
      const data = await getRedZones();
      setRedZones(data);
    } catch (e) {
      console.error("Failed to load red zones:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  const handleDeleteZone = async (id: string) => {
    if (!confirm("Are you sure you want to remove this Red Zone?")) return;
    try {
      await deleteRedZone(id);
      await fetchZones();
    } catch (e) {
      console.error("Failed to delete Red Zone:", e);
    }
  };

  const handlePolygonCreated = (feature: any, coords: [number, number][]) => {
    setDrawnFeature(feature);
    if (coords && coords.length > 0) {
      setDrawnCoords(coords);
    }
  };

  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    const geojsonPolygon = drawnFeature || {
      type: "Feature",
      properties: { title: title, risk_level: riskLevel },
      geometry: { type: "Polygon", coordinates: [drawnCoords] },
    };

    try {
      await insertRedZone({
        title: title,
        name: title,
        risk_level: riskLevel,
        description: description || "Temporary danger zone created by Panchayat official.",
        coordinates: drawnCoords,
        geojson_polygon: geojsonPolygon,
        is_active: true,
      } as any);

      setTitle("");
      setDescription("");
      setDrawnFeature(null);
      await fetchZones();
      alert(`Red Zone "${title}" successfully saved to Supabase!`);
    } catch (e) {
      alert("Error saving Red Zone");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      <div className="pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-emerald-400 text-lg">polyline</span>
          <span className="font-mono text-xs text-emerald-400 font-semibold uppercase tracking-wider">
            SHARED MAPCANVAS • SPATIAL POLYGON EDITOR
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Spatial Red Zone Polygon Manager
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Draw and publish temporary danger polygons using the shared MapCanvas component with `@mapbox/mapbox-gl-draw`.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Shared MapCanvas Container */}
        <div className="lg:col-span-7 space-y-3">
          <h2 className="text-sm font-bold text-slate-200">Active Spatial Red Zones Map</h2>
          <SharedMapCanvasWithDraw redZones={redZones} onPolygonCreated={handlePolygonCreated} />
        </div>

        {/* Save Zone Form */}
        <div className="lg:col-span-5 space-y-4">
          <form
            onSubmit={handleSaveZone}
            className="rounded-2xl border border-emerald-500/30 bg-slate-900/95 p-6 shadow-xl space-y-4"
          >
            <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider font-mono">
              ➕ Publish Red Zone
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Zone Title / Identifier *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Canoly Canal Monsoonal Runoff Zone"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Risk Severity Level
              </label>
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value as any)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-emerald-400 focus:outline-none"
              >
                <option value="LOW">LOW - Advisory Notice</option>
                <option value="MEDIUM">MEDIUM - Caution / Slow Transit</option>
                <option value="HIGH">HIGH - Danger / Reroute Recommended</option>
                <option value="CRITICAL">CRITICAL - Strict No-Access Red Zone</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Hazard Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe reason for temporary closure or safety alert..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all cursor-pointer text-xs"
            >
              <span className="material-symbols-outlined text-base">save</span>
              <span>{saving ? "Publishing GeoJSON..." : "Save Zone"}</span>
            </button>
          </form>

          {/* Active Red Zone List */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Published Red Zones ({redZones.length})
            </h3>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {redZones.map((rz) => (
                <div
                  key={rz.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-red-500/25 bg-slate-950 text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-200">{rz.name || rz.title}</div>
                    <div className="text-[11px] text-slate-400">{rz.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                      {rz.risk_level}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteZone(rz.id)}
                      className="p-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer flex items-center justify-center"
                      title="Remove Red Zone"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
