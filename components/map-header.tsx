"use client"

type Role = "tourist" | "warden"

interface MapHeaderProps {
  role: Role
  onRoleChange: (role: Role) => void
}

export function MapHeader({ role, onRoleChange }: MapHeaderProps) {
  const roles: { id: Role; label: string }[] = [
    { id: "tourist", label: "Tourist" },
    { id: "warden", label: "Warden" },
  ]

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-[56px] items-center justify-between border-b border-border-subtle bg-surface-container-low px-container-margin">
      {/* ── Left: Logo + zone badge ────────────────────────────────── */}
      <div className="flex items-center gap-4">
        {/* Wordmark */}
        <div className="flex items-center gap-2">
          {/* Animated pulse dot */}
          <span className="relative flex h-2.5 w-2.5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-container opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-container" />
          </span>
          <span
            className="font-display-sm text-[18px] font-semibold tracking-tight text-primary"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            TerraPulse
          </span>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-border-subtle" />

        {/* Zone badge */}
        <span
          className="hidden items-center rounded bg-bg-surface border border-border-subtle px-2 py-1 sm:flex"
          style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "12px", lineHeight: "16px", color: "#4a6380" }}
        >
          ZONE: Munnar Panchayat
        </span>
      </div>

      {/* ── Center: Role toggle ─────────────────────────────────────── */}
      <nav
        aria-label="Select role"
        className="flex items-center gap-1 rounded-full border border-border-subtle bg-bg-surface p-1"
      >
        {roles.map((r) => {
          const active = role === r.id
          return (
            <button
              key={r.id}
              type="button"
              aria-pressed={active}
              onClick={() => onRoleChange(r.id)}
              className={`rounded-full px-3 py-1 transition-all duration-200 ${
                active
                  ? "bg-bg-raised border border-primary/30 text-primary shadow-[0_0_8px_rgba(16,185,129,0.12)]"
                  : "text-text-muted hover:text-on-surface"
              }`}
              style={{
                fontFamily: "var(--font-inter)",
                fontSize: "11px",
                lineHeight: "14px",
                fontWeight: 500,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {r.label}
            </button>
          )
        })}
      </nav>

      {/* ── Right: Notifications + profile ─────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle bg-bg-surface text-text-muted transition-colors duration-200 hover:text-on-surface"
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "20px", fontVariationSettings: "'FILL' 0" }}
          >
            notifications
          </span>
          {/* Red dot */}
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary-container shadow-[0_0_4px_rgba(16,185,129,0.5)]" />
        </button>

        {/* Profile */}
        <button
          type="button"
          aria-label="User profile"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle bg-bg-surface text-text-muted transition-colors duration-200 hover:text-on-surface"
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "20px", fontVariationSettings: "'FILL' 0" }}
          >
            person
          </span>
        </button>
      </div>
    </header>
  )
}
