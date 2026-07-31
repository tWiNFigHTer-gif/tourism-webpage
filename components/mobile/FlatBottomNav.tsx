"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/useAuth"

type NavItem = "map" | "explore" | "profile"

interface FlatBottomNavProps {
  /** Which tab is currently active */
  active?: NavItem
}

/**
 * Straight/flat bottom navigation bar for the Map screen.
 *
 * Layout (left → right):
 *   Map (active icon)  |  Explore  |  Profile
 *
 * No floating FAB button — removed per spec.
 */
export default function FlatBottomNav({ active = "map" }: FlatBottomNavProps) {
  const router = useRouter()
  const { user, profile } = useAuth()

  const ACTIVE_COLOR = "#059669"
  const MUTED_COLOR = "#64748B"

  function itemColor(id: NavItem) {
    return active === id ? ACTIVE_COLOR : MUTED_COLOR
  }

  function iconFill(id: NavItem): string {
    return active === id ? "'FILL' 1" : "'FILL' 0"
  }

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        zIndex: 50,
        background: "rgba(255,255,255,0.96)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderTop: "1px solid #E2E8F0",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          height: "60px",
        }}
      >
        {/* ── Map ── */}
        <button
          type="button"
          id="flat-nav-map"
          onClick={() => router.push("/mobile")}
          aria-label="Map"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "2px",
            padding: "6px 20px",
            borderRadius: "10px",
            border: "none",
            background: active === "map" ? "rgba(16,185,129,0.10)" : "transparent",
            color: itemColor("map"),
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "22px", fontVariationSettings: iconFill("map") }}
          >
            map
          </span>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "10px",
              fontWeight: active === "map" ? 600 : 500,
              letterSpacing: "0.03em",
            }}
          >
            Map
          </span>
          {/* Active indicator dot */}
          {active === "map" && (
            <div
              style={{
                width: "4px",
                height: "4px",
                borderRadius: "9999px",
                background: ACTIVE_COLOR,
                marginTop: "1px",
              }}
            />
          )}
        </button>

        {/* ── Explore ── */}
        <button
          type="button"
          id="flat-nav-explore"
          onClick={() => router.push("/mobile/explore")}
          aria-label="Explore"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "2px",
            padding: "6px 20px",
            borderRadius: "10px",
            border: "none",
            background: active === "explore" ? "rgba(16,185,129,0.10)" : "transparent",
            color: itemColor("explore"),
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "22px", fontVariationSettings: iconFill("explore") }}
          >
            explore
          </span>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "10px",
              fontWeight: active === "explore" ? 600 : 500,
              letterSpacing: "0.03em",
            }}
          >
            Explore
          </span>
          {active === "explore" && (
            <div
              style={{
                width: "4px",
                height: "4px",
                borderRadius: "9999px",
                background: ACTIVE_COLOR,
                marginTop: "1px",
              }}
            />
          )}
        </button>

        {/* ── Profile ── */}
        <button
          type="button"
          id="flat-nav-profile"
          onClick={() => router.push("/mobile/profile")}
          aria-label="Profile"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "2px",
            padding: "6px 20px",
            borderRadius: "10px",
            border: "none",
            background: "transparent",
            color: itemColor("profile"),
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          {/* Avatar circle */}
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "9999px",
              border: user ? "1.5px solid #10b981" : "1px solid rgba(255,255,255,0.15)",
              boxShadow: user ? "0 0 8px rgba(16,185,129,0.35)" : "none",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#111820",
            }}
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Profile"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = "none"
                }}
              />
            ) : user ? (
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "9px",
                  fontWeight: 700,
                  color: "#4edea3",
                  letterSpacing: "0.02em",
                }}
              >
                {(profile?.username || user.user_metadata?.full_name || user.email || "ME")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
            ) : (
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "16px", color: "#4a6380" }}
              >
                account_circle
              </span>
            )}
          </div>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.03em",
            }}
          >
            Profile
          </span>
        </button>
      </div>
    </nav>
  )
}
