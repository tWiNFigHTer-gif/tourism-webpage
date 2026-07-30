"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import type { RedZone } from "@/lib/types";

const MAPBOX_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
  "pk.eyJ1IjoibWFwYm94ZXhhbXBsZSIsImEiOiJja2J4Ynh4eHhhM3V4MnFwZzJ5ZzJ5ZzJ5In0.example";

const isValidMapboxToken = (token?: string) =>
  Boolean(token && token.startsWith("pk.") && !token.includes("example") && !token.includes("your_"));

if (typeof window !== "undefined") {
  try {
    const origError = console.error;
    console.error = (...args: any[]) => {
      if (
        typeof args[0] === "string" &&
        (args[0].includes("A valid Mapbox access token is required") || args[0].includes("mapbox.com"))
      ) {
        return;
      }
      origError.apply(console, args);
    };
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

interface AdminRedZoneMapProps {
  redZones: RedZone[];
  activeCoords?: [number, number][];
  onPolygonCreated?: (feature: any, coords: [number, number][]) => void;
}

export default function AdminRedZoneMap({
  redZones,
  activeCoords,
  onPolygonCreated,
}: AdminRedZoneMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const tokenValid = isValidMapboxToken(MAPBOX_TOKEN);
    try {
      (mapboxgl as any).config = (mapboxgl as any).config || {};
      if (!tokenValid) {
        (mapboxgl as any).config.REQUIRE_ACCESS_TOKEN = false;
        const origError = console.error;
        console.error = (...args: any[]) => {
          if (
            typeof args[0] === "string" &&
            args[0].includes("A valid Mapbox access token is required")
          ) {
            return;
          }
          origError.apply(console, args);
        };
      }
    } catch {}

    mapboxgl.accessToken = tokenValid
      ? MAPBOX_TOKEN
      : "pk.eyJ1IjoibWFwYm94ZXhhbXBsZSIsImEiOiJja2J4Ynh4eHhhM3V4MnFwZzJ5ZzJ5ZzJ5In0.example";

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: tokenValid ? "mapbox://styles/mapbox/navigation-night-v1" : CARTO_DARK_STYLE,
      center: [75.775, 11.252], // Kozhikode / Canoly Canal region
      zoom: 13,
      pitch: 20,
    });

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      defaultMode: "draw_polygon",
    });

    map.addControl(draw, "top-left");
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    drawRef.current = draw;
    mapRef.current = map;

    const handleDrawChange = () => {
      const data = draw.getAll();
      if (data.features.length > 0) {
        const feature = data.features[data.features.length - 1];
        if (feature.geometry && feature.geometry.type === "Polygon") {
          let coords = feature.geometry.coordinates[0] as [number, number][];
          if (coords.length >= 3) {
            // Ensure closed polygon shape ring
            const first = coords[0];
            const last = coords[coords.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) {
              coords = [...coords, first];
            }
            if (onPolygonCreated) {
              onPolygonCreated(feature, coords);
            }
          }
        }
      }
    };

    map.on("draw.create", handleDrawChange);
    map.on("draw.update", handleDrawChange);
    map.on("draw.delete", handleDrawChange);
    map.on("draw.modechange", (e: any) => {
      if (e.mode === "simple_select" || e.mode === "direct_select") {
        handleDrawChange();
      }
    });
    map.on("dblclick", () => {
      setTimeout(handleDrawChange, 50);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
    };
  }, [onPolygonCreated]);

  // Load existing red zones onto the map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.on("load", () => {
      renderRedZoneLayers();
    });

    if (map.isStyleLoaded()) {
      renderRedZoneLayers();
    }

    function renderRedZoneLayers() {
      if (!map) return;
      redZones.forEach((rz, idx) => {
        const sourceId = `admin-rz-src-${rz.id || idx}`;
        const fillId = `admin-rz-fill-${rz.id || idx}`;
        const lineId = `admin-rz-line-${rz.id || idx}`;

        let geojson: GeoJSON.Feature<GeoJSON.Polygon> | null = null;

        if (rz.geojson_polygon) {
          geojson = rz.geojson_polygon as any;
        } else if (rz.coordinates && rz.coordinates.length > 0) {
          geojson = {
            type: "Feature",
            properties: { title: rz.name || rz.title, risk_level: rz.risk_level },
            geometry: {
              type: "Polygon",
              coordinates: [rz.coordinates],
            },
          };
        }

        if (geojson) {
          if (map.getSource(sourceId)) {
            (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(geojson);
          } else {
            map.addSource(sourceId, { type: "geojson", data: geojson });
            map.addLayer({
              id: fillId,
              type: "fill",
              source: sourceId,
              paint: {
                "fill-color": "#EF4444",
                "fill-opacity": 0.25,
              },
            });
            map.addLayer({
              id: lineId,
              type: "line",
              source: sourceId,
              paint: {
                "line-color": "#EF4444",
                "line-width": 2,
                "line-dasharray": [3, 3],
              },
            });
          }
        }
      });
    }
  }, [redZones]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-slate-950 min-h-[460px]">
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "460px",
        }}
      />
      <div className="absolute bottom-3 left-3 bg-[#0F172A]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-emerald-500/30 text-[11px] text-emerald-400 font-mono flex items-center gap-2 z-10">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        Double-click nodes to complete &amp; fix shape as zone polygon
      </div>
    </div>
  );
}
