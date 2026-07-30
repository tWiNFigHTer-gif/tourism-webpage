"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { RedZone } from "@/lib/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

const isValidMapboxToken = (token?: string) =>
  Boolean(token && token.startsWith("pk.") && !token.includes("example") && !token.includes("your_"));

if (typeof window !== "undefined") {
  try {
    (mapboxgl as any).config = (mapboxgl as any).config || {};
    (mapboxgl as any).config.REQUIRE_ACCESS_TOKEN = false;
  } catch {}
}

const CARTO_DARK_STYLE: any = {
  version: 8,
  sources: {
    "carto-dark": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap &copy; CARTO",
    },
  },
  layers: [
    {
      id: "carto-dark-layer",
      type: "raster",
      source: "carto-dark",
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

export interface TouristDestinationNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  description: string;
}

export const DEMO_DESTINATIONS: TouristDestinationNode[] = [
  {
    id: "canoly-canal",
    name: "Canoly Canal & Sarovaram Eco Park",
    lat: 11.272,
    lng: 75.795,
    category: "Eco Park & Canal Walkway",
    description: "Lush mangrove ecosystem and canal walkway in Kozhikode city.",
  },
  {
    id: "kadalundi-birds",
    name: "Kadalundi Bird Sanctuary & Mangrove Trail",
    lat: 11.127,
    lng: 75.828,
    category: "Estuary & Wildlife Reserve",
    description: "Estuary mangrove reserve hosting migratory birds and tidal causeway.",
  },
  {
    id: "janakikattu-eco",
    name: "Janakikattu Eco Tourism & River Path",
    lat: 11.605,
    lng: 75.81,
    category: "River Canopy & Forest Trail",
    description: "Dense forest riverfront trail with bamboo footbridges.",
  },
  {
    id: "kakkayam-dam",
    name: "Kakkayam Dam & Elephant Corridor",
    lat: 11.55,
    lng: 75.92,
    category: "Dam Reserve & Trekking Peak",
    description: "High altitude dam viewpoint and Western Ghats wildlife corridor.",
  },
  {
    id: "vellar-village",
    name: "Vellar Craft Village & Cultural Park",
    lat: 11.23,
    lng: 75.78,
    category: "Artisan Hub & Cultural Plaza",
    description: "Traditional artisan craft village displaying indigenous Kerala handicrafts.",
  },
  {
    id: "mavoor-wetlands",
    name: "Mavoor Wetlands & Bird Habitat",
    lat: 11.26,
    lng: 75.91,
    category: "Wetland Ecology & Marshland",
    description: "Biodiverse marshland and wetland sanctuary for endemic waterfowl.",
  },
];

interface AdminRedZoneMapProps {
  redZones: RedZone[];
  selectedLocationId?: string;
  onSelectLocation?: (location: TouristDestinationNode) => void;
  activeCoords?: any;
  onPolygonCreated?: any;
}

export default function AdminRedZoneMap({
  redZones,
  selectedLocationId,
  onSelectLocation,
}: AdminRedZoneMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: CARTO_DARK_STYLE,
      center: [75.82, 11.35],
      zoom: 10,
      pitch: 20,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers & dynamic hazard status overlays
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    DEMO_DESTINATIONS.forEach((loc) => {
      // Find active red zone hazard matching this location name or coordinates
      const activeZone = redZones.find(
        (rz) =>
          rz.is_active !== false &&
          (rz.risk_level as string) !== "RESOLVED" &&
          (rz.name?.toLowerCase().includes(loc.name.split(" ")[0].toLowerCase()) ||
            rz.description?.toLowerCase().includes(loc.name.split(" ")[0].toLowerCase()))
      );

      const status = activeZone ? (activeZone.risk_level as string) : "NORMAL";
      const isSelected = selectedLocationId === loc.id;

      // Marker element
      const el = document.createElement("div");
      el.className = "cursor-pointer group flex flex-col items-center";

      let statusColor = "#10B981"; // Emerald Normal
      let statusBg = "rgba(16, 185, 129, 0.2)";
      let statusBorder = "rgba(78, 222, 163, 0.4)";
      let icon = "location_on";

      if (status === "CRITICAL" || status === "HIGH") {
        statusColor = "#EF4444";
        statusBg = "rgba(239, 68, 68, 0.25)";
        statusBorder = "rgba(239, 68, 68, 0.5)";
        icon = "warning";
      } else if (status === "WARNING" || status === "MEDIUM" || status === "LOW") {
        statusColor = "#F59E0B";
        statusBg = "rgba(245, 158, 11, 0.25)";
        statusBorder = "rgba(245, 158, 11, 0.5)";
        icon = "priority_high";
      }

      el.innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          background: ${isSelected ? "#0F172A" : "rgba(15, 23, 42, 0.85)"};
          border: 2px solid ${isSelected ? "#4EDEA3" : statusBorder};
          box-shadow: 0 0 16px ${statusBg};
          transition: all 0.2s ease;
        ">
          <span className="material-symbols-outlined" style="color: ${statusColor}; font-size: 16px;">
            ${icon}
          </span>
          <span style="font-family: 'Space Grotesk', sans-serif; font-size: 12px; font-weight: 700; color: #F8FAFC;">
            ${loc.name.split("&")[0].trim()}
          </span>
          <span style="
            font-family: 'JetBrains Mono', monospace;
            font-size: 9px;
            font-weight: 700;
            padding: 1px 6px;
            border-radius: 10px;
            background: ${statusBg};
            color: ${statusColor};
            border: 1px solid ${statusBorder};
          ">
            ${status}
          </span>
        </div>
      `;

      el.addEventListener("click", () => {
        if (onSelectLocation) {
          onSelectLocation(loc);
        }
        if (mapRef.current) {
          mapRef.current.flyTo({ center: [loc.lng, loc.lat], zoom: 12, pitch: 35 });
        }
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([loc.lng, loc.lat])
        .addTo(map);

      markersRef.current[loc.id] = marker;
    });
  }, [redZones, selectedLocationId, onSelectLocation]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-slate-950 min-h-[460px]">
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "460px",
        }}
      />
      <div className="absolute bottom-3 left-3 bg-[#0F172A]/90 backdrop-blur-md px-3.5 py-2 rounded-lg border border-emerald-500/30 text-[11px] text-emerald-400 font-mono flex items-center gap-2 z-10 shadow-lg">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        Click any Tourist Destination Place Node to manage live hazard status
      </div>
    </div>
  );
}
