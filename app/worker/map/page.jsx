"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import "leaflet/dist/leaflet.css";
let L;
if (typeof window !== "undefined") {
  L = require("leaflet");
}


// Heatmap (solo cliente)
const HeatmapLayer = dynamic(() => import("@/components/HeatmapLayer"), {
  ssr: false,
});

// React-Leaflet dinámico
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
);

export default function WorkerFullMap() {
  const router = useRouter();
  const mapRef = useRef(null);

  const [selectedSpot, setSelectedSpot] = useState(null);
  const [showModal, setShowModal] = useState(true);

  // 🔥 TODAS LAS ZONAS (AJUSTAR COORDENADAS CON GOOGLE MAPS PARA MÁXIMA PRECISIÓN)
  const HOTSPOTS = [
    { name: "Shopping Paris", lat: -25.5093, lng: -54.6111, intensity: 9 },
    { name: "Shopping China", lat: -25.5091, lng: -54.6102, intensity: 9 },
    { name: "Monalisa", lat: -25.5101, lng: -54.6120, intensity: 8 },
    { name: "Microcentro CDE", lat: -25.5160, lng: -54.6118, intensity: 10 },
    { name: "Km 4", lat: -25.5039, lng: -54.6350, intensity: 7 },
    { name: "Km 7", lat: -25.4812, lng: -54.6250, intensity: 8 },
    { name: "Km 8", lat: -25.4750, lng: -54.6350, intensity: 6 },
    { name: "Km 9 Monday", lat: -25.4670, lng: -54.6420, intensity: 6 },
    { name: "Barrio Boquerón", lat: -25.5290, lng: -54.6078, intensity: 7 },
    { name: "Barrio Obrero", lat: -25.5247, lng: -54.6172, intensity: 6 },
    { name: "Área 1 Minga", lat: -25.4974, lng: -54.6621, intensity: 8 },
    { name: "Área 2 Minga", lat: -25.5020, lng: -54.6710, intensity: 7 },
    { name: "Km 14 Monday", lat: -25.4370, lng: -54.7120, intensity: 6 },
    { name: "Centro Minga", lat: -25.5085, lng: -54.6398, intensity: 7 },
    { name: "Aviación Minga", lat: -25.4950, lng: -54.6480, intensity: 7 },
    { name: "Costanera Hernandarias", lat: -25.4052, lng: -54.6424, intensity: 7 },
    { name: "Centro Hernandarias", lat: -25.4062, lng: -54.6400, intensity: 8 },
    { name: "UNINTER Hernandarias", lat: -25.4300, lng: -54.6350, intensity: 6 },
    { name: "Itaipú Acceso 1", lat: -25.4105, lng: -54.5895, intensity: 8 },
    { name: "Centro Franco", lat: -25.5580, lng: -54.6130, intensity: 7 },
    { name: "Río Monday", lat: -25.5540, lng: -54.6200, intensity: 6 },
    { name: "Fracción San Agustín", lat: -25.5480, lng: -54.5950, intensity: 7 },
    { name: "Shopping del Sol", lat: -25.2914, lng: -57.5802, intensity: 10 },
    { name: "Shopping Mariscal", lat: -25.2989, lng: -57.5889, intensity: 9 },
    { name: "Villa Morra", lat: -25.2972, lng: -57.5820, intensity: 8 },
    { name: "Las Lomas", lat: -25.2849, lng: -57.5660, intensity: 7 },
    { name: "Centro Asunción", lat: -25.2836, lng: -57.6359, intensity: 9 },
    { name: "Avenida Eusebio Ayala", lat: -25.3026, lng: -57.5837, intensity: 9 },
    { name: "San Lorenzo Centro", lat: -25.3401, lng: -57.5078, intensity: 8 },
    { name: "Universidad Nacional (UNA)", lat: -25.3385, lng: -57.5088, intensity: 7 },
    { name: "Luque Centro", lat: -25.3204, lng: -57.4906, intensity: 7 },
    { name: "Aeropuerto Silvio Pettirossi", lat: -25.2401, lng: -57.5139, intensity: 10 },
    { name: "Zona Norte - Fdo", lat: -25.3070, lng: -57.5270, intensity: 7 },
    { name: "Zona Sur - Fdo", lat: -25.3250, lng: -57.5310, intensity: 6 },
    { name: "Lambaré Centro", lat: -25.3450, lng: -57.6060, intensity: 7 },
    { name: "Yacht y Golf Club", lat: -25.3647, lng: -57.6004, intensity: 8 },
    { name: "Ñemby Centro", lat: -25.3940, lng: -57.5350, intensity: 7 },
    { name: "Limpio Centro", lat: -25.1590, lng: -57.4850, intensity: 6 },
  ];

  const heatPoints = HOTSPOTS.map((p) => [p.lat, p.lng, p.intensity / 10]);

  // 🔥 Función al seleccionar una zona
  const goToZone = (spot) => {
    setSelectedSpot(spot);
    setShowModal(false);

    setTimeout(() => {
      if (mapRef.current) {
        // ✅ Animación suave y zoom a la zona elegida
        mapRef.current.flyTo([spot.lat, spot.lng], 15, {
          duration: 1.4,
        });
      }
    }, 250);
  };

  return (
    <div className="w-full h-screen flex flex-col">

      {/* HEADER */}
      <header className="safe-top w-full bg-white/95 backdrop-blur-sm shadow-sm z-[999]">
        <div className="relative flex items-center justify-between px-4 py-4">

          <button
            onClick={() => router.push("/worker")}
            className="flex items-center gap-2 text-emerald-600 font-semibold active:scale-95 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15 19l-7-7 7-7"/>
            </svg>
            <span className="text-base">Volver</span>
          </button>

          <h2 className="absolute left-1/2 -translate-x-1/2 font-extrabold text-emerald-600 text-lg tracking-wide">
            Zonas activas
          </h2>

          <span className="opacity-0 w-16 select-none">x</span>
        </div>
      </header>

      {/* MAPA */}
      <div className="flex-1">
        <MapContainer
          whenCreated={(map) => (mapRef.current = map)}
          center={[-25.5093, -54.6111]}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
          <HeatmapLayer points={heatPoints} />

          {/* 🔥 MARCADOR PREMIUM SIN IMAGEN FEA */}
          {selectedSpot && (
            <Marker
              position={[selectedSpot.lat, selectedSpot.lng]}
              icon={L.divIcon({
                className: "custom-spot-marker",
                iconSize: [22, 22],
                popupAnchor: [0, -10],
              })}
            >
              <Popup autoPan={true} closeButton={false} autoClose={false}>
                <div className="font-bold text-gray-800 text-center">
                  {selectedSpot.name}
                </div>
              </Popup>
            </Marker>
          )}

        </MapContainer>
      </div>

      {/* BOTÓN MODAL */}
      <button
        onClick={() => setShowModal(true)}
        className="
          absolute bottom-6 left-1/2 -translate-x-1/2 
          bg-emerald-600 text-white font-bold 
          px-6 py-3 rounded-full shadow-lg 
          active:scale-95 transition z-[999]
        "
      >
        Ver zonas activas
      </button>

      {/* MODAL */}
      {showModal && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-end z-[9999]">
          <div className="w-full bg-white rounded-t-2xl p-6 shadow-xl max-h-[60%] overflow-y-auto animate-slide-up">

            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-emerald-600">
                Seleccioná una zona
              </h3>

              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {HOTSPOTS.map((h, i) => (
                <button
                  key={i}
                  onClick={() => goToZone(h)}
                  className="
                    bg-emerald-100 text-emerald-700 
                    px-3 py-2 rounded-xl font-semibold 
                    text-sm active:scale-95 hover:bg-emerald-200 
                    transition text-center shadow-sm
                  "
                >
                  {h.name}
                </button>
              ))}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
