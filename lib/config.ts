export interface TouristStartPoint {
  id: string
  name: string
  district: string
  lat: number
  lng: number
}

// Configurable Tourist Starting Points
export const TOURIST_START_POINTS: TouristStartPoint[] = [
  { id: "clt-station", name: "Kozhikode Railway Station", district: "Kozhikode", lat: 11.2480, lng: 75.7838 },
  { id: "clt-airport", name: "Calicut Airport (CCJ)", district: "Kozhikode", lat: 11.1368, lng: 75.9553 },
  { id: "clt-beach",   name: "Kozhikode Beach",           district: "Kozhikode", lat: 11.2612, lng: 75.7690 },
  { id: "wyd-kalpetta",name: "Wayanad Kalpetta Town",     district: "Wayanad",   lat: 11.6094, lng: 76.0829 },
  { id: "idk-munnar",  name: "Munnar Town Center",        district: "Idukki",    lat: 10.0889, lng: 77.0595 },
]

export const DEFAULT_START_POINT = TOURIST_START_POINTS[0]

export function buildGoogleMapsDirUrl(originLat: number, originLng: number, destLat: number, destLng: number): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}`
}
