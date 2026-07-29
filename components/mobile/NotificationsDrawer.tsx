"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export interface NotificationItem {
  id: string
  title: string
  message: string
  time: string
  type: "hazard" | "discount" | "capacity"
  tagText: string
  locationId?: string
  locationName?: string
  discountCode?: string
  read: boolean
}

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    title: "⚠️ RED ZONE HAZARD ALERT",
    message: "Active Flash Flood Warning in Periyar West & Chalakudy River Basin. Panchayat directive: Cease water exploration.",
    time: "10 mins ago",
    type: "hazard",
    tagText: "CRITICAL HAZARD",
    locationId: "periyar-west",
    read: false,
  },
  {
    id: "notif-2",
    title: "🎉 WEEKEND SPECIAL DISCOUNT!",
    message: "Get 20% OFF entry passes for Mavoor Wetlands & Bird Sanctuary this weekend! Use code WEEKEND20.",
    time: "1 hour ago",
    type: "discount",
    tagText: "20% OFF DISCOUNT",
    locationId: "mavoor-wetlands",
    locationName: "Mavoor Wetlands & Bird Sanctuary",
    discountCode: "WEEKEND20",
    read: false,
  },
  {
    id: "notif-3",
    title: "🌿 EARLY BIRD ECO DISCOUNT",
    message: "15% discount on early morning entry slots at Munnar Eravikulam National Park.",
    time: "3 hours ago",
    type: "discount",
    tagText: "15% OFF DEALS",
    locationId: "eravikulam",
    locationName: "Eravikulam National Park",
    discountCode: "EARLY15",
    read: false,
  },
  {
    id: "notif-4",
    title: "🔥 LIVE MAP CAPACITY UPDATE",
    message: "Sarovaram Eco Park Mangrove Walkway is currently at 28% capacity — Ideal low-crowd window right now!",
    time: "4 hours ago",
    type: "capacity",
    tagText: "LOW CROWD ALERT",
    locationId: "canoly-canal",
    locationName: "Canoly Canal & Sarovaram Eco Park",
    read: false,
  },
  {
    id: "notif-5",
    title: "⚠️ HIGH WATER FLOW WARNING",
    message: "Athirappilly Waterfall lower viewing deck temporarily restricted due to heavy upstream discharge.",
    time: "Yesterday",
    type: "hazard",
    tagText: "SAFETY ADVISORY",
    locationId: "athirappilly",
    read: true,
  },
]

export function NotificationsDrawer({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onClearAll,
}: {
  isOpen: boolean
  onClose: () => void
  notifications: NotificationItem[]
  onMarkRead: (id: string) => void
  onClearAll: () => void
}) {
  const router = useRouter()
  const [filter, setFilter] = useState<"all" | "hazard" | "discount" | "capacity">("all")

  if (!isOpen) return null

  const filtered = notifications.filter((n) => {
    if (filter === "all") return true
    return n.type === filter
  })

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm cursor-pointer animate-in fade-in duration-200"
      />

      {/* Drawer Container */}
      <div className="relative z-10 w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-white/10 bg-[#111820] p-4 shadow-2xl backdrop-blur-2xl max-h-[85dvh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Top Handle */}
        <div className="mb-2 flex justify-center sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ffb95f]" style={{ fontSize: "22px" }}>
              notifications_active
            </span>
            <div>
              <h2 className="text-base font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Important Notifications
              </h2>
              <p className="text-[10.5px] text-[#4edea3] font-mono">
                {unreadCount > 0 ? `⚠️ ${unreadCount} Unread Live Alerts & Weekend Discounts` : "All notifications read"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="text-[10px] font-semibold text-[#8aa299] hover:text-white underline cursor-pointer"
              >
                Clear All
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#bbcabf] hover:text-white"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>close</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto py-2.5 no-scrollbar border-b border-white/5">
          {[
            { id: "all", label: `All (${notifications.length})` },
            { id: "hazard", label: "⚠️ Hazards" },
            { id: "discount", label: "🎉 Discounts" },
            { id: "capacity", label: "🔥 Live Capacity" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as any)}
              className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                filter === tab.id
                  ? "bg-[#4edea3] text-[#003824] shadow-md"
                  : "bg-white/5 text-[#bbcabf] hover:bg-white/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
          {filtered.length > 0 ? (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => onMarkRead(item.id)}
                className={`relative flex flex-col p-3 rounded-xl border transition-all cursor-pointer ${
                  !item.read
                    ? item.type === "hazard"
                      ? "border-red-500/40 bg-red-500/10 shadow-[0_0_12px_rgba(239,68,68,0.15)]"
                      : item.type === "discount"
                      ? "border-amber-500/40 bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                      : "border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                    : "border-white/5 bg-[#0c2132]/60 opacity-80"
                }`}
              >
                {/* Unread Pill indicator */}
                {!item.read && (
                  <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                )}

                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={`text-[9.5px] font-bold uppercase tracking-wider font-mono px-2 py-0.5 rounded border ${
                      item.type === "hazard"
                        ? "bg-red-500/20 text-red-400 border-red-500/30"
                        : item.type === "discount"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                        : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    }`}
                  >
                    {item.tagText}
                  </span>
                  <span className="text-[10px] text-[#4a6380]">{item.time}</span>
                </div>

                <h3 className="text-xs font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {item.title}
                </h3>
                <p className="text-[11.5px] text-[#bbcabf] mt-1 leading-relaxed">{item.message}</p>

                {/* Call to action buttons */}
                <div className="mt-2.5 flex items-center gap-2 pt-2 border-t border-white/5">
                  {item.type === "discount" && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onClose()
                        router.push(
                          `/mobile/book?location_id=${item.locationId || "mavoor-wetlands"}&location_name=${encodeURIComponent(
                            item.locationName || "Eco Gem"
                          )}&discount_code=${item.discountCode}`
                        )
                      }}
                      className="flex items-center gap-1 rounded-lg bg-amber-500/20 px-2.5 py-1 text-[10.5px] font-bold text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 cursor-pointer"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>confirmation_number</span>
                      Claim Discount Pass
                    </button>
                  )}

                  {item.type === "hazard" && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onClose()
                        router.push("/mobile")
                      }}
                      className="flex items-center gap-1 rounded-lg bg-red-500/20 px-2.5 py-1 text-[10.5px] font-bold text-red-400 border border-red-500/40 hover:bg-red-500/30 cursor-pointer"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>map</span>
                      View Hazard Map
                    </button>
                  )}

                  {item.type === "capacity" && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onClose()
                        router.push("/mobile")
                      }}
                      className="flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[10.5px] font-bold text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 cursor-pointer"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>near_me</span>
                      Check Spot Capacity
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-[#4a6380]">
              <span className="material-symbols-outlined text-3xl mb-2">notifications_off</span>
              <p className="text-xs font-semibold text-white">No notifications in this category</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
