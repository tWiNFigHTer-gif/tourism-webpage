"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Plus, MapPin, CheckCircle2, Route, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";

export interface TripLocation {
  id: string;
  name: string;
  category?: string;
  lat: number;
  lng: number;
  description?: string;
  capacity_per_slot?: number;
}

export interface TripPlannerProps {
  isOpen?: boolean;
  onClose?: () => void;
  onConfirmTrip?: (places: TripLocation[]) => void;
}

export default function TripPlanner({
  isOpen = true,
  onClose,
  onConfirmTrip,
}: TripPlannerProps) {
  const [places, setPlaces] = useState<TripLocation[]>([]);
  const [selectedPlaces, setSelectedPlaces] = useState<TripLocation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // STEP 2 — Unrestricted fetch for all active locations
  useEffect(() => {
    async function fetchPlaces() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("locations")
          .select("id, name, category, lat, lng, description, capacity_per_slot")
          .eq("is_active", true)
          .order("name", { ascending: true });

        if (error) {
          console.error("Error fetching places for trip planner:", error);
          setError("Failed to load places");
          return;
        }

        setPlaces(data ?? []);
      } catch (err) {
        console.error("Trip planner fetch exception:", err);
        setError("Unable to load places");
      } finally {
        setLoading(false);
      }
    }

    fetchPlaces();
  }, []);

  // STEP 3 — Adding places with duplicate check
  const handleAddPlace = (place: TripLocation) => {
    setSelectedPlaces((prev) => {
      const exists = prev.some((p) => p.id === place.id);
      if (exists) return prev;
      return [...prev, place];
    });
  };

  // STEP 3 — Removing places
  const handleRemovePlace = (placeId: string) => {
    setSelectedPlaces((prev) => prev.filter((p) => p.id !== placeId));
  };

  const filteredPlaces = places.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleConfirm = () => {
    if (selectedPlaces.length < 1) return;
    if (onConfirmTrip) {
      onConfirmTrip(selectedPlaces);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto rounded-2xl border border-white/10 bg-[#111820] p-5 shadow-2xl backdrop-blur-xl text-white font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#10b981]/15 text-[#4edea3] border border-[#10b981]/30">
            <Route className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Tourist Trip Planner
            </h2>
            <p className="text-xs text-[#94a3b8]">
              Select multiple places to craft your eco-route
            </p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#bbcabf] transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Place Selector Input / Dropdown */}
      <div className="flex flex-col gap-3 mb-4">
        <label className="text-xs font-semibold uppercase tracking-wider text-[#4a6380]">
          Select Destinations
        </label>
        
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-[#4a6380]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search or pick places to add..."
            className="w-full rounded-xl border border-white/10 bg-[#0c2132] py-2.5 pl-9 pr-3 text-xs text-white placeholder-[#4a6380] outline-none transition-colors focus:border-[#4edea3]/50"
          />
        </div>

        {/* List of Available Places */}
        <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-[#0c2132]/60 p-2 flex flex-col gap-1.5 no-scrollbar">
          {loading ? (
            <div className="py-4 text-center text-xs text-[#4a6380]">
              Loading places...
            </div>
          ) : filteredPlaces.length > 0 ? (
            filteredPlaces.map((place) => {
              const isSelected = selectedPlaces.some((p) => p.id === place.id);
              return (
                <div
                  key={place.id}
                  className={`flex items-center justify-between rounded-lg p-2 transition-colors ${
                    isSelected
                      ? "bg-[#10b981]/10 border border-[#10b981]/30"
                      : "bg-[#111820]/40 border border-white/5 hover:border-white/15"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-[#4edea3]" />
                    <div className="truncate">
                      <p className="text-xs font-semibold text-white truncate">
                        {place.name}
                      </p>
                      {place.category && (
                        <span className="text-[10px] text-[#94a3b8] uppercase font-mono">
                          {place.category}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      isSelected
                        ? handleRemovePlace(place.id)
                        : handleAddPlace(place)
                    }
                    className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                      isSelected
                        ? "bg-[#10b981] text-[#003824]"
                        : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Added</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-3 w-3" />
                        <span>Add to trip</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="py-4 text-center text-xs text-[#4a6380]">
              No places found
            </div>
          )}
        </div>
      </div>

      {/* STEP 4 — Selected Places Removable Chips */}
      <div className="mb-5 border-t border-white/10 pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#4a6380]">
            Selected Destinations ({selectedPlaces.length})
          </span>
          {selectedPlaces.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedPlaces([])}
              className="text-[11px] text-[#94a3b8] hover:text-white"
            >
              Clear all
            </button>
          )}
        </div>

        {selectedPlaces.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedPlaces.map((place) => (
              <span
                key={place.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#10b981]/40 bg-[#10b981]/15 px-3 py-1 text-xs font-medium text-white shadow-sm"
              >
                <span>{place.name}</span>
                {place.category && (
                  <span className="rounded bg-[#10b981]/30 px-1.5 py-0.5 text-[9px] font-semibold text-[#4edea3] uppercase font-mono">
                    {place.category}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemovePlace(place.id)}
                  className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[#94a3b8] hover:bg-white/20 hover:text-white"
                  aria-label={`Remove ${place.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          /* STEP 4 — Empty State */
          <p className="text-xs text-[#4a6380] italic py-2">
            Add places to your trip
          </p>
        )}
      </div>

      {/* STEP 4 — Minimum 1 place required to confirm trip */}
      <button
        type="button"
        disabled={selectedPlaces.length < 1}
        onClick={handleConfirm}
        className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition-all shadow-lg ${
          selectedPlaces.length >= 1
            ? "bg-[#10b981] text-[#003824] hover:bg-[#4edea3] cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.25)]"
            : "bg-white/10 text-white/40 cursor-not-allowed border border-white/5"
        }`}
      >
        <Route className="h-4 w-4" />
        <span>
          {selectedPlaces.length >= 1
            ? `Confirm Trip (${selectedPlaces.length} ${
                selectedPlaces.length === 1 ? "Place" : "Places"
              })`
            : "Select at least 1 place to confirm trip"}
        </span>
      </button>
    </div>
  );
}
