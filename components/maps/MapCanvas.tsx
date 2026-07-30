"use client";

import React, { forwardRef, useEffect } from "react";
import Map, { NavigationControl } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

import mapboxgl from "mapbox-gl";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

const isValidMapboxToken = (token?: string) =>
  Boolean(token && token.startsWith("pk.") && !token.includes("example") && !token.includes("your_"));

if (typeof window !== "undefined") {
  try {
    (mapboxgl as any).config = (mapboxgl as any).config || {};
    (mapboxgl as any).config.REQUIRE_ACCESS_TOKEN = false;
  } catch {}
}

// Carto Dark Matter raster style fallback for offline/demo/invalid tokens
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

export interface SharedMapCanvasProps {
  initialViewState?: {
    longitude: number;
    latitude: number;
    zoom: number;
    pitch?: number;
    bearing?: number;
  };
  mapStyle?: string | any;
  mapboxAccessToken?: string;
  onClick?: (e: any) => void;
  onLoad?: (e: any) => void;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  showNavigationControl?: boolean;
}

export const MapCanvas = forwardRef<MapRef, SharedMapCanvasProps>(function MapCanvas(
  {
    initialViewState = { longitude: 75.85, latitude: 11.35, zoom: 9.5, pitch: 25 },
    mapStyle = CARTO_DARK_STYLE,
    mapboxAccessToken = MAPBOX_TOKEN,
    onClick,
    onLoad,
    children,
    className = "w-full h-full relative",
    style = { width: "100%", height: "100%" },
    showNavigationControl = true,
  },
  ref
) {
  const activeStyle = CARTO_DARK_STYLE;

  return (
    <div className={className} style={style}>
      <Map
        ref={ref}
        initialViewState={initialViewState}
        style={{ width: "100%", height: "100%" }}
        mapStyle={activeStyle}
        mapboxAccessToken={mapboxAccessToken || MAPBOX_TOKEN}
        onClick={onClick}
        onLoad={onLoad}
      >
        {showNavigationControl && (
          <NavigationControl position="top-left" style={{ marginTop: "12px" }} />
        )}
        {children}
      </Map>
    </div>
  );
});

export default MapCanvas;
