'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then(m => m.Circle), { ssr: false });

import L from 'leaflet';

const defaultIcon = L.icon({
  iconUrl: '/pin-green.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

export default function WorkerDemandMap({ hotspots = [] }) {
  return (
    <div className="w-full h-64 rounded-2xl overflow-hidden shadow-lg border">
      <MapContainer
        center={[-25.51, -54.61]} // CDE por defecto
        zoom={12}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 🔥 Hotspots de demanda (círculos de intensidad) */}
        {hotspots.map((p, i) => (
          <Circle
            key={i}
            center={[p.lat, p.lng]}
            radius={p.intensity * 120} // cuanto mayor, más grande
            pathOptions={{
              color: p.intensity > 6 ? "red" : "orange",
              fillColor: p.intensity > 6 ? "red" : "orange",
              fillOpacity: 0.35
            }}
          />
        ))}

        {/* 📍 Marcadores estratégicos */}
        {hotspots.map((p, i) => (
          <Marker key={`mk-${i}`} position={[p.lat, p.lng]} icon={defaultIcon}>
            <Popup>
              <strong>{p.name}</strong><br />
              Nivel de demanda: {p.intensity}/10
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
