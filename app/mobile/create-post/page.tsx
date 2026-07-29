"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ProtectedRoute } from "@/components/AuthProvider"
import { useAuth } from "@/lib/hooks/useAuth"
import type { StoredPass } from "@/app/mobile/book/page"
import type { ReviewData } from "@/components/mobile/mockReviews"

const DEFAULT_SEED_PASSES: StoredPass[] = [
  {
    id: "pass-active-1",
    pass_token: "TP-PASS-7842M",
    location_id: "mavoor-wetlands",
    location_name: "Mavoor Wetlands & Bird Sanctuary",
    slot_time: "10:00 AM",
    visitors: 2,
    visitor_name: "Arjun Nair",
    visitor_phone: "9876543210",
    booked_at: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    status: "ACTIVE",
    image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "pass-seed-1",
    pass_token: "TP-PASS-9821K",
    location_id: "canoly-canal",
    location_name: "Canoly Canal & Sarovaram Eco Park",
    slot_time: "10:00 AM",
    visitors: 2,
    visitor_name: "Arjun Nair",
    visitor_phone: "9876543210",
    booked_at: new Date(Date.now() - 86400000 * 2).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    status: "VISITED",
    image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=600&q=80",
  },
]

const PHOTO_PRESETS = [
  { id: "p1", label: "Bioluminescent / Forest", url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80" },
  { id: "p2", label: "Waterfall / Mist", url: "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=800&q=80" },
  { id: "p3", label: "Backwaters / Canal", url: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80" },
  { id: "p4", label: "Mountain Viewpoint", url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80" },
  { id: "p5", label: "Wildlife Sanctuary", url: "https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=800&q=80" },
]

function CreatePostForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile } = useAuth()

  const requestedLocationId = searchParams.get("location_id")
  const requestedLocationName = searchParams.get("location_name")

  // Load passes from localStorage
  const [visitedPasses, setVisitedPasses] = useState<StoredPass[]>([])
  const [hasLoaded, setHasLoaded] = useState(false)
  const [unvisitedWarning, setUnvisitedWarning] = useState<string | null>(null)

  // Form State
  const [selectedPassId, setSelectedPassId] = useState<string>("")
  const [rating, setRating] = useState<number>(5)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [reviewText, setReviewText] = useState<string>("")
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string>(PHOTO_PRESETS[0].url)
  const [customImagePreview, setCustomImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be smaller than 10 MB")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCustomImagePreview(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    let allPasses = DEFAULT_SEED_PASSES
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("terra_my_passes")
        if (stored) {
          allPasses = JSON.parse(stored)
        }
      } catch {
        allPasses = DEFAULT_SEED_PASSES
      }
    }

    const visited = allPasses.filter((p) => p.status === "VISITED")
    setVisitedPasses(visited)
    setHasLoaded(true)

    // Check requested location parameter vs visited places
    if (requestedLocationId || requestedLocationName) {
      const match = visited.find(
        (p) => p.location_id === requestedLocationId || p.location_name === requestedLocationName
      )
      if (match) {
        setSelectedPassId(match.id)
      } else {
        setUnvisitedWarning(
          `You have not completed a visit to "${requestedLocationName || "this location"}" yet. You can only post reviews for locations you have visited.`
        )
        if (visited.length > 0) {
          setSelectedPassId(visited[0].id)
        }
      }
    } else if (visited.length > 0) {
      setSelectedPassId(visited[0].id)
    }
  }, [requestedLocationId, requestedLocationName])

  const selectedPass = visitedPasses.find((p) => p.id === selectedPassId)

function compressImage(dataUrl: string, maxWidth = 700, quality = 0.65): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      let width = img.width
      let height = img.height
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL("image/jpeg", quality))
      } else {
        resolve(dataUrl)
      }
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPass) return
    if (!reviewText.trim()) return

    setIsSubmitting(true)

    let finalPhoto = customImagePreview || selectedPhotoUrl
    if (customImagePreview && customImagePreview.startsWith("data:image")) {
      try {
        finalPhoto = await compressImage(customImagePreview, 700, 0.65)
      } catch {/* fallback */}
    }

    const newReview: ReviewData = {
      id: `rev-user-${Date.now()}`,
      reviewer: {
        name: profile?.username || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Explorer",
        avatarUrl: profile?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80",
        verified: true,
        role: "VISITED EXPLORER • JUST NOW",
      },
      location: {
        name: selectedPass.location_name,
        district: "Kerala",
        zone: "ZONE DPI",
      },
      rating: rating,
      timeAgo: "Just now",
      text: reviewText.trim(),
      images: [finalPhoto],
      likeCount: 1,
      commentCount: 0,
      isLiked: true,
      isSaved: false,
    }

    // Save to localStorage with QuotaExceededError protection
    if (typeof window !== "undefined") {
      try {
        const storedReviewsRaw = localStorage.getItem("terra_user_reviews")
        const existing: ReviewData[] = storedReviewsRaw ? JSON.parse(storedReviewsRaw) : []
        const updated = [newReview, ...existing.slice(0, 5)]
        localStorage.setItem("terra_user_reviews", JSON.stringify(updated))
      } catch (err) {
        console.warn("LocalStorage quota full, storing lightweight fallback:", err)
        try {
          const fallbackReview = { ...newReview, images: [PHOTO_PRESETS[0].url] }
          localStorage.setItem("terra_user_reviews", JSON.stringify([fallbackReview]))
        } catch {/* ignore */}
      }
    }

    setTimeout(() => {
      setIsSubmitting(false)
      router.push("/mobile/explore")
    }, 400)
  }

  if (!hasLoaded) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-[#0a0e13] text-emerald-400 font-mono text-xs">
        Loading visited places verification…
      </div>
    )
  }

  return (
    <div className="min-h-dvh w-full bg-[#0a0e13] text-[#f0f4f8] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-white/10 bg-[#0c2132]/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-[#111820] text-[#bbcabf] hover:text-white"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>close</span>
          </button>
          <div>
            <h1 className="text-sm font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Share Visited Experience
            </h1>
            <p className="text-[10px] text-emerald-400 font-mono">VERIFIED VISIT POSTING</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push("/mobile/book")}
          className="text-xs text-[#8aa299] hover:text-white font-medium"
        >
          My Passes
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col gap-5">
        {/* Unvisited Warning Banner */}
        {unvisitedWarning && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-300 text-xs">
            <span className="material-symbols-outlined text-amber-400 shrink-0" style={{ fontSize: "18px" }}>
              warning
            </span>
            <p>{unvisitedWarning}</p>
          </div>
        )}

        {/* State 1: NO Visited Places */}
        {visitedPasses.length === 0 ? (
          <div className="my-auto flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#111820] p-6 text-center shadow-xl">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
              <span className="material-symbols-outlined text-3xl">verified_user</span>
            </div>
            <h2 className="text-base font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Only Visited Locations Can Be Reviewed
            </h2>
            <p className="text-xs text-[#8aa299] leading-relaxed mb-6">
              To guarantee real, high-quality ecotourism feedback, users can only post reviews for locations where they have completed a visit with a verified pass.
            </p>
            <div className="flex flex-col gap-2.5 w-full">
              <button
                type="button"
                onClick={() => router.push("/mobile/book")}
                className="w-full rounded-xl bg-emerald-500 py-3 text-xs font-bold text-[#003824] shadow-lg hover:bg-emerald-400"
              >
                Book an Entry Pass
              </button>
              <button
                type="button"
                onClick={() => router.push("/mobile/explore")}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-[#bbcabf]"
              >
                Return to Explore Feed
              </button>
            </div>
          </div>
        ) : (
          /* State 2: User HAS Visited Places -> Post Form */
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Location Selector (STRICTLY RESTRICTED TO VISITED PLACES) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10.5px] font-bold text-emerald-400 uppercase tracking-wider font-mono">
                Select Visited Location *
              </label>
              <div className="relative">
                <select
                  value={selectedPassId}
                  onChange={(e) => setSelectedPassId(e.target.value)}
                  className="w-full rounded-xl border border-emerald-500/30 bg-[#111820] px-3 py-2.5 text-xs font-semibold text-white outline-none cursor-pointer"
                >
                  {visitedPasses.map((pass) => (
                    <option key={pass.id} value={pass.id} className="bg-[#111820] text-white">
                      ✓ {pass.location_name} (Visited on {pass.booked_at})
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-[#4a6380]">
                🔒 Only locations from your verified visited passes appear in this list.
              </p>
            </div>

            {/* Star Rating */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10.5px] font-bold text-[#8aa299] uppercase tracking-wider font-mono">
                Your Rating *
              </label>
              <div className="flex items-center gap-2 bg-[#111820] border border-white/10 p-3 rounded-xl">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = star <= (hoverRating || rating)
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 cursor-pointer transition-transform hover:scale-125 focus:outline-none"
                        aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                      >
                        <svg
                          width="26"
                          height="26"
                          viewBox="0 0 24 24"
                          fill={isFilled ? "#ffb95f" : "none"}
                          stroke={isFilled ? "#ffb95f" : "#4a6380"}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{
                            filter: isFilled ? "drop-shadow(0 0 6px rgba(255,185,95,0.5))" : "none",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      </button>
                    )
                  })}
                </div>
                <span className="ml-auto text-xs font-bold text-[#ffb95f] font-mono bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                  ★ {rating} / 5 Stars
                </span>
              </div>
            </div>

            {/* Review Text */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10.5px] font-bold text-[#8aa299] uppercase tracking-wider font-mono">
                Review & Atmospheric Details *
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={4}
                required
                placeholder="Share trail conditions, crowd density, water levels, or wildlife spotted..."
                className="w-full rounded-xl border border-white/10 bg-[#111820] p-3 text-xs text-white placeholder:text-[#4a6380] outline-none focus:border-emerald-500/50"
              />
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: "none" }}
              onChange={handleCustomImageUpload}
            />

            {/* Photo Selection / Device Upload */}
            <div className="flex flex-col gap-2.5">
              <label className="text-[10.5px] font-bold text-[#8aa299] uppercase tracking-wider font-mono">
                Attach Photo Update
              </label>

              {/* Upload Button Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                  customImagePreview
                    ? "border-emerald-400 bg-emerald-500/10"
                    : "border-emerald-500/30 bg-[#111820] hover:border-emerald-400 hover:bg-[#15202b]"
                }`}
              >
                {customImagePreview ? (
                  <div className="flex flex-col items-center gap-2 w-full">
                    <div className="relative h-28 w-full overflow-hidden rounded-lg border border-emerald-500/40">
                      <img src={customImagePreview} alt="Custom uploaded photo" className="h-full w-full object-cover" />
                      <span className="absolute top-2 right-2 bg-emerald-500 text-[#003824] px-2 py-0.5 rounded text-[10px] font-bold">
                        ✓ CUSTOM UPLOAD
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                      <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>photo_camera</span>
                      Tap to change photo from device
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 py-1">
                    <span className="material-symbols-outlined text-emerald-400" style={{ fontSize: "28px" }}>
                      add_a_photo
                    </span>
                    <span className="text-xs font-bold text-white">Upload Photo from Device</span>
                    <span className="text-[10px] text-[#4a6380]">Supports JPG, PNG, WebP or GIF (Max 10 MB)</span>
                  </div>
                )}
              </div>

              {/* Preset Photos Fallback */}
              <div className="mt-1">
                <span className="text-[10px] font-semibold text-[#4a6380] uppercase tracking-wider block mb-1.5 font-mono">
                  Or Select Preset Eco Photo
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {PHOTO_PRESETS.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setCustomImagePreview(null)
                        setSelectedPhotoUrl(p.url)
                      }}
                      className={`relative flex cursor-pointer flex-col overflow-hidden rounded-xl border p-1 transition-all ${
                        !customImagePreview && selectedPhotoUrl === p.url
                          ? "border-emerald-400 bg-emerald-500/10 ring-2 ring-emerald-500/30"
                          : "border-white/10 bg-[#111820] hover:border-white/20"
                      }`}
                    >
                      <img src={p.url} alt={p.label} className="h-16 w-full object-cover rounded-lg" />
                      <span className="mt-1 text-[9.5px] font-medium text-white truncate px-1">{p.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !reviewText.trim()}
              className={`w-full rounded-xl py-3.5 text-xs font-bold transition-all shadow-lg cursor-pointer mt-2 ${
                isSubmitting || !reviewText.trim()
                  ? "bg-white/10 text-[#4a6380] cursor-not-allowed"
                  : "bg-emerald-500 text-[#003824] hover:bg-emerald-400"
              }`}
            >
              {isSubmitting ? "Publishing Review…" : "Publish Verified Review"}
            </button>
          </form>
        )}
      </main>
    </div>
  )
}

export default function ProtectedCreatePostPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="p-4 text-xs text-white">Loading...</div>}>
        <CreatePostForm />
      </Suspense>
    </ProtectedRoute>
  )
}
