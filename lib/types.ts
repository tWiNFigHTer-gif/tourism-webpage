export type UserRole = "tourist" | "panchayat_admin" | "super_admin";

export interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: UserRole;
  panchayat_name: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Location {
  id: string;
  name: string;
  description: string;
  category: string;
  lat: number;
  lng: number;
  capacity_per_slot?: number;
  capacity_max?: number;
  panchayat_id?: string;
  region?: string;
  district?: string;
  image_url?: string;
  is_active?: boolean;
  status?: "active" | "hidden";
  updated_at?: string;
  rich_details?: LocationRichDetails;
  hazard_status?: "NORMAL" | "WARNING" | "CRITICAL";
  hazard_level?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | null;
  hazard_zone_ids?: string[];
  hazard_zone_names?: string[];
  hazard_exposure?: "none" | "near" | "inside";
  hazard_message?: string;
  hazard_distance_km?: number | null;
}

export interface KeralaResponsibleEnterprise {
  id: string;
  name: string;
  type: "honey_farm" | "spice_farm" | "handicraft" | "organic_eatery" | "community_homestay";
  title: string;
  description: string;
  image?: string;
  contact?: string;
  location_near?: string;
}

export interface LocalGuide {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  phone: string;
  languages: string[];
  experience_years: number;
}

export interface LocationRichDetails {
  local_enterprises?: KeralaResponsibleEnterprise[];
  local_guides?: LocalGuide[];
  eco_activities?: string[];
  souvenirs?: string[];
  travel_tips?: string[];
  emergency_contacts?: {
    forest_helpline: string;
    police_clinic: string;
  };
}

export interface DangerZone {
  id: string;
  name: string;
  geojson: GeoJSON.Feature | GeoJSON.FeatureCollection;
  severity: "low" | "medium" | "high" | "critical";
  panchayat_id: string;
}

export interface RedZone {
  id: string;
  name: string;
  title?: string;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  coordinates: [number, number][]; // [[lng, lat], ...]
  geojson_polygon?: any;
  is_active: boolean;
  created_by?: string;
  created_at?: string;
}

export interface Pass {
  id: string;
  location_id: string;
  time_slot: string;
  issued_at: string;
  panchayat_id: string;
}

export interface HazardReport {
  id: string;
  location_id?: string;
  location_name: string;
  category: string;
  description: string;
  reported_at: string;
  reporter_name?: string;
  lat: number;
  lng: number;
  status: "pending" | "in_progress" | "resolved";
  photo_url?: string;
  panchayat_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface CapacityStatus {
  location_id: string;
  time_slot: string;
  issued_count: number;
  capacity: number;
  is_full: boolean;
}

export interface TourismEvent {
  id: string;
  title: string;
  description: string | null;
  location_id: string | null;
  location_name: string | null;
  start_time: string;       // ISO 8601
  end_time: string | null;
  image_url: string | null;
  is_active: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LocalBusiness {
  id: string;
  name: string;
  category: "business" | "guide" | "homestay" | "handicraft" | "eatery" | "service";
  title: string | null;
  description: string | null;
  contact: string | null;
  location_id: string | null;
  location_name: string | null;
  status: "verified" | "pending" | "hidden";
  badge: string | null;
  icon: string | null;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}
