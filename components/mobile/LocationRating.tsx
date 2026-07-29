"use client"

import { useState, useEffect } from "react"
import { upsertLocationRating } from "@/lib/db"

interface LocationRatingProps {
  locationId: string
  userId?: string
}

export function LocationRating({ locationId, userId }: LocationRatingProps) {
  const [rating, setRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [isSaved, setIsSaved] = useState(false)

  // Load stored rating on mount or locationId change
  useEffect(() => {
    if (typeof window === "undefined" || !locationId) return
    try {
      const stored = localStorage.getItem(`terra_rating_${locationId}`)
      if (stored) {
        setRating(Number(stored))
      } else {
        setRating(0)
      }
    } catch {/* ignore */}
    setIsSaved(false)
  }, [locationId])

  const handleRate = async (value: number) => {
    setRating(value)
    setIsSaved(true)

    // Save to localStorage
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`terra_rating_${locationId}`, String(value))
      } catch {/* ignore */}
    }

    // Persist to Supabase if available
    try {
      await upsertLocationRating(locationId, value, userId)
    } catch (e) {
      console.warn("Rating saved to local state")
    }

    setTimeout(() => setIsSaved(false), 2500)
  }

  const activeDisplay = hoverRating || rating

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#4a6380]">
          Your Rating
        </span>
        {isSaved && (
          <span className="text-[10px] font-semibold text-[#4edea3] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 animate-in fade-in">
            ✓ Rating Saved!
          </span>
        )}
      </div>

      <div className="mt-1.5 flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleRate(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-1 text-[#ffb95f] hover:scale-125 transition-transform cursor-pointer outline-none"
            aria-label={`Rate ${star} stars`}
          >
            <span
              className="material-symbols-outlined text-2xl transition-all"
              style={{
                fontVariationSettings: star <= activeDisplay ? "'FILL' 1" : "'FILL' 0",
                color: star <= activeDisplay ? "#ffb95f" : "#4a6380",
              }}
            >
              star
            </span>
          </button>
        ))}

        <span className="ml-2 text-xs font-semibold text-[#f0f4f8]">
          {rating > 0 ? `${rating}.0 / 5.0` : "Tap to rate"}
        </span>
      </div>
    </div>
  )
}
