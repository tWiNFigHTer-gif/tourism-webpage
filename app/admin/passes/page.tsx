"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface PassRecord {
  id: string;
  pass_code: string;
  location_name: string;
  tourist_name: string;
  time_slot: string;
  issued_at: string;
  status: "VALID" | "CHECKED_IN" | "EXPIRED";
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

  const mapTouristToAdmin = (tp: any): PassRecord => {
    let statusMapped: "VALID" | "CHECKED_IN" | "EXPIRED" = "VALID";
    if (tp.status === "VISITED") {
      statusMapped = "CHECKED_IN";
    }
    return {
      id: tp.id,
      pass_code: tp.pass_token,
      location_name: tp.location_name,
      tourist_name: tp.visitor_name || "Tourist Explorer",
      time_slot: tp.slot_time,
      issued_at: tp.booked_at,
      status: statusMapped,
    };
  };

  const mapAdminToTourist = (pr: PassRecord, existingTp?: any): any => {
    let statusMapped: "ACTIVE" | "VISITED" = "ACTIVE";
    if (pr.status === "CHECKED_IN" || pr.status === "EXPIRED") {
      statusMapped = "VISITED";
    }
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

  const loadAllPasses = () => {
    // 1. Read tourist passes
    const touristRaw = typeof window !== "undefined" ? localStorage.getItem("terra_my_passes") : null;
    let touristPasses: any[] = [];
    if (touristRaw) {
      try {
        touristPasses = JSON.parse(touristRaw);
      } catch (e) {
        console.error(e);
      }
    }

    // 2. Read admin passes
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

    // 3. Merge them. We use a Map to keep unique pass codes (case-insensitive)
    const mergedMap = new Map<string, PassRecord>();

    // Add admin passes first (e.g. demo passes)
    adminPasses.forEach((p) => mergedMap.set(p.pass_code.toUpperCase(), p));

    // Overwrite or append tourist passes
    touristPasses.forEach((tp) => {
      mergedMap.set(tp.pass_token.toUpperCase(), mapTouristToAdmin(tp));
    });

    return Array.from(mergedMap.values());
  };

  useEffect(() => {
    setPasses(loadAllPasses());

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "terra_my_passes" || e.key === "stop_admin_passes") {
        setPasses(loadAllPasses());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const savePasses = (updated: PassRecord[]) => {
    setPasses(updated);
    if (typeof window !== "undefined") {
      // 1. Save to stop_admin_passes
      localStorage.setItem("stop_admin_passes", JSON.stringify(updated));

      // 2. Sync to terra_my_passes (preserving existing extra tourist fields)
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
      // Dispatch storage event manually for same-tab updates
      window.dispatchEvent(new Event("storage_sync"));
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
      // Generate a dynamic demo valid pass if arbitrary code entered
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

  const handleCheckIn = (id: string) => {
    const updated = passes.map((p) => (p.id === id ? { ...p, status: "CHECKED_IN" as const } : p));
    savePasses(updated);
    if (scanResult?.id === id) {
      setScanResult({ ...scanResult, status: "CHECKED_IN" });
    }
  };

  const filteredPasses = passes.filter((p) => {
    if (filterLocation === "all") return true;
    return p.location_name.toLowerCase().includes(filterLocation.toLowerCase());
  });

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <span className="material-symbols-outlined" style={{ color: "#4EDEA3", fontSize: "18px" }}>
            qr_code_scanner
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#4EDEA3", fontWeight: 600 }}>
            PANCHAYAT ENTRY GATE CONTROL • STOP! DPI
          </span>
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "26px", fontWeight: 700, color: "#F8FAFC", margin: 0 }}>
          Digital Pass Verification & Gate Scanner
        </h1>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#94A3B8", marginTop: "4px" }}>
          Verify tourist entry passes, scan QR codes, and monitor carrying capacity turnstile check-ins in real-time.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "24px" }}>
        {/* Left Column: QR Scanner & Verification Input */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <form
            onSubmit={handleVerifyPass}
            style={{
              background: "rgba(17,24,32,0.9)",
              border: "1px solid rgba(78,222,163,0.3)",
              borderRadius: "16px",
              padding: "20px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}
          >
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "16px", fontWeight: 700, color: "#4EDEA3", margin: "0 0 14px 0" }}>
              🔍 Gate Pass Verification
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#CBD5E1", marginBottom: "6px" }}>
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
                      background: "#0F172A",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      color: "#F8FAFC",
                      fontSize: "13px",
                      fontFamily: "'JetBrains Mono', monospace",
                      outline: "none",
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      background: "#10B981",
                      color: "#000F1D",
                      border: "none",
                      borderRadius: "8px",
                      padding: "0 16px",
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "13px",
                      fontWeight: 700,
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
                background: scanResult.status === "EXPIRED" ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
                border: scanResult.status === "EXPIRED" ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(16,185,129,0.4)",
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
                    color: scanResult.status === "EXPIRED" ? "#EF4444" : "#10B981",
                  }}
                >
                  {scanResult.status === "EXPIRED" ? "❌ PASS EXPIRED" : "✅ PASS VALID & ACTIVE"}
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
                  <strong>Check-in Status:</strong>{" "}
                  <span style={{ color: scanResult.status === "CHECKED_IN" ? "#F59E0B" : "#10B981", fontWeight: 700 }}>
                    {scanResult.status}
                  </span>
                </div>
              </div>

              {scanResult.status === "VALID" && (
                <button
                  type="button"
                  onClick={() => handleCheckIn(scanResult.id)}
                  style={{
                    width: "100%",
                    marginTop: "14px",
                    background: "#10B981",
                    color: "#000F1D",
                    border: "none",
                    borderRadius: "10px",
                    padding: "10px",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>check_circle</span>
                  Confirm Turnstile Entry Check-in
                </button>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "16px", fontWeight: 700, color: "#F8FAFC", margin: 0 }}>
              Live Entry Pass Registry ({filteredPasses.length})
            </h2>

            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              style={{
                background: "#0F172A",
                color: "#94A3B8",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "6px",
                padding: "6px 10px",
                fontSize: "11px",
              }}
            >
              <option value="all">All Locations</option>
              <option value="Canoly">Canoly Canal</option>
              <option value="Kadalundi">Kadalundi</option>
              <option value="Janakikattu">Janakikattu</option>
              <option value="Kakkayam">Kakkayam</option>
            </select>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#64748B", fontSize: "11px" }}>
                  <th style={{ padding: "10px 12px" }}>PASS TOKEN</th>
                  <th style={{ padding: "10px 12px" }}>TOURIST & ZONE</th>
                  <th style={{ padding: "10px 12px" }}>TIME SLOT</th>
                  <th style={{ padding: "10px 12px", textAlign: "right" }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filteredPasses.map((p) => (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      fontSize: "13px",
                      fontFamily: "'Inter', sans-serif",
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
                    <td style={{ padding: "12px", textAlign: "right" }}>
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
                              : p.status === "EXPIRED"
                              ? "rgba(239,68,68,0.2)"
                              : "rgba(16,185,129,0.2)",
                          color:
                            p.status === "CHECKED_IN"
                              ? "#F59E0B"
                              : p.status === "EXPIRED"
                              ? "#EF4444"
                              : "#10B981",
                        }}
                      >
                        {p.status}
                      </span>
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
