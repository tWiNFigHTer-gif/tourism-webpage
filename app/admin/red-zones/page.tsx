"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getRedZones, insertRedZone, updateRedZone, deleteRedZone } from "@/lib/db";
import type { RedZone } from "@/lib/types";
import { DEMO_DESTINATIONS, type TouristDestinationNode } from "@/components/admin/AdminRedZoneMap";

const AdminRedZoneMap = dynamic(() => import("@/components/admin/AdminRedZoneMap"), {
  ssr: false,
  loading: () => (
    <div style={{ height: "460px", background: "#0F172A", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: "#4EDEA3" }}>
      Loading Spatial Node Map...
    </div>
  ),
});

export default function RedZoneManagerPage() {
  const [redZones, setRedZones] = useState<RedZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<TouristDestinationNode>(DEMO_DESTINATIONS[0]);
  const [hazardStatus, setHazardStatus] = useState<"NORMAL" | "WARNING" | "CRITICAL" | "RESOLVED">("WARNING");
  const [hazardDescription, setHazardDescription] = useState("");
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

  const handleSelectLocation = (loc: TouristDestinationNode) => {
    setSelectedLocation(loc);
    // Find active zone hazard if present
    const existing = redZones.find(
      (rz) =>
        rz.is_active !== false &&
        (rz.name?.toLowerCase().includes(loc.name.split(" ")[0].toLowerCase()) ||
          rz.description?.toLowerCase().includes(loc.name.split(" ")[0].toLowerCase()))
    );
    if (existing) {
      setHazardStatus((existing.risk_level as any) || "WARNING");
      setHazardDescription(existing.description || "");
    } else {
      setHazardStatus("NORMAL");
      setHazardDescription("");
    }
  };

  const handleUpdateHazard = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const matchingZone = redZones.find(
        (rz) =>
          rz.is_active !== false &&
          (rz.name?.toLowerCase().includes(selectedLocation.name.split(" ")[0].toLowerCase()) ||
            rz.description?.toLowerCase().includes(selectedLocation.name.split(" ")[0].toLowerCase()))
      );

      if (hazardStatus === "RESOLVED" || hazardStatus === "NORMAL") {
        // Resolve hazard: remove active overlays and archive incident
        const activeZonesToResolve = redZones.filter(
          (rz) =>
            rz.is_active !== false &&
            (rz.name?.toLowerCase().includes(selectedLocation.name.split(" ")[0].toLowerCase()) ||
              rz.description?.toLowerCase().includes(selectedLocation.name.split(" ")[0].toLowerCase()))
        );

        for (const zone of activeZonesToResolve) {
          await deleteRedZone(zone.id);
        }

        alert(`Hazard for "${selectedLocation.name}" has been marked RESOLVED. All overlays removed, tourists notified, and incident archived.`);
      } else {
        const zonePayload = {
          title: `${selectedLocation.name} - ${hazardStatus} Alert`,
          name: `${selectedLocation.name} - ${hazardStatus} Alert`,
          risk_level: hazardStatus === "CRITICAL" ? "CRITICAL" : "HIGH",
          description: hazardDescription || `Temporary ${hazardStatus} alert issued by Panchayat Official for ${selectedLocation.name}.`,
          coordinates: [
            [selectedLocation.lng - 0.005, selectedLocation.lat - 0.005],
            [selectedLocation.lng + 0.005, selectedLocation.lat - 0.005],
            [selectedLocation.lng + 0.005, selectedLocation.lat + 0.005],
            [selectedLocation.lng - 0.005, selectedLocation.lat + 0.005],
            [selectedLocation.lng - 0.005, selectedLocation.lat - 0.005],
          ],
          geojson_polygon: {
            type: "Feature",
            properties: { title: selectedLocation.name, risk_level: hazardStatus },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [selectedLocation.lng - 0.005, selectedLocation.lat - 0.005],
                  [selectedLocation.lng + 0.005, selectedLocation.lat - 0.005],
                  [selectedLocation.lng + 0.005, selectedLocation.lat + 0.005],
                  [selectedLocation.lng - 0.005, selectedLocation.lat + 0.005],
                  [selectedLocation.lng - 0.005, selectedLocation.lat - 0.005],
                ],
              ],
            },
          },
          is_active: true,
        } as any;

        // Publish or update warning/critical hazard
        if (matchingZone) {
          await updateRedZone(matchingZone.id, zonePayload);
        } else {
          await insertRedZone(zonePayload);
        }

        alert(`Dynamic Hazard Lifecycle for "${selectedLocation.name}" set to ${hazardStatus}. Tourist stream updated in real-time.`);
      }

      await fetchZones();
    } catch (e) {
      alert("Error updating hazard status");
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
            location_on
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#4EDEA3", fontWeight: 600 }}>
            DESTINATION NODE HAZARD LIFECYCLE CONTROLLER
          </span>
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "26px", fontWeight: 700, background: "linear-gradient(135deg, #059669 0%, #34d399 60%, #6ee7b7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", margin: 0 }}>
          Tourist Destination Hazard & Safety Manager
        </h1>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#94A3B8", marginTop: "4px" }}>
          Click any destination node on the map to issue temporary warning or critical alerts. Marking a hazard as Resolved immediately clears overlays and restores the destination to normal state.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }}>
        {/* Left: Map Preview with Clickable Place Markers */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "16px", padding: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "15px", fontWeight: 600, color: "#0F172A", margin: 0 }}>
                Spatial Tourist Places Map
              </h2>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#059669", fontWeight: 700 }}>
                Selected: {selectedLocation.name}
              </span>
            </div>
            <AdminRedZoneMap
              redZones={redZones}
              selectedLocationId={selectedLocation.id}
              onSelectLocation={handleSelectLocation}
            />
          </div>
        </div>

        {/* Right: Node Hazard Form & Active Incidents List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <form
            onSubmit={handleUpdateHazard}
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "16px",
              padding: "20px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "16px", fontWeight: 700, color: "#059669", margin: "0 0 16px 0" }}>
              📍 Manage Hazard Lifecycle
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#475569", fontWeight: 600, marginBottom: "6px" }}>
                  Selected Tourist Destination Node
                </label>
                <select
                  value={selectedLocation.id}
                  onChange={(e) => {
                    const found = DEMO_DESTINATIONS.find((d) => d.id === e.target.value);
                    if (found) handleSelectLocation(found);
                  }}
                  style={{
                    width: "100%",
                    background: "#FFFFFF",
                    border: "1px solid #CBD5E1",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    color: "#0F172A",
                    fontSize: "13.5px",
                    fontWeight: 500,
                    outline: "none",
                  }}
                >
                  {DEMO_DESTINATIONS.map((loc) => (
                    <option key={loc.id} value={loc.id} style={{ background: "#FFFFFF", color: "#0F172A" }}>
                      {loc.name} ({loc.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#475569", fontWeight: 600, marginBottom: "6px" }}>
                  Hazard Lifecycle Status
                </label>
                <select
                  value={hazardStatus}
                  onChange={(e) => setHazardStatus(e.target.value as any)}
                  style={{
                    width: "100%",
                    background: "#FFFFFF",
                    border: "1px solid #CBD5E1",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    color: "#0F172A",
                    fontSize: "13.5px",
                    fontWeight: 500,
                    outline: "none",
                  }}
                >
                  <option value="NORMAL" style={{ background: "#FFFFFF", color: "#0F172A" }}>🟢 NORMAL - All Clear (No Hazard Overlay)</option>
                  <option value="WARNING" style={{ background: "#FFFFFF", color: "#0F172A" }}>🟡 WARNING - Caution Alert (Amber Pulse)</option>
                  <option value="CRITICAL" style={{ background: "#FFFFFF", color: "#0F172A" }}>🔴 CRITICAL - Strict Danger Alert (Red Pulse)</option>
                  <option value="RESOLVED" style={{ background: "#FFFFFF", color: "#0F172A" }}>✅ RESOLVED - Clear Overlay & Archive Incident</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#475569", fontWeight: 600, marginBottom: "6px" }}>
                  Hazard Details / Official Advisory Note
                </label>
                <textarea
                  value={hazardDescription}
                  onChange={(e) => setHazardDescription(e.target.value)}
                  rows={3}
                  placeholder="Enter details regarding water level, trail obstruction, or high-tide advisory..."
                  style={{
                    width: "100%",
                    background: "#FFFFFF",
                    border: "1px solid #CBD5E1",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    color: "#0F172A",
                    fontSize: "13.5px",
                    fontWeight: 500,
                    outline: "none",
                    fontFamily: "'Inter', sans-serif",
                    resize: "none",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                style={{
                  width: "100%",
                  background: hazardStatus === "RESOLVED" || hazardStatus === "NORMAL" ? "#059669" : hazardStatus === "CRITICAL" ? "#DC2626" : "#D97706",
                  color: "#FFFFFF",
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
                  {hazardStatus === "RESOLVED" ? "check_circle" : "published_with_changes"}
                </span>
                {saving ? "Updating Status..." : `Update ${selectedLocation.name.split(" ")[0]} Status`}
              </button>
            </div>
          </form>

          {/* Active Hazards Stream */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "16px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "15px", fontWeight: 600, color: "#0F172A", marginBottom: "14px" }}>
              Active Destination Hazards ({redZones.length})
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {redZones.length === 0 ? (
                <div style={{ fontSize: "12px", color: "#64748B", textAlign: "center", padding: "12px" }}>
                  No active destination hazards. All locations in Normal state.
                </div>
              ) : (
                redZones.map((rz) => (
                  <div
                    key={rz.id}
                    style={{
                      background: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      borderRadius: "10px",
                      padding: "12px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: "#0F172A", fontSize: "13px" }}>{rz.name || rz.title}</div>
                      <div style={{ fontSize: "11px", color: "#64748B" }}>{rz.description}</div>
                    </div>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "10px",
                        fontWeight: 600,
                        background: "#FEF2F2",
                        color: "#DC2626",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        border: "1px solid #FECACA",
                      }}
                    >
                      {rz.risk_level}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
