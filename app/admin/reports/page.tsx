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

      {/* Filter & Search Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "20px",
          background: "rgba(17,24,32,0.8)",
          padding: "12px 16px",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          {["all", "pending", "in_progress", "resolved"].map((st) => (
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
                border: filterStatus === st ? "1px solid #4EDEA3" : "1px solid rgba(255,255,255,0.1)",
                background: filterStatus === st ? "rgba(78,222,163,0.15)" : "transparent",
                color: filterStatus === st ? "#4EDEA3" : "#94A3B8",
              }}
            >
              {st === "all" ? "All Reports" : st.replace("_", " ").toUpperCase()}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "280px", background: "#0F172A", padding: "6px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }}>
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
              color: "#F1F5F9",
              fontSize: "12px",
              width: "100%",
            }}
          />
        </div>
      </div>

      {/* Main Table */}
      <div
        style={{
          background: "rgba(17,24,32,0.9)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "16px",
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#64748B", fontSize: "11px", background: "rgba(15,23,42,0.6)" }}>
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
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    fontSize: "13px",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 600, color: "#F1F5F9" }}>{rep.location_name}</div>
                    <div style={{ fontSize: "11px", color: "#64748B" }}>{rep.reporter_name || "Tourist User"}</div>
                  </td>
                  <td style={{ padding: "14px 16px", color: "#CBD5E1", fontSize: "12px" }}>
                    <span style={{ background: "rgba(255,255,255,0.06)", padding: "3px 8px", borderRadius: "6px" }}>
                      {rep.category}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", color: "#94A3B8", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
                      }}
                    >
                      {rep.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => setSelectedReport(rep)}
                      style={{
                        background: "rgba(78,222,163,0.1)",
                        color: "#4EDEA3",
                        border: "1px solid rgba(78,222,163,0.3)",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Review & Triage
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Review Modal */}
      {selectedReport && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#000F1D",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "520px",
              padding: "24px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "18px", fontWeight: 700, color: "#F8FAFC", margin: 0 }}>
                Incident Review: {selectedReport.location_name}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer" }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px", color: "#CBD5E1" }}>
              <div>
                <span style={{ color: "#64748B", fontSize: "11px" }}>CATEGORY:</span>
                <div style={{ fontWeight: 600, color: "#4EDEA3" }}>{selectedReport.category}</div>
              </div>
              <div>
                <span style={{ color: "#64748B", fontSize: "11px" }}>DESCRIPTION:</span>
                <p style={{ background: "rgba(17,24,32,0.8)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", margin: "4px 0 0" }}>
                  {selectedReport.description}
                </p>
              </div>
              <div style={{ display: "flex", gap: "16px" }}>
                <div>
                  <span style={{ color: "#64748B", fontSize: "11px" }}>SPATIAL COORDINATES:</span>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "#F1F5F9" }}>
                    📍 {selectedReport.lat.toFixed(4)}, {selectedReport.lng.toFixed(4)}
                  </div>
                </div>
                <div>
                  <span style={{ color: "#64748B", fontSize: "11px" }}>REPORTER:</span>
                  <div style={{ color: "#F1F5F9" }}>{selectedReport.reporter_name || "Tourist"}</div>
                </div>
              </div>

              <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
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
                        border: selectedReport.status === st ? "1px solid #4EDEA3" : "1px solid rgba(255,255,255,0.1)",
                        background: selectedReport.status === st ? "rgba(78,222,163,0.2)" : "rgba(17,24,32,0.8)",
                        color: selectedReport.status === st ? "#4EDEA3" : "#94A3B8",
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
