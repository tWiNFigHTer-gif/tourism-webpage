"use client"

import { useState } from "react"

interface HazardAlertModalProps {
  isOpen: boolean
  onClose: () => void
}

export function HazardAlertModal({ isOpen, onClose }: HazardAlertModalProps) {
  const [acknowledged, setAcknowledged] = useState(false)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-gutter">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-bg-deep/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <main className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border-medium bg-bg-surface glow-red shadow-2xl">

        {/* ── Red Warning Banner Header ───────────────────────────── */}
        <div className="relative overflow-hidden border-b border-danger/30 bg-danger/10 pb-6 pt-8 flex flex-col items-center justify-center">
          {/* Warning stripe background */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              background: "repeating-linear-gradient(45deg, transparent, transparent 10px, #ef4444 10px, #ef4444 20px)",
            }}
          />
          <div className="relative z-10 flex flex-col items-center gap-3">
            <span
              className="material-symbols-outlined text-danger"
              style={{ fontSize: "48px", fontVariationSettings: "'FILL' 1" }}
            >
              warning
            </span>
            <h1
              className="text-center uppercase tracking-wider text-text-primary"
              style={{
                fontFamily: "var(--font-space-grotesk)",
                fontSize: "22px",
                lineHeight: "28px",
                fontWeight: 600,
                letterSpacing: "-0.02em",
              }}
            >
              ⚠️ RED ZONE: Flash Flood Hazard
            </h1>
          </div>
        </div>

        {/* ── Content Body ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-6 p-panel-padding">

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
          <div className="flex items-start gap-3 rounded-lg border border-secondary/30 bg-amber-dim p-4">
            <span
              className="material-symbols-outlined mt-0.5 text-secondary"
              style={{ fontSize: "20px", fontVariationSettings: "'FILL' 0" }}
            >
              announcement
            </span>
            <p className="text-sm leading-relaxed text-text-primary">
              <span className="mb-1 block font-semibold text-secondary">
                Panchayat Emergency Directive:
              </span>
              Immediate evacuation or sheltering required. Extreme environmental risk present in immediate vicinity.
              <span className="mt-2 block border-t border-secondary/20 pt-2 text-xs opacity-80">
                The selected route crosses a restricted polygon. Access is strictly prohibited due to active flood risk.
              </span>
            </p>
          </div>

          {/* Required actions */}
          <div className="flex flex-col gap-2 border-t border-border-subtle pt-4">
            <span
              className="mb-1 uppercase tracking-wider text-text-muted"
              style={{ fontFamily: "var(--font-inter)", fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em" }}
            >
              Required Actions
            </span>
            <ul className="flex flex-col gap-2">
              {[
                { icon: "close",          text: "Cease all current exploration activities immediately." },
                { icon: "directions_run", text: "Move to designated safe zones indicated on the map." },
                { icon: "campaign",       text: "Await further instructions from local authorities." },
              ].map(({ icon, text }) => (
                <li key={icon} className="flex items-start gap-2 text-[13px] leading-tight text-text-muted">
                  <span
                    className="material-symbols-outlined mt-0.5 shrink-0 text-danger"
                    style={{ fontSize: "16px", fontVariationSettings: "'FILL' 0" }}
                  >
                    {icon}
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Acknowledgment checkbox */}
          <label className="group mt-2 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="form-checkbox mt-0.5 h-5 w-5 cursor-pointer rounded border-border-medium bg-bg-deep text-danger focus:ring-2 focus:ring-danger focus:ring-offset-2 focus:ring-offset-bg-surface transition-colors"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
            />
            <span className="select-none text-sm leading-tight text-text-muted transition-colors group-hover:text-on-surface">
              I acknowledge the immediate risk to safety and will follow all directives.
            </span>
          </label>

          {/* Action buttons */}
          <div className="mt-2 flex flex-col gap-3">
            <button
              type="button"
              disabled={!acknowledged}
              onClick={onClose}
              className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-danger bg-danger py-3.5 px-4 font-semibold text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-2 focus:ring-offset-bg-surface disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "20px", fontVariationSettings: "'FILL' 0" }}
              >
                near_me
              </span>
              Acknowledge &amp; Reroute
            </button>
            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed select-none px-4 py-2 text-center text-sm font-medium text-danger/50 opacity-60 transition-all focus:outline-none"
            >
              Proceed at own risk
            </button>
          </div>

        </div>
      </main>
    </div>
  )
}
