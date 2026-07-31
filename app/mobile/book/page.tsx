"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useCapacity } from "@/lib/hooks/useCapacity"
import { useBookPass } from "@/lib/hooks/useBookPass"
import { useAuth, ProtectedRoute } from "@/components/AuthProvider"

const ENTRY_WINDOWS = [
  { time: "08:00 AM", slotCode: "08:00", label: "Morning Slot", id: "0800", available: true  },
  { time: "10:00 AM", slotCode: "10:00", label: "Active Now",   id: "1000", available: true  },
  { time: "12:00 PM", slotCode: "12:00", label: "Midday Slot",  id: "1200", available: true  },
  { time: "02:00 PM", slotCode: "14:00", label: "Afternoon",    id: "1400", available: true  },
  { time: "04:00 PM", slotCode: "16:00", label: "Evening Sunset", id: "1600", available: true },
]

export interface StoredPass {
  id: string;
  pass_token: string;
  location_id: string;
  location_name: string;
  slot_time: string;
  visitors: number;
  visitor_name: string;
  visitor_phone: string;
  booked_at: string;
  status: "ACTIVE" | "VISITED";
  image?: string;
  is_bulk?: boolean;
}

const DEFAULT_SEED_PASSES: StoredPass[] = [
  {
    id: "pass-active-1",
    pass_token: "TP-PASS-7842M",
    location_id: "mavoor-wetlands",
    location_name: "Mavoor Wetlands & Bird Sanctuary",
    slot_time: "10:00 AM",
    visitors: 2,
    visitor_name: "Arjun Nair",
    visitor_phone: "9876543210",
    booked_at: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    status: "ACTIVE",
    image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "pass-seed-1",
    pass_token: "TP-PASS-9821K",
    location_id: "canoly-canal",
    location_name: "Canoly Canal & Sarovaram Eco Park",
    slot_time: "10:00 AM",
    visitors: 2,
    visitor_name: "Arjun Nair",
    visitor_phone: "9876543210",
    booked_at: new Date(Date.now() - 86400000 * 2).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    status: "VISITED",
    image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=600&q=80",
  },
]

function BookingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  const locationId = searchParams.get("location_id") ?? "mavoor-wetlands"
  const locationName = searchParams.get("location_name") ?? "Mavoor Wetlands & Bird Sanctuary"
  const bulkNamesRaw = searchParams.get("bulk_names")
  const discountCode = searchParams.get("discount_code")
  const isDirectBook = searchParams.has("location_id") || Boolean(bulkNamesRaw) || Boolean(discountCode)

  const [activeTab, setActiveTab] = useState<"my-passes" | "book">(
    isDirectBook ? "book" : "my-passes"
  )

  const getTodayISO = () => new Date().toISOString().split("T")[0]
  const getTomorrowISO = () => new Date(Date.now() + 86400000).toISOString().split("T")[0]

  const [visitDate, setVisitDate] = useState<string>(getTodayISO())
  const [selectedWindowId, setSelectedWindowId] = useState("1000")
  const [visitors, setVisitors] = useState(1)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")

  const [promoInput, setPromoInput] = useState<string>(discountCode || "")
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; percent: number; label: string } | null>(() => {
    if (discountCode === "WEEKEND20") return { code: "WEEKEND20", percent: 20, label: "20% Weekend Ecotourism Discount" }
    if (discountCode === "EARLY15") return { code: "EARLY15", percent: 15, label: "15% Morning Early Bird Pass" }
    return null
  })

  const handleApplyPromoCode = (customCode?: string) => {
    const target = (customCode || promoInput).trim().toUpperCase()
    if (!target) return
    if (target === "WEEKEND20") {
      setAppliedPromo({ code: "WEEKEND20", percent: 20, label: "20% Weekend Ecotourism Discount" })
    } else if (target === "EARLY15") {
      setAppliedPromo({ code: "EARLY15", percent: 15, label: "15% Morning Early Bird Discount" })
    } else if (target === "ECOGIFT") {
      setAppliedPromo({ code: "ECOGIFT", percent: 10, label: "10% Kerala Eco Explorer Discount" })
    } else {
      alert("Invalid Promo Code. Try WEEKEND20, EARLY15, or ECOGIFT")
    }
  }

  // My Stored Passes state - scoped by current user ID
  const [myPasses, setMyPasses] = useState<StoredPass[]>([])

  const [selectedPassId, setSelectedPassId] = useState<string | null>(null)

  useEffect(() => {
    const handleSync = () => {
      if (!user?.id) {
        setMyPasses([])
        return
      }
      const userKey = `terra_my_passes_${user.id}`
      const stored = typeof window !== "undefined" ? localStorage.getItem(userKey) : null
      if (stored) {
        try {
          setMyPasses(JSON.parse(stored))
        } catch {
          setMyPasses([])
        }
      } else {
        setMyPasses([])
      }
    }
    handleSync()
    window.addEventListener("storage", handleSync)
    window.addEventListener("storage_sync", handleSync)
    return () => {
      window.removeEventListener("storage", handleSync)
      window.removeEventListener("storage_sync", handleSync)
    }
  }, [user?.id])

  const activeWindow = ENTRY_WINDOWS.find((w) => w.id === selectedWindowId) ?? ENTRY_WINDOWS[1]

  // Live Capacity polling
  const { data: capacityData } = useCapacity(
    locationId,
    activeWindow.slotCode
  )

  const issuedCount = capacityData?.issued_count ?? 18
  const totalCapacity = capacityData?.capacity ?? 50
  const capacityPct = Math.min(100, Math.round((issuedCount / totalCapacity) * 100))
  const slotsRemaining = capacityData ? capacityData.capacity - capacityData.issued_count : 32
  const isFull = slotsRemaining <= 0

  // Real Pass Booking Hook
  const { bookPass, isBooking, error: bookingError, result: confirmedPass } = useBookPass()

  // Auto handle Bulk Booking if bulk_names query param exists
  useEffect(() => {
    if (bulkNamesRaw) {
      try {
        const names: string[] = JSON.parse(bulkNamesRaw)
        const todayStr = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
        const bulkPasses: StoredPass[] = names.map((spotName, i) => ({
          id: `bulk-pass-${Date.now()}-${i}`,
          pass_token: `TP-TRIP-${Math.floor(1000 + Math.random() * 9000)}`,
          location_id: `spot-${i}`,
          location_name: spotName,
          slot_time: i % 2 === 0 ? "10:00 AM" : "02:00 PM",
          visitors: 2,
          visitor_name: "Explorer Traveler",
          visitor_phone: "9876543210",
          booked_at: todayStr,
          status: "ACTIVE",
          image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=600&q=80",
          is_bulk: true,
        }))

        setMyPasses((prev) => {
          const next = [...bulkPasses, ...prev]
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("terra_my_passes", JSON.stringify(next))
            } catch (e) {
              console.error(e)
            }
          }
          return next
        })
        setActiveTab("my-passes")
      } catch (err) {
        console.error("Bulk pass error:", err)
      }
    }
  }, [bulkNamesRaw])

  const handleBook = async () => {
    const finalName = name.trim() || "Explorer Traveler"
    const finalPhone = phone.length === 10 ? phone : "9876543210"
    const panchayatId = "kerala_ecotourism"
    const res = await bookPass(locationId, activeWindow.slotCode, panchayatId)

    if (res) {
      const newPass: StoredPass = {
        id: (res as any).id || `pass-${Date.now()}`,
        pass_token: res.pass_token || `TP-PASS-${Math.floor(1000 + Math.random() * 9000)}`,
        location_id: locationId,
        location_name: locationName,
        slot_time: activeWindow.time,
        visitors: visitors,
        visitor_name: finalName,
        visitor_phone: finalPhone,
        booked_at: new Date(visitDate).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        status: "ACTIVE",
        image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=600&q=80",
      }

      setMyPasses((prev) => {
        const next = [newPass, ...prev]
        if (typeof window !== "undefined") {
          try {
            if (user?.id) {
              localStorage.setItem(`terra_my_passes_${user.id}`, JSON.stringify(next))
            }
            localStorage.setItem("terra_my_passes", JSON.stringify(next))
            localStorage.setItem("terra_pulse_passes", JSON.stringify(next))
            window.dispatchEvent(new CustomEvent("storage_sync", { detail: { key: "passes" } }))
          } catch (e) {
            console.error("Pass store error:", e)
          }
        }
        return next
      })
      setActiveTab("my-passes")
    }
  }

  const activePasses = myPasses.filter((p) => p.status === "ACTIVE")
  const visitedPasses = myPasses.filter((p) => p.status === "VISITED")
  const selectedPass = myPasses.find((p) => p.id === selectedPassId) || myPasses[0]

  return (
    <div
      className="relative flex min-h-dvh w-full flex-col overflow-x-hidden"
      style={{ backgroundColor: "#0a0e13", color: "#f0f4f8" }}
    >
      {/* ── Google Fonts & Icons Stylesheet ───────────────────────── */}
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />

      {/* ── Sticky Header ─────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between border-b border-white/10 px-4 py-3"
        style={{
          background: "rgba(10,14,19,0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/mobile")}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-[#111820] text-[#bbcabf] hover:text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>arrow_back</span>
          </button>
          <div>
            <p className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              MY PASSES & TRIPS
            </p>
            <h1 className="text-base font-bold text-white leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {activeTab === "my-passes" ? "My Booked Passes & History" : "Place Entry Pass"}
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push("/mobile")}
          className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30"
        >
          Explore Map
        </button>
      </header>

      {/* ── Navigation Tab Selector ───────────────────────────────── */}
      <div className="flex w-full border-b border-white/10 bg-[#0c2132]/80 px-4 pt-3 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setActiveTab("my-passes")}
          className={`flex-1 pb-3 text-center text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === "my-passes"
              ? "border-b-2 border-emerald-400 text-emerald-400"
              : "text-[#4a6380] hover:text-white"
          }`}
        >
          <span>🎫 My Passes & Upcoming Trips</span>
          <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
            {myPasses.length}
          </span>
        </button>

        {isDirectBook && (
          <button
            type="button"
            onClick={() => setActiveTab("book")}
            className={`flex-1 pb-3 text-center text-xs font-bold transition-all cursor-pointer ${
              activeTab === "book"
                ? "border-b-2 border-emerald-400 text-emerald-400"
                : "text-[#4a6380] hover:text-white"
            }`}
          >
            🎟️ Single Place Booking
          </button>
        )}
      </div>

      <main className="flex-1 p-4 pb-12">
        {/* ── VIEW 1: MY PASSES & UPCOMING TRIPS DASHBOARD ────────────── */}
        {activeTab === "my-passes" && (
          <div className="flex flex-col gap-6 max-w-md mx-auto animate-in fade-in duration-200" style={{ paddingBottom: "40px" }}>
            {myPasses.length > 0 ? (
              <>
                {/* ── Active Ticket Display Card ── */}
                <AnimatePresence mode="wait">
                  {selectedPass && (
                    <motion.div
                      key={selectedPass.id}
                      initial={{ scale: 0.95, opacity: 0, y: 10 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.95, opacity: 0, y: -10 }}
                      transition={{ type: "spring", damping: 25, stiffness: 220 }}
                      style={{
                        background: "linear-gradient(to bottom, #0d1e2e, #070e14)",
                        border: selectedPass.status === "ACTIVE" ? "1.5px solid rgba(16,185,129,0.3)" : "1.5px solid rgba(255,255,255,0.08)",
                        boxShadow: selectedPass.status === "ACTIVE" ? "0 8px 32px rgba(16,185,129,0.08)" : "none",
                        borderRadius: "20px",
                        padding: "20px",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                    {/* Status and Token header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: selectedPass.status === "ACTIVE" ? "#10B981" : "#4b5563",
                            boxShadow: selectedPass.status === "ACTIVE" ? "0 0 8px #10B981" : "none",
                          }}
                        />
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: "11px",
                            fontWeight: 700,
                            color: selectedPass.status === "ACTIVE" ? "#4edea3" : "#9ca3af",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {selectedPass.status === "ACTIVE" ? "ACTIVE" : "VISITED"}
                        </span>
                      </div>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: "11px",
                          fontWeight: 500,
                          color: "#4a6380",
                        }}
                      >
                        {selectedPass.pass_token}
                      </span>
                    </div>

                    {/* QR Code Container */}
                    <div
                      style={{
                        background: "#05090d",
                        border: "1px solid rgba(255,255,255,0.05)",
                        borderRadius: "16px",
                        padding: "24px 16px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "12px",
                        marginBottom: "20px",
                      }}
                    >
                      <div
                        style={{
                          background: "#fff",
                          padding: "10px",
                          borderRadius: "12px",
                          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                        }}
                      >
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${selectedPass.pass_token}`}
                          alt="QR Code"
                          style={{ width: "130px", height: "130px" }}
                        />
                      </div>
                      <p
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: "10px",
                          color: "#4a6380",
                          margin: 0,
                          letterSpacing: "0.02em",
                        }}
                      >
                        PRESENT TICKET AT CHECKPOINT
                      </p>
                    </div>

                    {/* Destination details */}
                    <div style={{ marginBottom: "20px" }}>
                      <span
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "10px",
                          fontWeight: 600,
                          color: "#4a6380",
                          letterSpacing: "0.08em",
                          display: "block",
                        }}
                      >
                        DESTINATION
                      </span>
                      <h3
                        style={{
                          fontFamily: "'Space Grotesk', sans-serif",
                          fontSize: "20px",
                          fontWeight: 700,
                          color: "#fff",
                          margin: "4px 0 0",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {selectedPass.location_name}
                      </h3>
                    </div>

                    {/* Meta details columns */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div>
                        <span
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "10px",
                            fontWeight: 600,
                            color: "#4a6380",
                            letterSpacing: "0.08em",
                            display: "block",
                          }}
                        >
                          DATE & TIME
                        </span>
                        <p
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "13px",
                            fontWeight: 700,
                            color: "#f0f4f8",
                            margin: "4px 0 0",
                          }}
                        >
                          {selectedPass.booked_at}
                        </p>
                        <p
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "11px",
                            color: "#4a6380",
                            margin: "2px 0 0",
                          }}
                        >
                          Slot: {selectedPass.slot_time}
                        </p>
                      </div>

                      <div>
                        <span
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "10px",
                            fontWeight: 600,
                            color: "#4a6380",
                            letterSpacing: "0.08em",
                            display: "block",
                          }}
                        >
                          CAPACITY
                        </span>
                        <p
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "13px",
                            fontWeight: 700,
                            color: "#f0f4f8",
                            margin: "4px 0 0",
                          }}
                        >
                          {selectedPass.visitors} Passenger{selectedPass.visitors > 1 ? "s" : ""}
                        </p>
                        {/* Capacity indicator bars */}
                        <div style={{ display: "flex", gap: "3px", marginTop: "6px" }}>
                          {Array.from({ length: 4 }).map((_, idx) => (
                            <div
                              key={idx}
                              style={{
                                width: "16px",
                                height: "3px",
                                borderRadius: "2px",
                                background: idx < selectedPass.visitors ? "#10b981" : "rgba(255,255,255,0.06)",
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Pine Tree Watermark SVG */}
                    <svg
                      width="100"
                      height="100"
                      viewBox="0 0 100 100"
                      fill="none"
                      stroke="rgba(16,185,129,0.05)"
                      strokeWidth="1.2"
                      style={{
                        position: "absolute",
                        bottom: "-10px",
                        right: "-10px",
                        pointerEvents: "none",
                      }}
                    >
                      <path d="M50 20 L25 60 L40 60 L15 90 L85 90 L60 60 L75 60 Z" />
                      <path d="M70 40 L50 70 L60 70 L40 90 L80 90 L65 70 L75 70 Z" />
                    </svg>

                    {/* Mark Visited Action inside details (if ACTIVE) */}
                    {selectedPass.status === "ACTIVE" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMyPasses((prev) => {
                            const next = prev.map((p) => (p.id === selectedPass.id ? { ...p, status: "VISITED" as const } : p))
                            if (typeof window !== "undefined") {
                              localStorage.setItem("terra_my_passes", JSON.stringify(next))
                            }
                            return next
                          });
                          // Trigger custom event to sync with other windows
                          window.dispatchEvent(new Event("storage_sync"));
                        }}
                        style={{
                          width: "100%",
                          marginTop: "20px",
                          background: "rgba(16,185,129,0.15)",
                          border: "1px solid rgba(78,222,163,0.3)",
                          color: "#4edea3",
                          borderRadius: "10px",
                          padding: "10px",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>check_circle</span>
                        Mark Pass as Visited
                      </button>
                    )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Active & Upcoming Passes List ── */}
                {activePasses.length > 0 && (
                  <div>
                    <h2
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: "12px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        color: "#8fa3b8",
                        letterSpacing: "0.06em",
                        marginBottom: "12px",
                        marginTop: "8px",
                      }}
                    >
                      Active Expeditions ({activePasses.length})
                    </h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {activePasses.map((pass) => (
                        <div
                          key={pass.id}
                          onClick={() => setSelectedPassId(pass.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            borderRadius: "14px",
                            border: selectedPassId === pass.id ? "1.5px solid #10b981" : "1px solid rgba(255,255,255,0.06)",
                            background: selectedPassId === pass.id ? "rgba(16,185,129,0.04)" : "#111820",
                            padding: "12px 14px",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div
                              style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "10px",
                                background: "rgba(16,185,129,0.12)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#4edea3",
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                                {pass.location_name.toLowerCase().includes("forest") ? "forest" : pass.location_name.toLowerCase().includes("canal") || pass.location_name.toLowerCase().includes("wetland") || pass.location_name.toLowerCase().includes("estuary") ? "water" : "terrain"}
                              </span>
                            </div>
                            <div>
                              <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 600, color: "#f0f4f8" }}>
                                {pass.location_name}
                              </h3>
                              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#4a6380", marginTop: "2px" }}>
                                {pass.booked_at} • {pass.pass_token}
                              </p>
                            </div>
                          </div>
                          <span className="material-symbols-outlined" style={{ fontSize: "18px", color: selectedPassId === pass.id ? "#4edea3" : "#4a6380" }}>
                            chevron_right
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Past Expeditions History ── */}
                <div>
                  <h2
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: "12px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: "#8fa3b8",
                      letterSpacing: "0.06em",
                      marginBottom: "12px",
                      marginTop: "8px",
                    }}
                  >
                    Past Expeditions ({visitedPasses.length})
                  </h2>

                  {visitedPasses.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {visitedPasses.map((pass) => (
                        <div
                          key={pass.id}
                          onClick={() => setSelectedPassId(pass.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            borderRadius: "14px",
                            border: selectedPassId === pass.id ? "1.5px solid #10b981" : "1px solid rgba(255,255,255,0.06)",
                            background: selectedPassId === pass.id ? "rgba(16,185,129,0.04)" : "#111820",
                            padding: "12px 14px",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div
                              style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "10px",
                                background: "rgba(255,255,255,0.04)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#8fa3b8",
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                                {pass.location_name.toLowerCase().includes("forest") ? "forest" : pass.location_name.toLowerCase().includes("canal") || pass.location_name.toLowerCase().includes("wetland") || pass.location_name.toLowerCase().includes("estuary") ? "water" : "terrain"}
                              </span>
                            </div>
                            <div>
                              <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 600, color: "#f0f4f8" }}>
                                {pass.location_name}
                              </h3>
                              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#4a6380", marginTop: "2px" }}>
                                {pass.booked_at} • {pass.pass_token}
                              </p>
                            </div>
                          </div>
                          <span className="material-symbols-outlined" style={{ fontSize: "18px", color: selectedPassId === pass.id ? "#4edea3" : "#4a6380" }}>
                            chevron_right
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: "20px", textAlign: "center", fontSize: "12px", color: "#4a6380", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: "12px" }}>
                      No past expeditions logged yet.
                    </div>
                  )}
                </div>

                {/* ── Warden Advisory Warning Banner ── */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    borderRadius: "12px",
                    border: "1px solid rgba(245,158,11,0.2)",
                    background: "rgba(245,158,11,0.05)",
                    padding: "14px",
                    marginTop: "12px",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ color: "#F59E0B", fontSize: "20px", fontVariationSettings: "'FILL' 1" }}>
                    shield
                  </span>
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "12px",
                      color: "#F59E0B",
                      margin: 0,
                      fontWeight: 500,
                      lineHeight: "1.4",
                    }}
                  >
                    Please keep your digital pass ready for the forest warden.
                  </p>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border border-dashed border-white/10 bg-white/5">
                <span className="material-symbols-outlined text-4xl text-[#4a6380] mb-2">confirmation_number</span>
                <p className="text-sm font-semibold text-white">No Expeditions Booked</p>
                <p className="text-xs text-[#8aa299] mt-1 max-w-xs px-4">
                  Select a destination on the tourist map to book an entry pass and start your ecosystem expedition.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── VIEW 2: SINGLE PLACE ENTRY PASS BOOKING FORM ───────────── */}
        {activeTab === "book" && (
          <div className="flex flex-col gap-5 max-w-md mx-auto animate-in fade-in duration-200">
            {confirmedPass ? (
              <div className="flex flex-col items-center justify-center p-6 text-center rounded-2xl border border-emerald-500/30 bg-[#111820] shadow-2xl backdrop-blur-xl">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="material-symbols-outlined" style={{ fontSize: "36px", fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Pass Issued Successfully!
                </h2>
                <p className="text-xs text-[#8aa299] mt-1">
                  Your entry pass for <span className="text-emerald-400 font-semibold">{locationName}</span> is saved to your Passes.
                </p>

                <div className="mt-5 flex w-full gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("my-passes")}
                    className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 text-xs font-bold text-[#003824] shadow-lg hover:bg-emerald-400 cursor-pointer"
                  >
                    View My Passes
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/mobile")}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-white hover:bg-white/10 cursor-pointer"
                  >
                    Map
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Location Banner Card */}
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#111820] p-3 shadow-md">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                    <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>park</span>
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-white">{locationName}</h2>
                    <p className="text-[11px] text-emerald-400 font-medium">Live Panchayat Carrying Capacity Protected Zone</p>
                  </div>
                </div>

                {discountCode && (
                  <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/15 p-3 text-amber-300 shadow-md">
                    <span className="material-symbols-outlined text-amber-400" style={{ fontSize: "20px" }}>
                      local_offer
                    </span>
                    <div>
                      <p className="text-xs font-bold text-amber-300">Discount Code Applied: {discountCode}</p>
                      <p className="text-[10.5px] text-amber-200/80">Special Ecotourism Weekend Pass Offer Pre-Applied</p>
                    </div>
                  </div>
                )}

                {/* Capacity Card */}
                <div className="rounded-xl border border-white/10 bg-[#111820] p-3.5 shadow-md">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-[#8aa299]">Slot Capacity ({activeWindow.time})</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {issuedCount}/{totalCapacity} ({capacityPct}% Full)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#0c2132]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${capacityPct}%`,
                        backgroundColor: isFull ? "#ef4444" : capacityPct >= 70 ? "#f59e0b" : "#10b981",
                      }}
                    />
                  </div>
                </div>

                {/* Visitor Details Form */}
                <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#111820] p-4 shadow-md">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#4a6380]">Explorer Details</h3>

                  <div>
                    <label className="text-xs font-semibold text-[#bbcabf] mb-1 block">Full Name</label>
                    <div className="flex h-11 items-center rounded-xl border border-white/10 bg-[#0c2132] px-3">
                      <span className="material-symbols-outlined text-[#4a6380] mr-2" style={{ fontSize: "18px" }}>person</span>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Arjun Nair"
                        className="w-full bg-transparent text-xs text-white outline-none placeholder:text-[#4a6380]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#bbcabf] mb-1 block">Mobile Number (for SMS Pass)</label>
                    <div className="flex h-11 items-center rounded-xl border border-white/10 bg-[#0c2132] px-3">
                      <span className="text-xs font-bold text-[#4a6380] mr-2">+91</span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="98765 43210"
                        className="w-full bg-transparent text-xs text-white outline-none placeholder:text-[#4a6380]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#bbcabf] mb-1 block">Number of Visitors</label>
                    <div className="flex h-11 items-center justify-between rounded-xl border border-white/10 bg-[#0c2132] px-3">
                      <button
                        type="button"
                        onClick={() => setVisitors(Math.max(1, visitors - 1))}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white hover:bg-white/10 cursor-pointer"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>remove</span>
                      </button>
                      <span className="text-xs font-bold text-white">{visitors} Visitor(s)</span>
                      <button
                        type="button"
                        onClick={() => setVisitors(Math.min(10, visitors + 1))}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white hover:bg-white/10 cursor-pointer"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Visit Date Selector */}
                <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-[#111820] p-4 shadow-md">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#4a6380]">Select Visit Date</h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setVisitDate(getTodayISO())}
                      className={`flex-1 rounded-xl py-2 text-xs font-semibold border transition-all cursor-pointer ${
                        visitDate === getTodayISO()
                          ? "border-emerald-400 bg-emerald-500/20 text-emerald-400"
                          : "border-white/10 bg-[#0c2132] text-[#bbcabf] hover:border-white/20"
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisitDate(getTomorrowISO())}
                      className={`flex-1 rounded-xl py-2 text-xs font-semibold border transition-all cursor-pointer ${
                        visitDate === getTomorrowISO()
                          ? "border-emerald-400 bg-emerald-500/20 text-emerald-400"
                          : "border-white/10 bg-[#0c2132] text-[#bbcabf] hover:border-white/20"
                      }`}
                    >
                      Tomorrow
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-[#8aa299] shrink-0">Custom Date:</span>
                    <input
                      type="date"
                      value={visitDate}
                      min={getTodayISO()}
                      onChange={(e) => setVisitDate(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#0c2132] px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Entry Window Selector */}
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#4a6380]">Select Time Window</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {ENTRY_WINDOWS.map((win) => (
                      <button
                        key={win.id}
                        type="button"
                        onClick={() => setSelectedWindowId(win.id)}
                        className={`flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          selectedWindowId === win.id
                            ? "border-emerald-400 bg-emerald-500/10 text-white"
                            : "border-white/10 bg-[#111820] text-[#bbcabf] hover:border-white/20"
                        }`}
                      >
                        <span className="text-xs font-bold font-mono">{win.time}</span>
                        <span className="text-[10.5px] text-emerald-400 font-medium">{win.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Discount Coupon & Price Breakdown Card */}
                <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#111820] p-4 shadow-md">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#4a6380]">Discount Coupon &amp; Offer</h3>

                  {/* Applied Coupon Info */}
                  {appliedPromo ? (
                    <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-2.5">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-400" style={{ fontSize: "18px" }}>
                          check_circle
                        </span>
                        <div>
                          <p className="text-xs font-bold text-emerald-400">{appliedPromo.code} ({appliedPromo.percent}% OFF)</p>
                          <p className="text-[10px] text-emerald-200/80">{appliedPromo.label}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAppliedPromo(null)}
                        className="text-[10px] font-bold text-red-400 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                        placeholder="Enter Promo Code (e.g. WEEKEND20)"
                        className="flex-1 rounded-xl border border-white/10 bg-[#0c2132] px-3 py-2 text-xs text-white outline-none uppercase font-mono placeholder:normal-case placeholder:text-[#4a6380]"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyPromoCode()}
                        className="rounded-xl bg-amber-500/20 border border-amber-500/40 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/30 cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  )}

                  {/* Available Promo Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-[#4a6380]">Available Deals:</span>
                    {[
                      { code: "WEEKEND20", label: "20% Weekend" },
                      { code: "EARLY15", label: "15% Morning" },
                      { code: "ECOGIFT", label: "10% Eco Explorer" },
                    ].map((deal) => (
                      <button
                        key={deal.code}
                        type="button"
                        onClick={() => {
                          setPromoInput(deal.code)
                          handleApplyPromoCode(deal.code)
                        }}
                        className="rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-[9.5px] font-mono text-amber-300 hover:bg-white/10 cursor-pointer"
                      >
                        {deal.code} ({deal.label})
                      </button>
                    ))}
                  </div>

                  {/* Price Breakdown */}
                  <div className="border-t border-white/10 pt-2.5 space-y-1 text-xs">
                    <div className="flex justify-between text-[#bbcabf]">
                      <span>Entry Pass ({visitors} x ₹150)</span>
                      <span>₹{visitors * 150}</span>
                    </div>
                    {appliedPromo && (
                      <div className="flex justify-between text-emerald-400 font-semibold">
                        <span>Discount ({appliedPromo.percent}% OFF)</span>
                        <span>-₹{Math.round((visitors * 150 * appliedPromo.percent) / 100)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-white text-sm pt-1 border-t border-white/5">
                      <span>Total Amount Payable</span>
                      <span className="text-emerald-400 font-mono">
                        ₹{appliedPromo ? visitors * 150 - Math.round((visitors * 150 * appliedPromo.percent) / 100) : visitors * 150}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Submit Action CTA Button */}
                <button
                  type="button"
                  onClick={handleBook}
                  disabled={isBooking || isFull}
                  className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-xs font-bold text-[#003824] shadow-lg transition-all hover:bg-emerald-400 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  {isBooking ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#003824] border-t-transparent" />
                      Issuing Pass...
                    </span>
                  ) : (
                    <>
                      <span>Claim Free Entry Pass</span>
                      <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                        arrow_forward
                      </span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default function MobileBookingPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="p-8 text-center text-text-muted">Loading booking...</div>}>
        <BookingContent />
      </Suspense>
    </ProtectedRoute>
  )
}
