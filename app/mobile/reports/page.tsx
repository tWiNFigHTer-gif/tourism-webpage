"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/AuthProvider"
import { useAuth } from "@/lib/hooks/useAuth"
import FlatBottomNav from "@/components/mobile/FlatBottomNav"
import { getUserHazardReports } from "@/lib/db"

export interface UserReport {
  id: string
  category: string
  location_name: string
  description: string
  reported_at: string
  updated_at?: string
  status: "Submitted" | "Under Review" | "Verification in Progress" | "In Progress" | "Fixed" | "Rejected" | "Closed"
  assigned_authority?: string
  timeline: { title: string; time: string; completed: boolean }[]
}

const DEFAULT_SEED_REPORTS: UserReport[] = [
  {
    id: "rep-001",
    category: "Trash / Littering",
    location_name: "Canoly Canal & Sarovaram Eco Park",
    description: "Plastic accumulation noticed near the wooden boardwalk north section.",
    reported_at: "2026-07-25 14:30",
    updated_at: "2026-07-26 10:15",
    status: "In Progress",
    assigned_authority: "Kozhikode Municipal Eco Field Unit 3",
    timeline: [
      { title: "Report Submitted", time: "Jul 25, 14:30", completed: true },
      { title: "Under Review", time: "Jul 25, 16:00", completed: true },
      { title: "Verification in Progress", time: "Jul 26, 09:00", completed: true },
      { title: "In Progress", time: "Jul 26, 10:15", completed: true },
      { title: "Fixed & Verified", time: "Pending", completed: false },
    ],
  },
  {
    id: "rep-002",
    category: "Safety Hazard",
    location_name: "Mavoor Wetlands & Bird Sanctuary",
    description: "Broken handrail on observation deck #2 post heavy rains.",
    reported_at: "2026-07-22 09:15",
    updated_at: "2026-07-24 16:45",
    status: "Fixed",
    assigned_authority: "Wayanad-Kozhikode Forest Conservancy",
    timeline: [
      { title: "Report Submitted", time: "Jul 22, 09:15", completed: true },
      { title: "Under Review", time: "Jul 22, 11:30", completed: true },
      { title: "In Progress", time: "Jul 23, 14:00", completed: true },
      { title: "Fixed", time: "Jul 24, 16:45", completed: true },
      { title: "Closed", time: "Jul 24, 17:00", completed: true },
    ],
  },
]

function getStatusBadgeStyle(status: UserReport["status"]) {
  switch (status) {
    case "Submitted":
      return { bg: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", border: "rgba(96, 165, 250, 0.3)", icon: "outbox" }
    case "Under Review":
      return { bg: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", border: "rgba(251, 191, 36, 0.3)", icon: "search" }
    case "Verification in Progress":
      return { bg: "rgba(168, 85, 247, 0.15)", color: "#c084fc", border: "rgba(192, 132, 252, 0.3)", icon: "fact_check" }
    case "In Progress":
      return { bg: "rgba(234, 179, 8, 0.15)", color: "#facc15", border: "rgba(250, 204, 21, 0.3)", icon: "engineering" }
    case "Fixed":
      return { bg: "rgba(16, 185, 129, 0.18)", color: "#4edea3", border: "rgba(78, 222, 163, 0.35)", icon: "task_alt" }
    case "Rejected":
      return { bg: "rgba(239, 68, 68, 0.15)", color: "#f87171", border: "rgba(248, 113, 113, 0.3)", icon: "cancel" }
    case "Closed":
      return { bg: "rgba(100, 116, 139, 0.15)", color: "#94a3b8", border: "rgba(148, 163, 184, 0.3)", icon: "lock" }
    default:
      return { bg: "rgba(16, 185, 129, 0.15)", color: "#4edea3", border: "rgba(78, 222, 163, 0.3)", icon: "info" }
  }
}

function ReportsContent() {
  const router = useRouter()
  const { user } = useAuth()
  const [reports, setReports] = useState<UserReport[]>(DEFAULT_SEED_REPORTS)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(DEFAULT_SEED_REPORTS[0].id)

  useEffect(() => {
    async function loadReports() {
      setIsLoading(true)

      // Try local storage for offline / user submitted reports
      let local: UserReport[] = []
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("terra_my_reports")
          if (raw) local = JSON.parse(raw)
        } catch {/* ignore */}
      }

      // Try DB reports
      try {
        const dbData = await getUserHazardReports(user?.id)
        if (dbData && dbData.length > 0) {
          const mapped: UserReport[] = dbData.map((d: any, idx: number) => {
            const rawStatus = d.status === "resolved" ? "Fixed" : d.status === "open" ? "Under Review" : "Submitted"
            return {
              id: d.id || `rep-db-${idx}`,
              category: d.category || "Field Report",
              location_name: d.locations?.name || "Kerala Eco-Gem",
              description: d.description || "Report logged with Panchayat.",
              reported_at: d.reported_at ? new Date(d.reported_at).toLocaleString() : "Recently",
              updated_at: d.resolved_at ? new Date(d.resolved_at).toLocaleString() : "Just now",
              status: rawStatus,
              assigned_authority: d.panchayat_id ? `Panchayat ${d.panchayat_id} Authority` : "Local Panchayat Field Team",
              timeline: [
                { title: "Report Submitted", time: d.reported_at ? new Date(d.reported_at).toLocaleTimeString() : "Logged", completed: true },
                { title: "Under Review", time: d.status !== "open" ? "Reviewed" : "Pending", completed: d.status !== "open" },
                { title: "Fixed / Resolved", time: d.resolved_at ? new Date(d.resolved_at).toLocaleTimeString() : "Pending", completed: d.status === "resolved" },
              ],
            }
          })
          setReports([...local, ...mapped])
        } else if (local.length > 0) {
          setReports(local)
        }
      } catch {
        if (local.length > 0) setReports(local)
      } finally {
        setIsLoading(false)
      }
    }

    loadReports()
  }, [user?.id])

  return (
    <div style={{ backgroundColor: "#0a0e13", color: "#f0f4f8", minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />

      {/* Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          height: "56px",
          background: "rgba(12,33,50,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button
          type="button"
          onClick={() => router.push("/mobile/profile")}
          style={{ width: "34px", height: "34px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.10)", background: "#111820", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#bbcabf" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>arrow_back</span>
        </button>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "16px", fontWeight: 700, color: "#4edea3" }}>
            Civic Hazard Reports
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: "#4a6380", letterSpacing: "0.08em" }}>
            PANCHAYAT ACTION TRACKER
          </span>
        </div>

        <div style={{ width: "34px" }} />
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "16px 16px 100px", maxWidth: "480px", margin: "0 auto", width: "100%" }}>
        {/* Intro Card */}
        <div style={{ background: "#111820", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", padding: "16px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <span className="material-symbols-outlined" style={{ color: "#ffb95f", fontSize: "20px" }}>
              analytics
            </span>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "15px", fontWeight: 700, color: "#f0f4f8" }}>
              Submitted Field Issues ({reports.length})
            </h2>
          </div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#8fa3b8", lineHeight: 1.5 }}>
            Real-time status updates from local Panchayat eco-wardens and environmental authorities.
          </p>
        </div>

        {/* Reports List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {reports.map((report) => {
            const badge = getStatusBadgeStyle(report.status)
            const isExpanded = expandedId === report.id

            return (
              <div
                key={report.id}
                style={{
                  background: "#111820",
                  borderRadius: "16px",
                  border: isExpanded ? "1px solid rgba(78,222,163,0.35)" : "1px solid rgba(255,255,255,0.08)",
                  padding: "16px",
                  transition: "all 0.2s ease",
                }}
              >
                {/* Top header row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : report.id)}
                  style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", cursor: "pointer" }}
                >
                  <div>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9.5px", color: "#ffb95f", textTransform: "uppercase", fontWeight: 700 }}>
                      {report.category}
                    </span>
                    <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "16px", fontWeight: 700, color: "#f0f4f8", marginTop: "2px" }}>
                      {report.location_name}
                    </h3>
                  </div>

                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                      padding: "4px 10px",
                      borderRadius: "9999px",
                      fontSize: "11px",
                      fontWeight: 600,
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                      {badge.icon}
                    </span>
                    {report.status}
                  </span>
                </div>

                {/* Description */}
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#8fa3b8", marginTop: "10px", lineHeight: 1.5 }}>
                  "{report.description}"
                </p>

                {/* Metadata */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "12px", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: "11px", color: "#4a6380" }}>
                  <span>📅 Reported: {report.reported_at}</span>
                  {report.assigned_authority && (
                    <span style={{ color: "#4edea3", fontWeight: 500 }}>🏛️ {report.assigned_authority.split(" ")[0]} Unit</span>
                  )}
                </div>

                {/* Expanded Timeline View */}
                {isExpanded && (
                  <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px dashed rgba(255,255,255,0.1)" }}>
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#4a6380", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>
                      STATUS TIMELINE & PROGRESS
                    </p>

                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingLeft: "8px" }}>
                      {report.timeline.map((step, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: "12px", position: "relative" }}>
                          {/* Dot / Indicator */}
                          <div
                            style={{
                              width: "12px",
                              height: "12px",
                              borderRadius: "9999px",
                              background: step.completed ? "#4edea3" : "#233748",
                              border: step.completed ? "2px solid #003824" : "1px solid rgba(255,255,255,0.1)",
                              flexShrink: 0,
                              boxShadow: step.completed ? "0 0 8px rgba(16,185,129,0.4)" : "none",
                            }}
                          />

                          <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", fontWeight: step.completed ? 600 : 400, color: step.completed ? "#f0f4f8" : "#4a6380" }}>
                              {step.title}
                            </span>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: step.completed ? "#4edea3" : "#4a6380" }}>
                              {step.time}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>

      <FlatBottomNav active="profile" />
    </div>
  )
}

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <ReportsContent />
    </ProtectedRoute>
  )
}
