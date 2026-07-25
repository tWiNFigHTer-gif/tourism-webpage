/**
 * Terra-Pulse — Spatial Itinerary Generator Engine
 * 
 * Principal Backend & Spatial Data Engineering Utility
 * Designed for Next.js + Supabase Ecotourism MVP
 * 
 * Algorithmic Rules:
 * 1. Haversine Distance computation (Great-circle distance in kilometers)
 * 2. Hilly Terrain Speed: 35 km/h average
 * 3. Fixed Visit Duration: 2.5 hours per ecotourism location
 * 4. Max Daily Budget: 9.0 hours total (Travel Time + Visit Time)
 * 5. Greedy Search: Iteratively selects nearest unvisited spot fitting the day budget.
 */

export interface LocationRecord {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category?: string;
  district?: string;
  description?: string;
  [key: string]: any;
}

export interface DayItinerary {
  day: number;
  route: LocationRecord[];
  totalDistanceKm: number;
  totalTravelTimeHours: number;
  totalVisitTimeHours: number;
  totalTimeSpentHours: number;
}

// ── Constants & Configuration ───────────────────────────────────────────
const EARTH_RADIUS_KM = 6371;
const AVERAGE_SPEED_KMH = 35; // Hilly Western Ghats terrain average speed (km/h)
const VISIT_DURATION_HOURS = 2.5; // Fixed visit duration per spot (hours)
const DAILY_TIME_BUDGET_HOURS = 9.0; // Maximum daily time budget (hours)

/**
 * Standard Haversine formula to compute great-circle distance between two GPS coordinates in kilometers.
 * 
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in kilometers
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((EARTH_RADIUS_KM * c).toFixed(2));
}

/**
 * Greedy Spatial Multi-Day Itinerary Generator
 * 
 * Starting from an origin (lat/lng), iteratively finds the nearest unvisited location.
 * Pushes spots into daily buckets as long as (Travel Time + Visit Time) <= 9.0 Hours.
 * Closes the day when budget is exceeded and carries over starting location to next day.
 * 
 * @param originLat Origin latitude (tourist start point)
 * @param originLng Origin longitude (tourist start point)
 * @param locations Array of location objects from Supabase
 * @param days Integer number of trip days (1, 2, or 3)
 * @returns Array of structured day itineraries
 */
export function generateItinerary(
  originLat: number,
  originLng: number,
  locations: LocationRecord[],
  days: number = 1
): DayItinerary[] {
  if (!locations || locations.length === 0 || days < 1) {
    return [];
  }

  // Create mutable pool of unvisited spots
  const unvisited: LocationRecord[] = [...locations];
  const itinerary: DayItinerary[] = [];

  let currentLat = originLat;
  let currentLng = originLng;

  for (let currentDay = 1; currentDay <= days; currentDay++) {
    let dayTimeBudgetUsed = 0;
    let dayDistance = 0;
    let dayTravelTime = 0;
    let dayVisitTime = 0;
    const dayRoute: LocationRecord[] = [];

    while (unvisited.length > 0) {
      // 1. Greedy Search: Find nearest unvisited location from current position
      let nearestIndex = -1;
      let nearestDist = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const dist = calculateHaversineDistance(
          currentLat,
          currentLng,
          unvisited[i].lat,
          unvisited[i].lng
        );
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIndex = i;
        }
      }

      // If no valid candidates, terminate day loop
      if (nearestIndex === -1) break;

      const candidate = unvisited[nearestIndex];
      const travelTimeHours = nearestDist / AVERAGE_SPEED_KMH;
      const totalSpotTimeHours = travelTimeHours + VISIT_DURATION_HOURS;

      // 2. Budget Evaluation: Check if spot fits into current day's 9.0-hour budget
      if (dayTimeBudgetUsed + totalSpotTimeHours <= DAILY_TIME_BUDGET_HOURS) {
        // Fits within day budget -> append to day route
        dayRoute.push(candidate);
        dayDistance += nearestDist;
        dayTravelTime += travelTimeHours;
        dayVisitTime += VISIT_DURATION_HOURS;
        dayTimeBudgetUsed += totalSpotTimeHours;

        // Advance current location coordinate to candidate spot
        currentLat = candidate.lat;
        currentLng = candidate.lng;

        // Remove from unvisited pool
        unvisited.splice(nearestIndex, 1);
      } else {
        // Exceeds 9-hour daily budget
        if (dayRoute.length > 0) {
          // Close current day, reset budget, start next day from last visited spot
          break;
        } else {
          // Edge case: Nearest spot alone takes > 9h from origin. Add to avoid empty day and close day.
          dayRoute.push(candidate);
          dayDistance += nearestDist;
          dayTravelTime += travelTimeHours;
          dayVisitTime += VISIT_DURATION_HOURS;
          dayTimeBudgetUsed += totalSpotTimeHours;

          currentLat = candidate.lat;
          currentLng = candidate.lng;
          unvisited.splice(nearestIndex, 1);
          break;
        }
      }
    }

    // Wrap up current day itinerary
    if (dayRoute.length > 0) {
      itinerary.push({
        day: currentDay,
        route: dayRoute,
        totalDistanceKm: parseFloat(dayDistance.toFixed(1)),
        totalTravelTimeHours: parseFloat(dayTravelTime.toFixed(2)),
        totalVisitTimeHours: parseFloat(dayVisitTime.toFixed(1)),
        totalTimeSpentHours: parseFloat(dayTimeBudgetUsed.toFixed(2)),
      });
    }

    // Stop if all locations have been visited
    if (unvisited.length === 0) break;
  }

  return itinerary;
}
