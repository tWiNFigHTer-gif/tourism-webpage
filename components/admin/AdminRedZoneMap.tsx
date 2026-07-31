"use client";

import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RedZone } from "@/lib/types";

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
    description: "Lush mangrove ecosystem and canal walkway right in Kozhikode city featuring wooden boardwalks & butterfly park.",
  },
  {
    id: "kadalundi-birds",
    name: "Kadalundi Bird Sanctuary",
    lat: 11.1278,
    lng: 75.8286,
    category: "Estuary & Wildlife Reserve",
    description: "Serene estuarine sanctuary where Kadalundi River meets Arabian sea ideal for birdwatching and kayaking.",
  },
  {
    id: "janakikattu-eco",
    name: "Janakikattu Eco Tourism",
    lat: 11.6215,
    lng: 75.7892,
    category: "River Canopy & Forest Trail",
    description: "Protected evergreen forest ecosystem rich in medicinal flora along the Kuttiyadi riverbank.",
  },
  {
    id: "kakkayam-dam",
    name: "Kakkayam Dam & Reserve Peak",
    lat: 11.5542,
    lng: 75.9211,
    category: "Dam Reserve & Trekking Peak",
    description: "Picturesque dam site and waterfall trek in Kozhikode district surrounded by dense Malabar forests.",
  },
  {
    id: "vellar-craft",
    name: "Vellar Craft Village",
    lat: 8.3848,
    lng: 76.9859,
    category: "Artisan Hub & Cultural Plaza",
    description: "Dedicated artisan village in Kovalam showcasing traditional Kerala crafts, handlooms, and a Kalaripayattu academy.",
  },
  {
    id: "mavoor-wetlands",
    name: "Mavoor Wetlands & Bird Habitat",
    lat: 11.2619,
    lng: 75.9412,
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
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const polygonsRef = useRef<L.Polygon[]>([]);

  // Initialize Leaflet map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [11.28, 75.82],
      zoom: 10,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
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

  // Helper: build marker icon HTML for a destination
  const buildMarkerIcon = useCallback(
    (loc: TouristDestinationNode, isSelected: boolean, status: string) => {
      let statusColor = "#059669";
      let statusBg = "#ecfdf5";
      let statusBorder = "#a7f3d0";
      let icon = "location_on";

      if (status === "CRITICAL" || status === "HIGH") {
        statusColor = "#dc2626";
        statusBg = "#fef2f2";
        statusBorder = "#fecaca";
        icon = "warning";
      } else if (status === "WARNING" || status === "MEDIUM" || status === "LOW") {
        statusColor = "#d97706";
        statusBg = "#fffbe6";
        statusBorder = "#fde68a";
        icon = "priority_high";
      }

      const iconHtml = `
        <div style="
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px 4px 4px;
          border-radius: 20px;
          background: ${isSelected ? "#0F172A" : "#FFFFFF"};
          color: ${isSelected ? "#FFFFFF" : "#0F172A"};
          border: ${isSelected ? "2.5px solid #059669" : `1.5px solid ${statusBorder}`};
          box-shadow: ${isSelected ? "0 0 0 3px rgba(5,150,105,0.25), 0 4px 14px rgba(0,0,0,0.18)" : "0 4px 14px rgba(0,0,0,0.12)"};
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        ">
          <div style="
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: ${isSelected ? "#059669" : statusColor};
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          ">
            <span class="material-symbols-outlined" style="color: #FFFFFF; font-size: 14px; font-weight: 700;">
              ${isSelected ? "check_circle" : icon}
            </span>
          </div>
          <span style="font-family: 'Space Grotesk', sans-serif; font-size: 12px; font-weight: 700;">
            ${loc.name.split("&")[0].trim()}
          </span>
          <span style="
            font-family: 'JetBrains Mono', monospace;
            font-size: 9px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 8px;
            background: ${isSelected ? "rgba(5,150,105,0.15)" : statusBg};
            color: ${isSelected ? "#059669" : statusColor};
            border: 1px solid ${isSelected ? "#059669" : statusBorder};
          ">
            ${isSelected ? "SELECTED" : status}
          </span>
        </div>
      `;

      return L.divIcon({
        html: iconHtml,
        className: "custom-leaflet-admin-marker",
        iconSize: [160, 36],
        iconAnchor: [80, 18],
      });
    },
    []
  );

  // Update spot markers & red-zone polygons
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers & polygons
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};
    polygonsRef.current.forEach((p) => p.remove());
    polygonsRef.current = [];

    // Render Red Zone Polygons
    redZones.forEach((rz) => {
      if (rz.is_active === false) return;
      let coords: [number, number][] = [];

      if (rz.geojson_polygon?.coordinates?.[0]) {
        coords = rz.geojson_polygon.coordinates[0].map((pt: [number, number]) => [pt[1], pt[0]]);
      } else if (Array.isArray(rz.coordinates)) {
        coords = rz.coordinates.map((pt: any) => [pt.lat || pt[1], pt.lng || pt[0]]);
      }

      if (coords.length > 2) {
        const poly = L.polygon(coords, {
          color: "#dc2626",
          weight: 2,
          fillColor: "#ef4444",
          fillOpacity: 0.2,
          dashArray: "6, 6",
        }).addTo(map);

        poly.bindPopup(`
          <div style="padding: 4px; font-family: sans-serif;">
            <strong style="color: #dc2626;">HAZARD RED ZONE: ${rz.title || rz.name}</strong>
            <p style="margin: 4px 0 0; font-size: 11px; color: #475569;">${rz.description || "Active risk zone."}</p>
          </div>
        `);

        polygonsRef.current.push(poly);
      }
    });

    // Render Destination Markers
    DEMO_DESTINATIONS.forEach((loc) => {
      const activeZone = redZones.find(
        (rz) =>
          rz.is_active !== false &&
          (rz.risk_level as string) !== "RESOLVED" &&
          (rz.name?.toLowerCase().includes(loc.name.split(" ")[0].toLowerCase()) ||
            rz.description?.toLowerCase().includes(loc.name.split(" ")[0].toLowerCase()))
      );

      const status = activeZone ? (activeZone.risk_level as string) : "NORMAL";
      const isSelected = selectedLocationId === loc.id;

      const customIcon = buildMarkerIcon(loc, isSelected, status);
      const marker = L.marker([loc.lat, loc.lng], { icon: customIcon }).addTo(map);

      marker.on("click", () => {
        if (onSelectLocation) {
          onSelectLocation(loc);
        }
        map.flyTo([loc.lat, loc.lng], 13, { animate: true, duration: 0.8 });
      });

      markersRef.current[loc.id] = marker;
    });
  }, [redZones, selectedLocationId, onSelectLocation, buildMarkerIcon]);

  // Pan map to selected location when selectedLocationId changes (dropdown → map sync)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedLocationId) return;

    const loc = DEMO_DESTINATIONS.find((d) => d.id === selectedLocationId);
    if (loc) {
      map.flyTo([loc.lat, loc.lng], 13, { animate: true, duration: 0.8 });
    }
  }, [selectedLocationId]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 shadow-md bg-slate-50 min-h-[460px]">
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "460px",
        }}
      />
      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-lg border border-emerald-300 text-[11px] text-emerald-800 font-mono flex items-center gap-2 z-[1000] shadow-md">
        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
        Click any Tourist Destination Place Node to manage live hazard status
      </div>
    </div>
  );
}
