"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RedZone } from "@/lib/types";

export default function AdminRedZoneMap({
  redZones,
  activeCoords,
}: {
  redZones: RedZone[];
  activeCoords: [number, number][];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Initialize Leaflet map centered at Kozhikode / Canoly Canal area
    const map = L.map(containerRef.current, {
      center: [11.252, 75.772],
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing layers
    map.eachLayer((layer) => {
      if (layer instanceof L.Polygon || layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Draw active published Red Zones
    redZones.forEach((rz) => {
      if (rz.coordinates && rz.coordinates.length > 0) {
        // Leaflet requires [lat, lng] format
        const leafletLatLngs: [number, number][] = rz.coordinates.map(([lng, lat]) => [lat, lng]);
        const polygon = L.polygon(leafletLatLngs, {
          color: "#EF4444",
          fillColor: "#EF4444",
          fillOpacity: 0.35,
          weight: 2,
          dashArray: "4, 4",
        }).addTo(map);

        polygon.bindPopup(`
          <div style="color: #000; font-family: sans-serif;">
            <strong style="color: #EF4444;">${rz.name}</strong><br/>
            <small>Risk: ${rz.risk_level}</small><br/>
            <span>${rz.description}</span>
          </div>
        `);
      }
    });
  }, [redZones, activeCoords]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "440px",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    />
  );
}
