"use client"

import { useState } from "react"

type FilterType = "wildlife" | "waterfalls" | "viewpoints" | "safety"

interface Filter {
  id: FilterType
  label: string
  icon: string
}

const typeFilters: Filter[] = [
  { id: "wildlife",   label: "Wildlife",     icon: "nature_people"  },
  { id: "waterfalls", label: "Waterfalls",   icon: "waterfall_chart" },
  { id: "viewpoints", label: "Viewpoints",   icon: "terrain"         },
  { id: "safety",     label: "Safety Zones", icon: "verified_user"   },
]

const savedSpots = [
  {
    name: "Echo Point",
    distance: "14.2 km",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBNMSr0dmvHmMxO3yylV1owwZSnnZupMBavm9Kq94OjZuzjWyqK_j_XQMAvO0FJbkr8lHFjvO3rCtNRdWDLf3mSAEMlCUk6kew1LBvLLObJc3jfRAQBU7O6QkH6hX2b2N4HdZakalRgyzzcIMkmzsDNPCVl6fRNefwJlnND5bzKLzFuw5ZS4Lj-qwWjW7T23Jul5F8k2JrPYKEC3OdVmOV_wboRm_gkM4E6t7Iq286hHluqzi-xE5DKJF8yAIoxzKsGUrZiNWBt2X5w",
  },
  {
    name: "Pambadum Shola",
    distance: "8.7 km",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuA4Ar_PHNV9Es5TJpmYiH91zQ5jiY9TsSGdy6PssrSLwuBg3p_qoRoceaGwJIUnRHq81UUb_TOAIgGfEC8to3S6MdOqm5A_eggIMs4vRHsQApOIDQyufwkAu28KLHtYAdriaMkdz8UpckwLHCLxwrPbZBOfxlBP-mVIPGqvavXlhfzp6j0FP6zVaAAivN3G3_3waAJoh4iuN_QUTaJRY2ck4HfmWHJ9kGiBVgmTbY0pwNyOCDZnR_2idggtTiqbpGshU_8mi5oekxRD",
  },
]

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="mb-4 uppercase tracking-wider text-text-muted"
      style={{
        fontFamily: "var(--font-inter)",
        fontSize: "11px",
        lineHeight: "14px",
        fontWeight: 500,
        letterSpacing: "0.04em",
      }}
    >
      {children}
    </h2>
  )
}

function ToggleSwitch({
  checked,
  onChange,
  danger,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  danger?: boolean
}) {
  const trackColor = checked
    ? danger
      ? "bg-danger/20 border-danger/30"
      : "bg-primary/20 border-primary/30"
    : "bg-bg-surface border-border-subtle"

  const thumbColor = checked
    ? danger
      ? "bg-danger shadow-[0_0_4px_rgba(239,68,68,0.5)]"
      : "bg-primary shadow-[0_0_4px_rgba(16,185,129,0.5)]"
    : "bg-text-muted"

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-4 w-8 rounded-full border transition-colors duration-200 cursor-pointer ${trackColor}`}
    >
      <span
        className={`absolute top-0.5 h-3 w-3 rounded-full transition-transform duration-200 ${thumbColor} ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  )
}

export function MapSidebar() {
  const [activeFilters, setActiveFilters] = useState<Set<FilterType>>(new Set(["wildlife"]))
  const [wildlifeTracking, setWildlifeTracking] = useState(true)
  const [weatherAlerts, setWeatherAlerts] = useState(false)
  const [maxCrowd, setMaxCrowd] = useState(75)

  const toggleFilter = (id: FilterType) => {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <aside className="hidden w-[280px] shrink-0 overflow-y-auto border-r border-border-subtle bg-surface-container md:flex flex-col no-scrollbar">
      <div className="flex flex-col gap-8 p-panel-padding">

        {/* ── Filters ─────────────────────────────────────────────── */}
        <section>
          <SectionTitle>Filters</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {typeFilters.map((f) => {
              const active = activeFilters.has(f.id)
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleFilter(f.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-all duration-200 ${
                    active
                      ? "border-primary/30 bg-bg-raised text-primary shadow-[0_0_8px_rgba(16,185,129,0.12)]"
                      : "border-border-medium bg-bg-surface text-text-muted hover:bg-surface-variant/30 hover:text-on-surface"
                  }`}
                  style={{ fontFamily: "var(--font-inter)", fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em" }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "14px", fontVariationSettings: "'FILL' 0" }}>
                    {f.icon}
                  </span>
                  {f.label}
                </button>
              )
            })}
          </div>
        </section>

        {/* ── Activity ─────────────────────────────────────────────── */}
        <section>
          <SectionTitle>Activity</SectionTitle>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-on-surface">Live Wildlife Tracking</span>
              <ToggleSwitch checked={wildlifeTracking} onChange={setWildlifeTracking} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-on-surface">Weather Alerts</span>
              <ToggleSwitch checked={weatherAlerts} onChange={setWeatherAlerts} />
            </div>
          </div>
        </section>

        {/* ── Crowd Density ────────────────────────────────────────── */}
        <section>
          <div className="mb-4 flex items-end justify-between">
            <SectionTitle>Max Crowd Density</SectionTitle>
            <span
              className="text-primary -mt-4"
              style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "12px", lineHeight: "16px" }}
            >
              High
            </span>
          </div>
          <div className="relative mb-2 w-full">
            <input
              type="range"
              min={0}
              max={100}
              value={maxCrowd}
              onChange={(e) => setMaxCrowd(Number(e.target.value))}
              className="tp-range w-full border border-border-subtle"
              style={{
                background: `linear-gradient(to right, #10b981 ${maxCrowd}%, rgba(255,255,255,0.08) ${maxCrowd}%)`,
              }}
            />
          </div>
          <div
            className="flex justify-between text-text-muted"
            style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "10px" }}
          >
            <span>Low</span>
            <span>Med</span>
            <span>High</span>
          </div>
        </section>

        {/* ── Saved Spots ──────────────────────────────────────────── */}
        <section>
          <SectionTitle>Saved Spots</SectionTitle>
          <div className="flex flex-col gap-3">
            {savedSpots.map((spot) => (
              <div
                key={spot.name}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-border-subtle bg-bg-surface p-3 transition-all duration-200 hover:border-border-medium hover:bg-bg-raised group"
              >
                {/* Thumbnail */}
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-surface-variant">
                  <img
                    src={spot.img}
                    alt={spot.name}
                    className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-medium text-on-surface">{spot.name}</h4>
                  <p
                    className="mt-0.5 text-text-muted"
                    style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "12px" }}
                  >
                    {spot.distance}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </aside>
  )
}
