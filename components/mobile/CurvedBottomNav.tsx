"use client"

import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/lib/hooks/useAuth"

interface CurvedBottomNavProps {
  onCreatePress?: () => void
}

export default function CurvedBottomNav({ onCreatePress }: CurvedBottomNavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, profile } = useAuth()

  const handleMap = () => router.push("/map")
  const handleExplore = () => router.push("/mobile/explore")
  const handleCreate = onCreatePress ?? (() => router.push("/mobile/book"))
  const handleProfile = () => router.push("/mobile/profile")

  const isMapActive = pathname === "/map" || pathname === "/mobile"
  const isExploreActive = pathname.startsWith("/mobile/explore")
  const isProfileActive = pathname.startsWith("/mobile/profile")

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 pointer-events-auto">
      <div className="relative h-20 bg-[#081d2e]/95 backdrop-blur-xl border-t border-white/10 shadow-2xl flex items-center justify-around px-4">
        {/* Map icon */}
        <button
          type="button"
          id="curved-nav-map"
          onClick={handleMap}
          aria-label="Go to Map"
          className={`flex flex-col items-center justify-center gap-1 bg-transparent border-none cursor-pointer transition-colors px-3 py-1 ${
            isMapActive ? "text-[#4edea3]" : "text-[#4a6380] hover:text-white"
          }`}
        >
          <span className="material-symbols-outlined text-2xl">map</span>
          <span className="font-sans text-[11px] font-medium tracking-wide">Map</span>
        </button>

        {/* Explore icon */}
        <button
          type="button"
          id="curved-nav-explore"
          onClick={handleExplore}
          aria-label="Go to Explore"
          className={`flex flex-col items-center justify-center gap-1 bg-transparent border-none cursor-pointer transition-colors px-3 py-1 ${
            isExploreActive ? "text-[#4edea3]" : "text-[#4a6380] hover:text-white"
          }`}
        >
          <span className="material-symbols-outlined text-2xl">explore</span>
          <span className="font-sans text-[11px] font-medium tracking-wide">Explore</span>
        </button>

        {/* Floating Action Button (FAB) for Book Pass */}
        <button
          type="button"
          id="explore-fab-create"
          onClick={handleCreate}
          aria-label="Book Pass"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/30 hover:scale-105 transition-all cursor-pointer border border-emerald-300"
          title="Book Slot Pass"
        >
          <span className="material-symbols-outlined text-2xl font-bold">confirmation_number</span>
        </button>

        {/* Profile icon */}
        <button
          type="button"
          id="curved-nav-profile"
          onClick={handleProfile}
          aria-label="Go to Profile"
          className={`flex flex-col items-center justify-center gap-1 bg-transparent border-none cursor-pointer transition-colors px-3 py-1 ${
            isProfileActive ? "text-[#4edea3]" : "text-[#4a6380] hover:text-white"
          }`}
        >
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center overflow-hidden border ${
              isProfileActive ? "border-[#4edea3] shadow-[0_0_8px_rgba(78,222,163,0.5)]" : "border-slate-600"
            }`}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : user ? (
              <span className="text-[9px] font-bold text-[#4edea3]">
                {(profile?.username || user.user_metadata?.full_name || user.email || "ME").slice(0, 2).toUpperCase()}
              </span>
            ) : (
              <span className="material-symbols-outlined text-sm text-[#4a6380]">account_circle</span>
            )}
          </div>
          <span className="font-sans text-[11px] font-medium tracking-wide">Profile</span>
        </button>
      </div>
    </nav>
  )
}
