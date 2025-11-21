"use client";

import { useEffect } from "react";
import L from "leaflet";
import "leaflet.heat";
import { useMap } from "react-leaflet";

export default function HeatmapLayer({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const layer = L.heatLayer(points, {
      radius: 45,
      blur: 25,
      maxZoom: 15,
      minOpacity: 0.3,
      gradient: {
        0.2: "#ffe066",
        0.4: "#ffa94d",
        0.6: "#ff6b6b",
        0.9: "#d00000",
      },
    });

    layer.addTo(map);

    return () => {
      map.removeLayer(layer);
    };
  }, [map, points]);

  return null;
}
