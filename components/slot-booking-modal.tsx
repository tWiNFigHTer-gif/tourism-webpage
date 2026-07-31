"use client"

import { useState } from "react"

interface SlotBookingModalProps {
  isOpen: boolean
  onClose: () => void
  locationName?: string
  capacity?: { current: number; total: number }
}

const TIME_SLOTS = [
  { time: "08:00", available: true,  selected: false },
  { time: "10:00", available: true,  selected: true  },
  { time: "12:00", available: true,  selected: false },
  { time: "14:00", available: false, selected: false },
]

const getUpcomingDates = () => {
  const dates = [];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const now = new Date();
  for (let i = 0; i < 5; i++) {
    const d = new Date(now.getTime() + i * 86400000);
    dates.push(`${days[d.getDay()]} ${d.getDate()}`);
  }
  return dates;
};

export function SlotBookingModal({
  isOpen,
  onClose,
  locationName = "Pambadum Shola National Park",
  capacity = { current: 36, total: 50 },
}: SlotBookingModalProps) {
  const dynamicDates = getUpcomingDates();
  const [selectedSlot, setSelectedSlot] = useState("10:00")
  const [selectedDate, setSelectedDate] = useState(dynamicDates[0] || "Today")
  const [visitors, setVisitors] = useState(1)
  const [booked, setBooked] = useState(false)
  const [generatedToken, setGeneratedToken] = useState("")

  const capacityPct = Math.round((capacity.current / capacity.total) * 100)

  const handleConfirmBook = () => {
    const token = `TP-PASS-${Math.floor(1000 + Math.random() * 9000)}`;
    setGeneratedToken(token);
    setBooked(true);

    const newPass = {
      id: `pass-${Date.now()}`,
      pass_token: token,
      location_id: locationName.toLowerCase().replace(/\s+/g, "-"),
      location_name: locationName,
      slot_time: selectedSlot,
      visitors: visitors,
      visitor_name: "Tourist Explorer",
      visitor_phone: "9876543210",
      booked_at: selectedDate,
      status: "ACTIVE",
      image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=600&q=80",
    };

    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("terra_my_passes");
        const prev = raw ? JSON.parse(raw) : [];
        const next = [newPass, ...prev];
        localStorage.setItem("terra_my_passes", JSON.stringify(next));
        localStorage.setItem("terra_pulse_passes", JSON.stringify(next));
        window.dispatchEvent(new CustomEvent("storage_sync", { detail: { key: "passes" } }));
      } catch (e) {
        console.error("Pass save error:", e);
      }
    }
  };

  if (!isOpen) return null

  if (booked) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-gutter">
        <div className="absolute inset-0 bg-bg-deep/80 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-primary/30 bg-bg-surface shadow-2xl glow-emerald">
          <div className="flex flex-col items-center gap-4 p-panel-padding py-10 text-center">
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontSize: "56px", fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            <h2
              className="text-text-primary"
              style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "22px", fontWeight: 600 }}
            >
              Booking Confirmed!
            </h2>
            <p className="text-sm text-text-muted">
              Your entry pass for <span className="text-primary">{locationName}</span> has been confirmed.
            </p>
            <div
              className="rounded-lg border border-border-subtle bg-bg-deep px-6 py-3"
              style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "12px", color: "#4a6380" }}
            >
              PASS: {generatedToken} · {selectedDate} · {selectedSlot}
            </div>
            <button
              onClick={onClose}
              className="mt-2 rounded-full bg-primary px-8 py-3 font-semibold text-on-primary transition-colors hover:bg-primary-fixed cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-gutter">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-bg-deep/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border-subtle bg-bg-surface shadow-2xl glass-panel">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between border-b border-border-subtle p-panel-padding">
          <div className="flex-1 min-w-0 pr-4">
            <h2
              className="text-text-primary"
              style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "22px", lineHeight: "28px", fontWeight: 600, letterSpacing: "-0.02em" }}
            >
              {locationName}
            </h2>
            <p className="mt-1 text-sm text-text-muted">Book your entry pass</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border-subtle text-text-muted transition-colors hover:text-on-surface"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>close</span>
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6 p-panel-padding">

          {/* Capacity bar */}
          <div>
            <div className="mb-2 flex items-end justify-between">
              <span
                className="uppercase tracking-wider text-text-muted"
                style={{ fontFamily: "var(--font-inter)", fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em" }}
              >
                Current Capacity
              </span>
              <span
                className="text-primary"
                style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "12px" }}
              >
                {capacityPct}% Full ({capacity.current}/{capacity.total})
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full border border-border-subtle bg-bg-deep">
              <div
                className="h-full rounded-full bg-primary shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-500"
                style={{ width: `${capacityPct}%` }}
              />
            </div>
          </div>

          {/* Date picker */}
          <div>
            <span
              className="mb-3 block uppercase tracking-wider text-text-muted"
              style={{ fontFamily: "var(--font-inter)", fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em" }}
            >
              Select Date
            </span>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {dynamicDates.map((date) => (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  className={`shrink-0 rounded-lg px-3 py-2 text-center transition-all duration-200 cursor-pointer ${
                    selectedDate === date
                      ? "border border-primary/50 bg-bg-raised text-primary shadow-[0_0_8px_rgba(16,185,129,0.1)]"
                      : "border border-border-subtle bg-bg-deep text-text-muted hover:border-border-medium"
                  }`}
                  style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "12px" }}
                >
                  {date}
                </button>
              ))}
            </div>
          </div>

          {/* Time slots */}
          <div>
            <span
              className="mb-3 block uppercase tracking-wider text-text-muted"
              style={{ fontFamily: "var(--font-inter)", fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em" }}
            >
              Available Slots
            </span>
            <div className="grid grid-cols-4 gap-2">
              {TIME_SLOTS.map(({ time, available }) => {
                const isSelected = selectedSlot === time
                return (
                  <button
                    key={time}
                    type="button"
                    disabled={!available}
                    onClick={() => available && setSelectedSlot(time)}
                    className={`relative overflow-hidden rounded py-1.5 text-center transition-all duration-200 ${
                      !available
                        ? "cursor-not-allowed border border-border-subtle text-text-muted/30"
                        : isSelected
                          ? "border border-primary/50 bg-bg-raised text-primary shadow-[0_0_8px_rgba(16,185,129,0.1)] cursor-pointer"
                          : "border border-border-subtle bg-bg-deep text-text-muted hover:border-border-medium cursor-pointer"
                    }`}
                    style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "12px" }}
                  >
                    {!available && (
                      <div
                        className="absolute inset-0 opacity-20"
                        style={{
                          background: "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.05) 4px, rgba(255,255,255,0.05) 8px)",
                        }}
                      />
                    )}
                    <span className="relative z-10">{time}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Visitor count */}
          <div>
            <span
              className="mb-3 block uppercase tracking-wider text-text-muted"
              style={{ fontFamily: "var(--font-inter)", fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em" }}
            >
              Visitors
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setVisitors(Math.max(1, visitors - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle bg-bg-deep text-text-muted transition-colors hover:border-border-medium hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>remove</span>
              </button>
              <span
                className="flex-1 text-center text-on-surface"
                style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "22px", fontWeight: 600 }}
              >
                {visitors}
              </span>
              <button
                type="button"
                onClick={() => setVisitors(Math.min(10, visitors + 1))}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle bg-bg-deep text-text-muted transition-colors hover:border-border-medium hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add</span>
              </button>
            </div>
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={handleConfirmBook}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-medium text-on-primary transition-colors hover:bg-primary-fixed cursor-pointer"
          >
            <span>Book Entry Pass</span>
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>arrow_forward</span>
          </button>

          {/* Token note */}
          <p
            className="text-center text-text-muted"
            style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "11px" }}
          >
            Your pass token will be generated after confirmation.
          </p>

        </div>
      </div>
    </div>
  )
}
