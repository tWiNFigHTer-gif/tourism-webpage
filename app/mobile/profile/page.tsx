"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ProtectedRoute } from "@/components/AuthProvider"
import { useAuth } from "@/components/AuthProvider"
import FlatBottomNav from "@/components/mobile/FlatBottomNav"
import { uploadAvatar, getUserHazardReports } from "@/lib/db"

interface Toast {
  id: string
  type: "success" | "error" | "info"
  message: string
}

function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div
      style={{
        position: "fixed",
        top: "68px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        width: "calc(100% - 32px)",
        maxWidth: "440px",
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => {
        const bg = t.type === "success" ? "#ecfdf5" : t.type === "error" ? "#fef2f2" : "#f0f9ff"
        const border = t.type === "success" ? "#a7f3d0" : t.type === "error" ? "#fecaca" : "#bae6fd"
        const text = t.type === "success" ? "#047857" : t.type === "error" ? "#b91c1c" : "#0369a1"
        const icon = t.type === "success" ? "check_circle" : t.type === "error" ? "error" : "info"
        return (
          <div
            key={t.id}
            style={{
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              padding: "12px 16px",
              borderRadius: "12px",
              background: bg,
              border: `1px solid ${border}`,
              color: text,
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>{icon}</span>
              <span>{t.message}</span>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              style={{ background: "transparent", border: "none", color: text, cursor: "pointer", display: "flex" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>close</span>
            </button>
          </div>
        )
      })}
    </div>
  )
}

const EXPLORER_BADGES = [
  { id: "b1", title: "Eco Pioneer", icon: "eco", desc: "Visited 3+ Protected Sanctuaries" },
  { id: "b2", title: "Civic Watch", icon: "shield_with_heart", desc: "Reported Community Hazard" },
  { id: "b3", title: "Trail Master", icon: "hiking", desc: "Completed Kadalundi Bird Walk" },
]

function ProfileContent() {
  const router = useRouter()
  const { user, profile, isLoading: profileLoading, refreshProfile, updateProfile, signOut } = useAuth()

  // Local state
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming")
  const [subTab, setSubTab] = useState<"posts" | "saved" | "liked" | "tagged">("saved")
  const [savedPosts, setSavedPosts] = useState<any[]>([])

  useEffect(() => {
    const loadSavedPosts = async () => {
      let loaded: any[] = []

      if (typeof window !== "undefined") {
        try {
          const userKey = user?.id ? `terra_saved_posts_${user.id}` : null
          const rawScoped = userKey ? localStorage.getItem(userKey) : null
          const rawGlobal = localStorage.getItem("terra_saved_posts")

          if (rawScoped) {
            loaded = JSON.parse(rawScoped)
          } else if (rawGlobal) {
            loaded = JSON.parse(rawGlobal)
          }
        } catch (e) {
          console.log("Error reading saved posts local storage:", e)
        }
      }

      if (user?.id) {
        try {
          const res = await fetch(`/api/saved-posts?user_id=${user.id}`).catch(() => null)
          if (res && res.ok) {
            const remoteData = await res.json()
            if (Array.isArray(remoteData) && remoteData.length > 0) {
              const remotePosts = remoteData.map((rd: any) => rd.post_data || rd).filter(Boolean)
              if (remotePosts.length > 0) loaded = remotePosts
            }
          }
        } catch (err) {
          console.log("Saved posts Supabase fetch info:", err)
        }
      }

      setSavedPosts(loaded)
    }

    loadSavedPosts()
    window.addEventListener("storage", loadSavedPosts)
    window.addEventListener("storage_sync", loadSavedPosts)
    return () => {
      window.removeEventListener("storage", loadSavedPosts)
      window.removeEventListener("storage_sync", loadSavedPosts)
    }
  }, [user?.id])
  const [isEditMode, setIsEditMode] = useState(false)
  const [editUsername, setEditUsername] = useState("")
  const [editBio, setEditBio] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [reportCount, setReportCount] = useState(0)

  // System preferences state
  const [preferences, setPreferences] = useState({
    theme: "light",
    notifications: true,
    language: "en",
    mapStyle: "standard",
    units: "metric",
  })
  const [activePrefSection, setActivePrefSection] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const addToast = (type: Toast["type"], message: string) => {
    const id = `toast-${Date.now()}`
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => dismissToast(id), 5000)
  }

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  // Read passes from local storage scoped to current user
  const [myPasses, setMyPasses] = useState<any[]>([])
  useEffect(() => {
    const handleSync = () => {
      if (!user?.id) {
        setMyPasses([])
        return
      }
      const userKey = `terra_my_passes_${user.id}`
      const stored = localStorage.getItem(userKey)
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

  // Sync edit fields when profile loads
  useEffect(() => {
    if (profile) {
      setEditUsername(profile.username ?? "")
      setEditBio(profile.bio ?? "")
    }
  }, [profile])

  // Fetch civic report count
  useEffect(() => {
    async function loadReportCount() {
      try {
        const reports = await getUserHazardReports(user?.id)
        setReportCount(reports?.length ?? 0)
      } catch {
        setReportCount(0)
      }
    }
    if (user?.id) loadReportCount()
  }, [user?.id])

  // Load preferences from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("terra_user_preferences")
        if (raw) setPreferences((prev) => ({ ...prev, ...JSON.parse(raw) }))
      } catch {}
    }
  }, [])

  const updatePreferences = (patch: Partial<typeof preferences>) => {
    const next = { ...preferences, ...patch }
    setPreferences(next)
    if (typeof window !== "undefined") {
      localStorage.setItem("terra_user_preferences", JSON.stringify(next))
    }
    addToast("info", "Preference updated")
  }

  // Derived values
  const activePasses = myPasses.filter((p) => p.status !== "VISITED" && p.status !== "EXPIRED")
  const visitedPasses = myPasses.filter((p) => p.status === "VISITED" || p.status === "CHECKED_IN")
  const displayName = profile?.username || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Arjun Nair"
  const initials = displayName.slice(0, 2).toUpperCase()
  const email = user?.email || "explorer@kerala.wild"
  const currentAvatarUrl = avatarPreview || profile?.avatar_url || null

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

    setIsSaving(true)
    const loadingToastId = `toast-loading-${Date.now()}`
    setToasts((prev) => [...prev, { id: loadingToastId, type: "info", message: "Saving profile changes…" }])

    try {
      let avatarUrl: string | undefined = undefined
      if (avatarFile && user?.id) {
        const { url, error: uploadErr } = await uploadAvatar(user.id, avatarFile)
        if (uploadErr) {
          dismissToast(loadingToastId)
          addToast("error", `Avatar upload failed: ${uploadErr}`)
          setIsSaving(false)
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
      setIsSaving(false)

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
      setIsSaving(false)
      addToast("error", err?.message ?? "An unexpected error occurred.")
    }
  }

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

  const handleSignOut = async () => {
    setIsSigningOut(true)
    await signOut()
    router.replace("/login")
  }

  return (
    <div style={{ backgroundColor: "#F8FAFC", color: "#0F172A", minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
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

      {/* ── Top Brand Navigation Bar ────────────────────────────────────────── */}
      <header
        style={{
          position: "sticky", top: 0, zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px", height: "60px",
          background: "#FFFFFF",
          borderBottom: "1px solid #E2E8F0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "18px", fontWeight: 700, color: "#059669", margin: 0 }}>
            Terra-Pulse
          </h1>
        </div>



        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#64748B", cursor: "pointer" }}>notifications</span>
          <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#64748B", cursor: "pointer" }} onClick={() => setIsEditMode(!isEditMode)}>settings</span>
          <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#ECFDF5", border: "1px solid #059669", display: "flex", alignItems: "center", justifyContent: "center", color: "#059669", fontSize: "12px", fontWeight: 700 }}>
            {initials}
          </div>
        </div>
      </header>

      {/* ── Main Container ──────────────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: "24px 16px 120px", maxWidth: "600px", margin: "0 auto", width: "100%" }}>

        {/* ── Profile Hero Card ──────────────────────────────────────────────── */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            marginBottom: "24px",
          }}
        >
          {isEditMode ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0F172A", margin: 0 }}>Edit Profile Settings</h3>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#64748B", display: "block", marginBottom: "4px" }}>Display Name</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #E2E8F0", outline: "none", fontSize: "14px" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#64748B", display: "block", marginBottom: "4px" }}>Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={2}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #E2E8F0", outline: "none", fontSize: "14px", resize: "none" }}
                />
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="button" onClick={handleCancelEdit} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #E2E8F0", background: "#F8FAFC", color: "#64748B", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button type="button" onClick={handleSave} disabled={isSaving} style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", background: "#059669", color: "#FFFFFF", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>{isSaving ? "Saving..." : "Save Profile"}</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      width: "64px", height: "64px", borderRadius: "12px",
                      background: "#0F172A", overflow: "hidden",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {currentAvatarUrl ? (
                      <img src={currentAvatarUrl} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "22px", fontWeight: 700, color: "#059669" }}>
                        {initials}
                      </span>
                    )}
                  </div>
                  <div style={{ position: "absolute", bottom: "-4px", right: "-4px", width: "18px", height: "18px", borderRadius: "50%", background: "#059669", border: "2px solid #FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "11px", color: "#FFFFFF" }}>check</span>
                  </div>
                </div>

                <div>
                  <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "18px", fontWeight: 700, color: "#0F172A", margin: "0 0 4px" }}>
                    {displayName}
                  </h2>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", fontWeight: 700, color: "#059669", background: "#ECFDF5", padding: "3px 8px", borderRadius: "4px", border: "1px solid rgba(5,150,105,0.2)" }}>
                    VERIFIED EXPLORER
                  </span>
                </div>
              </div>

              <div style={{ height: "1px", background: "#E2E8F0", margin: "16px 0" }} />

              {/* Stats Counters */}
              <div style={{ display: "flex", gap: "36px" }}>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>ACTIVE PASSES</div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "18px", fontWeight: 700, color: "#059669", marginTop: "2px" }}>
                    {String(activePasses.length).padStart(2, "0")}
                  </div>
                </div>

                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>CIVIC REPORTS</div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "18px", fontWeight: 700, color: "#059669", marginTop: "2px" }}>
                    {String(reportCount).padStart(2, "0")}
                  </div>
                </div>
              </div>

              {/* Sub-tabs: Posts / Saved / Liked / Tagged */}
              <div style={{ display: "flex", justifyContent: "center", gap: "24px", marginTop: "24px", borderBottom: "1px solid #E2E8F0", paddingBottom: "8px" }}>
                {(["posts", "saved", "liked", "tagged"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSubTab(st)}
                    style={{
                      background: "transparent",
                      border: "none",
                      paddingBottom: "6px",
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "12.5px",
                      fontWeight: subTab === st ? 700 : 500,
                      color: subTab === st ? "#059669" : "#64748B",
                      borderBottom: subTab === st ? "2px solid #059669" : "2px solid transparent",
                      cursor: "pointer",
                      textTransform: "capitalize",
                    }}
                  >
                    {st === "saved" ? `saved (${savedPosts.length})` : st}
                  </button>
                ))}
              </div>

              {subTab === "saved" ? (
                savedPosts.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
                    {savedPosts.map((post: any, idx: number) => {
                      const title = post.location?.name || post.reviewer?.name || post.title || "Saved Ecotourism Post"
                      const snippet = post.text ? post.text.slice(0, 60) + "..." : post.caption || "Saved explorer review bookmark"
                      const img = post.images?.[0] || post.photo_url || "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=300&q=80"
                      return (
                        <div
                          key={post.id || idx}
                          style={{
                            background: "#FFFFFF",
                            border: "1px solid #E2E8F0",
                            borderRadius: "12px",
                            padding: "12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "12px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", overflow: "hidden" }}>
                            <img
                              src={img}
                              alt={title}
                              style={{ width: "44px", height: "44px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }}
                            />
                            <div style={{ minWidth: 0 }}>
                              <h4 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "13px", fontWeight: 700, color: "#0F172A", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {title}
                              </h4>
                              <p style={{ fontSize: "11px", color: "#64748B", margin: "2px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {snippet}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = savedPosts.filter((p) => (p.id || p) !== (post.id || post))
                              setSavedPosts(updated)
                              if (typeof window !== "undefined") {
                                localStorage.setItem("terra_saved_posts", JSON.stringify(updated))
                                if (user?.id) localStorage.setItem(`terra_saved_posts_${user.id}`, JSON.stringify(updated))
                                window.dispatchEvent(new Event("storage_sync"))
                              }
                            }}
                            style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px" }}
                            title="Remove bookmark"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>bookmark_remove</span>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "32px 0", color: "#64748B", fontSize: "13px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "32px", color: "#94A3B8", display: "block", marginBottom: "6px" }}>
                      bookmark_border
                    </span>
                    No saved posts yet. Explore and bookmark ecotourism gems!
                  </div>
                )
              ) : (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#64748B", fontSize: "13px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "32px", color: "#94A3B8", display: "block", marginBottom: "6px" }}>
                    post_add
                  </span>
                  No {subTab} yet
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Trips & Expeditions Tabs ────────────────────────────────────────── */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", gap: "24px", borderBottom: "1px solid #E2E8F0", marginBottom: "16px" }}>
            {(["upcoming", "past"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  background: "transparent",
                  border: "none",
                  paddingBottom: "8px",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: activeTab === tab ? "#059669" : "#64748B",
                  borderBottom: activeTab === tab ? "2px solid #059669" : "2px solid transparent",
                  cursor: "pointer",
                }}
              >
                {tab === "upcoming" ? "Upcoming Trips" : "Past Expeditions"}
              </button>
            ))}
          </div>

          {activeTab === "upcoming" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {activePasses.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 16px", background: "#FFFFFF", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "36px", color: "#94A3B8", marginBottom: "8px", display: "block" }}>
                    confirmation_number
                  </span>
                  <p style={{ fontSize: "13px", color: "#475569", margin: "0 0 12px", fontWeight: 500 }}>
                    No upcoming booked passes yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push("/mobile/book")}
                    style={{ background: "#059669", color: "#FFFFFF", border: "none", borderRadius: "8px", padding: "8px 16px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                  >
                    Book Destination Pass
                  </button>
                </div>
              ) : (
                activePasses.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: "12px",
                      padding: "16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#059669" }} />
                        <h4 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "14px", fontWeight: 700, color: "#0F172A", margin: 0 }}>
                          {p.location_name}
                        </h4>
                      </div>
                      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#64748B", margin: "4px 0 0 16px" }}>
                        {p.booked_at || "VALID"} • {p.slot_time || "10:00 AM"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => router.push("/map")}
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid #E2E8F0",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#0F172A",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>map</span>
                      VIEW ON MAP
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "past" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {visitedPasses.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 16px", background: "#FFFFFF", borderRadius: "12px", border: "1px solid #E2E8F0", color: "#64748B", fontSize: "13px" }}>
                  No past expeditions recorded yet.
                </div>
              ) : (
                visitedPasses.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: "12px",
                      padding: "16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#64748B" }} />
                        <h4 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "14px", fontWeight: 700, color: "#0F172A", margin: 0 }}>
                          {p.location_name}
                        </h4>
                      </div>
                      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#64748B", margin: "4px 0 0 16px" }}>
                        {p.booked_at} • VISITED
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ── System Preferences ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: "24px" }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", fontWeight: 700, color: "#64748B", letterSpacing: "0.08em", marginBottom: "10px" }}>
            SYSTEM PREFERENCES
          </p>

          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "14px", overflow: "hidden" }}>
            <div
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #E2E8F0", cursor: "pointer" }}
              onClick={() => addToast("info", "Environmental preferences active")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#64748B" }}>eco</span>
                <span style={{ fontSize: "13.5px", fontWeight: 500, color: "#0F172A" }}>Environmental Preferences</span>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#64748B" }}>chevron_right</span>
            </div>

            <div
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #E2E8F0", cursor: "pointer" }}
              onClick={() => addToast("info", "Privacy settings updated")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#64748B" }}>security</span>
                <span style={{ fontSize: "13.5px", fontWeight: 500, color: "#0F172A" }}>Privacy Settings</span>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#64748B" }}>chevron_right</span>
            </div>

            <div
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", cursor: "pointer" }}
              onClick={() => router.push("/admin/dashboard")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#64748B" }}>grid_view</span>
                <span style={{ fontSize: "13.5px", fontWeight: 500, color: "#0F172A" }}>Civic Dashboard Link</span>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#64748B" }}>open_in_new</span>
            </div>
          </div>
        </div>

        {/* ── Logout Button ──────────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "12px",
            borderRadius: "12px",
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            color: "#DC2626",
            fontFamily: "'Inter', sans-serif",
            fontSize: "13.5px",
            fontWeight: 700,
            cursor: isSigningOut ? "not-allowed" : "pointer",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>logout</span>
          {isSigningOut ? "Logging out..." : "Log Out"}
        </button>

        {/* Footer info */}
        <div style={{ marginTop: "24px", display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748B" }}>
          <span>Terra-Pulse SDI • 10.8505° N, 76.2711° E</span>
          <div style={{ display: "flex", gap: "12px" }}>
            <span>Data Privacy</span>
            <span>System Status</span>
            <span>API Docs</span>
          </div>
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
