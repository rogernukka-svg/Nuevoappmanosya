"use client";

import { useMap } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";
import "leaflet.heat";

export default function HeatmapLayer({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const heat = L.heatLayer(points, {
      radius: 40,
      blur: 25,
      maxZoom: 15,
      gradient: {
        0.2: "#ffec99",
        0.4: "#ffc078",
        0.6: "#ff6b6b",
        0.9: "#c1121f",
      },
    });

    heat.addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [map, points]);

  return null;
}
