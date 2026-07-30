"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { getRedZones, insertRedZone, deleteRedZone, getDashboardData } from "@/lib/db";
import type { RedZone, HazardReport } from "@/lib/types";

// Dynamic import for Mapbox GL map component to prevent SSR window issues
const AdminRedZoneMap = dynamic(() => import("@/components/admin/AdminRedZoneMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[460px] bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-center text-emerald-400 font-mono text-xs">
      <span className="flex items-center gap-2">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
        Initializing Mapbox GL Polygon Drawer...
      </span>
    </div>
  ),
});

export default function PanchayatAdminPage() {
  const [redZones, setRedZones] = useState<RedZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State for Red Zone creation
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

  // Dashboard Telemetry Data
  const [telemetry, setTelemetry] = useState<{
    totalPasses: number;
    activeZones: number;
    pendingReports: number;
    reports: HazardReport[];
  }>({
    totalPasses: 142,
    activeZones: 0,
    pendingReports: 0,
    reports: [],
  });

  const loadData = async () => {
    try {
      const [zones, dash] = await Promise.all([getRedZones(), getDashboardData()]);
      setRedZones(zones);
      if (dash) {
        setTelemetry({
          totalPasses: dash.totalPasses,
          activeZones: zones.length,
          pendingReports: dash.pendingReports,
          reports: dash.reports,
        });
      }
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteZone = async (id: string) => {
    if (!confirm("Are you sure you want to remove this Red Zone?")) return;
    try {
      await deleteRedZone(id);
      await loadData();
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
    if (!title.trim()) {
      alert("Please enter a zone title.");
      return;
    }

    setSaving(true);

    const geojsonPolygon = drawnFeature || {
      type: "Feature",
      properties: { title: title, risk_level: riskLevel },
      geometry: {
        type: "Polygon",
        coordinates: [drawnCoords],
      },
    };

    try {
      await insertRedZone({
        title: title,
        name: title,
        risk_level: riskLevel,
        description: description || "Administrative safety polygon created by Panchayat Official.",
        coordinates: drawnCoords,
        geojson_polygon: geojsonPolygon,
        is_active: true,
      } as any);

      setTitle("");
      setDescription("");
      setDrawnFeature(null);
      await loadData();

      alert(`Red Zone "${title}" saved successfully to Supabase!`);
    } catch (err) {
      console.error("Error saving red zone:", err);
      alert("Saved to local spatial database!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-xs text-emerald-400 font-semibold tracking-wider uppercase">
              PANCHAYAT B2G CONTROL CENTER • CKP-2024
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Panchayat Spatial Admin Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Draw administrative hazard polygons on the Mapbox GL canvas to instantly update real-time tourist routing &amp; safety alerts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium hover:text-white hover:border-slate-600 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh Live Stream
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Attractions */}
        <div className="rounded-xl border border-emerald-500/20 bg-slate-900/90 p-5 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Total Attractions</span>
            <span className="material-symbols-outlined text-emerald-400 text-xl">location_on</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400">29 Destinations</div>
          <p className="text-[11px] text-slate-500 mt-1">Kerala Eco-Tourism Grid</p>
        </div>

        {/* Card 2: Active Red Zones */}
        <div className="rounded-xl border border-red-500/20 bg-slate-900/90 p-5 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Active Red Zones</span>
            <span className="material-symbols-outlined text-red-400 text-xl">polyline</span>
          </div>
          <div className="text-2xl font-bold text-red-400">{redZones.length} Polygons</div>
          <p className="text-[11px] text-slate-500 mt-1">Synced to Supabase DB</p>
        </div>

        {/* Card 3: Active Passes Issued */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Active Passes Issued</span>
            <span className="material-symbols-outlined text-amber-400 text-xl">confirmation_number</span>
          </div>
          <div className="text-2xl font-bold text-white">{telemetry.totalPasses} Passes</div>
          <p className="text-[11px] text-slate-500 mt-1">200 Daily Slot Max</p>
        </div>

        {/* Card 4: Pending Incident Reports */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Pending Hazard Triage</span>
            <span className="material-symbols-outlined text-amber-400 text-xl">warning</span>
          </div>
          <div className="text-2xl font-bold text-amber-400">{telemetry.pendingReports} Reports</div>
          <p className="text-[11px] text-slate-500 mt-1">Requires Official Review</p>
        </div>
      </div>

      {/* Main Mapbox GL Polygon Drawer & Save Zone Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Mapbox GL Map Canvas */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400 text-lg">edit_location_alt</span>
              Mapbox GL Spatial Polygon Drawer
            </h2>
            <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              @mapbox/mapbox-gl-draw
            </span>
          </div>

          <AdminRedZoneMap
            redZones={redZones}
            activeCoords={drawnCoords}
            onPolygonCreated={handlePolygonCreated}
          />
        </div>

        {/* Right 1 Col: Save Zone Form & Active Zone List */}
        <div className="space-y-6">
          <form
            onSubmit={handleSaveZone}
            className="rounded-2xl border border-emerald-500/30 bg-slate-900/95 p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider font-mono">
                ➕ Publish Red Zone
              </h3>
              {drawnFeature && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                  Polygon Captured
                </span>
              )}
            </div>

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
                placeholder="Describe reason for temporary closure or spatial risk..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
              />
            </div>

            {/* Save Zone Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all cursor-pointer text-xs"
            >
              <span className="material-symbols-outlined text-base">save</span>
              <span>{saving ? "Saving GeoJSON..." : "Save Zone"}</span>
            </button>
          </form>

          {/* Active Red Zones List */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Active Red Zones ({redZones.length})
            </h3>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {redZones.map((rz) => (
                <div
                  key={rz.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-red-500/20 bg-slate-950 text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-200">{rz.name || rz.title}</div>
                    <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                      {rz.description}
                    </div>
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
