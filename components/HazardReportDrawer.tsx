"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Map,
  Send,
  Trash2,
  Wrench,
  X,
} from "lucide-react";

export interface HazardReportDrawerProps {
  locationId: string;
  locationName: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (category: string, description: string) => Promise<void>;
}

type CategoryId =
  | "trash_littering"
  | "damaged_infrastructure"
  | "safety_hazard"
  | "trail_issue";

interface CategoryOption {
  id: CategoryId;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accentColor: string;
  selectedBgClass: string;
  selectedTextClass: string;
}

const CATEGORIES: CategoryOption[] = [
  {
    id: "trash_littering",
    label: "Trash / Littering",
    icon: Trash2,
    accentColor: "#f59e0b",
    selectedBgClass: "bg-amber-500 border-amber-500",
    selectedTextClass: "text-white",
  },
  {
    id: "damaged_infrastructure",
    label: "Damaged Infrastructure",
    icon: Wrench,
    accentColor: "#ef4444",
    selectedBgClass: "bg-red-500 border-red-500",
    selectedTextClass: "text-white",
  },
  {
    id: "safety_hazard",
    label: "Safety Hazard",
    icon: AlertTriangle,
    accentColor: "#ef4444",
    selectedBgClass: "bg-red-500 border-red-500",
    selectedTextClass: "text-white",
  },
  {
    id: "trail_issue",
    label: "Trail Issue",
    icon: Map,
    accentColor: "#94a3b8",
    selectedBgClass: "bg-slate-600 border-slate-600",
    selectedTextClass: "text-white",
  },
];

export default function HazardReportDrawer({
  locationId,
  locationName,
  isOpen,
  onClose,
  onSubmit,
}: HazardReportDrawerProps) {
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryId>("trash_littering");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset form when drawer opens or closes
  useEffect(() => {
    if (!isOpen) {
      // Small timeout to allow exit animation to complete before resetting
      const timer = setTimeout(() => {
        setSelectedCategory("trash_littering");
        setDescription("");
        setIsSubmitting(false);
        setIsSuccess(false);
        setSubmitError(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle submit form action
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit(selectedCategory, description);
      setIsSuccess(true);

      // Auto close after 3 seconds on success
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to submit report. Please try again."
      );
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
            className="absolute inset-0 bg-black/70 backdrop-blur-xs"
            aria-hidden="true"
          />

          {/* Drawer container */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 280,
            }}
            className="relative z-10 w-full overflow-hidden rounded-t-3xl border-t border-white/10 bg-[#161922] p-6 shadow-2xl"
          >
            {/* Top drag handle indicator */}
            <div className="mb-4 flex justify-center">
              <div className="h-1.5 w-12 rounded-full bg-white/15" />
            </div>

            {isSuccess ? (
              /* ── Success State ────────────────────────────────────────── */
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-[#10b981]/30 bg-[#10b981]/15 text-[#10b981] shadow-[0_0_30px_rgba(16,185,129,0.25)] animate-in zoom-in-75 duration-300">
                  <CheckCircle2 className="h-10 w-10 stroke-[2.5]" />
                </div>
                <h3
                  className="mb-2 text-2xl font-bold text-white tracking-tight"
                  style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
                >
                  Report received
                </h3>
                <p className="max-w-sm text-sm text-[#bbcabf] leading-relaxed">
                  The Panchayat field team has been notified. Thank you for helping protect this ecosystem.
                </p>
                <div className="mt-6 flex items-center gap-2 text-xs text-[#4a6380]">
                  <span className="inline-block h-2 w-2 animate-ping rounded-full bg-[#10b981]" />
                  <span>Closing automatically...</span>
                </div>
              </div>
            ) : (
              /* ── Form State ────────────────────────────────────────────── */
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2
                      className="text-xl font-bold text-white tracking-tight"
                      style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
                    >
                      Report a field problem
                    </h2>
                    <p className="mt-0.5 text-xs text-[#bbcabf]">
                      Location: <span className="font-medium text-[#4edea3]">{locationName}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#bbcabf] transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="Close drawer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Error Banner if any */}
                {submitError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                    {submitError}
                  </div>
                )}

                {/* Category selector grid (2x2) */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#4a6380]">
                    Select Problem Category
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = selectedCategory === cat.id;

                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all duration-200 ${
                            isSelected
                              ? `${cat.selectedBgClass} ${cat.selectedTextClass} shadow-lg`
                              : "border-white/5 bg-[#0c2132]/60 text-[#bbcabf] hover:border-white/15 hover:bg-[#0c2132]"
                          }`}
                        >
                          <Icon
                            className={`h-5 w-5 shrink-0 transition-colors ${
                              isSelected
                                ? "text-white"
                                : ""
                            }`}
                            style={{
                              color: isSelected ? undefined : cat.accentColor,
                            }}
                          />
                          <span className="text-xs font-semibold leading-tight">
                            {cat.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Description textarea */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="hazard-description"
                    className="text-xs font-semibold uppercase tracking-wider text-[#4a6380]"
                  >
                    Description
                  </label>
                  <textarea
                    id="hazard-description"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what you saw — your report goes directly to the Panchayat field coordinator"
                    className="w-full rounded-xl border border-white/10 bg-[#0c2132] p-3.5 text-sm text-white placeholder-[#4a6380] outline-none transition-colors focus:border-[#4edea3]/50 focus:ring-1 focus:ring-[#4edea3]/30"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#10b981] py-3.5 text-sm font-semibold text-[#003824] shadow-[0_0_20px_rgba(16,185,129,0.25)] transition-all hover:bg-[#4edea3] focus:outline-none focus:ring-2 focus:ring-[#4edea3] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#003824] border-t-transparent" />
                      Sending report...
                    </span>
                  ) : (
                    <>
                      <span>Send report to Panchayat</span>
                      <Send className="h-4 w-4" />
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
