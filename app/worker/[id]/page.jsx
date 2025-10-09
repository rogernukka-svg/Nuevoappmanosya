'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/lib/supabase';

// ====== React Leaflet dinámico ======
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(m => m.Tooltip), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false });

const ORS_KEY = process.env.NEXT_PUBLIC_ORS_KEY;

/* ====== Función de voz ====== */
function speak(text) {
  if (typeof window === 'undefined') return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-ES';
  utterance.pitch = 1;
  utterance.rate = 1;
  utterance.volume = 1;
  window.speechSynthesis.cancel(); // cortar voces anteriores
  window.speechSynthesis.speak(utterance);
}

/* ====== Badge de estado ====== */
function StatusBadge({ status }) {
  const map = {
    open: { text: '📦 Esperando asignación', cls: 'bg-white/10 text-white' },
    assigned: { text: '🧭 Asignado', cls: 'bg-emerald-500 text-black' },
    on_route: { text: '🚗 En camino', cls: 'bg-cyan-400 text-black' },
    arrived: { text: '📍 Llegó al destino', cls: 'bg-indigo-400 text-black' },
    done: { text: '✅ Completado', cls: 'bg-emerald-400 text-black' },
    canceled: { text: '❌ Cancelado', cls: 'bg-red-500 text-black' },
  };
  const s = map[status] || { text: status || '—', cls: 'bg-white/10 text-white' };
  return <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${s.cls}`}>{s.text}</span>;
}

/* ====== Distancia Haversine ====== */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ====== Página ====== */
export default function JobPage() {
  const { id: jobId } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [workerCoords, setWorkerCoords] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);

  // ====== Carga inicial ======
  useEffect(() => {
    if (!jobId) return;
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.from('jobs').select('*').eq('id', jobId).maybeSingle();
        if (error) throw error;
        if (!data) throw new Error('Trabajo no encontrado');
        setJob(data);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId]);

  // ====== Realtime ======
  useEffect(() => {
    if (!jobId) return;
    const channel = supabase
      .channel(`job-${jobId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'jobs', filter: `id=eq.${jobId}` },
        (payload) => {
          const j = payload.new;
          setJob(j);

          // Actualización de voz automática
          if (j.status === 'arrived') speak('Has llegado al cliente.');
          if (j.status === 'done') speak('Trabajo completado con éxito.');
          if (j.status === 'canceled') speak('Atención. El trabajo ha sido cancelado.');

          if (j.worker_lat && j.worker_lng) {
            const coords = { lat: j.worker_lat, lon: j.worker_lng };
            setWorkerCoords(coords);
            if (j.lat && j.lon) fetchRoute(coords, { lat: j.lat, lon: j.lon });
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [jobId]);

  // ====== Ruta con OpenRouteService ======
  async function fetchRoute(from, to) {
    try {
      const res = await fetch(
        `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_KEY}&start=${from.lon},${from.lat}&end=${to.lon},${to.lat}`
      );
      const data = await res.json();
      const coords = data.features[0].geometry.coordinates.map((c) => [c[1], c[0]]);
      setRouteCoords(coords);

      const meters = data.features[0].properties.segments[0].distance;
      const seconds = data.features[0].properties.segments[0].duration;
      setDistance((meters / 1000).toFixed(1));
      setEta(Math.round(seconds / 60));
    } catch (e) {
      console.error('Error ORS:', e);
    }
  }

  const hasCoords = useMemo(() => typeof job?.lat === 'number' && typeof job?.lon === 'number', [job]);

  // ====== Acciones ======
  async function markArrived() {
    await supabase.from('jobs').update({ status: 'arrived' }).eq('id', jobId);
    setJob((p) => ({ ...p, status: 'arrived' }));
    speak('Has marcado tu llegada al cliente.');
  }

  async function markDone() {
    await supabase.from('jobs').update({ status: 'done' }).eq('id', jobId);
    setJob((p) => ({ ...p, status: 'done' }));
    speak('Trabajo finalizado con éxito. ¡Buen trabajo!');
  }

  async function cancelJob() {
    if (!confirm('¿Querés cancelar este trabajo?')) return;
    await supabase.from('jobs').update({ status: 'canceled' }).eq('id', jobId);
    setJob((p) => ({ ...p, status: 'canceled' }));
    speak('Trabajo cancelado correctamente.');
  }

  // ====== UI ======
  if (loading)
    return (
      <div className="container">
        <div className="card p-5 mt-6 text-center text-white/70">⏳ Cargando pedido…</div>
      </div>
    );

  if (err)
    return (
      <div className="container">
        <div className="card p-5 mt-6 text-center text-red-400">⚠️ Error: {err}</div>
      </div>
    );

  if (!job)
    return (
      <div className="container">
        <div className="card p-5 mt-6 text-center">Trabajo no encontrado.</div>
      </div>
    );

  return (
    <div className="container py-6">
      {/* CABECERA */}
      <header className="text-center mb-6">
        <h1 className="text-2xl font-extrabold mb-2">{job.title || 'Trabajo'}</h1>
        <StatusBadge status={job.status} />
        <p className="mt-2 text-white/70 text-sm">
          Publicado: {new Date(job.created_at).toLocaleString()}
        </p>
      </header>

      {/* MAPA */}
      {hasCoords && (
        <section className="card p-4 mb-6">
          <h2 className="font-bold mb-3 text-lg text-center">📍 Ubicación del cliente</h2>
          <div className="w-full rounded-2xl overflow-hidden" style={{ height: 320 }}>
            <MapContainer center={[job.lat, job.lon]} zoom={14} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
              <Marker position={[job.lat, job.lon]}><Tooltip>Cliente</Tooltip></Marker>
              {workerCoords && (
                <Marker position={[workerCoords.lat, workerCoords.lon]}>
                  <Tooltip>Vos (trabajador)</Tooltip>
                </Marker>
              )}
              {routeCoords.length > 0 && (
                <Polyline positions={routeCoords} pathOptions={{ color: '#14B8A6', weight: 5 }} />
              )}
            </MapContainer>
          </div>
          {eta && distance && (
            <p className="mt-3 text-center text-sm text-white/80">
              🚗 Distancia: <strong>{distance} km</strong> • ⏱ Tiempo estimado: <strong>{eta} min</strong>
            </p>
          )}
        </section>
      )}

      {/* ACCIONES */}
      <section className="card p-6 text-center space-y-3">
        <h3 className="font-bold text-lg mb-3">Acciones rápidas</h3>
        {job.status === 'open' && (
          <button className="btn bg-red-600 text-white py-3 text-lg w-full" onClick={cancelJob}>
            ❌ Cancelar trabajo
          </button>
        )}
        {job.status !== 'arrived' && job.status !== 'done' && job.status !== 'canceled' && (
          <button className="btn bg-cyan-500 text-black py-3 text-lg w-full" onClick={markArrived}>
            ✅ Marcar llegada
          </button>
        )}
        {job.status === 'arrived' && (
          <button className="btn bg-emerald-500 text-black py-3 text-lg w-full" onClick={markDone}>
            🏁 Finalizar trabajo
          </button>
        )}
        <Link href="/worker/jobs" className="btn bg-white/10 text-white py-3 w-full mt-4">
          ← Volver a mis trabajos
        </Link>
      </section>
    </div>
  );
}
