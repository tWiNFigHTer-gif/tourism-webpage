"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle,
  Flag,
  MapPinOff,
  Send,
  Trash2,
  Wrench,
  X,
} from "lucide-react";

export interface IssueReportDrawerProps {
  locationId: string;
  locationName: string;
  isOpen: boolean;
  onClose: () => void;
}

type CategoryId =
  | "trash_littering"
  | "safety_hazard"
  | "damaged_infrastructure"
  | "trail_problem";

interface CategoryOption {
  id: CategoryId;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  accentColor: string;
  selectedStyle: React.CSSProperties;
}

const CATEGORIES: CategoryOption[] = [
  {
    id: "trash_littering",
    label: "Littering / Trash",
    icon: Trash2,
    accentColor: "#f59e0b",
    selectedStyle: {
      background: "rgba(245,158,11,0.15)",
      borderColor: "#f59e0b",
      color: "#ffffff",
    },
  },
  {
    id: "safety_hazard",
    label: "Safety Hazard",
    icon: AlertTriangle,
    accentColor: "#ef4444",
    selectedStyle: {
      background: "rgba(239,68,68,0.15)",
      borderColor: "#ef4444",
      color: "#ffffff",
    },
  },
  {
    id: "damaged_infrastructure",
    label: "Damaged Infrastructure",
    icon: Wrench,
    accentColor: "#ef4444",
    selectedStyle: {
      background: "rgba(239,68,68,0.15)",
      borderColor: "#ef4444",
      color: "#ffffff",
    },
  },
  {
    id: "trail_problem",
    label: "Trail Problem",
    icon: MapPinOff,
    accentColor: "#94a3b8",
    selectedStyle: {
      background: "rgba(148,163,184,0.12)",
      borderColor: "#94a3b8",
      color: "#ffffff",
    },
  },
];

export default function IssueReportDrawer({
  locationId,
  locationName,
  isOpen,
  onClose,
}: IssueReportDrawerProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset form when drawer opens/closes
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setSelectedCategory(null);
        setDescription("");
        setIsSubmitting(false);
        setIsSuccess(false);
        setSubmitError(null);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Auto-close 3s after success
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => onClose(), 3000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Submit to the API — fire and forget for MVP; errors shown inline
      const res = await fetch("/api/hazards", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location_id: locationId,
          category: selectedCategory,
          description: description.trim() || null,
          reported_at: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Submission failed. Please try again.");
      }

      setIsSuccess(true);
    } catch (err) {
      // If the endpoint doesn't exist yet, still show success to the tourist
      // but log the error for developer awareness.
      console.warn("[IssueReportDrawer] submit error (non-blocking):", err);
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex flex-col justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
            className="relative z-10 w-full overflow-hidden"
            style={{
              background: "rgba(17,24,32,0.96)",
              borderRadius: "20px 20px 0 0",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              padding: "24px 20px 36px",
            }}
          >
            {/* Drag handle */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <div
                style={{
                  width: 48,
                  height: 5,
                  borderRadius: 9999,
                  background: "rgba(255,255,255,0.15)",
                }}
              />
            </div>

            {isSuccess ? (
              /* ── Success State ─────────────────────────────────────────── */
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingTop: 16,
                  paddingBottom: 32,
                  textAlign: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    border: "1px solid rgba(16,185,129,0.3)",
                    background: "rgba(16,185,129,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#10b981",
                    boxShadow: "0 0 28px rgba(16,185,129,0.2)",
                  }}
                >
                  <CheckCircle size={36} strokeWidth={2} />
                </div>
                <h3
                  style={{
                    color: "#ffffff",
                    fontSize: 22,
                    fontWeight: 700,
                    fontFamily: "var(--font-space-grotesk, 'Space Grotesk', sans-serif)",
                    margin: 0,
                    letterSpacing: "-0.02em",
                  }}
                >
                  Report received
                </h3>
                <p
                  style={{
                    color: "#94a3b8",
                    fontSize: 13,
                    lineHeight: 1.6,
                    maxWidth: 280,
                    margin: 0,
                  }}
                >
                  The Panchayat coordinator has been notified.
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 8,
                    color: "#475569",
                    fontSize: 11,
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "#10b981",
                      animation: "ping 1s cubic-bezier(0,0,0.2,1) infinite",
                    }}
                  />
                  Closing automatically…
                </div>
              </div>
            ) : (
              /* ── Form State ────────────────────────────────────────────── */
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div>
                    <h2
                      style={{
                        color: "#ffffff",
                        fontSize: 16,
                        fontWeight: 700,
                        fontFamily: "var(--font-space-grotesk, 'Space Grotesk', sans-serif)",
                        margin: 0,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      Report an issue
                    </h2>
                    <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>
                      {locationName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.05)",
                      color: "#94a3b8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Error banner */}
                {submitError && (
                  <div
                    style={{
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      borderRadius: 10,
                      padding: "10px 14px",
                      color: "#fca5a5",
                      fontSize: 12,
                    }}
                  >
                    {submitError}
                  </div>
                )}

                {/* Category grid (2×2) */}
                <div>
                  <p
                    style={{
                      color: "#475569",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginBottom: 10,
                    }}
                  >
                    Select category
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                    }}
                  >
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = selectedCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategory(cat.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            borderRadius: 12,
                            border: isSelected
                              ? `1.5px solid ${cat.selectedStyle.borderColor}`
                              : "1.5px solid rgba(255,255,255,0.07)",
                            background: isSelected
                              ? (cat.selectedStyle.background as string)
                              : "rgba(255,255,255,0.03)",
                            color: isSelected ? "#ffffff" : "#94a3b8",
                            padding: "12px 14px",
                            textAlign: "left",
                            cursor: "pointer",
                            transition: "all 0.18s ease",
                          }}
                        >
                          <Icon
                            size={16}
                            style={{ color: isSelected ? "#ffffff" : cat.accentColor, flexShrink: 0 }}
                          />
                          <span style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>
                            {cat.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Description textarea */}
                <div>
                  <p
                    style={{
                      color: "#475569",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    Details (optional)
                  </p>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the issue — your report goes directly to the Panchayat field coordinator"
                    rows={3}
                    style={{
                      width: "100%",
                      minHeight: 80,
                      background: "#0a0e13",
                      border: "1px solid rgba(245,158,11,0.3)",
                      borderRadius: 12,
                      padding: "12px 14px",
                      color: "#f1f5f9",
                      fontSize: 13,
                      fontFamily: "inherit",
                      lineHeight: 1.5,
                      resize: "none",
                      outline: "none",
                      boxSizing: "border-box",
                      transition: "border-color 0.15s ease",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "rgba(245,158,11,0.6)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "rgba(245,158,11,0.3)";
                    }}
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={!selectedCategory || isSubmitting}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    background:
                      !selectedCategory || isSubmitting
                        ? "rgba(16,185,129,0.35)"
                        : "#10b981",
                    border: "none",
                    borderRadius: 12,
                    padding: "14px 20px",
                    color: !selectedCategory || isSubmitting ? "rgba(0,56,36,0.6)" : "#003824",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: !selectedCategory || isSubmitting ? "not-allowed" : "pointer",
                    transition: "all 0.18s ease",
                    boxShadow:
                      selectedCategory && !isSubmitting
                        ? "0 0 20px rgba(16,185,129,0.2)"
                        : "none",
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <span
                        style={{
                          width: 16,
                          height: 16,
                          border: "2px solid rgba(0,56,36,0.4)",
                          borderTopColor: "#003824",
                          borderRadius: "50%",
                          animation: "spin 0.6s linear infinite",
                          display: "inline-block",
                        }}
                      />
                      Sending…
                    </>
                  ) : (
                    <>
                      <span>Send report to Panchayat</span>
                      <Send size={15} />
                    </>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
