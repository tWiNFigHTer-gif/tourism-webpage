"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getRedZones, insertRedZone } from "@/lib/db";
import type { RedZone } from "@/lib/types";

// Dynamic import for Leaflet map component to prevent SSR window issues
const AdminRedZoneMap = dynamic(() => import("@/components/admin/AdminRedZoneMap"), {
  ssr: false,
  loading: () => (
    <div style={{ height: "400px", background: "#0F172A", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: "#4EDEA3" }}>
      Loading Spatial Map Canvas...
    </div>
  ),
});

export default function RedZoneManagerPage() {
  const [redZones, setRedZones] = useState<RedZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoneName, setZoneName] = useState("");
  const [riskLevel, setRiskLevel] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("HIGH");
  const [description, setDescription] = useState("");
  const [customCoords, setCustomCoords] = useState<[number, number][]>([
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

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneName.trim()) return;

    setSaving(true);
    try {
      await insertRedZone({
        name: zoneName,
        risk_level: riskLevel,
        description: description || "Temporary danger zone created by Panchayat official.",
        coordinates: customCoords,
        is_active: true,
      });

      setZoneName("");
      setDescription("");
      await fetchZones();
      alert(`Red Zone "${zoneName}" successfully published to PostGIS & Spatial Safety Stream!`);
    } catch (e) {
      alert("Error saving Red Zone");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <span className="material-symbols-outlined" style={{ color: "#4EDEA3", fontSize: "18px" }}>
            polyline
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#4EDEA3", fontWeight: 600 }}>
            POSTGIS SPATIAL HAZARD BOUNDARY EDITOR
          </span>
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "26px", fontWeight: 700, color: "#F8FAFC", margin: 0 }}>
          Spatial Red Zone Polygon Manager
        </h1>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#94A3B8", marginTop: "4px" }}>
          Draw and publish temporary spatial danger polygons. Any tourist navigating near these boundaries will receive instant real-time route rerouting & hazard warnings.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }}>
        {/* Left: Map Preview & Polygon Canvas */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "rgba(17,24,32,0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "16px" }}>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "15px", fontWeight: 600, color: "#F8FAFC", marginBottom: "12px" }}>
              Active Spatial Red Zones Map
            </h2>
            <AdminRedZoneMap redZones={redZones} activeCoords={customCoords} />
          </div>
        </div>

        {/* Right: Create Red Zone Form & Active Zone List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Create Form */}
          <form
            onSubmit={handleCreateZone}
            style={{
              background: "rgba(17,24,32,0.9)",
              border: "1px solid rgba(78,222,163,0.3)",
              borderRadius: "16px",
              padding: "20px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}
          >
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "16px", fontWeight: 700, color: "#4EDEA3", margin: "0 0 16px 0" }}>
              ➕ Publish New Red Zone Boundary
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#CBD5E1", marginBottom: "6px" }}>
                  Zone Name / Identifier *
                </label>
                <input
                  type="text"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  placeholder="e.g. Canoly Canal Monsoonal Runoff Zone"
                  required
                  style={{
                    width: "100%",
                    background: "#0F172A",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    color: "#F8FAFC",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#CBD5E1", marginBottom: "6px" }}>
                  Risk Severity Level
                </label>
                <select
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(e.target.value as any)}
                  style={{
                    width: "100%",
                    background: "#0F172A",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    color: "#F8FAFC",
                    fontSize: "13px",
                    outline: "none",
                  }}
                >
                  <option value="LOW">LOW - Advisory Notice</option>
                  <option value="MEDIUM">MEDIUM - Caution / Slow Transit</option>
                  <option value="HIGH">HIGH - Danger / Reroute Recommended</option>
                  <option value="CRITICAL">CRITICAL - Strict No-Access Red Zone</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#CBD5E1", marginBottom: "6px" }}>
                  Hazard Description / Cause
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe reason for temporary closure or safety alert..."
                  style={{
                    width: "100%",
                    background: "#0F172A",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    color: "#F8FAFC",
                    fontSize: "13px",
                    outline: "none",
                    fontFamily: "'Inter', sans-serif",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                style={{
                  width: "100%",
                  background: "#10B981",
                  color: "#000F1D",
                  border: "none",
                  borderRadius: "10px",
                  padding: "12px",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  marginTop: "8px",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  send
                </span>
                {saving ? "Publishing GeoJSON..." : "Publish PostGIS Red Zone"}
              </button>
            </div>
          </form>

          {/* Active Red Zone List */}
          <div style={{ background: "rgba(17,24,32,0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "20px" }}>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "15px", fontWeight: 600, color: "#F8FAFC", marginBottom: "14px" }}>
              Published Active Red Zones ({redZones.length})
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {redZones.map((rz) => (
                <div
                  key={rz.id}
                  style={{
                    background: "#0F172A",
                    border: "1px solid rgba(239,68,68,0.25)",
                    borderRadius: "10px",
                    padding: "12px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: "#F1F5F9", fontSize: "13px" }}>{rz.name}</div>
                    <div style={{ fontSize: "11px", color: "#94A3B8" }}>{rz.description}</div>
                  </div>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "10px",
                      fontWeight: 600,
                      background: "rgba(239,68,68,0.2)",
                      color: "#EF4444",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      border: "1px solid rgba(239,68,68,0.3)",
                    }}
                  >
                    {rz.risk_level}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
