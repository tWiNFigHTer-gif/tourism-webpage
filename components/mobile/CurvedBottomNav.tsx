"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/useAuth"

interface CurvedBottomNavProps {
  /** Callback when the FAB '+' is pressed (defaults to navigating to /mobile/book) */
  onCreatePress?: () => void
}

/**
 * Curved bottom navigation bar for the Explore screen.
 *
 * Layout (left → right):
 *   Map icon  |  [curved notch with floating FAB '+']  |  Profile icon
 *
 * SVG path is the exact notch from the Stitch-generated design.
 */
export default function CurvedBottomNav({ onCreatePress }: CurvedBottomNavProps) {
  const router = useRouter()
  const { user, profile } = useAuth()

  const handleMap = () => router.push("/mobile")
  const handleCreate = onCreatePress ?? (() => router.push("/mobile/create-post"))
  const handleProfile = () => router.push("/mobile/profile")

  // Colours from the Terra-Pulse design system
  const BG = "rgba(8,29,46,0.90)"
  const ICON_MUTED = "#4a6380"
  const ICON_ACTIVE = "#4edea3"

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        zIndex: 50,
        /* Ensure pointer events only on the SVG shape area */
      }}
    >
      {/* ── Outer shell: holds the SVG background + the button row ── */}
      <div style={{ position: "relative", height: "80px" }}>
        {/* SVG curved bar — matches Stitch notch path exactly */}
        <svg
          viewBox="0 0 400 80"
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "80px",
            filter: "drop-shadow(0 -4px 20px rgba(0,0,0,0.5))",
            pointerEvents: "none",
          }}
        >
          <defs>
            <clipPath id="curved-notch-clip">
              <path d="M0,80 L400,80 L400,0 L240,0 C230,0 225,5 220,10 C210,25 190,25 180,10 C175,5 170,0 160,0 L0,0 Z" />
            </clipPath>
          </defs>
          {/* Filled bar */}
          <path
            d="M0,80 L400,80 L400,0 L240,0 C230,0 225,5 220,10 C210,25 190,25 180,10 C175,5 170,0 160,0 L0,0 Z"
            fill={BG}
            style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as React.CSSProperties}
          />
          {/* Top border line */}
          <path
            d="M0,0 L160,0 C170,0 175,5 180,10 C190,25 210,25 220,10 C225,5 230,0 240,0 L400,0"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        </svg>

        {/* ── Floating Action Button (FAB) in the notch ── */}
        <div
          style={{
            position: "absolute",
            bottom: "38px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
          }}
        >
          <button
            type="button"
            id="explore-fab-create"
            onClick={handleCreate}
            aria-label="Create review"
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "9999px",
              background: "linear-gradient(135deg, #4edea3 0%, #10b981 60%, #3b82f6 100%)",
              border: "none",
              boxShadow: "0 4px 20px rgba(16,185,129,0.40), 0 2px 8px rgba(0,0,0,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              position: "relative",
              overflow: "visible",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "scale(0.92)"
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "scale(1)"
            }}
          >
            {/* Breathing glow ring */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "9999px",
                background: "rgba(78,222,163,0.20)",
                animation: "tp-breathe 2.4s infinite ease-in-out",
                pointerEvents: "none",
              }}
            />
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: "30px",
                color: "#003824",
                fontVariationSettings: "'FILL' 1",
                position: "relative",
                zIndex: 1,
              }}
            >
              add
            </span>
          </button>
        </div>

        {/* ── Nav Buttons Row ── */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "80px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            paddingLeft: "20px",
            paddingRight: "20px",
            zIndex: 51,
          }}
        >
          {/* Map icon (left) */}
          <button
            type="button"
            id="curved-nav-map"
            onClick={handleMap}
            aria-label="Go to Map"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "3px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: ICON_MUTED,
              padding: "6px 20px",
              transition: "color 0.2s ease",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "26px" }}>
              map
            </span>
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "10px",
                fontWeight: 500,
                letterSpacing: "0.03em",
              }}
            >
              Map
            </span>
          </button>

          {/* Centre spacer (for FAB) */}
          <div style={{ width: "64px" }} />

          {/* Profile icon (right) */}
          <button
            type="button"
            id="curved-nav-profile"
            onClick={handleProfile}
            aria-label="Go to Profile"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "3px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: ICON_MUTED,
              padding: "6px 20px",
              transition: "color 0.2s ease",
            }}
          >
            {/* Avatar circle for profile */}
            <div
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "9999px",
                border: user ? "1.5px solid #10b981" : "1px solid rgba(255,255,255,0.15)",
                boxShadow: user ? "0 0 8px rgba(16,185,129,0.30)" : "none",
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
                    color: ICON_ACTIVE,
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
                  style={{ fontSize: "18px", color: ICON_MUTED }}
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
      </div>

      {/* keyframes */}
      <style>{`
        @keyframes tp-breathe {
          0%, 100% { transform: scale(1); opacity: 0.20; }
          50% { transform: scale(1.3); opacity: 0.08; }
        }
      `}</style>
    </nav>
  )
}
