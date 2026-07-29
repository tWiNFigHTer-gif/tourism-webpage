"use client"

import { useState, useEffect } from "react"

interface HazardAlertModalProps {
  isOpen: boolean
  onClose: () => void
}

export function HazardAlertModal({ isOpen, onClose }: HazardAlertModalProps) {
  const [acknowledged, setAcknowledged] = useState(false)

  // Listen for Escape key press to dismiss modal
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-bg-deep/80 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <main className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border-medium bg-[#111820] glow-red shadow-2xl animate-in fade-in zoom-in-95 duration-200">

        {/* ── Red Warning Banner Header ───────────────────────────── */}
        <div className="relative overflow-hidden border-b border-danger/30 bg-danger/10 pb-6 pt-8 flex flex-col items-center justify-center">
          {/* Warning stripe background */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              background: "repeating-linear-gradient(45deg, transparent, transparent 10px, #ef4444 10px, #ef4444 20px)",
            }}
          />

          {/* Top-Right Visible Close (X) Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close warning modal"
            className="absolute top-3 right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/80 hover:bg-black/60 hover:text-white transition-colors cursor-pointer border border-white/10"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>close</span>
          </button>

          <div className="relative z-10 flex flex-col items-center gap-3">
            <span
              className="material-symbols-outlined text-danger"
              style={{ fontSize: "48px", fontVariationSettings: "'FILL' 1" }}
            >
              warning
            </span>
            <h1
              className="text-center uppercase tracking-wider text-text-primary px-4"
              style={{
                fontFamily: "var(--font-space-grotesk)",
                fontSize: "20px",
                lineHeight: "26px",
                fontWeight: 600,
                letterSpacing: "-0.02em",
              }}
            >
              ⚠️ RED ZONE: Flash Flood Hazard
            </h1>
          </div>
        </div>

        {/* ── Content Body ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-5 p-5">

          {/* Zone pill */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-danger bg-surface px-4 py-1.5 pulse-border">
              <span className="h-1.5 w-1.5 rounded-full bg-danger" />
              <span
                className="uppercase tracking-widest text-danger"
                style={{ fontFamily: "var(--font-inter)", fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em" }}
              >
                Active Flood Risk: Periyar West
              </span>
            </div>
          </div>

          {/* Directive box */}
          <div className="flex items-start gap-3 rounded-lg border border-secondary/30 bg-amber-dim p-3.5">
            <span
              className="material-symbols-outlined mt-0.5 text-secondary shrink-0"
              style={{ fontSize: "20px", fontVariationSettings: "'FILL' 0" }}
            >
              announcement
            </span>
            <p className="text-xs leading-relaxed text-text-primary">
              <span className="mb-1 block font-semibold text-secondary">
                Panchayat Emergency Directive:
              </span>
              Immediate evacuation or sheltering required. Extreme environmental risk present in immediate vicinity.
              <span className="mt-1.5 block border-t border-secondary/20 pt-1.5 text-[11px] opacity-80">
                The selected route crosses a restricted polygon. Access is strictly prohibited due to active flood risk.
              </span>
            </p>
          </div>

          {/* Required actions */}
          <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
            <span
              className="mb-1 uppercase tracking-wider text-[#4a6380]"
              style={{ fontFamily: "var(--font-inter)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}
            >
              Required Actions
            </span>
            <ul className="flex flex-col gap-2">
              {[
                { icon: "close",          text: "Cease all current exploration activities immediately." },
                { icon: "directions_run", text: "Move to designated safe zones indicated on the map." },
                { icon: "campaign",       text: "Await further instructions from local authorities." },
              ].map(({ icon, text }) => (
                <li key={icon} className="flex items-start gap-2 text-[12px] leading-tight text-[#bbcabf]">
                  <span
                    className="material-symbols-outlined mt-0.5 shrink-0 text-danger"
                    style={{ fontSize: "15px", fontVariationSettings: "'FILL' 0" }}
                  >
                    {icon}
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Acknowledgment checkbox */}
          <label className="group mt-1 flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              className="form-checkbox mt-0.5 h-4 w-4 cursor-pointer rounded border-border-medium bg-bg-deep text-danger focus:ring-2 focus:ring-danger focus:ring-offset-2 focus:ring-offset-bg-surface transition-colors"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
            />
            <span className="select-none text-xs leading-tight text-[#bbcabf] transition-colors group-hover:text-white">
              I acknowledge the immediate risk to safety and will follow all directives.
            </span>
          </label>

          {/* Action buttons */}
          <div className="mt-1 flex flex-col gap-2">
            <button
              type="button"
              disabled={!acknowledged}
              onClick={onClose}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-danger bg-danger py-3 px-4 font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-xs"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "18px", fontVariationSettings: "'FILL' 0" }}
              >
                near_me
              </span>
              Acknowledge &amp; Reroute
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-center text-xs font-semibold text-[#bbcabf] hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              Dismiss Warning
            </button>
          </div>

        </div>
      </main>
    </div>
  )
}
