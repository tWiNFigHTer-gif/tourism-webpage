"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"

export interface UserProfile {
  id: string
  username: string | null
  bio: string | null
  avatar_url: string | null
  updated_at: string | null
}

interface UseProfileReturn {
  profile: UserProfile | null
  isLoading: boolean
  isSaving: boolean
  error: string | null
  dbAvailable: boolean
  fetchProfile: (userId: string) => Promise<void>
  updateProfile: (data: Partial<Pick<UserProfile, "username" | "bio" | "avatar_url">>) => Promise<{ error?: string }>
  uploadAvatar: (userId: string, file: File) => Promise<{ url?: string; error?: string }>
}

const LS_KEY = (id: string) => `terra_profile_${id}`

function loadLocalProfile(userId: string): UserProfile {
  if (typeof window === "undefined") return { id: userId, username: null, bio: null, avatar_url: null, updated_at: null }
  try {
    const raw = localStorage.getItem(LS_KEY(userId))
    if (raw) return JSON.parse(raw) as UserProfile
  } catch {/* ignore */}
  return { id: userId, username: null, bio: null, avatar_url: null, updated_at: null }
}

function saveLocalProfile(p: UserProfile) {
  if (typeof window === "undefined") return
  try { localStorage.setItem(LS_KEY(p.id), JSON.stringify(p)) } catch {/* ignore */}
}

export function useProfile(): UseProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dbAvailable, setDbAvailable] = useState(true)

  const fetchProfile = useCallback(async (userId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from("profiles")
        .select("id, username, bio, avatar_url, updated_at")
        .eq("id", userId)
        .single()

      if (err) {
        if (err.code === "PGRST116") {
          // Row not found — first time user, init empty profile
          const empty = { id: userId, username: null, bio: null, avatar_url: null, updated_at: null }
          setProfile(empty)
          setDbAvailable(true)
        } else if (err.code === "PGRST205" || err.code === "42P01") {
          // Table doesn't exist — fall back to localStorage
          setDbAvailable(false)
          setProfile(loadLocalProfile(userId))
        } else {
          // Other DB error — still fall back to localStorage gracefully
          setDbAvailable(false)
          setProfile(loadLocalProfile(userId))
          setError(null) // don't surface error to user
        }
      } else if (data) {
        setDbAvailable(true)
        setProfile(data as UserProfile)
      } else {
        const empty = { id: userId, username: null, bio: null, avatar_url: null, updated_at: null }
        setProfile(empty)
      }
    } catch (e: any) {
      setDbAvailable(false)
      setProfile(loadLocalProfile(userId))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateProfile = useCallback(
    async (data: Partial<Pick<UserProfile, "username" | "bio" | "avatar_url">>) => {
      if (!profile) return { error: "No profile loaded" }

      setIsSaving(true)
      setError(null)

      const updated: UserProfile = {
        ...profile,
        ...data,
        updated_at: new Date().toISOString(),
      }

      // Always save to localStorage as primary local cache
      saveLocalProfile(updated)
      setProfile(updated)

      if (!dbAvailable) {
        setIsSaving(false)
        return {}
      }

      try {
        const { error: err } = await supabase
          .from("profiles")
          .upsert(
            { id: profile.id, ...data, updated_at: new Date().toISOString() },
            { onConflict: "id" }
          )

        if (err) {
          if (err.code === "PGRST205" || err.code === "42P01") {
            setDbAvailable(false)
            // Already saved to localStorage — not an error for the user
            setIsSaving(false)
            return {}
          }
          setError(err.message)
          setIsSaving(false)
          return { error: err.message }
        }

        setIsSaving(false)
        return {}
      } catch (e: any) {
        setDbAvailable(false)
        setIsSaving(false)
        return {}
      }
    },
    [profile, dbAvailable]
  )

  const uploadAvatar = useCallback(async (userId: string, file: File): Promise<{ url?: string; error?: string }> => {
    // Validate file
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (!allowed.includes(file.type)) {
      return { error: "Please upload a JPG, PNG, WebP or GIF image." }
    }
    if (file.size > 5 * 1024 * 1024) {
      return { error: "Image must be smaller than 5 MB." }
    }

    try {
      const ext = file.name.split(".").pop() ?? "jpg"
      const path = `${userId}/avatar.${ext}`

      // Ensure bucket exists
      await supabase.storage.createBucket("avatars", { public: true })

      const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, {
        upsert: true,
        contentType: file.type,
      })

      if (uploadErr) {
        // If storage upload fails (e.g. policy not set), use data URL as fallback
        if (uploadErr.message.includes("policy") || uploadErr.message.includes("permission") || uploadErr.message.includes("row-level")) {
          return { error: `Storage policy not configured. Please run the SQL migration in Supabase Dashboard. Error: ${uploadErr.message}` }
        }
        return { error: uploadErr.message }
      }

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path)
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`
      return { url: publicUrl }
    } catch (e: any) {
      return { error: e.message }
    }
  }, [])

  return { profile, isLoading, isSaving, error, dbAvailable, fetchProfile, updateProfile, uploadAvatar }
}
