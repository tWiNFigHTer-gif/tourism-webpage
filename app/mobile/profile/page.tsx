"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/AuthProvider"
import { useAuth } from "@/lib/hooks/useAuth"
import type { StoredPass } from "@/app/mobile/book/page"

function ProfileContent() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming")
  const [myPasses, setMyPasses] = useState<StoredPass[]>([])

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("terra_my_passes")
        if (stored) setMyPasses(JSON.parse(stored))
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  const activePasses = myPasses.filter((p) => p.status === "ACTIVE")
  const visitedPasses = myPasses.filter((p) => p.status === "VISITED")

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Explorer"
  const initials = displayName.slice(0, 2).toUpperCase()
  const email = user?.email || "explorer@kerala.wild"

  const handleSignOut = async () => {
    await signOut()
    router.replace("/login")
  }

  return (
    <div
      className="relative flex min-h-dvh w-full flex-col overflow-x-hidden"
      style={{ backgroundColor: "#0a0e13", color: "#f0f4f8" }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&family=Inter:wght@100..900&family=JetBrains+Mono:wght@100..800&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />

      {/* ── Sticky Header ─────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-4 h-14 border-b border-white/5"
        style={{ background: "rgba(12,33,50,0.85)", backdropFilter: "blur(12px)" }}
      >
        <button
          type="button"
          onClick={() => router.push("/mobile")}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-[#111820] text-[#bbcabf] hover:text-white transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>arrow_back</span>
        </button>

        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-bold tracking-widest uppercase"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "#4edea3" }}
          >
            EXPLORER DASHBOARD
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[#bbcabf]">
          <span className="material-symbols-outlined cursor-pointer hover:text-white transition-colors" style={{ fontSize: "20px" }}>
            notifications
          </span>
        </div>
      </header>

      <main className="flex-1 px-4 pb-28 max-w-md mx-auto w-full">
        {/* ── Profile Glass Hero Card ───────────────────────────────── */}
        <section className="mt-6 relative overflow-hidden rounded-2xl border border-white/10 bg-[#111820] p-5 shadow-2xl">
          {/* Ambient emerald glow */}
          <div
            className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full blur-3xl"
            style={{ background: "rgba(16,185,129,0.10)" }}
          />

          <div className="flex items-center gap-4 mb-5">
            {/* Avatar with glow */}
            <div className="relative shrink-0">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-emerald-400 bg-[#0c2132] text-2xl font-bold text-emerald-400"
                style={{
                  boxShadow: "0 0 16px rgba(78,222,163,0.45)",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                {initials}
              </div>
              {/* Verified badge */}
              <div className="absolute bottom-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 border-2 border-[#0a0e13]">
                <span className="material-symbols-outlined text-[#003824]" style={{ fontSize: "12px", fontVariationSettings: "'FILL' 1" }}>
                  verified
                </span>
              </div>
            </div>

            <div>
              <h1
                className="text-lg font-bold text-white leading-tight"
                style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}
              >
                {displayName}
              </h1>
              <p className="text-[11px] text-[#8fa3b8] mt-0.5">{email}</p>
              <span
                className="mt-1.5 inline-flex items-center rounded border border-emerald-500/25 bg-emerald-500/12 px-2 py-0.5 text-[9.5px] font-bold tracking-widest text-emerald-400"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                VERIFIED EXPLORER
              </span>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex gap-8 border-t border-white/8 pt-4">
            <div className="flex flex-col">
              <span
                className="text-[9.5px] font-bold uppercase tracking-widest text-[#4a6380]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                ACTIVE PASSES
              </span>
              <span
                className="mt-1 text-lg font-bold text-emerald-400"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {String(activePasses.length).padStart(2, "0")}
              </span>
            </div>
            <div className="flex flex-col">
              <span
                className="text-[9.5px] font-bold uppercase tracking-widest text-[#4a6380]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                PLACES VISITED
              </span>
              <span
                className="mt-1 text-lg font-bold text-emerald-400"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {String(visitedPasses.length).padStart(2, "0")}
              </span>
            </div>
            <div className="flex flex-col">
              <span
                className="text-[9.5px] font-bold uppercase tracking-widest text-[#4a6380]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                CIVIC REPORTS
              </span>
              <span
                className="mt-1 text-lg font-bold text-emerald-400"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                00
              </span>
            </div>
          </div>
        </section>

        {/* ── Trip Management Tabs ─────────────────────────────────── */}
        <section className="mt-8">
          <div className="flex gap-6 border-b border-white/8 mb-5">
            {(["upcoming", "past"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`pb-2.5 text-sm font-bold transition-all cursor-pointer capitalize ${
                  activeTab === tab
                    ? "border-b-2 border-emerald-400 text-emerald-400"
                    : "text-[#4a6380] hover:text-white"
                }`}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {tab === "upcoming" ? "Upcoming Trips" : "Past Expeditions"}
              </button>
            ))}
          </div>

          {/* Upcoming Passes */}
          {activeTab === "upcoming" && (
            <div className="flex flex-col gap-3">
              {activePasses.length > 0 ? (
                activePasses.map((pass) => (
                  <div
                    key={pass.id}
                    className="flex items-center justify-between rounded-xl border border-white/8 bg-[#111820] p-4 hover:bg-[#1a2332] transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative h-2.5 w-2.5 shrink-0">
                        <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                        <div className="absolute inset-0 rounded-full bg-emerald-400" />
                      </div>
                      <div>
                        <h3
                          className="text-sm font-semibold text-white truncate max-w-[180px]"
                          style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                          {pass.location_name}
                        </h3>
                        <p
                          className="mt-0.5 text-[10px] uppercase text-[#4a6380]"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          {pass.booked_at} • {pass.slot_time}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push("/mobile/book")}
                      className="flex items-center gap-1.5 rounded border border-white/12 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-[#bbcabf] uppercase tracking-wide hover:border-emerald-500/40 hover:text-emerald-400 transition-colors cursor-pointer shrink-0"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>map</span>
                      VIEW PASS
                    </button>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl border border-dashed border-white/10 bg-white/5">
                  <span className="material-symbols-outlined text-3xl text-[#4a6380] mb-2">confirmation_number</span>
                  <p className="text-xs font-semibold text-white">No Upcoming Trips</p>
                  <p className="mt-1 text-[11px] text-[#8aa299] max-w-xs">
                    Book entry passes from the Explorer Map to see them here.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push("/mobile")}
                    className="mt-4 rounded-xl bg-emerald-500/20 px-4 py-2 text-xs font-bold text-emerald-400 border border-emerald-500/30 cursor-pointer"
                  >
                    Explore Map
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Past Expeditions */}
          {activeTab === "past" && (
            <div className="flex flex-col gap-3 opacity-80">
              {visitedPasses.length > 0 ? (
                visitedPasses.map((pass) => (
                  <div
                    key={pass.id}
                    className="flex items-center justify-between rounded-xl border border-white/8 bg-[#111820] p-4 grayscale hover:grayscale-0 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="material-symbols-outlined text-[#4a6380]"
                        style={{ fontSize: "18px" }}
                      >
                        history
                      </span>
                      <div>
                        <h3
                          className="text-sm font-semibold text-white truncate max-w-[190px]"
                          style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                          {pass.location_name}
                        </h3>
                        <p
                          className="mt-0.5 text-[10px] uppercase text-[#4a6380]"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          {pass.booked_at} • COMPLETED
                        </p>
                      </div>
                    </div>
                    <span
                      className="text-[9.5px] font-bold uppercase text-[#4a6380]"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      ARCHIVED
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-[#4a6380]">
                  No past expeditions logged yet.
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── System Preferences ──────────────────────────────────── */}
        <section className="mt-10">
          <p
            className="mb-3 px-1 text-[9.5px] font-bold uppercase tracking-widest text-[#4a6380]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            SYSTEM PREFERENCES
          </p>
          <div className="divide-y divide-white/5 rounded-xl border border-white/8 bg-[#111820] overflow-hidden">
            {[
              { icon: "eco", label: "Environmental Preferences" },
              { icon: "shield", label: "Privacy Settings" },
              { icon: "dashboard", label: "Civic Dashboard", external: true },
              { icon: "notifications", label: "Notification Settings" },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                className="flex w-full items-center justify-between px-4 py-4 text-left hover:bg-white/5 transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="material-symbols-outlined text-[#4a6380] group-hover:text-emerald-400 transition-colors"
                    style={{ fontSize: "20px" }}
                  >
                    {item.icon}
                  </span>
                  <span
                    className="text-sm text-white"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {item.label}
                  </span>
                </div>
                <span
                  className="material-symbols-outlined text-[#4a6380]"
                  style={{ fontSize: "18px" }}
                >
                  {item.external ? "open_in_new" : "chevron_right"}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Sign Out CTA ─────────────────────────────────────────── */}
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-8 w-full flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>logout</span>
          Log Out
        </button>

        {/* ── Terra-Pulse Footer ──────────────────────────────────── */}
        <div className="mt-4 text-center pb-2">
          <p
            className="text-[10px] text-[#4a6380]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Terra-Pulse SDI • 10.8505° N, 76.2711° E
          </p>
        </div>
      </main>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  )
}
