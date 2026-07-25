"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { getLocations, getDangerZones } from "@/lib/db"
import { useAuth, ProtectedRoute } from "@/lib/hooks/useAuth"
import { useCapacity } from "@/lib/hooks/useCapacity"
import { useSubmitHazard } from "@/lib/hooks/useSubmitHazard"
import { generateRoute, checkRouteSafety, type SafetyCheckResult } from "@/lib/turf"
import { generateItinerary, calculateHaversineDistance, type DayItinerary } from "@/lib/itinerary"
import HazardReportDrawer from "@/components/HazardReportDrawer"
import { HazardAlertModal } from "@/components/hazard-alert-modal"
import { RouteSafetyPanel } from "@/components/map/RouteSafetyPanel"
import type { MapLocation } from "@/components/map/LeafletMobileMap"

// Dynamically import Leaflet map with ssr: false
const LeafletMobileMap = dynamic(
  () => import("@/components/map/LeafletMobileMap"),
  { ssr: false }
)

const CATEGORY_PILLS = [
  { id: "all",        label: "All Gems",   icon: "dashboard"       },
  { id: "waterfalls", label: "Waterfalls", icon: "waterfall_chart" },
  { id: "forests",    label: "Forests",    icon: "park"            },
  { id: "wildlife",   label: "Wildlife",   icon: "pets"            },
  { id: "viewpoints", label: "Viewpoints", icon: "terrain"         },
  { id: "eco",        label: "Eco-Zones",  icon: "verified_user"   },
]

const CLIMATE_OPTIONS = [
  { id: "all", label: "All Climates", icon: "partly_cloudy_day" },
  { id: "cool", label: "Cool & Misty", icon: "cloud" },
  { id: "pleasant", label: "Pleasant & Breezy", icon: "air" },
  { id: "sunny", label: "Sunny Outdoor", icon: "wb_sunny" },
]

const DURATION_OPTIONS = [
  { id: "all", label: "Any Duration" },
  { id: "1day", label: "1-Day Plan" },
  { id: "2days", label: "2 Days Plan" },
  { id: "3days", label: "3+ Days Plan" },
]

// Tourist Starting Points Preset Options
const TOURIST_START_POINTS = [
  { id: "clt-station", name: "Kozhikode Railway Station", district: "Kozhikode", lat: 11.2480, lng: 75.7838 },
  { id: "clt-airport", name: "Calicut Airport (CCJ)", district: "Kozhikode", lat: 11.1368, lng: 75.9553 },
  { id: "clt-beach",   name: "Kozhikode Beach",           district: "Kozhikode", lat: 11.2612, lng: 75.7690 },
  { id: "wyd-kalpetta",name: "Wayanad Kalpetta Town",     district: "Wayanad",   lat: 11.6094, lng: 76.0829 },
  { id: "idk-munnar",  name: "Munnar Town Center",        district: "Idukki",    lat: 10.0889, lng: 77.0595 },
]

// Curated High-Resolution Unsplash Ecotourism Photos for Kerala Gems
const WATERFALL_IMAGES = [
  "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80",
]

const FOREST_IMAGES = [
  "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1511497584788-876761465586?auto=format&fit=crop&w=800&q=80",
]

const VIEWPOINT_IMAGES = [
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
]

const WILDLIFE_IMAGES = [
  "https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=800&q=80",
]

const ECO_BACKWATER_IMAGES = [
  "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80",
]

const DEFAULT_FALLBACK_IMAGE = "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80"

function getPlaceHeroImage(name: string, category: string, district: string, rawUrl?: string): string {
  if (rawUrl && rawUrl.startsWith("http") && !rawUrl.includes("wikimedia.org")) {
    return rawUrl
  }

  const nameLower = (name || "").toLowerCase()
  const catLower = (category || "").toLowerCase()

  if (nameLower.includes("waterfall") || nameLower.includes("falls") || catLower === "waterfalls") {
    const hash = nameLower.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return WATERFALL_IMAGES[hash % WATERFALL_IMAGES.length]
  }

  if (nameLower.includes("viewpoint") || nameLower.includes("peak") || nameLower.includes("hill") || catLower === "viewpoints") {
    const hash = nameLower.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return VIEWPOINT_IMAGES[hash % VIEWPOINT_IMAGES.length]
  }

  if (nameLower.includes("sanctuary") || nameLower.includes("wildlife") || nameLower.includes("bird") || catLower === "wildlife") {
    const hash = nameLower.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return WILDLIFE_IMAGES[hash % WILDLIFE_IMAGES.length]
  }

  if (nameLower.includes("forest") || nameLower.includes("jungle") || nameLower.includes("shola") || catLower === "forests") {
    const hash = nameLower.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return FOREST_IMAGES[hash % FOREST_IMAGES.length]
  }

  const hash = nameLower.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return ECO_BACKWATER_IMAGES[hash % ECO_BACKWATER_IMAGES.length]
}

// Fallback seed locations for initial load before Supabase response
const KERALA_PLACES_SEED: MapLocation[] = [
  {
    id: "canoly-canal",
    name: "Canoly Canal & Sarovaram Eco Park",
    region: "Kozhikode City",
    district: "Kozhikode",
    zone: "ZONE CLT-1",
    category: "eco",
    capacity: { current: 12, total: 50 },
    description: "Lush mangrove ecosystem & canal walkway right in Kozhikode city featuring wooden boardwalks & butterfly park.",
    distance: "3.8 km",
    lat: 11.2720,
    lng: 75.7950,
    active: true,
    image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80",
  },
]

function MobileMapPage() {
  const router = useRouter()
  const { user, signOut, profile } = useAuth()

  // Profile session menu toggle
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  // Tourist Starting Point ("From Location") state
  const [fromLocation, setFromLocation] = useState(TOURIST_START_POINTS[0])
  const [selectedAnchorLocation, setSelectedAnchorLocation] = useState<MapLocation | null>(null)

  // Filters state
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedClimate, setSelectedClimate] = useState("all")
  const [selectedDuration, setSelectedDuration] = useState("all")

  // Database Locations state
  const [rawLocations, setRawLocations] = useState<MapLocation[]>(KERALA_PLACES_SEED)
  const [dangerZones, setDangerZones] = useState<GeoJSON.Feature<GeoJSON.Polygon>[]>([])
  const [isDbLoading, setIsDbLoading] = useState(true)

  // Saved / Bookmarked Places state
  const [savedLocationIds, setSavedLocationIds] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("terra_saved_spots")
        return stored ? JSON.parse(stored) : ["canoly-canal", "mavoor-wetlands"]
      } catch {
        return ["canoly-canal"]
      }
    }
    return ["canoly-canal"]
  })

  const toggleSaveLocation = (id: string) => {
    setSavedLocationIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("terra_saved_spots", JSON.stringify(next))
        } catch (err) {
          console.error("Failed to save bookmark:", err)
        }
      }
      return next
    })
  }

  // Selected location (null initially so full map opens clean)
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null)
  const [activeNav, setActiveNav] = useState("map")
  const [searchValue, setSearchValue] = useState("")

  // Search & Filter Panel focus & outside-click ref
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const searchSectionRef = useRef<HTMLDivElement>(null)

  // Close search suggestions & advanced filters when clicking outside search section
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (searchSectionRef.current && !searchSectionRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false)
        setShowAdvancedFilters(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [])

  // Modals & Drawers state
  const [isReportDrawerOpen, setIsReportDrawerOpen] = useState(false)
  const [isHazardModalOpen, setIsHazardModalOpen] = useState(false)
  const { submitHazard } = useSubmitHazard()

  // ── Fetch ALL dynamic spots & danger zones from Supabase Database ──────
  useEffect(() => {
    async function loadDatabaseData() {
      try {
        setIsDbLoading(true)
        const [dbLocations, dbDangerZones] = await Promise.all([
          getLocations().catch(() => null),
          getDangerZones().catch(() => null),
        ])

        if (dbLocations && dbLocations.length > 0) {
          const mappedLocations: MapLocation[] = dbLocations.map((loc: any, idx: number) => {
            const cap = Number(loc.capacity_per_slot) || 50
            const rawCat = (loc.category || "eco").toLowerCase()
            const normalizedCat = rawCat.includes("waterfall")
              ? "waterfalls"
              : rawCat.includes("forest") || rawCat.includes("trail")
              ? "forests"
              : rawCat.includes("wildlife")
              ? "wildlife"
              : rawCat.includes("viewpoint")
              ? "viewpoints"
              : "eco"

            const heroImage = getPlaceHeroImage(loc.name, normalizedCat, loc.district, loc.image_url)

            return {
              id: loc.id || `db-loc-${idx}`,
              name: loc.name || "Kerala Ecotourism Spot",
              region: loc.region || loc.district || "Kerala",
              district: loc.district || "Kerala",
              zone: loc.panchayat_id ? `ZONE ${loc.panchayat_id.toUpperCase()}` : `ZONE ${idx + 1}A`,
              category: normalizedCat,
              capacity: { current: Math.floor(Math.random() * (cap * 0.6)) + 5, total: cap },
              description: loc.description || "Protected ecotourism zone under Panchayat carrying capacity monitoring.",
              distance: "0 km",
              lat: Number(loc.lat) || 11.2480,
              lng: Number(loc.lng) || 75.7838,
              active: idx === 0,
              image: heroImage,
            }
          })
          setRawLocations(mappedLocations)
        }

        if (dbDangerZones && dbDangerZones.length > 0) {
          const mappedDz: GeoJSON.Feature<GeoJSON.Polygon>[] = dbDangerZones
            .filter((dz: any) => dz.geojson)
            .map((dz: any) => ({
              type: "Feature",
              properties: { id: dz.id, name: dz.name, severity: dz.severity || "high" },
              geometry: typeof dz.geojson === "string" ? JSON.parse(dz.geojson) : dz.geojson,
            }))
          setDangerZones(mappedDz)
        }
      } catch (err) {
        console.error("Failed to load Supabase locations:", err)
      } finally {
        setIsDbLoading(false)
      }
    }

    loadDatabaseData()
  }, [])

  // ── Calculate Haversine Distances & Sort Nearest Spots dynamically ─────
  const locations = useMemo(() => {
    return rawLocations.map((loc) => {
      const dist = calculateHaversineDistance(fromLocation.lat, fromLocation.lng, loc.lat, loc.lng)
      return {
        ...loc,
        distanceKm: dist,
        distance: `${dist} km from ${fromLocation.name.split(" ")[0]}`,
      }
    }).sort((a, b) => a.distanceKm - b.distanceKm)
  }, [rawLocations, fromLocation])

  // Saved locations list
  const savedLocations = useMemo(() => {
    return locations.filter((loc) => savedLocationIds.includes(loc.id))
  }, [locations, savedLocationIds])

  // ── Live Capacity polling for selected location ─────────────────────────
  const activeSlot = "10:00"
  const locationIdForCapacity = selectedLocation?.id ?? (locations[0]?.id || "canoly-canal")
  const { data: liveCapacity } = useCapacity(
    locationIdForCapacity,
    activeSlot
  )

  const issuedCount = liveCapacity?.issued_count ?? (selectedLocation?.capacity.current ?? 18)
  const totalCapacity = liveCapacity?.capacity ?? (selectedLocation?.capacity.total ?? 50)
  const capacityPct = Math.min(100, Math.round((issuedCount / totalCapacity) * 100))
  const slotsRemaining = liveCapacity
    ? liveCapacity.capacity - liveCapacity.issued_count
    : (selectedLocation?.capacity.total ?? 50) - (selectedLocation?.capacity.current ?? 18)
  const isFull = slotsRemaining <= 0

  const capacityColor =
    capacityPct >= 90 ? "#ef4444" : capacityPct >= 70 ? "#f59e0b" : "#10b981"

  // Comprehensive Traveler Filter Logic (District, Search text, Category)
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      const matchesCategory = selectedCategory === "all" || loc.category === selectedCategory

      const query = searchValue.toLowerCase().trim()
      const matchesSearch =
        !query ||
        loc.name.toLowerCase().includes(query) ||
        loc.region.toLowerCase().includes(query) ||
        loc.district.toLowerCase().includes(query) ||
        loc.zone.toLowerCase().includes(query) ||
        loc.description.toLowerCase().includes(query)

      return matchesCategory && matchesSearch
    })
  }, [locations, selectedCategory, searchValue])

  // ── Spatial Greedy Multi-Day Itinerary Engine (35km/h speed, 2.5h visit, 9h budget) ──
  const itineraryData = useMemo(() => {
    if (selectedDuration === "all" && !selectedAnchorLocation && !searchValue.toLowerCase().includes("kozhikode")) {
      return null
    }

    const startLat = selectedAnchorLocation ? selectedAnchorLocation.lat : fromLocation.lat
    const startLng = selectedAnchorLocation ? selectedAnchorLocation.lng : fromLocation.lng

    const numDays = selectedDuration === "3days" ? 3 : selectedDuration === "2days" ? 2 : 1
    const generatedDays: DayItinerary[] = generateItinerary(
      startLat,
      startLng,
      filteredLocations,
      numDays
    )

    if (generatedDays.length === 0) return null

    const allStops = generatedDays.flatMap((d) => d.route as MapLocation[])
    if (allStops.length < 1) return null

    const routeCoords: [number, number][] = [
      [startLat, startLng],
      ...allStops.map((s) => [s.lat, s.lng] as [number, number]),
    ]

    const origin = `${startLat},${startLng}`
    const destination = `${allStops[allStops.length - 1].lat},${allStops[allStops.length - 1].lng}`
    const waypoints = allStops.slice(0, -1).map((s) => `${s.lat},${s.lng}`).join("|")
    const gmapsRouteUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${
      waypoints ? `&waypoints=${waypoints}` : ""
    }`

    return {
      days: numDays,
      stops: allStops,
      dayPlans: generatedDays,
      routeCoords,
      gmapsRouteUrl,
      startName: selectedAnchorLocation ? selectedAnchorLocation.name : fromLocation.name,
    }
  }, [selectedDuration, selectedAnchorLocation, searchValue, filteredLocations, fromLocation])

  // ── Spatial Safety Engine & Single-Location Navigation ────────────────────
  const [isCheckingRoute, setIsCheckingRoute] = useState(false)
  const [safetyResult, setSafetyResult] = useState<SafetyCheckResult | null>(null)

  const handleNavigate = useCallback(async (targetLoc?: MapLocation | null) => {
    const locToUse = targetLoc || selectedLocation || locations[0]
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "pk.demo"

    setSafetyResult(null)
    setIsCheckingRoute(true)

    // Launch Google Maps directions from tourist start point to location coordinates
    const gmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${fromLocation.lat},${fromLocation.lng}&destination=${locToUse.lat},${locToUse.lng}`
    if (typeof window !== "undefined") {
      window.open(gmapsUrl, "_blank")
    }

    // Spatial safety check
    const userPoint: [number, number] = [fromLocation.lng, fromLocation.lat]
    const destPoint: [number, number] = [locToUse.lng, locToUse.lat]

    try {
      let routeGeometry: GeoJSON.LineString
      if (token && token !== "pk.demo") {
        routeGeometry = await generateRoute(userPoint, destPoint, token)
      } else {
        routeGeometry = {
          type: "LineString",
          coordinates: [userPoint, destPoint],
        }
      }
      const result = checkRouteSafety(routeGeometry, dangerZones)
      setSafetyResult(result)
    } catch (err) {
      console.error("Route safety check failed:", err)
      setSafetyResult({ isSafe: true, intersectedZones: [], warningLevel: "none" })
    } finally {
      setIsCheckingRoute(false)
    }
  }, [selectedLocation, locations, dangerZones, fromLocation])

  // ── Auto-Detect Spatial Hazards for Selected Location or Trip Route ────────
  useEffect(() => {
    if (!dangerZones || dangerZones.length === 0) return

    if (selectedLocation) {
      const spotPt: [number, number] = [selectedLocation.lng, selectedLocation.lat]
      const userPt: [number, number] = [fromLocation.lng, fromLocation.lat]
      const routeLine: GeoJSON.LineString = {
        type: "LineString",
        coordinates: [userPt, spotPt],
      }
      const safety = checkRouteSafety(routeLine, dangerZones)
      if (!safety.isSafe) {
        setSafetyResult(safety)
        setIsHazardModalOpen(true)
      }
    } else if (itineraryData && itineraryData.routeCoords.length > 1) {
      const routeLine: GeoJSON.LineString = {
        type: "LineString",
        coordinates: itineraryData.routeCoords.map(([lat, lng]) => [lng, lat]),
      }
      const safety = checkRouteSafety(routeLine, dangerZones)
      if (!safety.isSafe) {
        setSafetyResult(safety)
        setIsHazardModalOpen(true)
      }
    }
  }, [selectedLocation, itineraryData, dangerZones, fromLocation])

  return (
    <div
      className="relative flex h-dvh w-full flex-col overflow-hidden"
      style={{ backgroundColor: "#0a0e13", color: "#f0f4f8" }}
    >
      {/* ── Google Fonts & Icons ───────────────────────────────────── */}
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />

      {/* ── Fixed Header Section: Title Bar + Tourist Start Point + Search Bar + Filters ── */}
      <div
        className="fixed left-0 top-0 z-50 flex w-full flex-col px-4 pt-3 pb-3"
        style={{
          background: "linear-gradient(to bottom, rgba(10,14,19,0.98) 0%, rgba(10,14,19,0.92) 85%, transparent 100%)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        {/* Header Row: Brand Logo | Pass Shortcut | Red Zone Alert | Profile */}
        <div className="flex h-10 items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/mobile")}>
            <span className="relative flex h-3 w-3 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            <h1
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "18px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "#4edea3",
              }}
            >
              KERALA WILD
            </h1>
          </div>

          <div className="flex items-center gap-2 relative">
            <button
              type="button"
              onClick={() => router.push("/mobile/book")}
              className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                confirmation_number
              </span>
              PASS
            </button>

            {/* Profile Avatar Button */}
            <button
              type="button"
              aria-label="Profile"
              onClick={() => {
                if (user) {
                  setShowProfileMenu(!showProfileMenu)
                } else {
                  router.push("/login")
                }
              }}
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "9999px",
                overflow: "hidden",
                border: user ? "1.5px solid #10b981" : "1px solid rgba(255,255,255,0.15)",
                boxShadow: user ? "0 0 10px rgba(16,185,129,0.3)" : "none",
              }}
              className="flex items-center justify-center bg-[#111820] cursor-pointer"
            >
              {user ? (
                <div className="flex h-full w-full items-center justify-center bg-emerald-500/20 text-[11px] font-bold text-emerald-400">
                  {(user.user_metadata?.full_name || user.email || "E").slice(0, 2).toUpperCase()}
                </div>
              ) : (
                <span className="material-symbols-outlined text-[#bbcabf]" style={{ fontSize: "18px" }}>
                  account_circle
                </span>
              )}
            </button>

            {/* User Session Dropdown */}
            {user && showProfileMenu && (
              <div className="absolute right-0 top-10 z-50 w-56 rounded-xl border border-white/10 bg-[#111820] p-3 shadow-2xl backdrop-blur-xl">
                <div className="border-b border-white/10 pb-2">
                  <p className="text-xs font-bold text-white">
                    {user.user_metadata?.full_name || "Explorer"}
                  </p>
                  <p className="text-[10.5px] text-[#4a6380] truncate">{user.email}</p>
                  <span className="mt-1 inline-block rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[9.5px] font-semibold text-emerald-400">
                    VERIFIED EXPLORER
                  </span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut()
                    setShowProfileMenu(false)
                  }}
                  className="mt-2 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/10 cursor-pointer"
                >
                  <span>Sign Out</span>
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>logout</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tourist Start Location ("From Location") Selector Bar */}
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-blue-500/30 bg-[#0c2132]/90 px-3 py-1.5 backdrop-blur-md">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-xs shrink-0 font-bold">
            🚩
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-300 shrink-0">
            From Location:
          </span>
          <select
            value={fromLocation.id}
            onChange={(e) => {
              const selected = TOURIST_START_POINTS.find((p) => p.id === e.target.value)
              if (selected) setFromLocation(selected)
            }}
            className="flex-1 bg-transparent text-xs font-semibold text-white outline-none cursor-pointer"
          >
            {TOURIST_START_POINTS.map((pt) => (
              <option key={pt.id} value={pt.id} className="bg-[#111820] text-white">
                {pt.name} ({pt.district})
              </option>
            ))}
          </select>
        </div>

        {/* Search Bar & Filters Section */}
        <div ref={searchSectionRef} className="relative mt-2 w-full flex items-center gap-2">
          {/* Left: Standalone Search Input Box */}
          <div
            className={`flex flex-1 items-center h-10 rounded-xl border bg-[#111820] px-3 shadow-md transition-all ${
              isSearchFocused ? "border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.2)]" : "border-white/12"
            }`}
          >
            <span className="material-symbols-outlined text-[#4a6380] mr-2" style={{ fontSize: "18px" }}>
              search
            </span>
            <input
              type="text"
              value={searchValue}
              onFocus={() => setIsSearchFocused(true)}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search Kozhikode, Wayanad, Munnar..."
              className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-[#4a6380]"
            />
            {searchValue ? (
              <button
                type="button"
                onClick={() => setSearchValue("")}
                className="text-[#4a6380] hover:text-white mr-1"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>close</span>
              </button>
            ) : null}
          </div>

          {/* Right: Standalone Filter Button */}
          <button
            type="button"
            onClick={() => {
              setIsSearchFocused(true)
              setShowAdvancedFilters(!showAdvancedFilters)
            }}
            className={`flex h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-all cursor-pointer shrink-0 ${
              showAdvancedFilters || selectedClimate !== "all" || selectedDuration !== "all"
                ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                : "border-white/12 bg-[#111820] text-[#bbcabf] hover:border-white/20 hover:text-white"
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>tune</span>
            <span>Filters</span>
          </button>

          {/* Live Search Suggestions Dropdown */}
          {isSearchFocused && (
            <div
              className="absolute left-0 right-0 top-11 z-50 flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#111820] shadow-2xl backdrop-blur-xl animate-in fade-in duration-200"
              style={{ maxHeight: "250px", overflowY: "auto" }}
            >
              {filteredLocations.length > 0 ? (
                filteredLocations.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => {
                      setSelectedLocation(loc)
                      setIsSearchFocused(false)
                      setShowAdvancedFilters(false)
                    }}
                    className="flex items-center justify-between border-b border-white/5 p-2.5 text-left transition-colors hover:bg-white/5"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={loc.image}
                        alt={loc.name}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE
                        }}
                        className="h-10 w-12 rounded-lg object-cover border border-white/10 shrink-0"
                      />
                      <div>
                        <p className="text-xs font-semibold text-white">{loc.name}</p>
                        <p className="text-[11px] text-emerald-400 font-medium">{loc.distance}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                      Select
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-[#4a6380]">
                  No spots found matching "{searchValue}". Try Kozhikode, Wayanad, or Munnar.
                </div>
              )}
            </div>
          )}
        </div>

        {/* 🌦️ Traveler Climate & Trip Days Duration Filter Row */}
        {(isSearchFocused || showAdvancedFilters || selectedClimate !== "all" || selectedDuration !== "all") && (
          <div className="mt-2 flex flex-col gap-2 rounded-xl border border-white/10 bg-[#0c2132]/90 p-2.5 backdrop-blur-md animate-in slide-in-from-top-2 duration-200">
            {/* Climate Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#4a6380] shrink-0 w-16">
                Climate:
              </span>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {CLIMATE_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedClimate(c.id)}
                    className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                      selectedClimate === c.id
                        ? "bg-emerald-500 text-[#003824] shadow-sm font-semibold"
                        : "bg-white/5 text-[#bbcabf] hover:bg-white/10"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Trip Days Duration Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#4a6380] shrink-0 w-16">
                Days Plan:
              </span>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {DURATION_OPTIONS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDuration(d.id)}
                    className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                      selectedDuration === d.id
                        ? "bg-emerald-500 text-[#003824] shadow-sm font-semibold"
                        : "bg-white/5 text-[#bbcabf] hover:bg-white/10"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Category Pills Row */}
        <div
          style={{
            display: "flex",
            gap: "6px",
            overflowX: "auto",
            paddingTop: "8px",
            paddingBottom: "2px",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {CATEGORY_PILLS.map((pill) => {
            const isActive = selectedCategory === pill.id
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setSelectedCategory(pill.id)}
                style={{
                  whiteSpace: "nowrap",
                  padding: "5px 12px",
                  borderRadius: "9999px",
                  border: isActive
                    ? "1px solid rgba(78,222,163,0.5)"
                    : "1px solid rgba(255,255,255,0.08)",
                  background: isActive
                    ? "rgba(16,185,129,0.20)"
                    : "rgba(17,24,32,0.9)",
                  color: isActive ? "#4edea3" : "#bbcabf",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "11.5px",
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  transition: "all 0.15s ease",
                  boxShadow: isActive ? "0 0 10px rgba(16,185,129,0.2)" : "none",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                  {pill.icon}
                </span>
                {pill.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Main Map Canvas Area ── */}
      <main className="relative z-10 flex-1 pt-[180px] pb-20">
        <LeafletMobileMap
          locations={filteredLocations}
          selectedLocation={selectedLocation}
          onSelectLocation={setSelectedLocation}
          itineraryRoute={itineraryData ? itineraryData.routeCoords : []}
          startPoint={{ name: fromLocation.name, lat: fromLocation.lat, lng: fromLocation.lng }}
        />
      </main>

      {/* ── SAVED PLACES DRAWER / PAGE (Appears when Saved tab is active) ── */}
      {activeNav === "saved" && (
        <div className="fixed inset-x-0 top-[175px] bottom-[76px] z-40 flex flex-col bg-[#0a0e13]/98 backdrop-blur-2xl p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>
                bookmark
              </span>
              <h2 className="text-sm font-bold text-white">Saved Eco-Gems ({savedLocations.length})</h2>
            </div>
            <button
              type="button"
              onClick={() => setActiveNav("map")}
              className="text-xs font-semibold text-emerald-400 hover:underline"
            >
              Back to Map
            </button>
          </div>

          {savedLocations.length > 0 ? (
            <div className="mt-3 flex flex-col gap-2.5">
              {savedLocations.map((spot) => (
                <div
                  key={spot.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-[#111820] p-2.5 transition-colors hover:border-emerald-500/40"
                >
                  <div
                    className="flex items-center gap-3 cursor-pointer flex-1"
                    onClick={() => {
                      setSelectedLocation(spot)
                      setActiveNav("map")
                    }}
                  >
                    <img
                      src={spot.image}
                      alt={spot.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE
                      }}
                      className="h-12 w-14 rounded-lg object-cover border border-white/10 shrink-0"
                    />
                    <div>
                      <h3 className="text-xs font-bold text-white truncate max-w-[170px]">{spot.name}</h3>
                      <p className="text-[11px] font-medium text-emerald-400">📍 {spot.distance}</p>
                      <span className="text-[9.5px] text-[#4a6380] uppercase">{spot.district}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLocation(spot)
                        setActiveNav("map")
                      }}
                      className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 border border-emerald-500/30"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSaveLocation(spot.id)}
                      className="text-[#4a6380] hover:text-red-400 p-1"
                      aria-label="Remove saved spot"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="material-symbols-outlined text-4xl text-[#4a6380] mb-2">bookmark_border</span>
              <p className="text-sm font-semibold text-white">No Saved Spots Yet</p>
              <p className="text-xs text-[#8aa299] mt-1 max-w-xs">
                Tap the bookmark icon on any location card to save your favorite eco-gems here.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Connected Multi-Day Trip Itinerary Plan Box (Floating 76px above bottom nav) ── */}
      {itineraryData && !selectedLocation && activeNav === "map" && (
        <div
          className="fixed bottom-[76px] left-3 right-3 z-40 flex flex-col rounded-xl border border-emerald-500/30 bg-[#111820]/95 p-3.5 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-300"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>route</span>
              </span>
              <div>
                <p className="text-xs font-bold text-white">
                  {itineraryData.days}-Day Route Starting From:
                </p>
                <p className="text-[11px] text-[#4edea3] font-semibold truncate max-w-[180px]">
                  📍 {itineraryData.startName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const names = itineraryData.stops.map((s) => s.name)
                  router.push(`/mobile/book?bulk_names=${encodeURIComponent(JSON.stringify(names))}`)
                }}
                className="flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2.5 py-1.5 text-xs font-bold text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 cursor-pointer"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                  confirmation_number
                </span>
                <span>Bulk Book Passes</span>
              </button>

              {selectedAnchorLocation && (
                <button
                  type="button"
                  onClick={() => setSelectedAnchorLocation(null)}
                  className="text-[10.5px] font-semibold text-[#8aa299] hover:text-white px-2 py-1.5 rounded bg-white/5 border border-white/10"
                >
                  Reset Origin
                </button>
              )}
              <a
                href={itineraryData.gmapsRouteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-xs font-semibold text-[#003824] shadow-md hover:bg-emerald-400"
              >
                <span>Google Route</span>
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>open_in_new</span>
              </a>
            </div>
          </div>

          <div className="mt-2.5 flex gap-2.5 overflow-x-auto no-scrollbar py-1">
            {itineraryData.stops.map((stop, i) => (
              <div
                key={stop.id}
                onClick={() => setSelectedLocation(stop)}
                className="flex cursor-pointer flex-col overflow-hidden rounded-lg border border-white/10 bg-[#0c2132] w-36 shrink-0 transition-transform hover:scale-[1.02] hover:border-emerald-500/50"
              >
                <div className="relative h-16 w-full">
                  <img
                    src={stop.image}
                    alt={stop.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE
                    }}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute top-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-[#003824] shadow-md">
                    {i + 1}
                  </span>
                </div>
                <div className="p-2">
                  <p className="text-[11px] font-bold text-white truncate">{stop.name}</p>
                  <p className="text-[9.5px] font-medium text-emerald-400">{stop.distance}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Location Bottom Sheet with Place Hero Photo & Bookmark Save Button (Floating 76px above bottom nav) ── */}
      {selectedLocation && !isCheckingRoute && !safetyResult && activeNav === "map" && (
        <div
          style={{
            position: "fixed",
            bottom: "76px",
            left: 0,
            width: "100%",
            zIndex: 40,
            padding: "0 12px",
            paddingBottom: "4px",
            animation: "slideUp 0.25s ease-out",
          }}
        >
          <div
            style={{
              background: "rgba(17,24,32,0.96)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: "14px 14px 0 0",
              padding: "12px 14px 14px",
              boxShadow: "0 -8px 32px rgba(0,0,0,0.6)",
              position: "relative",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ width: "24px" }} />
              <div
                style={{
                  width: "40px",
                  height: "3.5px",
                  borderRadius: "9999px",
                  background: "rgba(255,255,255,0.20)",
                }}
              />
              <button
                type="button"
                onClick={() => setSelectedLocation(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#bbcabf",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                aria-label="Close details"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>close</span>
              </button>
            </div>

            <div className="relative mb-3 h-32 w-full overflow-hidden rounded-xl border border-white/10">
              <img
                src={selectedLocation.image}
                alt={selectedLocation.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE
                }}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#111820] via-transparent to-transparent opacity-80" />
              <span className="absolute bottom-2 left-2.5 text-xs font-semibold text-white drop-shadow">
                {selectedLocation.region}
              </span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "10px",
                  fontWeight: 600,
                  color: capacityColor,
                  background: "rgba(10,14,19,0.85)",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
                className="absolute bottom-2 right-2.5"
              >
                {capacityPct}% FULL {isFull ? "(FULL)" : `(${slotsRemaining} left)`}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div>
                <h2
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: "17px",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    color: "#f0f4f8",
                  }}
                >
                  {selectedLocation.name}
                </h2>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: "#4edea3", fontWeight: 500 }}>
                  📍 {selectedLocation.distance}
                </p>
              </div>
            </div>

            <div
              style={{
                width: "100%",
                height: "5px",
                borderRadius: "9999px",
                background: "#0c2132",
                overflow: "hidden",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${capacityPct}%`,
                  background: capacityColor,
                  borderRadius: "9999px",
                  boxShadow: `0 0 6px ${capacityColor}80`,
                  transition: "width 0.5s ease",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/mobile/book?location_id=${selectedLocation.id}&location_name=${encodeURIComponent(
                      selectedLocation.name
                    )}`
                  )
                }
                style={{
                  flex: 1,
                  background: "#10b981",
                  color: "#003824",
                  border: "none",
                  borderRadius: "9999px",
                  padding: "10px 12px",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  minWidth: "120px",
                }}
              >
                Book Entry
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                  arrow_forward
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedAnchorLocation(selectedLocation)
                  if (selectedDuration === "all") {
                    setSelectedDuration("2days")
                  }
                  setSelectedLocation(null)
                }}
                className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/25 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>route</span>
                <span>Plan Trip From Here</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavigate(selectedLocation)}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "#d0e5fb",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "9999px",
                  padding: "10px 12px",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "13.5px",
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "16px" }}
                >
                  near_me
                </span>
                Directions
              </button>

              {/* Bookmark Save Button */}
              <button
                type="button"
                onClick={() => toggleSaveLocation(selectedLocation.id)}
                aria-label={savedLocationIds.includes(selectedLocation.id) ? "Unsave spot" : "Save spot"}
                style={{
                  width: "40px",
                  height: "40px",
                  background: savedLocationIds.includes(selectedLocation.id) ? "rgba(16,185,129,0.20)" : "transparent",
                  border: savedLocationIds.includes(selectedLocation.id)
                    ? "1px solid rgba(78,222,163,0.5)"
                    : "1px solid rgba(255,255,255,0.10)",
                  borderRadius: "9999px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: savedLocationIds.includes(selectedLocation.id) ? "#4edea3" : "#d0e5fb",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: "19px",
                    fontVariationSettings: savedLocationIds.includes(selectedLocation.id) ? "'FILL' 1" : "'FILL' 0",
                  }}
                >
                  bookmark
                </span>
              </button>
            </div>

            <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => setIsReportDrawerOpen(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  background: "transparent",
                  border: "none",
                  color: "rgba(245, 158, 11, 0.85)",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "11.5px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>
                  flag
                </span>
                Report a problem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Route Safety Panel Overlay ───────────────────────────── */}
      <RouteSafetyPanel
        safetyResult={safetyResult}
        isChecking={isCheckingRoute}
        onAcknowledge={() => setSafetyResult(null)}
        onChooseDifferentRoute={() => setSafetyResult(null)}
      />

      {/* ── Hazard Alert Modal ─────────────── */}
      <HazardAlertModal
        isOpen={isHazardModalOpen}
        onClose={() => setIsHazardModalOpen(false)}
      />

      {/* ── Field Hazard Report Drawer ───────────────────────────── */}
      {selectedLocation && (
        <HazardReportDrawer
          locationId={selectedLocation.id}
          locationName={selectedLocation.name}
          isOpen={isReportDrawerOpen}
          onClose={() => setIsReportDrawerOpen(false)}
          onSubmit={async (category, description) => {
            await submitHazard(selectedLocation.id, category, description)
          }}
        />
      )}

      {/* ── Refined Clean Bottom Navigation Bar (Explore | Saved | Pass) ── */}
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          width: "100%",
          zIndex: 50,
          background: "rgba(17,24,32,0.96)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            height: "60px",
          }}
        >
          {[
            { id: "map",     icon: "explore",  label: "Explore", action: () => setActiveNav("map") },
            { id: "saved",   icon: "bookmark", label: "Saved",   action: () => setActiveNav("saved") },
          ].map((item) => {
            const isActive = activeNav === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.action}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "2px",
                  padding: "6px 16px",
                  borderRadius: "10px",
                  border: "none",
                  background: isActive ? "rgba(16,185,129,0.12)" : "transparent",
                  color: isActive ? "#4edea3" : "#4a6380",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: "20px",
                    fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                  }}
                >
                  {item.icon}
                </span>
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "10px",
                    fontWeight: 500,
                    letterSpacing: "0.03em",
                  }}
                >
                  {item.label}
                </span>
              </button>
            )
          })}

          {/* Profile User Avatar Button */}
          <button
            type="button"
            onClick={() => router.push("/mobile/profile")}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "3px",
              padding: "6px 16px",
              borderRadius: "10px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "9999px",
                border: user ? "1.5px solid #10b981" : "1px solid rgba(255,255,255,0.15)",
                boxShadow: user ? "0 0 8px rgba(16,185,129,0.35)" : "none",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#111820",
              }}
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                />
              ) : user ? (
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "9px",
                    fontWeight: 700,
                    color: "#4edea3",
                    letterSpacing: "0.02em",
                  }}
                >
                  {(profile?.username || user.user_metadata?.full_name || user.email || "EX").slice(0, 2).toUpperCase()}
                </span>
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "#4a6380" }}>
                  account_circle
                </span>
              )}
            </div>
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "10px",
                fontWeight: 500,
                letterSpacing: "0.03em",
                color: "#4a6380",
              }}
            >
              Profile
            </span>
          </button>
        </div>
      </nav>

      {/* ── Keyframes ─────────────────────────────────────────────── */}
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(0.8); opacity: 0.8; }
          80%  { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        input::placeholder { color: #4a6380; }
        ::-webkit-scrollbar { display: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}

export default function ProtectedMobileMapPage() {
  return (
    <ProtectedRoute>
      <MobileMapPage />
    </ProtectedRoute>
  )
}
