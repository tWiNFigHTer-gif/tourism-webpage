import { supabase } from "@/lib/supabase";

/**
 * Typed database query helpers for Terra-Pulse.
 * All UI components & hooks import from here instead of calling Supabase directly.
 */

export async function getLocations() {
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("is_active", true);
  if (error) throw error;
  return data;
}

export async function getDangerZones() {
  const { data, error } = await supabase
    .from("danger_zones")
    .select("*")
    .eq("is_active", true);
  if (error) throw error;
  return data;
}

export async function getPassCount(locationId: string, timeSlot: string) {
  const { count, error } = await supabase
    .from("passes")
    .select("*", { count: "exact", head: true })
    .eq("location_id", locationId)
    .eq("time_slot", timeSlot);
  if (error) throw error;
  return count ?? 0;
}

export async function insertPass(payload: {
  location_id: string;
  time_slot: string;
  panchayat_id: string;
  pass_token: string;
}) {
  const { data, error } = await supabase
    .from("passes")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function insertHazardReport(payload: {
  location_id: string;
  category: string;
  description: string;
  panchayat_id: string;
}) {
  const { data, error } = await supabase
    .from("hazard_reports")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function insertExperience(payload: {
  location_id: string;
  pass_token: string;
  caption: string;
  mood_tag: string;
  photo_url: string | null;
  panchayat_id: string;
}) {
  const { data, error } = await supabase
    .from("experiences")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getExperiences(locationId: string) {
  const { data, error } = await supabase
    .from("experiences")
    .select("*")
    .eq("location_id", locationId)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  return data;
}

export async function getDashboardData() {
  const [capacity, hazards, dangerZones] = await Promise.all([
    supabase.from("capacity_status").select("*"),
    supabase
      .from("hazard_reports")
      .select("*, locations(name)")
      .eq("status", "open")
      .order("reported_at", { ascending: false })
      .limit(20),
    supabase.from("danger_zones").select("*").eq("is_active", true),
  ]);
  return {
    capacity: capacity.data ?? [],
    hazards: hazards.data ?? [],
    dangerZones: dangerZones.data ?? [],
  };
}

export async function resolveHazard(id: string) {
  const { error } = await supabase
    .from("hazard_reports")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
