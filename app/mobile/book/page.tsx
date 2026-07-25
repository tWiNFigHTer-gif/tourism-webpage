"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCapacity } from "@/lib/hooks/useCapacity"
import { useBookPass } from "@/lib/hooks/useBookPass"
import { ProtectedRoute } from "@/components/AuthProvider"

const ENTRY_WINDOWS = [
  { time: "08:00 AM", slotCode: "08:00", label: "Morning Slot", id: "0800", available: true  },
  { time: "10:00 AM", slotCode: "10:00", label: "Active Now",   id: "1000", available: true  },
  { time: "12:00 PM", slotCode: "12:00", label: "Midday Slot",  id: "1200", available: true  },
  { time: "02:00 PM", slotCode: "14:00", label: "Afternoon",    id: "1400", available: true  },
  { time: "04:00 PM", slotCode: "16:00", label: "Evening Sunset", id: "1600", available: true },
]

const PASS_TYPES = [
  { id: "standard", label: "Standard Entry Pass", duration: "4 Hours", price: "Free (Panchayat DPI)" },
  { id: "full-day", label: "Full Day Explorer Pass", duration: "8 Hours", price: "Free (Panchayat DPI)" },
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
}

function BookingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const locationId = searchParams.get("location_id") ?? "mavoor-wetlands"
  const locationName = searchParams.get("location_name") ?? "Mavoor Wetlands & Bird Sanctuary"

  const [activeTab, setActiveTab] = useState<"book" | "my-passes">("book")

  const [selectedWindowId, setSelectedWindowId] = useState("1000")
  const [selectedPass, setSelectedPass] = useState("standard")
  const [visitors, setVisitors] = useState(1)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")

  // My Stored Passes state
  const [myPasses, setMyPasses] = useState<StoredPass[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("terra_my_passes")
        if (stored) return JSON.parse(stored)
      } catch (err) {
        console.error("Failed to load passes:", err)
      }
    }
    return [
      {
        id: "pass-seed-1",
        pass_token: "TP-PASS-9821K",
        location_id: "canoly-canal",
        location_name: "Canoly Canal & Sarovaram Eco Park",
        slot_time: "10:00 AM",
        visitors: 2,
        visitor_name: "Arjun Nair",
        visitor_phone: "9876543210",
        booked_at: new Date(Date.now() - 86400000).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        status: "VISITED",
        image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=600&q=80",
      },
    ]
  })

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

  const handleBook = async () => {
    if (!name.trim() || phone.length !== 10) return
    const panchayatId = "kerala_ecotourism"
    const res = await bookPass(locationId, activeWindow.slotCode, panchayatId)

    if (res) {
      const newPass: StoredPass = {
        id: res.id || `pass-${Date.now()}`,
        pass_token: res.pass_token || `TP-PASS-${Math.floor(1000 + Math.random() * 9000)}`,
        location_id: locationId,
        location_name: locationName,
        slot_time: activeWindow.time,
        visitors: visitors,
        visitor_name: name,
        visitor_phone: phone,
        booked_at: new Date().toLocaleDateString("en-IN", {
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
            localStorage.setItem("terra_my_passes", JSON.stringify(next))
          } catch (e) {
            console.error("Pass store error:", e)
          }
        }
        return next
      })
    }
  }

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
              PANCHAYAT PASS PORTAL
            </p>
            <h1 className="text-base font-bold text-white leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Eco-Zone Entry Pass
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

      {/* ── Navigation Tab Selector (Book Pass vs My Passes & Visited) ── */}
      <div className="flex w-full border-b border-white/10 bg-[#0c2132]/80 px-4 pt-3 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setActiveTab("book")}
          className={`flex-1 pb-3 text-center text-xs font-bold transition-all cursor-pointer ${
            activeTab === "book"
              ? "border-b-2 border-emerald-400 text-emerald-400"
              : "text-[#4a6380] hover:text-white"
          }`}
        >
          🎟️ Book New Pass
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("my-passes")}
          className={`flex-1 pb-3 text-center text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === "my-passes"
              ? "border-b-2 border-emerald-400 text-emerald-400"
              : "text-[#4a6380] hover:text-white"
          }`}
        >
          <span>🎫 My Passes & Visited</span>
          <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
            {myPasses.length}
          </span>
        </button>
      </div>

      <main className="flex-1 p-4 pb-12">
        {/* ── TAB 1: BOOK NEW PASS FORM ──────────────────────────────── */}
        {activeTab === "book" && (
          <div className="flex flex-col gap-5 max-w-md mx-auto animate-in fade-in duration-200">
            {/* Confirmation Screen */}
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
                  Your carrying-capacity pass for <span className="text-emerald-400 font-semibold">{locationName}</span> is active.
                </p>

                {/* Digital Pass Ticket Card */}
                <div className="mt-5 w-full rounded-xl border border-emerald-500/30 bg-[#0c2132] p-4 text-left shadow-lg">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-xs font-bold text-emerald-400" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      KERALA WILD DPI
                    </span>
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      ACTIVE PASS
                    </span>
                  </div>

                  <div className="mt-3 flex flex-col gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#4a6380] font-mono text-[10.5px]">PASS TOKEN:</span>
                      <span className="font-bold text-white font-mono">{confirmedPass.pass_token}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#4a6380] font-mono text-[10.5px]">LOCATION:</span>
                      <span className="font-bold text-white">{locationName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#4a6380] font-mono text-[10.5px]">TIME SLOT:</span>
                      <span className="font-bold text-emerald-400">{activeWindow.time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#4a6380] font-mono text-[10.5px]">VISITORS:</span>
                      <span className="font-bold text-white">{visitors} Explorer(s)</span>
                    </div>
                  </div>

                  {/* QR Ticket Visual */}
                  <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-white/20 bg-white/5 p-3">
                    <div className="flex h-20 w-20 items-center justify-center rounded bg-white p-1">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${confirmedPass.pass_token}`}
                        alt="QR Code"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <p className="mt-2 text-[10px] font-mono text-[#8aa299]">Scan at Panchayat Checkpoint</p>
                  </div>
                </div>

                <div className="mt-5 flex w-full gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("my-passes")}
                    className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 text-xs font-bold text-[#003824] shadow-lg hover:bg-emerald-400"
                  >
                    View All My Passes
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/mobile")}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-white hover:bg-white/10"
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

                {/* Error Banner */}
                {bookingError && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                    <span className="material-symbols-outlined shrink-0" style={{ fontSize: "18px" }}>warning</span>
                    <span>{bookingError.message}</span>
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

                {/* Visitor Form */}
                <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#111820] p-4 shadow-md">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#4a6380]">Explorer Registration</h3>

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

                {/* Submit Action CTA Button */}
                <button
                  type="button"
                  onClick={handleBook}
                  disabled={!name.trim() || phone.length !== 10 || isBooking || isFull}
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

        {/* ── TAB 2: MY PASSES & VISITED PLACES HISTORY ──────────────── */}
        {activeTab === "my-passes" && (
          <div className="flex flex-col gap-4 max-w-md mx-auto animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#4a6380]">
                Issued Digital Passes ({myPasses.length})
              </h2>
              <span className="text-[11px] font-semibold text-emerald-400">
                Panchayat Verified
              </span>
            </div>

            {myPasses.length > 0 ? (
              myPasses.map((pass) => (
                <div
                  key={pass.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111820] shadow-xl"
                >
                  {/* Card Header Banner */}
                  <div className="flex items-center justify-between bg-[#0c2132] px-4 py-2.5 border-b border-white/10">
                    <span className="text-xs font-bold text-white font-mono">{pass.pass_token}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-[9.5px] font-bold border ${
                        pass.status === "ACTIVE"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                      }`}
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {pass.status === "ACTIVE" ? "ACTIVE PASS" : "VISITED / COMPLETED"}
                    </span>
                  </div>

                  {/* Pass Body Info */}
                  <div className="p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={pass.image || DEFAULT_FALLBACK_IMAGE}
                        alt={pass.location_name}
                        className="h-14 w-16 rounded-xl object-cover border border-white/10 shrink-0"
                      />
                      <div>
                        <h3 className="text-xs font-bold text-white">{pass.location_name}</h3>
                        <p className="text-[11px] text-emerald-400 font-medium mt-0.5">
                          ⏰ Slot: {pass.slot_time} | 👥 {pass.visitors} Visitor(s)
                        </p>
                        <p className="text-[10px] text-[#4a6380] mt-0.5">
                          Issued for: {pass.visitor_name} ({pass.booked_at})
                        </p>
                      </div>
                    </div>

                    {/* QR Code section for Active Pass */}
                    {pass.status === "ACTIVE" && (
                      <div className="flex items-center justify-between rounded-xl border border-dashed border-emerald-500/30 bg-emerald-500/5 p-2.5">
                        <div className="flex items-center gap-2">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${pass.pass_token}`}
                            alt="QR Ticket"
                            className="h-10 w-10 rounded bg-white p-0.5 shrink-0"
                          />
                          <div>
                            <p className="text-[11px] font-bold text-white">Digital Checkpoint Ticket</p>
                            <p className="text-[9.5px] text-[#8aa299]">Show QR at reserve gate</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setMyPasses((prev) =>
                              prev.map((p) => (p.id === pass.id ? { ...p, status: "VISITED" } : p))
                            )
                          }}
                          className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[10.5px] font-semibold text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                        >
                          Mark Visited
                        </button>
                      </div>
                    )}

                    {/* Visited Badge */}
                    {pass.status === "VISITED" && (
                      <div className="flex items-center gap-2 rounded-xl bg-blue-500/10 border border-blue-500/20 p-2 text-xs text-blue-300">
                        <span className="material-symbols-outlined" style={{ fontSize: "16px", fontVariationSettings: "'FILL' 1" }}>
                          verified
                        </span>
                        <span>Completed Visit on {pass.booked_at}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="material-symbols-outlined text-4xl text-[#4a6380] mb-2">confirmation_number</span>
                <p className="text-sm font-semibold text-white">No Issued Passes Yet</p>
                <p className="text-xs text-[#8aa299] mt-1 max-w-xs">
                  Book your carrying-capacity pass above to receive your digital QR entry ticket.
                </p>
              </div>
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
