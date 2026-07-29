"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SafetyCheckResult } from "@/lib/turf";

interface RouteSafetyPanelProps {
  safetyResult: SafetyCheckResult | null;
  isChecking: boolean;
  onAcknowledge: () => void;
  /** Called when the user wants to pick a different destination. */
  onChooseDifferentRoute?: () => void;
}

// ── Sub-components ──────────────────────────────────────────────────────────

/** Mono-spaced zone badge used in the lists. */
function ZoneBadge({ name }: { name: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded border border-danger/30 bg-danger-dim px-2 py-1 text-danger"
      style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "11px", fontWeight: 500 }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: "13px", fontVariationSettings: "'FILL' 1" }}
      >
        dangerous
      </span>
      {name}
    </span>
  );
}

/** Eco-rules that apply whenever a route passes through a restricted zone. */
const ECO_RULES = [
  "Do not leave designated trails inside restricted zones.",
  "Wildlife disturbance is prohibited — keep noise below 40 dB.",
  "No single-use plastics within 500 m of any protected boundary.",
  "Report any sightings of illegal activity to the Forest Warden.",
];

// ── Loading state ───────────────────────────────────────────────────────────
function CheckingState() {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      className="flex items-center gap-3 rounded-xl border border-border-subtle bg-bg-surface/90 px-4 py-3 shadow-lg backdrop-blur-md"
    >
      {/* Pulsing dot */}
      <span className="relative flex h-3 w-3 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
      </span>
      <span
        className="text-on-surface"
        style={{ fontFamily: "var(--font-inter)", fontSize: "14px" }}
      >
        Checking route safety…
      </span>
    </motion.div>
  );
}

// ── Safe state ──────────────────────────────────────────────────────────────
function SafeState({ onAcknowledge }: { onAcknowledge: () => void }) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      className="flex items-center gap-3 rounded-xl border border-primary/30 bg-emerald-dim px-4 py-3 shadow-lg backdrop-blur-md"
    >
      <span
        className="material-symbols-outlined text-primary"
        style={{ fontSize: "24px", fontVariationSettings: "'FILL' 1" }}
      >
        verified_user
      </span>
      <div className="flex-1">
        <p
          className="font-semibold text-primary"
          style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "15px" }}
        >
          Route is safe
        </p>
        <p
          className="text-text-muted"
          style={{ fontFamily: "var(--font-inter)", fontSize: "12px" }}
        >
          No restricted zones detected along this path.
        </p>
      </div>
      <button
        type="button"
        onClick={onAcknowledge}
        className="shrink-0 rounded-lg bg-primary px-3 py-1.5 font-medium text-on-primary transition-colors hover:bg-primary-fixed"
        style={{ fontFamily: "var(--font-inter)", fontSize: "13px" }}
      >
        Navigate
      </button>
    </motion.div>
  );
}

// ── Caution panel (amber, bottom-floating) ──────────────────────────────────
function CautionPanel({
  intersectedZones,
  onAcknowledge,
  onChooseDifferentRoute,
}: {
  intersectedZones: string[];
  onAcknowledge: () => void;
  onChooseDifferentRoute?: () => void;
}) {
  const [checked, setChecked] = useState(false);

  return (
    <motion.div
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 220 }}
      className="w-full rounded-t-2xl border-t border-secondary/30 bg-bg-surface/95 shadow-2xl backdrop-blur-xl"
    >
      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="h-1 w-12 rounded-full bg-border-subtle" />
      </div>

      <div className="flex flex-col gap-5 p-panel-padding">
        {/* Header */}
        <div className="flex items-start gap-3">
          <span
            className="material-symbols-outlined text-secondary"
            style={{ fontSize: "28px", fontVariationSettings: "'FILL' 1" }}
          >
            warning
          </span>
          <div>
            <h3
              className="text-secondary"
              style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "17px", fontWeight: 600, letterSpacing: "-0.02em" }}
            >
              Caution: Restricted area ahead
            </h3>
            <p
              className="mt-0.5 text-text-muted"
              style={{ fontFamily: "var(--font-inter)", fontSize: "13px" }}
            >
              Your route passes through{" "}
              {intersectedZones.length === 1 ? "a protected zone" : `${intersectedZones.length} protected zones`}.
            </p>
          </div>
        </div>

        {/* Zone list */}
        <div className="flex flex-wrap gap-2">
          {intersectedZones.map((z) => (
            <ZoneBadge key={z} name={z} />
          ))}
        </div>

        {/* Eco rules */}
        <div className="rounded-lg border border-border-subtle bg-bg-raised/60 p-3">
          <p
            className="mb-2 uppercase tracking-wider text-text-muted"
            style={{ fontFamily: "var(--font-inter)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em" }}
          >
            Panchayat Guidelines
          </p>
          <ul className="flex flex-col gap-1.5">
            {ECO_RULES.map((rule) => (
              <li
                key={rule}
                className="flex items-start gap-2 text-text-muted"
                style={{ fontFamily: "var(--font-inter)", fontSize: "12px", lineHeight: "17px" }}
              >
                <span
                  className="material-symbols-outlined mt-px shrink-0 text-secondary"
                  style={{ fontSize: "13px", fontVariationSettings: "'FILL' 0" }}
                >
                  eco
                </span>
                {rule}
              </li>
            ))}
          </ul>
        </div>

        {/* Acknowledgment checkbox */}
        <label className="group flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="form-checkbox mt-0.5 h-5 w-5 cursor-pointer rounded border-secondary/40 bg-bg-deep text-secondary focus:ring-2 focus:ring-secondary/40 focus:ring-offset-2 focus:ring-offset-bg-surface transition-all"
          />
          <span
            className="select-none leading-snug text-text-muted transition-colors group-hover:text-on-surface"
            style={{ fontFamily: "var(--font-inter)", fontSize: "13px" }}
          >
            I understand the risks and will follow Panchayat guidelines.
          </span>
        </label>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onChooseDifferentRoute}
            className="flex-1 rounded-lg border border-border-medium py-3 font-medium text-on-surface transition-colors hover:border-primary/40 hover:text-primary"
            style={{ fontFamily: "var(--font-inter)", fontSize: "14px" }}
          >
            Choose different route
          </button>
          <button
            type="button"
            disabled={!checked}
            onClick={onAcknowledge}
            className="flex-1 rounded-lg border border-secondary/40 bg-amber-dim py-3 font-medium text-secondary transition-all disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:bg-secondary/20"
            style={{ fontFamily: "var(--font-inter)", fontSize: "14px" }}
          >
            Proceed anyway
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Critical overlay (full-screen modal) ────────────────────────────────────
function CriticalOverlay({
  intersectedZones,
  onAcknowledge,
  onChooseDifferentRoute,
}: {
  intersectedZones: string[];
  onAcknowledge: () => void;
  onChooseDifferentRoute?: () => void;
}) {
  const [checked, setChecked] = useState(false);

  return (
    /* Absolute inside the map container — takes over the visible canvas */
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pointer-events-auto absolute inset-0 z-[9999] flex flex-col items-center justify-center p-6"
      style={{ background: "rgba(10,14,19,0.88)", backdropFilter: "blur(8px)" }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 15 }}
        transition={{ type: "spring", damping: 25, stiffness: 250 }}
        className="w-full max-w-sm overflow-hidden rounded-2xl border-2 border-danger/60 bg-bg-surface shadow-[0_0_60px_rgba(239,68,68,0.25)]"
      >

        {/* ── Red stripe header ─────────────────────────────────── */}
        <div className="relative overflow-hidden border-b border-danger/30 bg-danger/10 px-panel-padding pb-6 pt-7 text-center">
          {/* Diagonal warning stripes */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              background:
                "repeating-linear-gradient(45deg,transparent,transparent 10px,#ef4444 10px,#ef4444 20px)",
            }}
          />
          <div className="relative z-10 flex flex-col items-center gap-2">
            <span
              className="material-symbols-outlined text-danger"
              style={{ fontSize: "44px", fontVariationSettings: "'FILL' 1" }}
            >
              gpp_bad
            </span>
            <h2
              className="text-center uppercase tracking-wide text-text-primary"
              style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "18px", fontWeight: 700, letterSpacing: "0.02em" }}
            >
              Critical Hazard Detected
            </h2>
            <p className="text-sm text-text-muted">
              Route intersects a <span className="font-semibold text-danger">HIGH SEVERITY</span> restricted zone.
            </p>
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5 p-panel-padding">

          {/* Zone pills */}
          <div>
            <p
              className="mb-2 uppercase tracking-wider text-text-muted"
              style={{ fontFamily: "var(--font-inter)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em" }}
            >
              Intersected Zones
            </p>
            <div className="flex flex-wrap gap-2">
              {intersectedZones.map((z) => (
                <ZoneBadge key={z} name={z} />
              ))}
            </div>
          </div>

          {/* Eco rules */}
          <div className="rounded-lg border border-danger/20 bg-danger-dim p-3">
            <p
              className="mb-2 uppercase tracking-wider text-danger/80"
              style={{ fontFamily: "var(--font-inter)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em" }}
            >
              Mandatory Regulations
            </p>
            <ul className="flex flex-col gap-1.5">
              {ECO_RULES.map((rule) => (
                <li
                  key={rule}
                  className="flex items-start gap-2"
                  style={{ fontFamily: "var(--font-inter)", fontSize: "12px", lineHeight: "17px", color: "#d0e5fb" }}
                >
                  <span
                    className="material-symbols-outlined mt-px shrink-0 text-danger"
                    style={{ fontSize: "13px", fontVariationSettings: "'FILL' 0" }}
                  >
                    close
                  </span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>

          {/* Mandatory checkbox */}
          <label className="group flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="form-checkbox mt-0.5 h-5 w-5 cursor-pointer rounded border-danger/40 bg-bg-deep text-danger focus:ring-2 focus:ring-danger/40 focus:ring-offset-2 focus:ring-offset-bg-surface transition-all"
            />
            <span
              className="select-none leading-snug text-text-muted transition-colors group-hover:text-on-surface"
              style={{ fontFamily: "var(--font-inter)", fontSize: "13px" }}
            >
              I understand the risks and will follow all Panchayat guidelines.
            </span>
          </label>

          {/* Actions — "Choose different route" is primary */}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={onChooseDifferentRoute}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-on-primary transition-colors hover:bg-primary-fixed"
              style={{ fontFamily: "var(--font-inter)", fontSize: "15px" }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "18px", fontVariationSettings: "'FILL' 0" }}
              >
                alt_route
              </span>
              Choose different route
            </button>
            <button
              type="button"
              disabled={!checked}
              onClick={onAcknowledge}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-danger py-3.5 font-semibold text-danger transition-all disabled:cursor-not-allowed disabled:opacity-35 enabled:hover:bg-danger/10"
              style={{ fontFamily: "var(--font-inter)", fontSize: "15px" }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "18px", fontVariationSettings: "'FILL' 0" }}
              >
                near_me
              </span>
              Proceed at own risk
            </button>
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Public component ────────────────────────────────────────────────────────

/**
 * RouteSafetyPanel
 *
 * Renders inside the map canvas container as either:
 *   - A bottom-floating strip (safe / caution / checking)
 *   - A full-canvas overlay (critical)
 *
 * Parent must position itself `relative` so the absolute overlay works.
 */
export function RouteSafetyPanel({
  safetyResult,
  isChecking,
  onAcknowledge,
  onChooseDifferentRoute,
}: RouteSafetyPanelProps) {
  return (
    <AnimatePresence mode="wait">
      {/* ── Loading ──────────────────────────────────────────────────────── */}
      {isChecking && (
        <div key="checking" className="absolute bottom-6 left-1/2 z-30 w-80 -translate-x-1/2">
          <CheckingState />
        </div>
      )}

      {/* ── Safe ─────────────────────────────────────────────────────────── */}
      {!isChecking && safetyResult && safetyResult.isSafe && (
        <div key="safe" className="absolute bottom-6 left-1/2 z-30 w-80 -translate-x-1/2">
          <SafeState onAcknowledge={onAcknowledge} />
        </div>
      )}

      {/* ── Critical overlay ─────────────────────────────────────────────── */}
      {!isChecking && safetyResult && !safetyResult.isSafe && safetyResult.warningLevel === "critical" && (
        <CriticalOverlay
          key="critical"
          intersectedZones={safetyResult.intersectedZones}
          onAcknowledge={onAcknowledge}
          onChooseDifferentRoute={onChooseDifferentRoute}
        />
      )}

      {/* ── Caution (bottom-floating) ────────────────────────────────────── */}
      {!isChecking && safetyResult && !safetyResult.isSafe && safetyResult.warningLevel !== "critical" && (
        <div key="caution" className="absolute bottom-0 left-0 right-0 z-30">
          <CautionPanel
            intersectedZones={safetyResult.intersectedZones}
            onAcknowledge={onAcknowledge}
            onChooseDifferentRoute={onChooseDifferentRoute}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
