"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getDashboardData, updateCivicReportStatus } from "@/lib/db";
import type { HazardReport, RedZone } from "@/lib/types";

export default function PanchayatDashboardPage() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [data, setData] = useState<{
    totalPasses: number;
    activeZones: number;
    pendingReports: number;
    inProgressReports: number;
    resolvedReports: number;
    reports: HazardReport[];
    redZones: RedZone[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await getDashboardData();
      setData(res);
    } catch (e) {
      console.error("Dashboard error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // 10s live polling
    window.addEventListener("storage", loadData);
    window.addEventListener("storage_sync", loadData);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", loadData);
      window.removeEventListener("storage_sync", loadData);
    };
  }, []);

  const handleStatusChange = async (id: string, newStatus: "pending" | "in_progress" | "resolved") => {
    await updateCivicReportStatus(id, newStatus);
    await loadData();
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#4EDEA3" }}>
        <span className="material-symbols-outlined animate-spin" style={{ fontSize: "32px" }}>
          sync
        </span>
        <p style={{ marginTop: "12px", fontFamily: "'Inter', sans-serif", fontSize: "14px", color: "#94A3B8" }}>
          Loading Panchayat Live Telemetry...
        </p>
      </div>
    );
  }

  const reports = data?.reports || [];
  const redZones = data?.redZones || [];

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "28px",
          paddingBottom: "16px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#10B981",
                boxShadow: "0 0 10px #10B981",
              }}
            />
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "11px",
                color: "#10B981",
                letterSpacing: "0.05em",
                fontWeight: 600,
              }}
            >
              LIVE STOP ! SPATIAL STREAM • CKP-2024
            </span>
          </div>
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "26px",
              fontWeight: 700,
              color: "#F8FAFC",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Panchayat Telemetry Dashboard
          </h1>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <Link
            href="/admin/red-zones"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(239,68,68,0.15)",
              color: "#FCA5A5",
              border: "1px solid rgba(239,68,68,0.3)",
              padding: "10px 16px",
              borderRadius: "10px",
              textDecoration: "none",
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              add_location_alt
            </span>
            Draw Red Zone
          </Link>

          <button
            type="button"
            onClick={loadData}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(255,255,255,0.06)",
              color: "#CBD5E1",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "10px 14px",
              borderRadius: "10px",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              refresh
            </span>
            Refresh
          </button>

          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.push("/login");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(239, 68, 68, 0.15)",
              color: "#EF4444",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              padding: "10px 14px",
              borderRadius: "10px",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              logout
            </span>
            Logout
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "18px",
          marginBottom: "32px",
        }}
      >
        {/* Metric 1: Total Attractions */}
        <div
          style={{
            background: "rgba(17,24,32,0.9)",
            border: "1px solid rgba(78,222,163,0.3)",
            borderRadius: "14px",
            padding: "20px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "12.5px", color: "#94A3B8", fontWeight: 500 }}>
              Total Attractions
            </span>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(78,222,163,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#4EDEA3",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                location_on
              </span>
            </div>
          </div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "28px", fontWeight: 700, color: "#4EDEA3" }}>
            29 Locations
          </div>
          <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "8px" }}>
            Kerala Eco-Tourism & Heritage Sites
          </div>
        </div>

        {/* Metric 2: Active Red Zones */}
        <div
          style={{
            background: "rgba(17,24,32,0.9)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "14px",
            padding: "20px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "12.5px", color: "#94A3B8", fontWeight: 500 }}>
              Active Red Zones
            </span>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(239,68,68,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#EF4444",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                polyline
              </span>
            </div>
          </div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "28px", fontWeight: 700, color: "#EF4444" }}>
            {redZones.length} Polygons
          </div>
          <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "8px" }}>
            PostGIS Danger Boundaries Active
          </div>
        </div>

        {/* Metric 3 */}
        <div
          style={{
            background: "rgba(17,24,32,0.9)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: "14px",
            padding: "20px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "12.5px", color: "#94A3B8", fontWeight: 500 }}>
              Pending Civic Reports
            </span>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(239,68,68,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#EF4444",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                warning
              </span>
            </div>
          </div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "28px", fontWeight: 700, color: "#EF4444" }}>
            {data?.pendingReports || 0}{" "}
            <span style={{ fontSize: "14px", color: "#94A3B8", fontWeight: 400 }}>Requires Action</span>
          </div>
          <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "8px" }}>
            {data?.inProgressReports || 0} In Progress • {data?.resolvedReports || 0} Resolved
          </div>
        </div>

        {/* Metric 4 */}
        <div
          style={{
            background: "rgba(17,24,32,0.9)",
            border: "1px solid rgba(78,222,163,0.2)",
            borderRadius: "14px",
            padding: "20px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "12.5px", color: "#94A3B8", fontWeight: 500 }}>
              Active Spatial Red Zones
            </span>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(78,222,163,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#4EDEA3",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                polyline
              </span>
            </div>
          </div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "28px", fontWeight: 700, color: "#4EDEA3" }}>
            {redZones.length} Polygons
          </div>
          <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "8px" }}>
            Synced with Tourist Safety Routing Engine
          </div>
        </div>
      </div>

      {/* Main Grid Section: Zone Capacities & Live Incident Triage */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
        {/* Left Column: Live Zone Carrying Capacities */}
        <div
          style={{
            background: "rgba(17,24,32,0.9)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <h2
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "16px",
                fontWeight: 700,
                color: "#F8FAFC",
                margin: 0,
              }}
            >
              Zone Carrying Capacities
            </h2>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10px",
                color: "#4EDEA3",
                background: "rgba(78,222,163,0.1)",
                padding: "2px 6px",
                borderRadius: "4px",
              }}
            >
              ST_Aggregate
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Zone 1 */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                <span style={{ color: "#E2E8F0", fontWeight: 600 }}>Canoly Canal Walkway</span>
                <span style={{ color: "#F59E0B", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                  42 / 50 (84%)
                </span>
              </div>
              <div style={{ height: "6px", background: "#0F172A", borderRadius: "999px", overflow: "hidden" }}>
                <div
                  style={{
                    width: "84%",
                    height: "100%",
                    background: "#F59E0B",
                    borderRadius: "999px",
                  }}
                />
              </div>
            </div>

            {/* Zone 2 */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                <span style={{ color: "#E2E8F0", fontWeight: 600 }}>Kadalundi Bird Sanctuary</span>
                <span style={{ color: "#EF4444", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                  38 / 40 (95% FULL)
                </span>
              </div>
              <div style={{ height: "6px", background: "#0F172A", borderRadius: "999px", overflow: "hidden" }}>
                <div
                  style={{
                    width: "95%",
                    height: "100%",
                    background: "#EF4444",
                    borderRadius: "999px",
                  }}
                />
              </div>
            </div>

            {/* Zone 3 */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                <span style={{ color: "#E2E8F0", fontWeight: 600 }}>Janakikattu Eco Forest</span>
                <span style={{ color: "#10B981", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                  25 / 60 (41%)
                </span>
              </div>
              <div style={{ height: "6px", background: "#0F172A", borderRadius: "999px", overflow: "hidden" }}>
                <div
                  style={{
                    width: "41%",
                    height: "100%",
                    background: "#10B981",
                    borderRadius: "999px",
                  }}
                />
              </div>
            </div>

            {/* Zone 4 */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                <span style={{ color: "#E2E8F0", fontWeight: 600 }}>Kakkayam Dam Viewpoint</span>
                <span style={{ color: "#10B981", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                  18 / 50 (36%)
                </span>
              </div>
              <div style={{ height: "6px", background: "#0F172A", borderRadius: "999px", overflow: "hidden" }}>
                <div
                  style={{
                    width: "36%",
                    height: "100%",
                    background: "#10B981",
                    borderRadius: "999px",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Civic Hazard Triage Table */}
        <div
          style={{
            background: "rgba(17,24,32,0.9)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h2
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#F8FAFC",
                  margin: 0,
                }}
              >
                Civic Hazard Incident Triage
              </h2>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#64748B", margin: 0 }}>
                Tourist-submitted environmental & safety hazards
              </p>
            </div>
            <Link
              href="/admin/reports"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "12px",
                color: "#4EDEA3",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              View All →
            </Link>
          </div>

          {/* Incident Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#64748B", fontSize: "11px" }}>
                  <th style={{ padding: "10px 12px" }}>INCIDENT / LOCATION</th>
                  <th style={{ padding: "10px 12px" }}>CATEGORY</th>
                  <th style={{ padding: "10px 12px" }}>STATUS</th>
                  <th style={{ padding: "10px 12px", textAlign: "right" }}>TRIAGE ACTION</th>
                </tr>
              </thead>
              <tbody>
                {reports.slice(0, 5).map((rep) => (
                  <tr
                    key={rep.id}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      fontSize: "13px",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontWeight: 600, color: "#F1F5F9" }}>{rep.location_name}</div>
                      <div style={{ fontSize: "11px", color: "#64748B" }}>
                        By {rep.reporter_name || "Tourist"} • {new Date(rep.reported_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td style={{ padding: "12px", color: "#CBD5E1", fontSize: "12px" }}>{rep.category}</td>
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: "10px",
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: "6px",
                          background:
                            rep.status === "pending"
                              ? "rgba(239,68,68,0.2)"
                              : rep.status === "in_progress"
                              ? "rgba(245,158,11,0.2)"
                              : "rgba(16,185,129,0.2)",
                          color:
                            rep.status === "pending"
                              ? "#EF4444"
                              : rep.status === "in_progress"
                              ? "#F59E0B"
                              : "#10B981",
                          border:
                            rep.status === "pending"
                              ? "1px solid rgba(239,68,68,0.3)"
                              : rep.status === "in_progress"
                              ? "1px solid rgba(245,158,11,0.3)"
                              : "1px solid rgba(16,185,129,0.3)",
                        }}
                      >
                        {rep.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "12px", textAlign: "right" }}>
                      <select
                        value={rep.status}
                        onChange={(e) => handleStatusChange(rep.id, e.target.value as any)}
                        style={{
                          background: "#0F172A",
                          color: "#94A3B8",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "6px",
                          padding: "4px 8px",
                          fontSize: "11px",
                          cursor: "pointer",
                        }}
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
