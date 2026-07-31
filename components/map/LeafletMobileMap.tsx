"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapLocation {
  id: string;
  name: string;
  region: string;
  district: string;
  zone: string;
  category: string;
  lat: number;
  lng: number;
  active: boolean;
  capacity: { current: number; total: number };
  description: string;
  distance: string;
  image: string;
  hazard_status?: "NORMAL" | "WARNING" | "CRITICAL";
  hazard_level?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | null;
  hazard_zone_ids?: string[];
  hazard_zone_names?: string[];
  hazard_exposure?: "none" | "near" | "inside";
  hazard_message?: string;
  hazard_distance_km?: number | null;
}

interface LeafletMobileMapProps {
  locations: MapLocation[];
  selectedLocation: MapLocation | null;
  onSelectLocation: (loc: MapLocation) => void;
  itineraryRoute: [number, number][]; // lat/lng pairs for connected route line
  startPoint?: { name: string; lat: number; lng: number } | null;
}

export default function LeafletMobileMap({
  locations,
  selectedLocation,
  onSelectLocation,
  itineraryRoute,
  startPoint,
}: LeafletMobileMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});
  const startMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Initialize Leaflet map with CartoDB Dark tiles
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialLat = startPoint
      ? startPoint.lat
      : selectedLocation
      ? selectedLocation.lat
      : 11.248;
    const initialLng = startPoint
      ? startPoint.lng
      : selectedLocation
      ? selectedLocation.lng
      : 75.7838;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 10,
      zoomControl: false,
      scrollWheelZoom: true,
      touchZoom: true,
      dragging: true,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }
    ).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update tourist start location marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (startMarkerRef.current) {
      startMarkerRef.current.remove();
      startMarkerRef.current = null;
    }

    if (startPoint) {
      const startHtml = `
        <div class="relative flex items-center justify-center">
          <div class="absolute h-8 w-8 rounded-full bg-blue-500/20 animate-ping"></div>
          <div class="h-5 w-5 rounded-full border-2 border-blue-400 bg-blue-500 shadow-[0_0_12px_#3b82f6] flex items-center justify-center text-[10px] font-bold text-white">
            🚩
          </div>
          <div class="absolute top-6 whitespace-nowrap rounded border border-blue-500/30 bg-[#0c2132]/95 px-2 py-0.5 text-[10px] font-bold text-blue-300 shadow-lg">
            START: ${startPoint.name.split(" ")[0]}
          </div>
        </div>
      `;

      const startIcon = L.divIcon({
        html: startHtml,
        className: "custom-leaflet-start-marker",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      startMarkerRef.current = L.marker([startPoint.lat, startPoint.lng], {
        icon: startIcon,
      }).addTo(map);
    }
  }, [startPoint]);

  // Update spot markers when locations list changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    locations.forEach((loc) => {
      const isSelected = selectedLocation?.id === loc.id;

      const customHtml = `
        <div class="relative flex items-center justify-center group">
          ${
            isSelected || loc.active
              ? '<div class="absolute h-8 w-8 rounded-full bg-emerald-500/20 animate-ping"></div>'
              : ""
          }
          <div class="h-4 w-4 rounded-full border-2 ${
            isSelected
              ? "border-emerald-400 bg-emerald-400 shadow-[0_0_12px_#10b981]"
              : "border-emerald-500/60 bg-emerald-950"
          } flex items-center justify-center">
            <div class="h-1.5 w-1.5 rounded-full ${
              isSelected ? "bg-white" : "bg-emerald-400"
            }"></div>
          </div>
          <div class="absolute top-5 flex items-center gap-1 whitespace-nowrap rounded border border-white/10 bg-[#111820]/95 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-md backdrop-blur-xs">
            <span>${loc.name.split(" ")[0]}</span>
            <span class="text-[9px] text-emerald-400 font-semibold">${
              loc.distance
            }</span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: customHtml,
        className: "custom-leaflet-marker",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([loc.lat, loc.lng], { icon: customIcon }).addTo(
        map
      );

      marker.on("click", () => {
        onSelectLocation(loc);
      });

      markersRef.current[loc.id] = marker;
    });
  }, [locations, selectedLocation, onSelectLocation]);

  // Update connected trip route line
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (itineraryRoute && itineraryRoute.length > 1) {
      const polyline = L.polyline(itineraryRoute, {
        color: "#4edea3",
        weight: 3.5,
        dashArray: "6, 8",
        opacity: 0.95,
      }).addTo(map);

      polylineRef.current = polyline;
      map.fitBounds(polyline.getBounds(), { padding: [60, 60] });
    }
  }, [itineraryRoute]);

  // Center map on selected location
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedLocation) return;
    map.panTo([selectedLocation.lat, selectedLocation.lng], { animate: true });
  }, [selectedLocation]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainerRef} className="h-full w-full z-0" />
      <style>{`
        .custom-leaflet-marker, .custom-leaflet-start-marker {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-container {
          background-color: #0a0e13 !important;
          font-family: var(--font-inter), sans-serif;
        }
        .leaflet-control-attribution {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
