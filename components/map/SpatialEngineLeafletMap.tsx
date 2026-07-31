"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RedZone } from "@/lib/types";

interface AttractionNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category?: string;
  description?: string;
}

interface SpatialEngineLeafletMapProps {
  attractions: AttractionNode[];
  redZones: RedZone[];
  selectedAttraction: AttractionNode | null;
  onSelectAttraction: (att: AttractionNode) => void;
  originPoint: [number, number]; // [lng, lat]
  simulatedRouteCoords: [number, number][] | null; // array of [lat, lng] pairs
  isRouteBlocked: boolean;
}

export default function SpatialEngineLeafletMap({
  attractions,
  redZones,
  selectedAttraction,
  onSelectAttraction,
  originPoint,
  simulatedRouteCoords,
  isRouteBlocked,
}: SpatialEngineLeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const originMarkerRef = useRef<L.Marker | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const polygonLayersRef = useRef<L.Polygon[]>([]);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  // Initialize Leaflet Map
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

  // Render Origin Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (originMarkerRef.current) {
      originMarkerRef.current.remove();
      originMarkerRef.current = null;
    }

    const originHtml = `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(59, 130, 246, 0.3); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: 22px; height: 22px; border-radius: 50%; background: #2563EB; border: 2px solid #FFFFFF; box-shadow: 0 0 12px rgba(37, 99, 235, 0.6); display: flex; align-items: center; justify-content: center; color: #FFFFFF; font-size: 11px; font-weight: 700;">
          📍
        </div>
      </div>
    `;

    const originIcon = L.divIcon({
      html: originHtml,
      className: "origin-marker-icon",
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    originMarkerRef.current = L.marker([originPoint[1], originPoint[0]], { icon: originIcon }).addTo(map);
    originMarkerRef.current.bindPopup(`
      <div style="padding: 4px; font-family: sans-serif;">
        <strong style="color: #2563EB;">YOUR ORIGIN POINT</strong>
        <p style="margin: 4px 0 0; font-size: 11px; color: #64748B;">Starting location for route safety check.</p>
      </div>
    `);
  }, [originPoint]);

  // Update Attraction Markers & Red Zone Polygons & Route Polyline
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing attraction markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    // Clear existing polygon overlays
    polygonLayersRef.current.forEach((p) => p.remove());
    polygonLayersRef.current = [];

    // Clear existing route polyline
    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }

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
          weight: 2.5,
          fillColor: "#ef4444",
          fillOpacity: 0.25,
          dashArray: "6, 6",
        }).addTo(map);

        poly.bindPopup(`
          <div style="padding: 4px; font-family: sans-serif;">
            <strong style="color: #dc2626;">HAZARD RED ZONE: ${rz.title || rz.name}</strong>
            <p style="margin: 4px 0 0; font-size: 11px; color: #475569;">${rz.description || "Active risk zone."}</p>
          </div>
        `);

        polygonLayersRef.current.push(poly);
      }
    });

    // Render Attraction Pin Markers
    attractions.forEach((att) => {
      const isSelected = selectedAttraction?.id === att.id;

      const markerHtml = `
        <div style="
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px 4px 4px;
          border-radius: 20px;
          background: ${isSelected ? "#0F172A" : "#FFFFFF"};
          color: ${isSelected ? "#FFFFFF" : "#0F172A"};
          border: 1.5px solid ${isSelected ? "#059669" : "#CBD5E1"};
          box-shadow: 0 4px 14px rgba(0,0,0,0.12);
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        ">
          <div style="
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #059669;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          ">
            <span class="material-symbols-outlined" style="color: #FFFFFF; font-size: 14px; font-weight: 700;">
              location_on
            </span>
          </div>
          <span style="font-family: 'Space Grotesk', sans-serif; font-size: 12px; font-weight: 700;">
            ${att.name.split("&")[0].trim()}
          </span>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: "spatial-attraction-marker",
        iconSize: [160, 36],
        iconAnchor: [80, 18],
      });

      const marker = L.marker([att.lat, att.lng], { icon: customIcon }).addTo(map);

      marker.on("click", () => {
        onSelectAttraction(att);
        map.setView([att.lat, att.lng], 12);
      });

      markersRef.current[att.id] = marker;
    });

    // Render Simulated Route Polyline
    if (simulatedRouteCoords && simulatedRouteCoords.length > 1) {
      const color = isRouteBlocked ? "#dc2626" : "#059669";
      const polyline = L.polyline(simulatedRouteCoords, {
        color: color,
        weight: 5,
        opacity: 0.8,
        dashArray: isRouteBlocked ? "8, 8" : undefined,
      }).addTo(map);

      routePolylineRef.current = polyline;
    }
  }, [attractions, redZones, selectedAttraction, simulatedRouteCoords, isRouteBlocked, onSelectAttraction]);

  return (
    <div className="relative w-full h-full min-h-screen">
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          minHeight: "100vh",
        }}
      />
    </div>
  );
}
