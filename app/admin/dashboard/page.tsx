"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getDashboardData, updateCivicReportStatus, type ActivityItem } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import type { HazardReport, RedZone } from "@/lib/types";
import dynamic from "next/dynamic";

const AdminRedZoneMap = dynamic(() => import("@/components/admin/AdminRedZoneMap"), {
  ssr: false,
  loading: () => (
    <div style={{ height: "460px", background: "#0F172A", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: "#4EDEA3" }}>
      Loading Spatial Node Map Preview...
    </div>
  ),
});

export default function PanchayatDashboardPage() {
  const router = useRouter();
  const { signOut } = useAuth();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === "SIGNED_OUT") {
        router.push("/login");
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);
  const [data, setData] = useState<{
    totalPasses: number;
    activeZones: number;
    pendingReports: number;
    inProgressReports: number;
    resolvedReports: number;
    totalLocations?: number;
    reports: HazardReport[];
    redZones: RedZone[];
    recentActivity?: ActivityItem[];
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
  const recentActivity = data?.recentActivity || [];

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
              LIVE TERRAPULSE SPATIAL STREAM • CKP-2024
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
            aria-label="Sign out"
            onClick={async () => {
              await supabase.auth.signOut();
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
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
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
            {data?.totalLocations || 11} Locations
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

        {/* Metric 3: Pending Civic Reports */}
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

        {/* Metric 4: Total Passes Booked */}
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
              Total Passes Booked
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
                qr_code
              </span>
            </div>
          </div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "28px", fontWeight: 700, color: "#4EDEA3" }}>
            {data?.totalPasses || 0} Passes
          </div>
          <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "8px" }}>
            Scanned & Active QR Reservations
          </div>
        </div>
      </div>

      {/* Row 2: Shortcuts, Zone Capacities & Map Preview */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px", marginBottom: "32px" }}>
        {/* Left Column: Shortcuts Panel & Carrying Capacities */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Shortcuts Panel */}
          <div
            style={{
              background: "rgba(17,24,32,0.9)",
              border: "1px solid rgba(78,222,163,0.25)",
              borderRadius: "16px",
              padding: "20px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            }}
          >
            <h2
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "15px",
                fontWeight: 700,
                color: "#4EDEA3",
                margin: "0 0 14px 0",
              }}
            >
              ⚡ Quick Portal Shortcuts
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Link
                href="/admin/red-zones"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "12px",
                  borderRadius: "10px",
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  color: "#FCA5A5",
                  textDecoration: "none",
                  transition: "all 0.2s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                    add_location_alt
                  </span>
                  <span style={{ fontWeight: 600, fontSize: "13px" }}>Draw Red Zone</span>
                </div>
                <span style={{ fontSize: "10px", color: "#94A3B8" }}>Mark danger areas on safety grid</span>
              </Link>

              <Link
                href="/admin/passes"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "12px",
                  borderRadius: "10px",
                  background: "rgba(16,185,129,0.08)",
                  border: "1px solid rgba(16,185,129,0.25)",
                  color: "#4EDEA3",
                  textDecoration: "none",
                  transition: "all 0.2s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                    qr_code_scanner
                  </span>
                  <span style={{ fontWeight: 600, fontSize: "13px" }}>Verify Pass</span>
                </div>
                <span style={{ fontSize: "10px", color: "#94A3B8" }}>Scan and check in tourist codes</span>
              </Link>

              <Link
                href="/admin/reports"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "12px",
                  borderRadius: "10px",
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.25)",
                  color: "#FCD34D",
                  textDecoration: "none",
                  transition: "all 0.2s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                    warning
                  </span>
                  <span style={{ fontWeight: 600, fontSize: "13px" }}>Civic Triage</span>
                </div>
                <span style={{ fontSize: "10px", color: "#94A3B8" }}>Triage reports & manage safety</span>
              </Link>

              <Link
                href="/mobile"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "12px",
                  borderRadius: "10px",
                  background: "rgba(59,130,246,0.08)",
                  border: "1px solid rgba(59,130,246,0.25)",
                  color: "#93C5FD",
                  textDecoration: "none",
                  transition: "all 0.2s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                    map
                  </span>
                  <span style={{ fontWeight: 600, fontSize: "13px" }}>Tourist Map</span>
                </div>
                <span style={{ fontSize: "10px", color: "#94A3B8" }}>View client spatial routing map</span>
              </Link>
            </div>
          </div>

          {/* Zone Carrying Capacities */}
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
                  fontSize: "15px",
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
        </div>

        {/* Right Column: Spatial Map Preview */}
        <div
          style={{
            background: "rgba(17,24,32,0.9)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h2
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "15px",
                fontWeight: 700,
                color: "#F8FAFC",
                margin: 0,
              }}
            >
              🗺️ Spatial Safe-Zone Map Preview
            </h2>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#64748B" }}>
              Active Red Zones: {redZones.length}
            </span>
          </div>
          <div style={{ flex: 1, minHeight: "360px", position: "relative" }}>
            <AdminRedZoneMap
              redZones={redZones}
              onSelectLocation={(loc) => {
                router.push(`/admin/red-zones`);
              }}
            />
          </div>
        </div>
      </div>

      {/* Row 3: Combined Activity Feed & Incident Triage Table */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "24px" }}>
        {/* Left Column: Live Activity Feed */}
        <div
          style={{
            background: "rgba(17,24,32,0.9)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
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
              📋 Real-time Activity Feed
            </h2>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10px",
                color: "#10B981",
                background: "rgba(16,185,129,0.1)",
                padding: "2px 6px",
                borderRadius: "4px",
              }}
            >
              Live Feed
            </span>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              overflowY: "auto",
              maxHeight: "420px",
              paddingRight: "4px",
            }}
          >
            {recentActivity.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#64748B", fontSize: "13px", fontFamily: "'Inter', sans-serif" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "36px", marginBottom: "8px", opacity: 0.5 }}>
                  history
                </span>
                <p>No recent actions logged on Safety Grid.</p>
              </div>
            ) : (
              recentActivity.map((act) => (
                <div
                  key={act.id}
                  style={{
                    display: "flex",
                    gap: "12px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.04)",
                    borderRadius: "10px",
                    padding: "10px 12px",
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "6px",
                      background: `${act.color}15`,
                      border: `1px solid ${act.color}35`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: act.color,
                      flexShrink: 0,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                      {act.icon}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "12.5px", fontWeight: 700, color: "#F8FAFC" }}>
                        {act.title}
                      </span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: "#64748B" }}>
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "11.5px", color: "#CBD5E1", margin: 0, lineHeight: 1.4 }}>
                      {act.description}
                    </p>
                  </div>
                </div>
              ))
            )}
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
                        By {rep.reporter_name || "Tourist"} • {new Date(rep.reported_at || rep.created_at || new Date().toISOString()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
