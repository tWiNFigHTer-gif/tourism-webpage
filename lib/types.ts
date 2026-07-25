export interface Location {
  id: string;
  name: string;
  description: string;
  category: string;
  lat: number;
  lng: number;
  capacity_per_slot: number;
  panchayat_id: string;
}

export interface DangerZone {
  id: string;
  name: string;
  geojson: GeoJSON.Feature | GeoJSON.FeatureCollection;
  severity: "low" | "medium" | "high" | "critical";
  panchayat_id: string;
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
  location_id: string;
  category: string;
  description: string;
  reported_at: string;
  panchayat_id: string;
}

export interface CapacityStatus {
  location_id: string;
  time_slot: string;
  issued_count: number;
  capacity: number;
  is_full: boolean;
}
