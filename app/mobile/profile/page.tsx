"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/AuthProvider"
import { useAuth } from "@/lib/hooks/useAuth"
import { useProfile } from "@/lib/hooks/useProfile"
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

// ─── Preference items ─────────────────────────────────────────────────────────
const PREF_ITEMS = [
  { icon: "eco", label: "Environmental Preferences" },
  { icon: "shield", label: "Privacy Settings" },
  { icon: "dashboard", label: "Civic Dashboard", external: true },
  { icon: "notifications", label: "Notification Settings" },
]

// ─── Main Component ────────────────────────────────────────────────────────────
function ProfileContent() {
  const router = useRouter()
  const { user, signOut, refreshProfile } = useAuth()
  const {
    profile,
    isLoading: profileLoading,
    isSaving,
    dbAvailable,
    fetchProfile,
    updateProfile,
    uploadAvatar,
  } = useProfile()

  // ── Local state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming")
  const [myPasses, setMyPasses] = useState<StoredPass[]>([])
  const [isEditMode, setIsEditMode] = useState(false)
  const [editUsername, setEditUsername] = useState("")
  const [editBio, setEditBio] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [isSigningOut, setIsSigningOut] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  let toastIdCounter = useRef(0)

  // ── Toast helpers ─────────────────────────────────────────────────────────
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

  // ── Boot: load profile + passes ───────────────────────────────────────────
  useEffect(() => {
    if (user?.id) fetchProfile(user.id)
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("terra_my_passes")
        if (stored) setMyPasses(JSON.parse(stored))
      } catch {/* ignore */}
    }
  }, [user?.id, fetchProfile])

  // ── Sync edit fields when profile loads ──────────────────────────────────
  useEffect(() => {
    if (profile) {
      setEditUsername(profile.username ?? "")
      setEditBio(profile.bio ?? "")
    }
  }, [profile])

  // ── Derived values ────────────────────────────────────────────────────────
  const activePasses = myPasses.filter((p) => p.status === "ACTIVE")
  const visitedPasses = myPasses.filter((p) => p.status === "VISITED")
  const displayName = profile?.username || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Explorer"
  const initials = displayName.slice(0, 2).toUpperCase()
  const email = user?.email || "explorer@kerala.wild"
  const currentAvatarUrl = avatarPreview || profile?.avatar_url || null

  // ── Avatar upload handler ─────────────────────────────────────────────────
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

  // ── Save profile ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    const trimmedUsername = editUsername.trim()
    const trimmedBio = editBio.trim()

    // Validate
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

      // 1. Upload avatar if changed
      if (avatarFile && user?.id) {
        const { url, error: uploadErr } = await uploadAvatar(user.id, avatarFile)
        if (uploadErr) {
          dismissToast(loadingToastId)
          addToast("error", `Avatar upload failed: ${uploadErr}`)
          return
        }
        avatarUrl = url
      }

      // 2. Upsert profile row
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

      // 3. Refresh global profile in AuthProvider
      await refreshProfile()

      // 4. Clear preview state and exit edit mode
      setAvatarFile(null)
      setAvatarPreview(null)
      setIsEditMode(false)
      addToast("success", "Profile updated successfully! 🌿")
    } catch (err: any) {
      dismissToast(loadingToastId)
      addToast("error", err?.message ?? "An unexpected error occurred.")
    }
  }

  // ── Cancel edit ───────────────────────────────────────────────────────────
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

  // ── Sign out ──────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    setIsSigningOut(true)
    await signOut()
    router.replace("/login")
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{ backgroundColor: "#0a0e13", color: "#f0f4f8", minHeight: "100dvh", display: "flex", flexDirection: "column" }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&family=Inter:wght@100..900&family=JetBrains+Mono:wght@100..800&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />

      {/* Toast stack */}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* ── Hidden file input ────────────────────────────────────────────── */}
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

        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", fontWeight: 700, color: "#4edea3", letterSpacing: "0.08em" }}>
          EXPLORER DASHBOARD
        </span>

        {/* Edit / Done toggle */}
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

        {/* DB Setup notice */}
      {!dbAvailable && (
        <div
          style={{
            margin: "12px 0 0",
            padding: "12px 14px",
            borderRadius: "12px",
            background: "rgba(245,158,11,0.10)",
            border: "1px solid rgba(245,158,11,0.30)",
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#f59e0b", marginTop: "1px", flexShrink: 0 }}>info</span>
          <div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#fcd34d", marginBottom: "4px", fontWeight: 600 }}>
              Profile stored locally
            </p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: "#8fa3b8", lineHeight: 1.5 }}>
              Changes are saved on this device. To enable cloud sync, run the{" "}
              <a
                href="https://supabase.com/dashboard/project/lwunotlnczcsynaemjsq/sql/new"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#4edea3", textDecoration: "underline", cursor: "pointer" }}
              >
                SQL migration
              </a>{" "}
              in Supabase.
            </p>
          </div>
        </div>
      )}

      {/* ── Profile Loading Skeleton ────────────────────────────────── */}
        {profileLoading && (
          <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {[80, 60, 40].map((w, i) => (
              <div key={i} style={{ height: "14px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", width: `${w}%`, animation: "pulse 1.5s ease infinite" }} />
            ))}
          </div>
        )}

        {/* ── Profile Glass Hero Card ─────────────────────────────────── */}
        {!profileLoading && (
          <section
            style={{
              marginTop: "20px", position: "relative", overflow: "hidden",
              borderRadius: "20px", border: "1px solid rgba(255,255,255,0.08)",
              background: "#111820", padding: "20px", boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
          >
            {/* Ambient glow */}
            <div style={{ pointerEvents: "none", position: "absolute", top: "-40px", right: "-40px", width: "120px", height: "120px", borderRadius: "9999px", background: "rgba(16,185,129,0.10)", filter: "blur(40px)" }} />

            {/* ── EDIT MODE ────────────────────────────────────────────── */}
            {isEditMode && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Avatar upload area */}
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
                        <img
                          src={currentAvatarUrl}
                          alt="Avatar preview"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                        />
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
                  {avatarPreview && (
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: "#4edea3", background: "rgba(16,185,129,0.12)", padding: "3px 8px", borderRadius: "6px", border: "1px solid rgba(78,222,163,0.2)" }}>
                      ✓ NEW PHOTO READY
                    </span>
                  )}
                </div>

                {/* Username field */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9.5px", color: "#4a6380", letterSpacing: "0.08em" }}>
                    USERNAME
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      maxLength={30}
                      placeholder="e.g. arjun_explorer"
                      style={{
                        width: "100%", padding: "10px 40px 10px 12px",
                        borderRadius: "10px", border: "1px solid rgba(78,222,163,0.35)",
                        background: "#0c2132", color: "#f0f4f8",
                        fontFamily: "'Inter', sans-serif", fontSize: "14px",
                        outline: "none", boxSizing: "border-box",
                      }}
                    />
                    <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: editUsername.length > 25 ? "#f59e0b" : "#4a6380" }}>
                      {editUsername.length}/30
                    </span>
                  </div>
                </div>

                {/* Bio field */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9.5px", color: "#4a6380", letterSpacing: "0.08em" }}>
                    BIO
                  </label>
                  <div style={{ position: "relative" }}>
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
                        fontFamily: "'Inter', sans-serif", fontSize: "14px",
                        outline: "none", resize: "none", boxSizing: "border-box",
                        lineHeight: "1.5",
                      }}
                    />
                    <span style={{ position: "absolute", right: "10px", bottom: "8px", fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: editBio.length > 140 ? "#f59e0b" : "#4a6380" }}>
                      {editBio.length}/160
                    </span>
                  </div>
                </div>

                {/* Save / Cancel buttons */}
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    style={{ flex: 1, padding: "11px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.10)", background: "transparent", color: "#8fa3b8", fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    style={{
                      flex: 2, padding: "11px", borderRadius: "12px",
                      border: "1px solid rgba(78,222,163,0.4)",
                      background: isSaving ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.18)",
                      color: isSaving ? "#8aa299" : "#4edea3",
                      fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 700,
                      cursor: isSaving ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                      transition: "all 0.2s",
                    }}
                  >
                    {isSaving ? (
                      <>
                        <span style={{ width: "14px", height: "14px", borderRadius: "9999px", border: "2px solid #4edea3", borderTopColor: "transparent", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                        Saving…
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined" style={{ fontSize: "16px", fontVariationSettings: "'FILL' 1" }}>save</span>
                        Save Profile
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ── VIEW MODE ────────────────────────────────────────────── */}
            {!isEditMode && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
                  {/* Avatar */}
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div
                      style={{
                        width: "80px", height: "80px", borderRadius: "9999px",
                        border: "2px solid #10b981",
                        boxShadow: "0 0 18px rgba(16,185,129,0.4)",
                        background: "#0c2132", overflow: "hidden",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {currentAvatarUrl ? (
                        <img
                          src={currentAvatarUrl}
                          alt={displayName}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={(e) => {
                            const el = e.target as HTMLImageElement
                            el.style.display = "none"
                            el.nextElementSibling?.removeAttribute("style")
                          }}
                        />
                      ) : null}
                      <span
                        style={{
                          fontFamily: "'Space Grotesk', sans-serif", fontSize: "24px", fontWeight: 700,
                          color: "#4edea3", letterSpacing: "-0.02em",
                          display: currentAvatarUrl ? "none" : "block",
                        }}
                      >
                        {initials}
                      </span>
                    </div>
                    {/* Verified badge */}
                    <div style={{ position: "absolute", bottom: "2px", right: "2px", width: "22px", height: "22px", borderRadius: "9999px", background: "#4edea3", border: "2px solid #0a0e13", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: "12px", color: "#003824", fontVariationSettings: "'FILL' 1" }}>verified</span>
                    </div>
                  </div>

                  {/* Name + badge */}
                  <div>
                    <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "20px", fontWeight: 700, color: "#f0f4f8", letterSpacing: "-0.02em", marginBottom: "4px" }}>
                      {displayName}
                    </h1>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#8fa3b8", marginBottom: "8px" }}>{email}</p>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9.5px", fontWeight: 700, color: "#4edea3", background: "rgba(16,185,129,0.12)", padding: "3px 8px", borderRadius: "6px", border: "1px solid rgba(78,222,163,0.2)" }}>
                      VERIFIED EXPLORER
                    </span>
                  </div>
                </div>

                {/* Bio */}
                {profile?.bio && (
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#8fa3b8", lineHeight: 1.6, marginBottom: "16px", borderLeft: "2px solid rgba(78,222,163,0.3)", paddingLeft: "12px" }}>
                    {profile.bio}
                  </p>
                )}
                {!profile?.bio && (
                  <button
                    type="button"
                    onClick={() => setIsEditMode(true)}
                    style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#4a6380", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: "8px", padding: "8px 12px", background: "transparent", cursor: "pointer", marginBottom: "16px", width: "100%", textAlign: "left" }}
                  >
                    + Add a short bio about your explorations…
                  </button>
                )}

                {/* Stats */}
                <div style={{ display: "flex", gap: "24px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "16px" }}>
                  {[
                    { label: "ACTIVE PASSES", value: String(activePasses.length).padStart(2, "0") },
                    { label: "PLACES VISITED", value: String(visitedPasses.length).padStart(2, "0") },
                    { label: "CIVIC REPORTS", value: "00" },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: "#4a6380", letterSpacing: "0.06em" }}>{label}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "18px", fontWeight: 700, color: "#4edea3" }}>{value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {/* ── Trip Tabs ────────────────────────────────────────────────── */}
        {!isEditMode && (
          <section style={{ marginTop: "28px" }}>
            {/* Tab headers */}
            <div style={{ display: "flex", gap: "24px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: "16px" }}>
              {(["upcoming", "past"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  style={{
                    paddingBottom: "10px",
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: "14px", fontWeight: 700,
                    color: activeTab === tab ? "#4edea3" : "#4a6380",
                    borderBottom: activeTab === tab ? "2px solid #4edea3" : "2px solid transparent",
                    background: "transparent", border: "none",
                    cursor: "pointer", transition: "all 0.2s",
                    marginBottom: "-1px",
                  }}
                >
                  {tab === "upcoming" ? "Upcoming Trips" : "Past Expeditions"}
                </button>
              ))}
            </div>

            {/* Upcoming */}
            {activeTab === "upcoming" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {activePasses.length > 0 ? (
                  activePasses.map((pass) => (
                    <div
                      key={pass.id}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        borderRadius: "14px", border: "1px solid rgba(255,255,255,0.08)",
                        background: "#111820", padding: "14px 16px",
                        transition: "background 0.2s",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                        <div style={{ position: "relative", width: "10px", height: "10px", flexShrink: 0 }}>
                          <div style={{ position: "absolute", inset: 0, borderRadius: "9999px", background: "#10b981", animation: "ping 1.5s ease infinite", opacity: 0.6 }} />
                          <div style={{ position: "absolute", inset: 0, borderRadius: "9999px", background: "#10b981" }} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 600, color: "#f0f4f8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "180px" }}>
                            {pass.location_name}
                          </h3>
                          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#4a6380", marginTop: "2px" }}>
                            {pass.booked_at} • {pass.slot_time}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => router.push("/mobile/book")}
                        style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "4px", padding: "6px 10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", color: "#bbcabf", fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", cursor: "pointer", fontWeight: 700, letterSpacing: "0.04em", transition: "all 0.2s" }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>confirmation_number</span>
                        VIEW PASS
                      </button>
                    </div>
                  ))
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", borderRadius: "14px", border: "1px dashed rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.02)", textAlign: "center" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "36px", color: "#4a6380", marginBottom: "10px" }}>confirmation_number</span>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 600, color: "#f0f4f8", marginBottom: "6px" }}>No Upcoming Trips</p>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#8aa299", maxWidth: "240px", lineHeight: 1.5 }}>
                      Book entry passes from the Explorer Map to see them here.
                    </p>
                    <button
                      type="button"
                      onClick={() => router.push("/mobile")}
                      style={{ marginTop: "16px", padding: "9px 20px", borderRadius: "10px", background: "rgba(16,185,129,0.18)", border: "1px solid rgba(78,222,163,0.3)", color: "#4edea3", fontFamily: "'Inter', sans-serif", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                    >
                      Explore Map
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Past expeditions */}
            {activeTab === "past" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", opacity: 0.85 }}>
                {visitedPasses.length > 0 ? (
                  visitedPasses.map((pass) => (
                    <div
                      key={pass.id}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.06)", background: "#111820", padding: "14px 16px", filter: "grayscale(50%)" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#4a6380", flexShrink: 0 }}>history</span>
                        <div style={{ minWidth: 0 }}>
                          <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 600, color: "#f0f4f8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" }}>
                            {pass.location_name}
                          </h3>
                          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#4a6380", marginTop: "2px" }}>
                            {pass.booked_at} • COMPLETED
                          </p>
                        </div>
                      </div>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9.5px", color: "#4a6380", letterSpacing: "0.04em", flexShrink: 0 }}>ARCHIVED</span>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: "40px 0", textAlign: "center", color: "#4a6380", fontFamily: "'Inter', sans-serif", fontSize: "12px" }}>
                    No past expeditions logged yet.
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ── System Preferences ─────────────────────────────────────── */}
        {!isEditMode && (
          <section style={{ marginTop: "32px" }}>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9.5px", fontWeight: 700, color: "#4a6380", letterSpacing: "0.08em", marginBottom: "12px", paddingLeft: "4px" }}>
              SYSTEM PREFERENCES
            </p>
            <div style={{ borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", background: "#111820", overflow: "hidden" }}>
              {PREF_ITEMS.map((item, i) => (
                <button
                  key={item.label}
                  type="button"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", padding: "16px", textAlign: "left",
                    background: "transparent", border: "none",
                    borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.05)",
                    cursor: "pointer", transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#4a6380" }}>{item.icon}</span>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", color: "#f0f4f8" }}>{item.label}</span>
                  </div>
                  <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#4a6380" }}>
                    {item.external ? "open_in_new" : "chevron_right"}
                  </span>
                </button>
              ))}
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
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { if (!isSigningOut) e.currentTarget.style.background = "rgba(239,68,68,0.10)" }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
          >
            {isSigningOut ? (
              <>
                <span style={{ width: "16px", height: "16px", borderRadius: "9999px", border: "2px solid #4a6380", borderTopColor: "transparent", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                Signing out…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>logout</span>
                Log Out
              </>
            )}
          </button>
        )}

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#4a6380" }}>
            Terra-Pulse SDI • 10.8505° N, 76.2711° E
          </p>
        </div>
      </main>

      {/* ── Keyframes ───────────────────────────────────────────────── */}
      <style>{`
        @keyframes slideDown { from { transform: translateY(-12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        input::placeholder, textarea::placeholder { color: #4a6380; }
        input:focus, textarea:focus { outline: none; box-shadow: 0 0 0 2px rgba(78,222,163,0.25); }
        ::-webkit-scrollbar { display: none; }
      `}</style>
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
