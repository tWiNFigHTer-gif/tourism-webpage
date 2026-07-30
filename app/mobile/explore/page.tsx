"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/AuthProvider"
import CurvedBottomNav from "@/components/mobile/CurvedBottomNav"
import ReviewCard from "@/components/mobile/ReviewCard"
import { MOCK_REVIEWS, type ReviewData } from "@/components/mobile/mockReviews"
import { getPlaces } from "@/lib/places"
import type { Location } from "@/lib/types"

import { NotificationsDrawer, INITIAL_NOTIFICATIONS, type NotificationItem } from "@/components/mobile/NotificationsDrawer"

// ── Scroll position persistence key ────────────────────────────────────────
const SCROLL_KEY = "terra_explore_scroll"

const FILTER_TAGS = [
  { id: "all", label: "All Posts" },
  { id: "gems", label: "Hidden Gems" },
  { id: "waterfalls", label: "Waterfalls" },
  { id: "forests", label: "Forests & Trails" },
  { id: "official", label: "Official Dept Updates" },
]

// ── Header component with Search toggle & Input ───────────────────────────────
function ExploreHeader({
  searchQuery,
  onSearchChange,
  isSearchOpen,
  onToggleSearch,
  unreadCount,
  onOpenNotifications,
}: {
  searchQuery: string
  onSearchChange: (q: string) => void
  isSearchOpen: boolean
  onToggleSearch: () => void
  unreadCount: number
  onOpenNotifications: () => void
}) {
  const [scrolled, setScrolled] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const el = document.getElementById("explore-scroll-container")
    if (!el) return
    const handler = () => setScrolled(el.scrollTop > 20)
    el.addEventListener("scroll", handler, { passive: true })
    return () => el.removeEventListener("scroll", handler)
  }, [])

  useEffect(() => {
    if (isSearchOpen) {
      inputRef.current?.focus()
    }
  }, [isSearchOpen])

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        zIndex: 50,
        height: "64px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 16px",
        background: scrolled ? "rgba(0,15,29,0.96)" : "rgba(0,15,29,0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        boxShadow: scrolled ? "0 4px 20px rgba(0,0,0,0.4)" : "none",
        transition: "all 0.25s ease",
      }}
    >
      {/* Search Bar mode vs Normal Brand Header mode */}
      {isSearchOpen ? (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flex: 1,
              height: "40px",
              borderRadius: "12px",
              background: "#111820",
              border: "1px solid rgba(78,222,163,0.4)",
              padding: "0 12px",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#4edea3", marginRight: "8px" }}>
              search
            </span>
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search places, hidden gems, tags, posts..."
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                color: "#f0f4f8",
                fontSize: "13px",
                outline: "none",
                fontFamily: "'Inter', sans-serif",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                style={{ background: "none", border: "none", color: "#4a6380", cursor: "pointer", display: "flex" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>close</span>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onToggleSearch}
            style={{
              padding: "8px 12px",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#bbcabf",
              fontFamily: "'Inter', sans-serif",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "12px", height: "12px" }}>
              <span
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  borderRadius: "9999px",
                  background: "#4edea3",
                  opacity: 0.75,
                  animation: "tp-ping 1.5s cubic-bezier(0,0,0.2,1) infinite",
                }}
              />
              <span
                style={{
                  position: "relative",
                  width: "8px",
                  height: "8px",
                  borderRadius: "9999px",
                  background: "#4edea3",
                  display: "block",
                }}
              />
            </span>
            <h1
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "20px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "#4edea3",
                margin: 0,
              }}
            >
              Explore
            </h1>
          </div>

          {/* Right actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              type="button"
              onClick={onToggleSearch}
              aria-label="Search"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                color: "#4edea3",
                cursor: "pointer",
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                search
              </span>
              Search
            </button>

            <button
              type="button"
              onClick={onOpenNotifications}
              aria-label="Notifications"
              style={{
                background: unreadCount > 0 ? "rgba(239,68,68,0.15)" : "none",
                border: unreadCount > 0 ? "1px solid rgba(239,68,68,0.3)" : "none",
                borderRadius: "10px",
                color: unreadCount > 0 ? "#f87171" : "#bbcabf",
                cursor: "pointer",
                padding: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>
                notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-2px",
                    right: "-2px",
                    height: "16px",
                    minWidth: "16px",
                    borderRadius: "9999px",
                    background: "#ef4444",
                    color: "#ffffff",
                    fontSize: "9px",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 4px",
                    border: "1.5px solid #000f1d",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </>
      )}
    </header>
  )
}

// ── Zone stats mini-card ────────────────────────────────────────────────────
function ZoneStatsCard() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "12px",
        margin: "0 0 16px",
      }}
    >
      <div
        style={{
          background: "#0c2132",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: "16px",
          padding: "14px",
        }}
      >
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "10px",
            fontWeight: 500,
            letterSpacing: "0.04em",
            color: "#4a6380",
            textTransform: "uppercase",
            marginBottom: "4px",
          }}
        >
          Zone Status
        </p>
        <p
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "20px",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "#f0f4f8",
            marginBottom: "8px",
          }}
        >
          Active
        </p>
        <div
          style={{
            height: "4px",
            width: "100%",
            background: "#233748",
            borderRadius: "9999px",
            overflow: "hidden",
            marginBottom: "4px",
          }}
        >
          <div
            style={{
              height: "100%",
              width: "28%",
              background: "#4edea3",
              borderRadius: "9999px",
            }}
          />
        </div>
        <p
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "9.5px",
            color: "#4a6380",
          }}
        >
          14/50 CAPACITY
        </p>
      </div>

      <div
        style={{
          background: "#0c2132",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: "16px",
          padding: "14px",
        }}
      >
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "10px",
            fontWeight: 500,
            letterSpacing: "0.04em",
            color: "#4a6380",
            textTransform: "uppercase",
            marginBottom: "4px",
          }}
        >
          Local Temp
        </p>
        <p
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "20px",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "#f0f4f8",
            marginBottom: "12px",
          }}
        >
          24.5°C
        </p>
        <p
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "9.5px",
            color: "#4a6380",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "12px" }}>
            humidity_low
          </span>
          78% HUMIDITY
        </p>
      </div>
    </div>
  )
}

// ── Main Explore Feed ───────────────────────────────────────────────────────
function ExploreFeedContent() {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [allReviews, setAllReviews] = useState<ReviewData[]>(MOCK_REVIEWS)
  const [searchQuery, setSearchQuery] = useState("")
  const [places, setPlaces] = useState<Location[]>([])

  useEffect(() => { getPlaces().then(setPlaces).catch(() => setPlaces([])) }, [])
  const [selectedTag, setSelectedTag] = useState("all")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("terra_notifications")
        if (stored) return JSON.parse(stored)
      } catch {/* ignore */}
    }
    return INITIAL_NOTIFICATIONS
  })
  const [isNotifOpen, setIsNotifOpen] = useState(false)

  const handleMarkRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("terra_notifications", JSON.stringify(next))
        } catch {/* ignore */}
      }
      return next
    })
  }, [])

  const handleClearAll = useCallback(() => {
    setNotifications([])
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("terra_notifications", JSON.stringify([]))
      } catch {/* ignore */}
    }
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedUserReviewsRaw = localStorage.getItem("terra_user_reviews")
        if (storedUserReviewsRaw) {
          const userReviews: ReviewData[] = JSON.parse(storedUserReviewsRaw)
          setAllReviews([...userReviews, ...MOCK_REVIEWS])
        }
      } catch (err) {
        console.error("Failed to load user reviews:", err)
      }
    }
  }, [])

  // Filter reviews dynamically based on search query & tag selection
  const filteredReviews = useMemo(() => {
    return allReviews.filter((item) => {
      // 1. Tag filter
      if (selectedTag === "gems" && !item.text.toLowerCase().includes("hidden") && !item.text.toLowerCase().includes("secret") && item.rating < 5) {
        return false
      }
      if (selectedTag === "waterfalls" && !item.location.name.toLowerCase().includes("fall") && !item.text.toLowerCase().includes("fall") && !item.text.toLowerCase().includes("water")) {
        return false
      }
      if (selectedTag === "forests" && !item.location.name.toLowerCase().includes("forest") && !item.location.name.toLowerCase().includes("trail") && !item.text.toLowerCase().includes("forest") && !item.text.toLowerCase().includes("trail")) {
        return false
      }
      if (selectedTag === "official" && !item.reviewer.verified) {
        return false
      }

      // 2. Search query filter (partial matching, case-insensitive across place name, text, district, reviewer name, role, zone)
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      const matchName = item.location.name.toLowerCase().includes(q)
      const matchDistrict = item.location.district.toLowerCase().includes(q)
      const matchZone = item.location.zone.toLowerCase().includes(q)
      const matchReviewer = item.reviewer.name.toLowerCase().includes(q)
      const matchRole = item.reviewer.role.toLowerCase().includes(q)
      const matchText = item.text.toLowerCase().includes(q)

      return matchName || matchDistrict || matchZone || matchReviewer || matchRole || matchText
    })
  }, [allReviews, searchQuery, selectedTag])

  const matchingPlaces = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return places.slice(0, 6)
    return places.filter((place) => [place.name, place.category, place.region, place.description].filter(Boolean).some((value) => String(value).toLowerCase().includes(q)))
  }, [places, searchQuery])

  // Restore scroll position on mount
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const saved = sessionStorage.getItem(SCROLL_KEY)
    if (saved) {
      el.scrollTop = Number(saved)
    }
  }, [])

  // Save scroll position on scroll
  const saveScroll = useCallback(() => {
    const el = scrollRef.current
    if (el) {
      sessionStorage.setItem(SCROLL_KEY, String(el.scrollTop))
    }
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    let timer: ReturnType<typeof setTimeout>
    const handler = () => {
      clearTimeout(timer)
      timer = setTimeout(saveScroll, 100)
    }
    el.addEventListener("scroll", handler, { passive: true })
    return () => {
      el.removeEventListener("scroll", handler)
      clearTimeout(timer)
    }
  }, [saveScroll])

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        width: "100%",
        backgroundColor: "#0a0e13",
        color: "#f0f4f8",
        overflow: "hidden",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />

      <ExploreHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isSearchOpen={isSearchOpen}
        onToggleSearch={() => {
          setIsSearchOpen(!isSearchOpen)
          if (isSearchOpen) setSearchQuery("")
        }}
        unreadCount={notifications.filter((n) => !n.read).length}
        onOpenNotifications={() => setIsNotifOpen(true)}
      />

      <div
        id="explore-scroll-container"
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          paddingTop: "76px",
          paddingBottom: "100px",
          paddingLeft: "16px",
          paddingRight: "16px",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <div style={{ maxWidth: "440px", margin: "0 auto" }}>
          {/* Quick Filter Tags Row */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              paddingBottom: "12px",
              scrollbarWidth: "none",
            }}
          >
            {FILTER_TAGS.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => setSelectedTag(tag.id)}
                style={{
                  whiteSpace: "nowrap",
                  padding: "6px 12px",
                  borderRadius: "9999px",
                  border: selectedTag === tag.id ? "1px solid rgba(78,222,163,0.5)" : "1px solid rgba(255,255,255,0.08)",
                  background: selectedTag === tag.id ? "rgba(16,185,129,0.2)" : "#111820",
                  color: selectedTag === tag.id ? "#4edea3" : "#bbcabf",
                  fontSize: "11.5px",
                  fontWeight: 600,
                  fontFamily: "'Inter', sans-serif",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {tag.label}
              </button>
            ))}
          </div>

          <ZoneStatsCard />

          {/* Search Result Count Banner when searching */}
          {(searchQuery || selectedTag !== "all") && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "12px",
                padding: "8px 12px",
                borderRadius: "10px",
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(78,222,163,0.2)",
              }}
            >
              <span style={{ fontSize: "12px", color: "#4edea3", fontWeight: 600 }}>
                Found {filteredReviews.length} results {searchQuery ? `for "${searchQuery}"` : ""}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("")
                  setSelectedTag("all")
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#bbcabf",
                  fontSize: "11px",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Reset Filters
              </button>
            </div>
          )}

          <section style={{ marginBottom: "18px" }}>
            <h2 style={{ fontSize: "14px", color: "#f0f4f8", marginBottom: "10px" }}>Places ({matchingPlaces.length})</h2>
            {matchingPlaces.map((place) => (
              <button key={place.id} type="button" onClick={() => router.push(`/mobile?place_id=${place.id}`)} style={{ width: "100%", textAlign: "left", marginBottom: "8px", padding: "12px", borderRadius: "12px", border: "1px solid rgba(78,222,163,.2)", background: "#111820", color: "#f0f4f8" }}>
                <strong>{place.name}</strong><br /><span style={{ color: "#8fa3b8", fontSize: "11px" }}>{place.category} · {place.region || "Kerala"}</span>
              </button>
            ))}
          </section>

          {/* Review cards */}
          {filteredReviews.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {filteredReviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          ) : (
            /* Empty Search Results State */
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "48px 16px",
                textAlign: "center",
                background: "#111820",
                borderRadius: "16px",
                border: "1px border rgba(255,255,255,0.06)",
                marginTop: "12px",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "40px", color: "#4a6380", marginBottom: "12px" }}>
                search_off
              </span>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#f0f4f8", marginBottom: "6px" }}>
                No Experiences Found
              </h3>
              <p style={{ fontSize: "12px", color: "#8fa3b8", maxWidth: "260px", lineHeight: 1.5, marginBottom: "16px" }}>
                No community posts match "{searchQuery}". Try searching for Wayanad, Periyar, Munnar, or waterfalls.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("")
                  setSelectedTag("all")
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: "10px",
                  background: "rgba(16,185,129,0.18)",
                  border: "1px solid rgba(78,222,163,0.3)",
                  color: "#4edea3",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Clear Search & Filters
              </button>
            </div>
          )}

          <div style={{ height: "24px" }} />
        </div>
      </div>

      <CurvedBottomNav />

      <NotificationsDrawer
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkRead}
        onClearAll={handleClearAll}
      />

      <style>{`
        @keyframes tp-ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        ::-webkit-scrollbar { display: none; }
        * { -ms-overflow-style: none; }
      `}</style>
    </div>
  )
}

export default function ExplorePage() {
  return (
    <ProtectedRoute>
      <ExploreFeedContent />
    </ProtectedRoute>
  )
}
