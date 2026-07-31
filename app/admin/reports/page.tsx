"use client";

import { useEffect, useState } from "react";
import { getCivicReports, updateCivicReportStatus } from "@/lib/db";
import type { HazardReport } from "@/lib/types";

export default function CivicReportsAdminPage() {
  const [reports, setReports] = useState<HazardReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedReport, setSelectedReport] = useState<HazardReport | null>(null);

  const fetchReports = async () => {
    try {
      const data = await getCivicReports();
      setReports(data);
    } catch (e) {
      console.error("Failed to load reports:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    const handleSync = () => fetchReports();
    window.addEventListener("storage", handleSync);
    window.addEventListener("storage_sync", handleSync);
    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("storage_sync", handleSync);
    };
  }, []);

  const handleStatusUpdate = async (id: string, status: "pending" | "in_progress" | "resolved") => {
    await updateCivicReportStatus(id, status);
    if (selectedReport?.id === id) {
      setSelectedReport({ ...selectedReport, status });
    }
    await fetchReports();
  };

  const filteredReports = reports.filter((r) => {
    const matchesStatus = filterStatus === "all" || r.status === filterStatus;
    const matchesSearch =
      r.location_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <span className="material-symbols-outlined" style={{ color: "#EF4444", fontSize: "18px" }}>
            warning
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#EF4444", fontWeight: 600 }}>
            CIVIC HAZARD TRIAGE PIPELINE
          </span>
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "26px", fontWeight: 700, color: "#F8FAFC", margin: 0 }}>
          Civic Incident Reports & Hazard Log
        </h1>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#94A3B8", marginTop: "4px" }}>
          Review, assign, and resolve environmental, infrastructure, and crowd overflow hazard reports submitted by tourists.
        </p>
      </div>

      {/* Controls: Filters & Search */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          {(["all", "pending", "in_progress", "resolved"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                fontFamily: "'Inter', sans-serif",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                border: filterStatus === st ? "1px solid rgba(5,150,105,0.4)" : "1px solid #CBD5E1",
                background: filterStatus === st ? "#ECFDF5" : "#FFFFFF",
                color: filterStatus === st ? "#059669" : "#475569",
              }}
            >
              {st === "all" ? "All Reports" : st.replace("_", " ").toUpperCase()}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "280px", background: "#FFFFFF", padding: "6px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "#64748B" }}>
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search location or category..."
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#0F172A",
              fontSize: "13px",
              width: "100%",
            }}
          />
        </div>
      </div>

      {/* Main Table */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #E2E8F0", color: "#475569", fontSize: "11px", background: "#F8FAFC" }}>
              <th style={{ padding: "14px 16px" }}>LOCATION</th>
              <th style={{ padding: "14px 16px" }}>CATEGORY</th>
              <th style={{ padding: "14px 16px" }}>DESCRIPTION Snippet</th>
              <th style={{ padding: "14px 16px" }}>REPORTED TIME</th>
              <th style={{ padding: "14px 16px" }}>STATUS</th>
              <th style={{ padding: "14px 16px", textAlign: "right" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "#64748B" }}>
                  Loading report logs...
                </td>
              </tr>
            ) : filteredReports.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "#64748B" }}>
                  No civic hazard reports found matching filters.
                </td>
              </tr>
            ) : (
              filteredReports.map((rep) => (
                <tr
                  key={rep.id}
                  style={{
                    borderBottom: "1px solid #F1F5F9",
                    fontSize: "13px",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 600, color: "#0F172A" }}>{rep.location_name}</div>
                    <div style={{ fontSize: "11px", color: "#64748B" }}>{rep.reporter_name || "Tourist User"}</div>
                  </td>
                  <td style={{ padding: "14px 16px", color: "#475569", fontSize: "12px" }}>
                    <span style={{ background: "#F1F5F9", padding: "3px 8px", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                      {rep.category}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", color: "#475569", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {rep.description}
                  </td>
                  <td style={{ padding: "14px 16px", color: "#64748B", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace" }}>
                    {new Date(rep.reported_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "10px",
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: "6px",
                        background:
                          rep.status === "pending"
                            ? "#FEF2F2"
                            : rep.status === "in_progress"
                            ? "#FFFBE6"
                            : "#ECFDF5",
                        color:
                          rep.status === "pending"
                            ? "#DC2626"
                            : rep.status === "in_progress"
                            ? "#D97706"
                            : "#059669",
                        border:
                          rep.status === "pending"
                            ? "1px solid #FECACA"
                            : rep.status === "in_progress"
                            ? "1px solid #FDE68A"
                            : "1px solid #A7F3D0",
                      }}
                    >
                      {(rep.status || "pending").replace("_", " ").toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => setSelectedReport(rep)}
                      style={{
                        background: "#F1F5F9",
                        border: "1px solid #CBD5E1",
                        color: "#0F172A",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Review & Status Triage Modal */}
      {selectedReport && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.4)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "520px",
              padding: "24px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "18px", fontWeight: 700, color: "#0F172A", margin: 0 }}>
                Incident Review: {selectedReport.location_name}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px", color: "#475569" }}>
              <div>
                <span style={{ color: "#64748B", fontSize: "11px" }}>CATEGORY:</span>
                <div style={{ fontWeight: 600, color: "#059669" }}>{selectedReport.category}</div>
              </div>
              <div>
                <span style={{ color: "#64748B", fontSize: "11px" }}>DESCRIPTION:</span>
                <p style={{ background: "#F8FAFC", padding: "10px", borderRadius: "8px", border: "1px solid #E2E8F0", margin: "4px 0 0", color: "#0F172A" }}>
                  {selectedReport.description}
                </p>
              </div>
              <div style={{ display: "flex", gap: "16px" }}>
                <div>
                  <span style={{ color: "#64748B", fontSize: "11px" }}>SPATIAL COORDINATES:</span>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "#0F172A" }}>
                    📍 {selectedReport.lat.toFixed(4)}, {selectedReport.lng.toFixed(4)}
                  </div>
                </div>
                <div>
                  <span style={{ color: "#64748B", fontSize: "11px" }}>REPORTER:</span>
                  <div style={{ color: "#0F172A" }}>{selectedReport.reporter_name || "Tourist"}</div>
                </div>
              </div>

              <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #E2E8F0" }}>
                <span style={{ color: "#64748B", fontSize: "11px", display: "block", marginBottom: "8px" }}>UPDATE INCIDENT STATUS:</span>
                <div style={{ display: "flex", gap: "8px" }}>
                  {(["pending", "in_progress", "resolved"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleStatusUpdate(selectedReport.id, st)}
                      style={{
                        flex: 1,
                        padding: "8px",
                        borderRadius: "8px",
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        border: selectedReport.status === st ? "1px solid rgba(5,150,105,0.4)" : "1px solid #CBD5E1",
                        background: selectedReport.status === st ? "#ECFDF5" : "#F8FAFC",
                        color: selectedReport.status === st ? "#059669" : "#475569",
                      }}
                    >
                      {st.replace("_", " ").toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
