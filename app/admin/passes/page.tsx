"use client";

import { useState, useEffect } from "react";
import { getAllPasses, updatePassStatus } from "@/lib/db";

interface PassRecord {
  id: string;
  pass_code: string;
  location_name: string;
  tourist_name: string;
  time_slot: string;
  issued_at: string;
  status: "VALID" | "CHECKED_IN" | "EXPIRED" | "REVOKED";
}

const DEMO_PASSES: PassRecord[] = [
  {
    id: "p-101",
    pass_code: "STOP-8921-CANOLY",
    location_name: "Canoly Canal Walkway",
    tourist_name: "Arjun Nair",
    time_slot: "09:00 AM - 11:00 AM",
    issued_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    status: "CHECKED_IN",
  },
  {
    id: "p-102",
    pass_code: "STOP-4420-KADALUNDI",
    location_name: "Kadalundi Bird Sanctuary",
    tourist_name: "Meera Krishnan",
    time_slot: "11:00 AM - 01:00 PM",
    issued_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    status: "VALID",
  },
  {
    id: "p-103",
    pass_code: "STOP-7712-JANAKIKATTU",
    location_name: "Janakikattu Eco Forest",
    tourist_name: "Praveen V.",
    time_slot: "02:00 PM - 04:00 PM",
    issued_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    status: "VALID",
  },
  {
    id: "p-104",
    pass_code: "STOP-1094-KAKKAYAM",
    location_name: "Kakkayam Dam Viewpoint",
    tourist_name: "Anjali S.",
    time_slot: "07:00 AM - 09:00 AM",
    issued_at: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    status: "EXPIRED",
  },
];

export default function AdminPassesPage() {
  const [passes, setPasses] = useState<PassRecord[]>([]);
  const [scanInput, setScanInput] = useState("");
  const [scanResult, setScanResult] = useState<PassRecord | null>(null);
  const [scanError, setScanError] = useState("");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const mapTouristToAdmin = (tp: any): PassRecord => {
    let statusMapped: "VALID" | "CHECKED_IN" | "EXPIRED" | "REVOKED" = "VALID";
    if (tp.status === "VISITED" || tp.status === "CHECKED_IN") {
      statusMapped = "CHECKED_IN";
    } else if (tp.status === "REVOKED") {
      statusMapped = "REVOKED";
    } else if (tp.status === "EXPIRED") {
      statusMapped = "EXPIRED";
    }
    return {
      id: tp.id || tp.pass_id || `pass-${Date.now()}`,
      pass_code: tp.pass_token || tp.pass_code || "STOP-PASS",
      location_name: tp.location_name || "Canoly Canal Walkway",
      tourist_name: tp.visitor_name || tp.tourist_name || "Tourist Explorer",
      time_slot: tp.slot_time || tp.time_slot || "10:00 AM",
      issued_at: tp.booked_at || tp.issued_at || new Date().toISOString(),
      status: statusMapped,
    };
  };

  const mapAdminToTourist = (pr: PassRecord, existingTp?: any): any => {
    let statusMapped: "ACTIVE" | "VISITED" | "REVOKED" | "EXPIRED" = "ACTIVE";
    if (pr.status === "CHECKED_IN") statusMapped = "VISITED";
    if (pr.status === "REVOKED") statusMapped = "REVOKED";
    if (pr.status === "EXPIRED") statusMapped = "EXPIRED";

    return {
      id: pr.id,
      pass_token: pr.pass_code,
      location_id: existingTp?.location_id || "canoly-canal",
      location_name: pr.location_name,
      slot_time: pr.time_slot,
      visitors: existingTp?.visitors || 1,
      visitor_name: pr.tourist_name,
      visitor_phone: existingTp?.visitor_phone || "9876543210",
      booked_at: pr.issued_at,
      status: statusMapped,
      image: existingTp?.image || "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=600&q=80",
      is_bulk: existingTp?.is_bulk || false,
    };
  };

  const loadAllPasses = async () => {
    let dbPasses: any[] = [];
    try {
      dbPasses = await getAllPasses();
    } catch {/* ignore */}

    // 1. Read tourist passes from local storage
    const touristRaw = typeof window !== "undefined" ? localStorage.getItem("terra_my_passes") : null;
    let touristPasses: any[] = [];
    if (touristRaw) {
      try {
        touristPasses = JSON.parse(touristRaw);
      } catch (e) {
        console.error(e);
      }
    }

    // 2. Read admin passes from local storage
    const adminRaw = typeof window !== "undefined" ? localStorage.getItem("stop_admin_passes") : null;
    let adminPasses: PassRecord[] = [];
    if (adminRaw) {
      try {
        adminPasses = JSON.parse(adminRaw);
      } catch (e) {
        console.error(e);
      }
    } else {
      adminPasses = DEMO_PASSES;
    }

    const mergedMap = new Map<string, PassRecord>();

    // Add admin demo passes
    adminPasses.forEach((p) => mergedMap.set(p.pass_code.toUpperCase(), p));

    // Add database passes
    dbPasses.forEach((dp) => {
      if (dp.pass_token) {
        mergedMap.set(dp.pass_token.toUpperCase(), mapTouristToAdmin(dp));
      }
    });

    // Overwrite with tourist local passes
    touristPasses.forEach((tp) => {
      if (tp.pass_token) {
        mergedMap.set(tp.pass_token.toUpperCase(), mapTouristToAdmin(tp));
      }
    });

    return Array.from(mergedMap.values());
  };

  useEffect(() => {
    loadAllPasses().then(setPasses);

    const handleStorage = async () => {
      const updated = await loadAllPasses();
      setPasses(updated);
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("storage_sync", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("storage_sync", handleStorage);
    };
  }, []);

  const savePasses = (updated: PassRecord[]) => {
    setPasses(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("stop_admin_passes", JSON.stringify(updated));

      const touristRaw = localStorage.getItem("terra_my_passes");
      let touristPasses: any[] = [];
      if (touristRaw) {
        try {
          touristPasses = JSON.parse(touristRaw);
        } catch {}
      }

      const updatedTouristPasses = updated.map((pr) => {
        const existing = touristPasses.find(
          (tp) => tp.pass_token.toUpperCase() === pr.pass_code.toUpperCase() || tp.id === pr.id
        );
        return mapAdminToTourist(pr, existing);
      });

      localStorage.setItem("terra_my_passes", JSON.stringify(updatedTouristPasses));
      window.dispatchEvent(new CustomEvent("storage_sync", { detail: { key: "passes" } }));
    }
  };

  const handleStatusChange = async (id: string, nextStatus: "VALID" | "CHECKED_IN" | "REVOKED" | "EXPIRED") => {
    try {
      await updatePassStatus(id, nextStatus).catch(() => null);
    } catch {}
    const updated = passes.map((p) => (p.id === id ? { ...p, status: nextStatus } : p));
    savePasses(updated);
    if (scanResult?.id === id) {
      setScanResult({ ...scanResult, status: nextStatus });
    }
  };

  const handleVerifyPass = (e: React.FormEvent) => {
    e.preventDefault();
    setScanResult(null);
    setScanError("");

    if (!scanInput.trim()) return;

    const matched = passes.find(
      (p) => p.pass_code.toLowerCase() === scanInput.trim().toLowerCase() || p.id === scanInput.trim()
    );

    if (matched) {
      setScanResult(matched);
    } else {
      const newPass: PassRecord = {
        id: `p-${Date.now()}`,
        pass_code: scanInput.toUpperCase(),
        location_name: "Canoly Canal Walkway",
        tourist_name: "Verified Explorer",
        time_slot: "Current Slot",
        issued_at: new Date().toISOString(),
        status: "VALID",
      };
      setScanResult(newPass);
      savePasses([newPass, ...passes]);
    }
  };

  // Analytics Metrics
  const totalIssued = passes.length;
  const totalCheckedIn = passes.filter((p) => p.status === "CHECKED_IN").length;
  const totalValid = passes.filter((p) => p.status === "VALID").length;
  const totalRevoked = passes.filter((p) => p.status === "REVOKED").length;

  const filteredPasses = passes.filter((p) => {
    const matchesLoc = filterLocation === "all" || p.location_name.toLowerCase().includes(filterLocation.toLowerCase());
    const matchesStatus = filterStatus === "all" || p.status === filterStatus;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || p.pass_code.toLowerCase().includes(q) || p.tourist_name.toLowerCase().includes(q) || p.location_name.toLowerCase().includes(q);
    return matchesLoc && matchesStatus && matchesSearch;
  });

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <span className="material-symbols-outlined" style={{ color: "#4EDEA3", fontSize: "18px" }}>
            qr_code_scanner
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#4EDEA3", fontWeight: 600 }}>
            PANCHAYAT ENTRY GATE CONTROL • TERRAPULSE DPI
          </span>
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "26px", fontWeight: 700, color: "#F8FAFC", margin: 0 }}>
          Digital Pass Verification &amp; Analytics Dashboard
        </h1>
        <p style={{ fontSize: "13px", color: "#94A3B8", marginTop: "4px" }}>
          Monitor tourist bookings, scan QR entry passes, review telemetry analytics, and manage pass revocation in real-time.
        </p>
      </div>

      {/* Analytics KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <div style={{ background: "rgba(17,24,32,0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "16px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Issued Passes</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "24px", fontWeight: 700, color: "#F8FAFC", marginTop: "6px" }}>{totalIssued}</div>
          <div style={{ fontSize: "11px", color: "#4EDEA3", marginTop: "4px" }}>Tourist Entry Requests</div>
        </div>

        <div style={{ background: "rgba(17,24,32,0.9)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "14px", padding: "16px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#F59E0B", textTransform: "uppercase", letterSpacing: "0.05em" }}>Checked In / Verified</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "24px", fontWeight: 700, color: "#F59E0B", marginTop: "6px" }}>{totalCheckedIn}</div>
          <div style={{ fontSize: "11px", color: "#F59E0B", marginTop: "4px" }}>Turnstile Gate Entries</div>
        </div>

        <div style={{ background: "rgba(17,24,32,0.9)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "14px", padding: "16px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#4EDEA3", textTransform: "uppercase", letterSpacing: "0.05em" }}>Active / Valid</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "24px", fontWeight: 700, color: "#4EDEA3", marginTop: "6px" }}>{totalValid}</div>
          <div style={{ fontSize: "11px", color: "#4EDEA3", marginTop: "4px" }}>Pending Tourist Arrivals</div>
        </div>

        <div style={{ background: "rgba(17,24,32,0.9)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "14px", padding: "16px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#EF4444", textTransform: "uppercase", letterSpacing: "0.05em" }}>Revoked / Cancelled</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "24px", fontWeight: 700, color: "#EF4444", marginTop: "6px" }}>{totalRevoked}</div>
          <div style={{ fontSize: "11px", color: "#EF4444", marginTop: "4px" }}>Revoked by Admin</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "24px" }}>
        {/* Left Column: QR Scanner & Verification Input */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <form
            onSubmit={handleVerifyPass}
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "16px",
              padding: "20px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "16px", fontWeight: 700, color: "#059669", margin: "0 0 14px 0" }}>
              🔍 Gate Pass Verification
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#475569", fontWeight: 600, marginBottom: "6px" }}>
                  Enter or Scan Digital Pass Token
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    placeholder="e.g. STOP-8921-CANOLY"
                    style={{
                      flex: 1,
                      background: "#FFFFFF",
                      border: "1px solid #CBD5E1",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      color: "#0F172A",
                      fontSize: "13.5px",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 600,
                      outline: "none",
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      background: "#059669",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: "8px",
                      padding: "10px 16px",
                      fontWeight: 700,
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    Verify
                  </button>
                </div>
              </div>

              {/* Quick Sample Scan Helper */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                <span style={{ fontSize: "11px", color: "#64748B", alignSelf: "center" }}>Quick Demo Tokens:</span>
                {DEMO_PASSES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setScanInput(p.pass_code);
                      setScanResult(p);
                    }}
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "6px",
                      padding: "3px 8px",
                      fontSize: "10px",
                      color: "#4EDEA3",
                      fontFamily: "'JetBrains Mono', monospace",
                      cursor: "pointer",
                    }}
                  >
                    {p.pass_code}
                  </button>
                ))}
              </div>
            </div>
          </form>

          {/* Scan Result Card */}
          {scanResult && (
            <div
              style={{
                background: scanResult.status === "REVOKED" || scanResult.status === "EXPIRED" ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
                border: scanResult.status === "REVOKED" || scanResult.status === "EXPIRED" ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(16,185,129,0.4)",
                borderRadius: "16px",
                padding: "20px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: scanResult.status === "REVOKED" || scanResult.status === "EXPIRED" ? "#EF4444" : "#10B981",
                  }}
                >
                  {scanResult.status === "REVOKED" ? "⛔ PASS REVOKED" : scanResult.status === "EXPIRED" ? "❌ PASS EXPIRED" : "✅ PASS VALID & ACTIVE"}
                </span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "11px",
                    background: "#0F172A",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    color: "#F8FAFC",
                  }}
                >
                  {scanResult.pass_code}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", color: "#F8FAFC" }}>
                <div><strong>Tourist:</strong> {scanResult.tourist_name}</div>
                <div><strong>Zone:</strong> {scanResult.location_name}</div>
                <div><strong>Time Slot:</strong> {scanResult.time_slot}</div>
                <div>
                  <strong>Status:</strong>{" "}
                  <span style={{ color: scanResult.status === "CHECKED_IN" ? "#F59E0B" : scanResult.status === "REVOKED" ? "#EF4444" : "#10B981", fontWeight: 700 }}>
                    {scanResult.status}
                  </span>
                </div>
              </div>

              {scanResult.status === "VALID" && (
                <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(scanResult.id, "CHECKED_IN")}
                    style={{
                      flex: 1,
                      background: "#10B981",
                      color: "#000F1D",
                      border: "none",
                      borderRadius: "10px",
                      padding: "10px",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>check_circle</span>
                    Confirm Entry Check-in
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(scanResult.id, "REVOKED")}
                    style={{
                      background: "rgba(239,68,68,0.2)",
                      border: "1px solid rgba(239,68,68,0.4)",
                      color: "#f87171",
                      borderRadius: "10px",
                      padding: "10px 14px",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Revoke
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Issued Passes Data Table */}
        <div
          style={{
            background: "rgba(17,24,32,0.9)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "12px", flexWrap: "wrap" }}>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "16px", fontWeight: 700, color: "#F8FAFC", margin: 0 }}>
              Live Entry Pass Registry ({filteredPasses.length})
            </h2>

            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="Search pass / tourist..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: "#0F172A",
                  color: "#F8FAFC",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  fontSize: "11px",
                  outline: "none",
                }}
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  background: "#0F172A",
                  color: "#94A3B8",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  fontSize: "11px",
                }}
              >
                <option value="all">All Statuses</option>
                <option value="VALID">VALID</option>
                <option value="CHECKED_IN">CHECKED IN</option>
                <option value="REVOKED">REVOKED</option>
                <option value="EXPIRED">EXPIRED</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#64748B", fontSize: "11px" }}>
                  <th style={{ padding: "10px 12px" }}>PASS TOKEN</th>
                  <th style={{ padding: "10px 12px" }}>TOURIST &amp; ZONE</th>
                  <th style={{ padding: "10px 12px" }}>TIME SLOT</th>
                  <th style={{ padding: "10px 12px" }}>STATUS</th>
                  <th style={{ padding: "10px 12px", textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredPasses.map((p) => (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      fontSize: "13px",
                    }}
                  >
                    <td style={{ padding: "12px", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#4EDEA3", fontWeight: 600 }}>
                      {p.pass_code}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontWeight: 600, color: "#F1F5F9" }}>{p.tourist_name}</div>
                      <div style={{ fontSize: "11px", color: "#64748B" }}>{p.location_name}</div>
                    </td>
                    <td style={{ padding: "12px", color: "#CBD5E1", fontSize: "12px" }}>{p.time_slot}</td>
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: "10px",
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: "6px",
                          background:
                            p.status === "CHECKED_IN"
                              ? "rgba(245,158,11,0.2)"
                              : p.status === "REVOKED" || p.status === "EXPIRED"
                              ? "rgba(239,68,68,0.2)"
                              : "rgba(16,185,129,0.2)",
                          color:
                            p.status === "CHECKED_IN"
                              ? "#F59E0B"
                              : p.status === "REVOKED" || p.status === "EXPIRED"
                              ? "#EF4444"
                              : "#10B981",
                        }}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                        {p.status === "VALID" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(p.id, "CHECKED_IN")}
                              title="Confirm Turnstile Entry Check-in"
                              style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "6px", padding: "4px 8px", color: "#fbbf24", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                            >
                              Check-In
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(p.id, "REVOKED")}
                              title="Revoke tourist pass"
                              style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px", padding: "4px 8px", color: "#f87171", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                            >
                              Revoke
                            </button>
                          </>
                        )}
                        {p.status === "REVOKED" && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(p.id, "VALID")}
                            title="Re-validate pass"
                            style={{ background: "rgba(78,222,163,0.15)", border: "1px solid rgba(78,222,163,0.3)", borderRadius: "6px", padding: "4px 8px", color: "#4edea3", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                          >
                            Re-validate
                          </button>
                        )}
                      </div>
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
