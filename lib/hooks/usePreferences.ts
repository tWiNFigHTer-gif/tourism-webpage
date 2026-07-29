"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"

export interface UserPreferences {
  theme: "dark" | "system"
  notifications: boolean
  language: "en" | "ml" | "hi"
  privacy: "public" | "private"
  accessibility: "standard" | "high_contrast"
  mapStyle: "standard" | "satellite" | "terrain"
  units: "metric" | "imperial"
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "dark",
  notifications: true,
  language: "en",
  privacy: "public",
  accessibility: "standard",
  mapStyle: "standard",
  units: "metric",
}

const PREF_KEY = (userId?: string) => `terra_preferences_${userId || "guest"}`

export function usePreferences(userId?: string) {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES)
  const [isLoading, setIsLoading] = useState(true)

  // Load preferences on mount or userId change
  useEffect(() => {
    async function loadPrefs() {
      setIsLoading(true)

      // 1. Try LocalStorage
      let local: UserPreferences | null = null
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem(PREF_KEY(userId))
          if (raw) local = JSON.parse(raw)
        } catch {/* ignore */}
      }

      if (local) {
        setPreferences({ ...DEFAULT_PREFERENCES, ...local })
      }

      // 2. Try Supabase if logged in
      if (userId) {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("preferences")
            .eq("id", userId)
            .single()

          if (!error && data?.preferences) {
            const merged = { ...DEFAULT_PREFERENCES, ...data.preferences }
            setPreferences(merged)
            if (typeof window !== "undefined") {
              localStorage.setItem(PREF_KEY(userId), JSON.stringify(merged))
            }
          }
        } catch {/* fallback to local */}
      }

      setIsLoading(false)
    }

    loadPrefs()
  }, [userId])

  // Update preferences function
  const updatePreferences = useCallback(async (newPrefs: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      const updated = { ...prev, ...newPrefs }

      // Save locally
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(PREF_KEY(userId), JSON.stringify(updated))
        } catch {/* ignore */}
      }

      // Save to Supabase DB if user is logged in
      if (userId) {
        (async () => {
          try {
            const { error } = await supabase
              .from("profiles")
              .update({ preferences: updated, updated_at: new Date().toISOString() })
              .eq("id", userId)
            if (error) {
              console.warn("DB preferences update error (fallback active):", error.message)
            }
          } catch {/* ignore */}
        })()
      }

      return updated
    })
  }, [userId])

  return { preferences, updatePreferences, isLoading }
}
