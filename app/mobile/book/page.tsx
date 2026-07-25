"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCapacity } from "@/lib/hooks/useCapacity"
import { useBookPass, type PassResult } from "@/lib/hooks/useBookPass"

const ENTRY_WINDOWS = [
  { time: "08:00 AM", slotCode: "08:00", label: "Starts in 12m", id: "0800", available: true  },
  { time: "10:00 AM", slotCode: "10:00", label: "Active Now",    id: "1000", available: true  },
  { time: "12:00 PM", slotCode: "12:00", label: "Starts in 2h", id: "1200", available: true  },
  { time: "02:00 PM", slotCode: "14:00", label: "Starts in 4h", id: "1400", available: true  },
  { time: "04:00 PM", slotCode: "16:00", label: "Fully Booked", id: "1600", available: false },
]

const PASS_TYPES = [
  { id: "standard", label: "Standard Entry", duration: "4 Hours", price: "₹50" },
  { id: "full-day", label: "Full Day Access", duration: "Sunrise–Sunset", price: "₹120" },
  { id: "guided",   label: "Guided Trek",    duration: "6 Hours",  price: "₹250" },
]

function BookingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const locationId = searchParams.get("location_id") ?? "silent-valley"
  const locationName = searchParams.get("location_name") ?? "Silent Valley National Park"

  const [selectedWindowId, setSelectedWindowId] = useState("1000")
  const [selectedPass, setSelectedPass] = useState("standard")
  const [visitors, setVisitors] = useState(1)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")

  const activeWindow = ENTRY_WINDOWS.find((w) => w.id === selectedWindowId) ?? ENTRY_WINDOWS[1]

  // ── Live Capacity for selected slot ──────────────────────────────────────
  const { data: capacityData, isLoading: capacityLoading } = useCapacity(
    locationId,
    activeWindow.slotCode
  )

  const issuedCount = capacityData?.issued_count ?? 36
  const totalCapacity = capacityData?.capacity ?? 50
  const capacityPct = Math.min(100, Math.round((issuedCount / totalCapacity) * 100))
  const slotsRemaining = capacityData ? capacityData.capacity - capacityData.issued_count : 14
  const isFull = slotsRemaining <= 0

  // ── Real Pass Booking Hook ──────────────────────────────────────────────
  const { bookPass, isBooking, error: bookingError, result: confirmedPass, reset: resetBooking } = useBookPass()

  const handleBook = async () => {
    if (!name.trim() || phone.length !== 10) return
    const panchayatId = "munnar_panchayat"
    await bookPass(locationId, activeWindow.slotCode, panchayatId)
  }

  // ── Confirmation Screen ──────────────────────────────────────────────────
  if (confirmedPass) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          backgroundColor: "#0a0e13",
          color: "#f0f4f8",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "340px", width: "100%" }}>
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "9999px",
              background: "rgba(16,185,129,0.12)",
              border: "2px solid rgba(16,185,129,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              boxShadow: "0 0 40px rgba(16,185,129,0.2)",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "40px", color: "#10b981", fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
          </div>

          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "26px",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              marginBottom: "8px",
            }}
          >
            Booking Confirmed!
          </h1>
          <p style={{ fontSize: "15px", color: "#4a6380", lineHeight: "22px", marginBottom: "32px" }}>
            Your entry pass for <span style={{ color: "#4edea3" }}>{locationName}</span> is ready.
          </p>

          <div
            style={{
              background: "rgba(17,24,32,0.9)",
              border: "1px solid rgba(78,222,163,0.2)",
              borderRadius: "16px",
              padding: "20px",
              marginBottom: "32px",
              boxShadow: "0 0 24px rgba(16,185,129,0.08)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "15px", fontWeight: 600, color: "#4edea3" }}>
                Terra-Pulse
              </span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "10px",
                  fontWeight: 500,
                  color: "#4a6380",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "4px",
                  padding: "2px 8px",
                }}
              >
                ECO-ZONE PASS
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { label: "PASS ID",    value: confirmedPass.pass_token },
                { label: "LOCATION",  value: locationName },
                { label: "ENTRY",     value: activeWindow.time },
                { label: "VISITORS",  value: `${visitors} person${visitors > 1 ? "s" : ""}` },
                { label: "PASS TYPE", value: PASS_TYPES.find((p) => p.id === selectedPass)?.label || "" },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#4a6380", letterSpacing: "0.06em" }}>
                    {label}
                  </span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 500, color: "#d0e5fb" }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: "16px",
                paddingTop: "16px",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                textAlign: "center",
              }}
            >
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#4a6380" }}>
                Saved to your device. Show at entry gate.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/mobile")}
            style={{
              width: "100%",
              background: "#10b981",
              color: "#003824",
              border: "none",
              borderRadius: "12px",
              padding: "16px",
              fontFamily: "'Inter', sans-serif",
              fontSize: "16px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>explore</span>
            Back to Map
          </button>
        </div>
      </div>
    )
  }

  // ── Booking Form View ────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100dvh",
        backgroundColor: "#0a0e13",
        color: "#f0f4f8",
        fontFamily: "'Inter', sans-serif",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(10,14,19,0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "14px 20px",
        }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(17,24,32,0.8)",
            color: "#bbcabf",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>arrow_back</span>
        </button>
        <div>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#4edea3", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Eco-Zone Authorization
          </p>
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "18px",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "#f0f4f8",
              lineHeight: "1.2",
            }}
          >
            {locationName}
          </h1>
        </div>
      </header>

      <div
        style={{
          position: "relative",
          zIndex: 10,
          padding: "20px 20px 40px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* Error Banner */}
        {bookingError && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "12px",
              padding: "14px 16px",
              color: "#ffb4ab",
              fontSize: "14px",
              lineHeight: "20px",
            }}
          >
            <span className="font-semibold block mb-1">
              {bookingError.kind === "zone_full" ? "⚠️ Zone Full" : "Booking Error"}
            </span>
            {bookingError.message}
          </div>
        )}

        {/* Live Capacity Card */}
        <div
          style={{
            background: "rgba(17,24,32,0.8)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "14px",
            padding: "16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", color: "#bbcabf" }}>
              Current Capacity ({activeWindow.time})
            </span>
            <div style={{ display: "flex", gap: "12px" }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "#4a6380" }}>
                {issuedCount}/{totalCapacity}
              </span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "12px",
                  color: isFull ? "#ef4444" : "#10b981",
                }}
              >
                {isFull ? "FULL" : `${capacityPct}% Full`}
              </span>
            </div>
          </div>
          <div
            style={{
              height: "6px",
              background: "#1a2332",
              borderRadius: "9999px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${capacityPct}%`,
                background: isFull ? "#ef4444" : "#10b981",
                borderRadius: "9999px",
                boxShadow: isFull ? "0 0 8px rgba(239,68,68,0.5)" : "0 0 8px rgba(16,185,129,0.4)",
              }}
            />
          </div>
        </div>

        {/* Visitor Details */}
        <section>
          <h2
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#4a6380",
              marginBottom: "12px",
            }}
          >
            Your Details
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label
                htmlFor="visitor-name"
                style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 500, color: "#bbcabf", marginBottom: "6px" }}
              >
                Full Name
              </label>
              <input
                id="visitor-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                style={{
                  width: "100%",
                  background: "#111820",
                  border: name ? "1px solid rgba(78,222,163,0.3)" : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "10px",
                  padding: "14px 16px",
                  fontSize: "16px",
                  color: "#f0f4f8",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="visitor-phone"
                style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 500, color: "#bbcabf", marginBottom: "6px" }}
              >
                Phone Number
              </label>
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "15px",
                    color: "#4a6380",
                    pointerEvents: "none",
                  }}
                >
                  +91
                </div>
                <input
                  id="visitor-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="98765 43210"
                  style={{
                    width: "100%",
                    background: "#111820",
                    border: phone.length === 10 ? "1px solid rgba(78,222,163,0.3)" : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "10px",
                    padding: "14px 16px 14px 48px",
                    fontSize: "16px",
                    color: "#f0f4f8",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div>
              <label
                style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 500, color: "#bbcabf", marginBottom: "10px" }}
              >
                Number of Visitors
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "#111820",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "10px",
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  onClick={() => setVisitors(Math.max(1, visitors - 1))}
                  style={{
                    width: "56px",
                    height: "52px",
                    border: "none",
                    borderRight: "1px solid rgba(255,255,255,0.06)",
                    background: "transparent",
                    color: "#4a6380",
                    fontSize: "22px",
                    cursor: "pointer",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>remove</span>
                </button>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "20px", fontWeight: 600, color: "#f0f4f8" }}>
                    {visitors}
                  </span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#4a6380", marginLeft: "6px" }}>
                    {visitors === 1 ? "person" : "people"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setVisitors(Math.min(10, visitors + 1))}
                  style={{
                    width: "56px",
                    height: "52px",
                    border: "none",
                    borderLeft: "1px solid rgba(255,255,255,0.06)",
                    background: "transparent",
                    color: "#4a6380",
                    fontSize: "22px",
                    cursor: "pointer",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>add</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Select Entry Window */}
        <section>
          <h2
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#4a6380",
              marginBottom: "12px",
            }}
          >
            Select Entry Window
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {ENTRY_WINDOWS.map((window) => {
              const isSelected = selectedWindowId === window.id
              const isDisabled = !window.available
              return (
                <button
                  key={window.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    setSelectedWindowId(window.id)
                    resetBooking()
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    padding: "14px",
                    borderRadius: "12px",
                    border: isSelected
                      ? "1px solid rgba(78,222,163,0.5)"
                      : isDisabled
                        ? "1px solid rgba(255,255,255,0.04)"
                        : "1px solid rgba(255,255,255,0.08)",
                    background: isSelected
                      ? "rgba(16,185,129,0.10)"
                      : isDisabled
                        ? "rgba(255,255,255,0.02)"
                        : "#0c2132",
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    opacity: isDisabled ? 0.4 : 1,
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: isSelected ? "#f0f4f8" : "#bbcabf",
                      marginBottom: "4px",
                    }}
                  >
                    {window.time}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "12px",
                      color: isSelected ? "#4edea3" : "#4a6380",
                    }}
                  >
                    {window.label}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* CTA Button */}
        <button
          type="button"
          onClick={handleBook}
          disabled={!name.trim() || phone.length !== 10 || isBooking || isFull}
          style={{
            width: "100%",
            background: name.trim() && phone.length === 10 && !isBooking && !isFull ? "#10b981" : "rgba(16,185,129,0.25)",
            color: name.trim() && phone.length === 10 && !isBooking && !isFull ? "#003824" : "rgba(255,255,255,0.3)",
            border: "none",
            borderRadius: "14px",
            padding: "18px 24px",
            fontFamily: "'Inter', sans-serif",
            fontSize: "17px",
            fontWeight: 600,
            cursor: name.trim() && phone.length === 10 && !isBooking && !isFull ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            boxShadow: name.trim() && phone.length === 10 && !isBooking && !isFull ? "0 0 24px rgba(16,185,129,0.3)" : "none",
          }}
        >
          {isBooking ? "Issuing Pass..." : isFull ? "Time Slot Full" : "Claim Entry Pass"}
          {!isBooking && !isFull && (
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
              arrow_forward
            </span>
          )}
        </button>
      </div>
    </div>
  )
}

export default function MobileBookingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-text-muted">Loading booking...</div>}>
      <BookingContent />
    </Suspense>
  )
}
