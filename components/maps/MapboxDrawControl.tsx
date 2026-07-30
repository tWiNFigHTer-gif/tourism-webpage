"use client";

import { useControl } from "react-map-gl/mapbox";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

interface MapboxDrawControlProps {
  onPolygonCreated?: (feature: any, coords: [number, number][]) => void;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

export function MapboxDrawControl(props: MapboxDrawControlProps) {
  const draw = useControl<MapboxDraw>(
    () =>
      new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: true,
          trash: true,
        },
        defaultMode: "draw_polygon",
      }),
    ({ map }) => {
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
              if (props.onPolygonCreated) {
                props.onPolygonCreated(feature, coords);
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
    },
    {
      position: props.position || "top-left",
    }
  );

  return null;
}

export default MapboxDrawControl;
