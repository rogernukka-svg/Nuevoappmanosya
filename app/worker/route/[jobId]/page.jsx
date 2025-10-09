'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/lib/supabase';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer    = dynamic(() => import('react-leaflet').then(m => m.TileLayer),    { ssr: false });
const Marker       = dynamic(() => import('react-leaflet').then(m => m.Marker),       { ssr: false });
const Polyline     = dynamic(() => import('react-leaflet').then(m => m.Polyline),     { ssr: false });
const Tooltip      = dynamic(() => import('react-leaflet').then(m => m.Tooltip),      { ssr: false });

const ORS_KEY = process.env.NEXT_PUBLIC_ORS_API_KEY;

// 🔹 Icono circular
function avatarIcon(url) {
  if (typeof window === 'undefined') return null;
  const L = require('leaflet');
  return L.divIcon({
    html: `<div style="width:40px;height:40px;border-radius:50%;overflow:hidden;border:2px solid #14B8A6">
             <img src="${url || '/avatar-fallback.png'}" style="width:100%;height:100%;object-fit:cover"/>
           </div>`,
    className: '',
    iconSize: [40, 40]
  });
}

export default function WorkerRoutePage() {
  const { jobId } = useParams(); // ⬅️ lee el id desde la URL
  const [workerPos, setWorkerPos] = useState(null);
  const [clientPos, setClientPos] = useState(null);
  const [route, setRoute] = useState([]);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [arrived, setArrived] = useState(false);

  // 🔹 Cargar datos del job
  useEffect(() => {
    async function fetchJob() {
      if (!jobId) return;
      const { data, error } = await supabase
        .from('jobs')
        .select('id, status, client_lat, client_lng, worker_id')
        .eq('id', jobId)
        .single();

      if (error) {
        console.error("Error cargando job:", error);
      } else if (data) {
        if (data.client_lat && data.client_lng) {
          setClientPos({ lat: data.client_lat, lng: data.client_lng });
        }
      }
    }
    fetchJob();
  }, [jobId]);

  // 🔹 Pedir ruta al ORS
  async function fetchRoute(from, to) {
    try {
      const res = await fetch(
        `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_KEY}&start=${from.lng},${from.lat}&end=${to.lng},${to.lat}`
      );
      const data = await res.json();

      const coords = data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
      setRoute(coords);

      const meters  = data.features[0].properties.segments[0].distance;
      const seconds = data.features[0].properties.segments[0].duration;

      setDistance((meters / 1000).toFixed(1));
      setEta(Math.round(seconds / 60));
    } catch (err) {
      console.error('Error ruta ORS:', err);
    }
  }

  // 🔹 Seguir GPS del trabajador
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setWorkerPos(newPos);

        if (jobId) {
          await supabase
            .from('jobs')
            .update({
              worker_lat: newPos.lat,
              worker_lng: newPos.lng,
              status: 'on_route'
            })
            .eq('id', jobId);
        }

        if (clientPos) fetchRoute(newPos, clientPos);
      },
      (err) => console.error('GPS error:', err),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [clientPos, jobId]);

  // 🔹 Actualizar ruta cada 5s
  useEffect(() => {
    if (!workerPos || !clientPos) return;
    const interval = setInterval(() => fetchRoute(workerPos, clientPos), 5000);
    return () => clearInterval(interval);
  }, [workerPos, clientPos]);

  // 🔹 Llegada al cliente
  async function handleArrived() {
    setArrived(true);
    alert('Has marcado que llegaste al cliente 🚀');
    if (jobId) {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'arrived' })
        .eq('id', jobId);
      if (error) console.error('Error actualizando job:', error);
    }
  }

  return (
    <div className="container">
      <h1 className="text-xl font-bold mb-3">Ruta hacia el cliente</h1>
      <div style={{ height: '70vh' }} className="rounded-xl overflow-hidden relative">
        {workerPos && clientPos && (
          <MapContainer center={workerPos} zoom={14} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={workerPos} icon={avatarIcon('/avatar-worker.png')}>
              <Tooltip>Tu ubicación</Tooltip>
            </Marker>
            <Marker position={clientPos} icon={avatarIcon('/avatar-client.png')}>
              <Tooltip>Cliente</Tooltip>
            </Marker>
            {route.length > 0 && (
              <Polyline positions={route} pathOptions={{ color: '#14B8A6', weight: 5 }} />
            )}
          </MapContainer>
        )}
        {eta !== null && distance !== null && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900/90 border border-white/10 rounded-2xl px-5 py-4 text-center shadow-xl w-[90%] max-w-md">
            {!arrived ? (
              <>
                <div className="font-bold text-lg text-white">🚗 En camino</div>
                <div className="text-sm text-white/80 mb-3">
                  {distance} km • {eta} min aprox
                </div>
                <button
                  onClick={handleArrived}
                  className="btn btn-primary w-full py-2 rounded-lg"
                >
                  ✅ Llegué
                </button>
              </>
            ) : (
              <div className="text-green-400 font-semibold">Has llegado al destino ✅</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
