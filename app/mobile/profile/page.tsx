"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/AuthProvider"
import { useAuth } from "@/lib/hooks/useAuth"
import { useProfile } from "@/lib/hooks/useProfile"
import { usePreferences } from "@/lib/hooks/usePreferences"
import FlatBottomNav from "@/components/mobile/FlatBottomNav"
import { getUserHazardReports } from "@/lib/db"
import type { StoredPass } from "@/app/mobile/book/page"

// ─── Toast ────────────────────────────────────────────────────────────────────
type ToastType = "success" | "error" | "loading"
interface Toast { id: number; type: ToastType; message: string }

function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div style={{ position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)", zIndex: 9999, display: "flex", flexDirection: "column", gap: "8px", width: "calc(100% - 32px)", maxWidth: "380px" }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => onDismiss(t.id)}
          style={{
            display: "flex", alignItems: "center", gap: "10px",
            borderRadius: "12px", padding: "12px 16px",
            background: t.type === "success" ? "rgba(16,185,129,0.18)" : t.type === "error" ? "rgba(239,68,68,0.18)" : "rgba(17,24,32,0.95)",
            border: `1px solid ${t.type === "success" ? "rgba(78,222,163,0.35)" : t.type === "error" ? "rgba(239,68,68,0.35)" : "rgba(255,255,255,0.10)"}`,
            backdropFilter: "blur(16px)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
            cursor: "pointer",
            animation: "slideDown 0.25s ease",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px", color: t.type === "success" ? "#4edea3" : t.type === "error" ? "#f87171" : "#bbcabf", fontVariationSettings: "'FILL' 1" }}>
            {t.type === "success" ? "check_circle" : t.type === "error" ? "error" : "sync"}
          </span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#f0f4f8", flex: 1 }}>{t.message}</span>
          <span className="material-symbols-outlined" style={{ fontSize: "14px", color: "#4a6380" }}>close</span>
        </div>
      ))}
    </div>
  )
}

// ─── Explorer Badges / Achievements ──────────────────────────────────────────
const EXPLORER_BADGES = [
  { id: "b1", title: "Eco Pioneer", icon: "forest", desc: "Visited 3+ Protected Sanctuaries" },
  { id: "b2", title: "Civic Warden", icon: "shield", desc: "Logged Field Hazard Report" },
  { id: "b3", title: "Trailblazer", icon: "hiking", desc: "Completed Wayanad Circuit" },
]

// ─── Main Profile Content Component ──────────────────────────────────────────
function ProfileContent() {
  const router = useRouter()
  const { user, signOut, refreshProfile } = useAuth()
  const {
    profile,
    isLoading: profileLoading,
    isSaving,
    fetchProfile,
    updateProfile,
    uploadAvatar,
  } = useProfile()

  const { preferences, updatePreferences } = usePreferences(user?.id)

  // Local State
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming")
  const [myPasses, setMyPasses] = useState<StoredPass[]>([])
  const [reportCount, setReportCount] = useState<number>(0)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editUsername, setEditUsername] = useState("")
  const [editBio, setEditBio] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [activePrefSection, setActivePrefSection] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [isSigningOut, setIsSigningOut] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  let toastIdCounter = useRef(0)

  // Toast Helpers
  const addToast = useCallback((type: ToastType, message: string, autoDismissMs = 4000) => {
    const id = ++toastIdCounter.current
    setToasts((prev) => [...prev, { id, type, message }])
    if (autoDismissMs > 0) {
      setTimeout(() => dismissToast(id), autoDismissMs)
    }
    return id
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Boot: Load profile, passes, reports count
  useEffect(() => {
    if (user?.id) fetchProfile(user.id)
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("terra_my_passes")
        if (stored) setMyPasses(JSON.parse(stored))

        const storedReports = localStorage.getItem("terra_my_reports")
        if (storedReports) {
          setReportCount(JSON.parse(storedReports).length)
        }
      } catch {/* ignore */}
    }

    // Try fetching DB report count
    getUserHazardReports(user?.id)
      .then((data) => {
        if (data) setReportCount((prev) => Math.max(prev, data.length))
      })
      .catch(() => {})
  }, [user?.id, fetchProfile])

  useEffect(() => {
    const handleSync = () => {
      const stored = localStorage.getItem("terra_my_passes");
      if (stored) {
        try {
          setMyPasses(JSON.parse(stored));
        } catch {}
      }
    };
    window.addEventListener("storage", handleSync);
    window.addEventListener("storage_sync", handleSync);
    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("storage_sync", handleSync);
    };
  }, []);

  // Sync edit fields when profile loads
  useEffect(() => {
    if (profile) {
      setEditUsername(profile.username ?? "")
      setEditBio(profile.bio ?? "")
    }
  }, [profile])

  // Derived values
  const activePasses = myPasses.filter((p) => p.status === "ACTIVE")
  const visitedPasses = myPasses.filter((p) => p.status === "VISITED")
  const displayName = profile?.username || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Explorer"
  const initials = displayName.slice(0, 2).toUpperCase()
  const email = user?.email || "explorer@kerala.wild"
  const currentAvatarUrl = avatarPreview || profile?.avatar_url || null

  // Avatar change handler
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (!allowed.includes(file.type)) {
      addToast("error", "Please upload a JPG, PNG, WebP, or GIF image.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast("error", "Image must be smaller than 5 MB.")
      return
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  // Save profile
  const handleSave = async () => {
    const trimmedUsername = editUsername.trim()
    const trimmedBio = editBio.trim()

    if (trimmedUsername.length > 30) {
      addToast("error", "Username must be 30 characters or fewer.")
      return
    }
    if (trimmedBio.length > 160) {
      addToast("error", "Bio must be 160 characters or fewer.")
      return
    }

    const loadingToastId = addToast("loading", "Saving your profile…", 0)

    try {
      let avatarUrl: string | undefined

      if (avatarFile && user?.id) {
        const { url, error: uploadErr } = await uploadAvatar(user.id, avatarFile)
        if (uploadErr) {
          dismissToast(loadingToastId)
          addToast("error", `Avatar upload failed: ${uploadErr}`)
          return
        }
        avatarUrl = url
      }

      const { error: updateErr } = await updateProfile({
        username: trimmedUsername || undefined,
        bio: trimmedBio || undefined,
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      })

      dismissToast(loadingToastId)

      if (updateErr) {
        addToast("error", `Save failed: ${updateErr}`)
        return
      }

      await refreshProfile()

      setAvatarFile(null)
      setAvatarPreview(null)
      setIsEditMode(false)
      addToast("success", "Profile updated successfully! 🌿")
    } catch (err: any) {
      dismissToast(loadingToastId)
      addToast("error", err?.message ?? "An unexpected error occurred.")
    }
  }

  // Cancel edit
  const handleCancelEdit = () => {
    setEditUsername(profile?.username ?? "")
    setEditBio(profile?.bio ?? "")
    setAvatarFile(null)
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview)
      setAvatarPreview(null)
    }
    setIsEditMode(false)
  }

  // Sign out
  const handleSignOut = async () => {
    setIsSigningOut(true)
    await signOut()
    router.replace("/login")
  }

  return (
    <div style={{ backgroundColor: "#0a0e13", color: "#f0f4f8", minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&family=Inter:wght@100..900&family=JetBrains+Mono:wght@100..800&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: "none" }}
        onChange={handleAvatarChange}
      />

      {/* ── Sticky Header ──────────────────────────────────────────────── */}
      <header
        style={{
          position: "sticky", top: 0, zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px", height: "56px",
          background: "rgba(12,33,50,0.85)", backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button
          type="button"
          onClick={() => router.push("/mobile")}
          style={{ width: "34px", height: "34px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.10)", background: "#111820", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#bbcabf" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>arrow_back</span>
        </button>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ position: "relative", display: "inline-flex", width: "8px", height: "8px", alignItems: "center", justifyContent: "center" }}>
              <span style={{ position: "absolute", inset: 0, borderRadius: "9999px", background: "#4edea3", opacity: 0.7, animation: "ping 1.5s ease infinite" }} />
              <span style={{ position: "relative", width: "6px", height: "6px", borderRadius: "9999px", background: "#4edea3", display: "inline-block" }} />
            </span>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "16px", fontWeight: 700, color: "#4edea3", letterSpacing: "-0.01em" }}>
              Terra-Pulse
            </span>
          </div>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", fontWeight: 700, color: "#4a6380", letterSpacing: "0.10em" }}>
            EXPLORER DASHBOARD
          </span>
        </div>

        {!isEditMode ? (
          <button
            type="button"
            onClick={() => setIsEditMode(true)}
            style={{ width: "34px", height: "34px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.10)", background: "#111820", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#4edea3" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>edit</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCancelEdit}
            style={{ width: "34px", height: "34px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.10)", background: "#111820", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#f87171" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>close</span>
          </button>
        )}
      </header>

      {/* ── Main Scroll Area ────────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: "0 16px 120px", maxWidth: "480px", margin: "0 auto", width: "100%" }}>

        {profileLoading && (
          <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {[80, 60, 40].map((w, i) => (
              <div key={i} style={{ height: "14px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", width: `${w}%`, animation: "pulse 1.5s ease infinite" }} />
            ))}
          </div>
        )}

        {/* ── Profile Hero Card ─────────────────────────────────── */}
        {!profileLoading && (
          <section
            style={{
              marginTop: "20px", position: "relative", overflow: "hidden",
              borderRadius: "20px", border: "1px solid rgba(255,255,255,0.08)",
              background: "#111820", padding: "20px", boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ pointerEvents: "none", position: "absolute", top: "-40px", right: "-40px", width: "120px", height: "120px", borderRadius: "9999px", background: "rgba(16,185,129,0.10)", filter: "blur(40px)" }} />

            {/* Edit Mode */}
            {isEditMode && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      position: "relative", width: "88px", height: "88px", borderRadius: "9999px",
                      border: "2px dashed #10b981", cursor: "pointer", overflow: "hidden",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "#0c2132",
                      boxShadow: "0 0 20px rgba(16,185,129,0.3)",
                    }}
                  >
                    {currentAvatarUrl ? (
                      <>
                        <img src={currentAvatarUrl} alt="Avatar preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: "24px", color: "#fff" }}>photo_camera</span>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "28px", color: "#4edea3" }}>add_a_photo</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "8px", color: "#4a6380" }}>TAP TO UPLOAD</span>
                      </div>
                    )}
                  </div>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: "#4a6380", textAlign: "center" }}>
                    JPG, PNG, WebP or GIF · Max 5 MB
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9.5px", color: "#4a6380", letterSpacing: "0.08em" }}>
                    USERNAME
                  </label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    maxLength={30}
                    placeholder="e.g. arjun_explorer"
                    style={{
                      width: "100%", padding: "10px 12px",
                      borderRadius: "10px", border: "1px solid rgba(78,222,163,0.35)",
                      background: "#0c2132", color: "#f0f4f8",
                      fontFamily: "'Inter', sans-serif", fontSize: "14px", outline: "none",
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9.5px", color: "#4a6380", letterSpacing: "0.08em" }}>
                    BIO
                  </label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    maxLength={160}
                    rows={3}
                    placeholder="A short bio about your explorations…"
                    style={{
                      width: "100%", padding: "10px 12px",
                      borderRadius: "10px", border: "1px solid rgba(78,222,163,0.35)",
                      background: "#0c2132", color: "#f0f4f8",
                      fontFamily: "'Inter', sans-serif", fontSize: "14px", outline: "none", resize: "none",
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button type="button" onClick={handleCancelEdit} style={{ flex: 1, padding: "11px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.10)", background: "transparent", color: "#8fa3b8", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button type="button" onClick={handleSave} disabled={isSaving} style={{ flex: 2, padding: "11px", borderRadius: "12px", border: "1px solid rgba(78,222,163,0.4)", background: "rgba(16,185,129,0.18)", color: "#4edea3", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                    {isSaving ? "Saving…" : "Save Profile"}
                  </button>
                </div>
              </div>
            )}

            {/* View Mode */}
            {!isEditMode && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div
                      style={{
                        width: "76px", height: "76px", borderRadius: "9999px",
                        border: "2px solid #10b981",
                        boxShadow: "0 0 18px rgba(16,185,129,0.4)",
                        background: "#0c2132", overflow: "hidden",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {currentAvatarUrl ? (
                        <img src={currentAvatarUrl} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "24px", fontWeight: 700, color: "#4edea3" }}>
                          {initials}
                        </span>
                      )}
                    </div>
                    <div style={{ position: "absolute", bottom: "2px", right: "2px", width: "20px", height: "20px", borderRadius: "9999px", background: "#4edea3", border: "2px solid #0a0e13", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: "12px", color: "#003824", fontVariationSettings: "'FILL' 1" }}>verified</span>
                    </div>
                  </div>

                  <div>
                    <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "20px", fontWeight: 700, color: "#f0f4f8", letterSpacing: "-0.02em", marginBottom: "2px" }}>
                      {displayName}
                    </h1>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#8fa3b8", marginBottom: "6px" }}>{email}</p>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", fontWeight: 700, color: "#4edea3", background: "rgba(16,185,129,0.12)", padding: "3px 8px", borderRadius: "6px", border: "1px solid rgba(78,222,163,0.2)" }}>
                      VERIFIED EXPLORER
                    </span>
                  </div>
                </div>

                {profile?.bio && (
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#8fa3b8", lineHeight: 1.5, marginBottom: "16px", borderLeft: "2px solid rgba(78,222,163,0.3)", paddingLeft: "10px" }}>
                    {profile.bio}
                  </p>
                )}

                {/* Stats Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "14px" }}>
                  <div style={{ background: "#0c2132", borderRadius: "12px", padding: "10px", textAlign: "center" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "8.5px", color: "#4a6380" }}>ACTIVE PASSES</span>
                    <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "18px", fontWeight: 700, color: "#4edea3", marginTop: "2px" }}>{String(activePasses.length).padStart(2, "0")}</p>
                  </div>
                  <div style={{ background: "#0c2132", borderRadius: "12px", padding: "10px", textAlign: "center" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "8.5px", color: "#4a6380" }}>PLACES VISITED</span>
                    <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "18px", fontWeight: 700, color: "#ffb95f", marginTop: "2px" }}>{String(visitedPasses.length).padStart(2, "0")}</p>
                  </div>
                  <div style={{ background: "#0c2132", borderRadius: "12px", padding: "10px", textAlign: "center" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "8.5px", color: "#4a6380" }}>CIVIC REPORTS</span>
                    <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "18px", fontWeight: 700, color: "#60a5fa", marginTop: "2px" }}>{String(reportCount).padStart(2, "0")}</p>
                  </div>
                </div>

                {/* Quick Action Row: Digital Pass & Reports Button */}
                <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                  <button
                    type="button"
                    onClick={() => router.push("/mobile/book")}
                    style={{
                      flex: 1, padding: "10px", borderRadius: "12px",
                      background: "rgba(16,185,129,0.15)", border: "1px solid rgba(78,222,163,0.3)",
                      color: "#4edea3", fontFamily: "'Inter', sans-serif", fontSize: "12px", fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", cursor: "pointer",
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>confirmation_number</span>
                    Digital Pass
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/mobile/reports")}
                    style={{
                      flex: 1, padding: "10px", borderRadius: "12px",
                      background: "rgba(59,130,246,0.15)", border: "1px solid rgba(96,165,250,0.3)",
                      color: "#60a5fa", fontFamily: "'Inter', sans-serif", fontSize: "12px", fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", cursor: "pointer",
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>analytics</span>
                    Reports ({reportCount})
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {/* ── Explorer Badges / Achievements Section ────────────────── */}
        {!isEditMode && (
          <section style={{ marginTop: "24px" }}>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9.5px", fontWeight: 700, color: "#4a6380", letterSpacing: "0.08em", marginBottom: "10px" }}>
              EXPLORER BADGES & HONORS
            </p>
            <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "4px" }}>
              {EXPLORER_BADGES.map((b) => (
                <div
                  key={b.id}
                  style={{
                    background: "#111820", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "14px", padding: "12px", width: "135px", flexShrink: 0,
                    display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
                  }}
                >
                  <div style={{ width: "36px", height: "36px", borderRadius: "9999px", background: "rgba(78,222,163,0.15)", border: "1px solid rgba(78,222,163,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#4edea3", marginBottom: "6px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>{b.icon}</span>
                  </div>
                  <h4 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "12px", fontWeight: 700, color: "#f0f4f8" }}>{b.title}</h4>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "9.5px", color: "#8fa3b8", marginTop: "2px" }}>{b.desc}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Trip Tabs ────────────────────────────────────────────────── */}
        {!isEditMode && (
          <section style={{ marginTop: "24px" }}>
            <div style={{ display: "flex", gap: "24px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: "14px" }}>
              {(["upcoming", "past"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  style={{
                    paddingBottom: "8px", fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: "14px", fontWeight: 700,
                    color: activeTab === tab ? "#4edea3" : "#4a6380",
                    borderBottom: activeTab === tab ? "2px solid #4edea3" : "2px solid transparent",
                    background: "transparent", border: "none", cursor: "pointer",
                  }}
                >
                  {tab === "upcoming" ? "Upcoming Trips" : "Past Expeditions"}
                </button>
              ))}
            </div>

            {activeTab === "upcoming" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {activePasses.length > 0 ? (
                  activePasses.map((pass) => (
                    <div key={pass.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.08)", background: "#111820", padding: "12px 14px" }}>
                      <div>
                        <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 600, color: "#f0f4f8" }}>{pass.location_name}</h3>
                        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#4a6380", marginTop: "2px" }}>{pass.booked_at} • {pass.slot_time}</p>
                      </div>
                      <button type="button" onClick={() => router.push("/mobile/book")} style={{ padding: "6px 10px", borderRadius: "8px", background: "rgba(16,185,129,0.15)", border: "1px solid rgba(78,222,163,0.3)", color: "#4edea3", fontSize: "10px", fontWeight: 700, cursor: "pointer" }}>
                        VIEW PASS
                      </button>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: "30px 16px", borderRadius: "14px", border: "1px dashed rgba(255,255,255,0.1)", textAlign: "center" }}>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#f0f4f8" }}>No Upcoming Trips</p>
                    <p style={{ fontSize: "11px", color: "#8fa3b8", marginTop: "4px" }}>Book entry passes from the map to see them here.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "past" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {visitedPasses.length > 0 ? (
                  visitedPasses.map((pass) => (
                    <div key={pass.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.06)", background: "#111820", padding: "12px 14px" }}>
                      <div>
                        <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 600, color: "#f0f4f8" }}>{pass.location_name}</h3>
                        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#4a6380", marginTop: "2px" }}>{pass.booked_at} • COMPLETED</p>
                      </div>
                      <button type="button" onClick={() => router.push(`/mobile/create-post?location_id=${pass.location_id}`)} style={{ padding: "5px 10px", borderRadius: "8px", background: "rgba(16,185,129,0.15)", border: "1px solid rgba(78,222,163,0.3)", color: "#4edea3", fontSize: "10px", fontWeight: 700, cursor: "pointer" }}>
                        Review Spot
                      </button>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: "24px 0", textAlign: "center", color: "#4a6380", fontSize: "12px" }}>No past expeditions logged yet.</div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ── System Preferences Panel ─────────────────────────────── */}
        {!isEditMode && (
          <section style={{ marginTop: "28px" }}>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9.5px", fontWeight: 700, color: "#4a6380", letterSpacing: "0.08em", marginBottom: "10px", paddingLeft: "2px" }}>
              SYSTEM PREFERENCES
            </p>
            <div style={{ borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", background: "#111820", overflow: "hidden" }}>

              {/* 1. Theme */}
              <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <button
                  type="button"
                  onClick={() => setActivePrefSection(activePrefSection === "theme" ? null : "theme")}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer", color: "#f0f4f8" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#4edea3" }}>palette</span>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "13.5px", fontWeight: 500 }}>App Theme</span>
                  </div>
                  <span style={{ fontSize: "11px", color: "#4a6380", textTransform: "capitalize" }}>
                    {preferences.theme} <span className="material-symbols-outlined" style={{ fontSize: "16px", verticalAlign: "middle" }}>expand_more</span>
                  </span>
                </button>

                {activePrefSection === "theme" && (
                  <div style={{ padding: "8px 16px 14px", background: "#0c2132", display: "flex", gap: "8px" }}>
                    {(["dark", "system"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => updatePreferences({ theme: t })}
                        style={{
                          flex: 1, padding: "8px", borderRadius: "8px",
                          border: preferences.theme === t ? "1px solid #4edea3" : "1px solid rgba(255,255,255,0.1)",
                          background: preferences.theme === t ? "rgba(16,185,129,0.2)" : "transparent",
                          color: preferences.theme === t ? "#4edea3" : "#bbcabf",
                          fontSize: "12px", fontWeight: 600, cursor: "pointer", textTransform: "capitalize",
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Notifications */}
              <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <button
                  type="button"
                  onClick={() => updatePreferences({ notifications: !preferences.notifications })}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer", color: "#f0f4f8" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#ffb95f" }}>notifications</span>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "13.5px", fontWeight: 500 }}>Hazard & Safety Alerts</span>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: preferences.notifications ? "#4edea3" : "#f87171" }}>
                    {preferences.notifications ? "ON" : "OFF"}
                  </span>
                </button>
              </div>

              {/* 3. Language */}
              <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <button
                  type="button"
                  onClick={() => setActivePrefSection(activePrefSection === "lang" ? null : "lang")}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer", color: "#f0f4f8" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#60a5fa" }}>translate</span>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "13.5px", fontWeight: 500 }}>Language</span>
                  </div>
                  <span style={{ fontSize: "11px", color: "#4a6380" }}>
                    {preferences.language === "en" ? "English" : preferences.language === "ml" ? "Malayalam" : "Hindi"}{" "}
                    <span className="material-symbols-outlined" style={{ fontSize: "16px", verticalAlign: "middle" }}>expand_more</span>
                  </span>
                </button>

                {activePrefSection === "lang" && (
                  <div style={{ padding: "8px 16px 14px", background: "#0c2132", display: "flex", gap: "8px" }}>
                    {[
                      { code: "en", label: "English" },
                      { code: "ml", label: "മലയാളം" },
                      { code: "hi", label: "हिंदी" },
                    ].map((l) => (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => updatePreferences({ language: l.code as any })}
                        style={{
                          flex: 1, padding: "8px", borderRadius: "8px",
                          border: preferences.language === l.code ? "1px solid #4edea3" : "1px solid rgba(255,255,255,0.1)",
                          background: preferences.language === l.code ? "rgba(16,185,129,0.2)" : "transparent",
                          color: preferences.language === l.code ? "#4edea3" : "#bbcabf",
                          fontSize: "12px", fontWeight: 600, cursor: "pointer",
                        }}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Map Style */}
              <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <button
                  type="button"
                  onClick={() => setActivePrefSection(activePrefSection === "map" ? null : "map")}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer", color: "#f0f4f8" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#c084fc" }}>map</span>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "13.5px", fontWeight: 500 }}>Map Style</span>
                  </div>
                  <span style={{ fontSize: "11px", color: "#4a6380", textTransform: "capitalize" }}>
                    {preferences.mapStyle} <span className="material-symbols-outlined" style={{ fontSize: "16px", verticalAlign: "middle" }}>expand_more</span>
                  </span>
                </button>

                {activePrefSection === "map" && (
                  <div style={{ padding: "8px 16px 14px", background: "#0c2132", display: "flex", gap: "8px" }}>
                    {(["standard", "satellite", "terrain"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => updatePreferences({ mapStyle: m })}
                        style={{
                          flex: 1, padding: "8px", borderRadius: "8px",
                          border: preferences.mapStyle === m ? "1px solid #4edea3" : "1px solid rgba(255,255,255,0.1)",
                          background: preferences.mapStyle === m ? "rgba(16,185,129,0.2)" : "transparent",
                          color: preferences.mapStyle === m ? "#4edea3" : "#bbcabf",
                          fontSize: "12px", fontWeight: 600, cursor: "pointer", textTransform: "capitalize",
                        }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 5. Units */}
              <div>
                <button
                  type="button"
                  onClick={() => updatePreferences({ units: preferences.units === "metric" ? "imperial" : "metric" })}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer", color: "#f0f4f8" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#4a6380" }}>straighten</span>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "13.5px", fontWeight: 500 }}>Distance Units</span>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#4edea3" }}>
                    {preferences.units === "metric" ? "Kilometers (km)" : "Miles (mi)"}
                  </span>
                </button>
              </div>

            </div>
          </section>
        )}

        {/* ── Sign Out ────────────────────────────────────────────────── */}
        {!isEditMode && (
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            style={{
              marginTop: "28px", width: "100%",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              padding: "14px", borderRadius: "14px",
              border: "1px solid rgba(239,68,68,0.20)",
              background: "transparent",
              color: isSigningOut ? "#4a6380" : "#f87171",
              fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: 700,
              cursor: isSigningOut ? "not-allowed" : "pointer",
            }}
          >
            {isSigningOut ? "Signing out…" : "Log Out"}
          </button>
        )}

        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#4a6380" }}>
            Terra-Pulse SDI • 10.8505° N, 76.2711° E
          </p>
        </div>
      </main>

      <FlatBottomNav active="profile" />
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
