'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XCircle,
  Star,
  Navigation2,
  Clock3,
  ShieldCheck,
  Wrench,
  Droplets,
  Sparkles,
  Hammer,
  Leaf,
  PawPrint,
  Flame,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { toast } from 'sonner';

const supabase = getSupabase();
const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then((m) => m.Circle), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then((m) => m.Tooltip), { ssr: false });
const MarkerClusterGroup = dynamic(() => import('react-leaflet-cluster').then((m) => m.default), { ssr: false });
import { useMap } from 'react-leaflet';

function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (map && center) map.setView(center);
  }, [center, map]);
  return null;
}

function mapAccentColor(worker) {
  const diffMin = (Date.now() - new Date(worker?.updated_at || Date.now()).getTime()) / 60000;
  return diffMin <= 30 ? '#10b981' : '#9ca3af';
}

function avatarIcon(url, worker) {
  if (typeof window === 'undefined') return null;
  const L = require('leaflet');
  const size = 52;
  const color = mapAccentColor(worker);
  const html = `
    <div style="width:${size}px;height:${size}px;border-radius:50%;
      position:relative;background:#fff;overflow:hidden;
      box-shadow:0 6px 16px rgba(0,0,0,.12);">
      <div style="position:absolute;inset:-4px;border-radius:50%;
        border:3px solid ${color};
        filter:drop-shadow(0 0 8px ${color}40);"></div>
      <img src="${url || '/avatar-fallback.png'}"
           style="position:absolute;inset:0;width:100%;height:100%;
           object-fit:cover;border-radius:50%;" />
    </div>`;
  return L.divIcon({ html, iconSize: [size, size], className: '' });
}

function formatLastSeen(updatedAt) {
  if (!updatedAt) return 'Sin datos';
  const diff = Date.now() - new Date(updatedAt).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Activo hace segundos';
  if (min < 60) return `Activo hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Activo hace ${h}h`;
  const d = Math.floor(h / 24);
  return `Activo hace ${d} día${d > 1 ? 's' : ''}`;
}

function StarRating({ avg = 0, count = 0 }) {
  const full = Math.floor(avg);
  const half = avg - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <div className="flex justify-center items-center gap-0.5 mt-1">
      {Array.from({ length: full }).map((_, i) => (
        <Star key={`f${i}`} size={14} className="text-yellow-400 fill-yellow-400" />
      ))}
      {half && <Star size={14} className="text-yellow-400" />}
      {Array.from({ length: empty }).map((_, i) => (
        <Star key={`e${i}`} size={14} className="text-gray-300" />
      ))}
      <span className="text-xs text-gray-500 ml-1">({count})</span>
    </div>
  );
}

export default function MapPage() {
  const router = useRouter();
  const [center, setCenter] = useState([-25.516, -54.616]);
  const [me, setMe] = useState({ id: null, lat: null, lon: null });
  const [workers, setWorkers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [requested, setRequested] = useState(new Set());
  const [selectedService, setSelectedService] = useState(null);

  const services = [
    { id: 'plomería', label: 'Plomería', icon: <Droplets size={18} /> },
    { id: 'electricidad', label: 'Electricidad', icon: <Wrench size={18} /> },
    { id: 'limpieza', label: 'Limpieza', icon: <Sparkles size={18} /> },
    { id: 'construcción', label: 'Construcción', icon: <Hammer size={18} /> },
    { id: 'jardinería', label: 'Jardinería', icon: <Leaf size={18} /> },
    { id: 'mascotas', label: 'Mascotas', icon: <PawPrint size={18} /> },
    { id: 'emergencia', label: 'Emergencia', icon: <Flame size={18} /> },
  ];

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (!uid) router.replace('/login');
      else setMe((prev) => ({ ...prev, id: uid }));
    })();
  }, [router]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    let watcher;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      watcher = navigator.geolocation.watchPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setCenter([lat, lon]);
          setMe((prev) => ({ ...prev, lat, lon }));
          try {
            await supabase
              .from('worker_profiles')
              .upsert({ user_id: uid, lat, lng: lon, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
          } catch {}
        },
        () => {},
        { enableHighAccuracy: true }
      );
    })();
    return () => watcher && navigator.geolocation.clearWatch(watcher);
  }, []);

  async function fetchWorkers(serviceFilter = null) {
    setBusy(true);
    try {
      let query = supabase.from('map_workers_view').select('*').not('lat', 'is', null).not('lng', 'is', null);
      if (serviceFilter) query = query.ilike('skills', `%${serviceFilter}%`);
      const { data, error } = await query;
      if (error) throw error;
      setWorkers(data);
    } catch {
      toast.error('Error cargando trabajadores');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    fetchWorkers();
  }, []);

  async function solicitar(worker) {
    if (requested.has(worker.user_id)) return;
    try {
      setRequested((prev) => new Set([...prev, worker.user_id]));
      await supabase.from('jobs').insert([
        {
          status: 'open',
          title: `Trabajo con ${worker.full_name}`,
          worker_id: worker.user_id,
          client_id: me.id,
          created_at: new Date().toISOString(),
        },
      ]);
      toast.success(`Solicitud enviada a ${worker.full_name}`);
    } catch {
      toast.error('Error al enviar solicitud');
    }
  }

  function clusterIconCreateFunction(cluster) {
    if (typeof window === 'undefined') return null;
    const L = require('leaflet');
    const count = cluster.getChildCount();
    return L.divIcon({
      html: `<div style="width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#10b981;color:white;font-weight:700;box-shadow:0 6px 18px rgba(16,185,129,.18);">${count}</div>`,
      className: '',
    });
  }

  return (
    <div className="relative min-h-screen bg-white">
      {/* === Header === */}
      <div className="absolute top-4 left-4 z-[1000]">
        <button
          onClick={() => router.push('/role-selector')}
          className="bg-white border text-emerald-600 font-medium px-3 py-1.5 rounded-xl shadow-sm hover:bg-gray-50 transition"
        >
          Cambiar rol
        </button>
      </div>

      {/* === Mapa === */}
      <div className="absolute inset-0 z-0">
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <ChangeView center={center} />
          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
          <MarkerClusterGroup chunkedLoading maxClusterRadius={48} iconCreateFunction={clusterIconCreateFunction}>
            {workers.map((w) => (
              <Marker
                key={w.user_id}
                position={[w.lat, w.lng]}
                icon={avatarIcon(w.avatar_url, w)}
                eventHandlers={{ click: () => setSelected(w) }}
              />
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </div>

      {/* === Panel Inferior === */}
      <div
        className="fixed left-0 right-0 bottom-0 z-[9999] bg-white rounded-t-3xl border-t border-gray-200 overflow-hidden"
        style={{ height: '60vh', maxHeight: '40vh', transition: 'max-height 0.3s ease-out' }}
      >
        <div
          className="flex justify-center items-center py-3 cursor-pointer"
          onClick={(e) => {
            const sheet = e.currentTarget.parentElement;
            sheet.style.maxHeight = sheet.style.maxHeight === '90vh' ? '40vh' : '90vh';
          }}
        >
          <div className="h-1.5 w-12 rounded-full bg-emerald-500"></div>
        </div>

        <div className="px-5 pb-8 overflow-y-auto" style={{ height: 'calc(100% - 32px)' }}>
          <h2 className="text-center text-lg font-bold text-emerald-600 mb-3">ManosYA</h2>

          {/* Botones principales */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <button onClick={() => fetchWorkers(selectedService)} className="bg-emerald-500 text-white font-semibold py-3 rounded-xl">
              🚀 Buscar Pros
            </button>
            <button onClick={() => router.push('/client/jobs')} className="bg-white border font-semibold py-3 rounded-xl">
              📦 Mis pedidos
            </button>
            <button onClick={() => router.push('/client/new')} className="bg-white border font-semibold py-3 rounded-xl">
              🏢 Empresarial
            </button>
          </div>

          {/* Servicios */}
          <div className="grid grid-cols-3 gap-2 text-sm">
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSelectedService(s.id === selectedService ? null : s.id);
                  fetchWorkers(s.id === selectedService ? null : s.id);
                }}
                className={`flex items-center justify-center gap-1 px-2 py-2 rounded-lg border ${
                  selectedService === s.id ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                {s.icon}
                <span className="capitalize">{s.label}</span>
              </button>
            ))}
          </div>

          {/* Estado */}
          <div className="mt-6 flex flex-col items-center gap-2">
            <p className="text-xs text-gray-500 italic">
              {busy ? 'Buscando trabajadores cerca…' : `${workers.length} trabajadores activos cerca`}
            </p>
          </div>
        </div>
      </div>

      {/* === Modal Perfil === */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-[99999]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-3xl w-[90%] max-w-md p-6 shadow-xl text-center"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold">Perfil</h2>
                <button onClick={() => setSelected(null)}>
                  <XCircle size={22} className="text-gray-400 hover:text-red-400" />
                </button>
              </div>
              <img
                src={selected.avatar_url || '/avatar-fallback.png'}
                alt={selected.full_name}
                className="w-24 h-24 rounded-full mx-auto mb-3 border-4 border-emerald-500 object-cover"
              />
              <h3 className="text-lg font-bold capitalize">{selected.full_name}</h3>
              <StarRating avg={selected.rating_avg || 0} count={selected.rating_count || 0} />
              <p className="text-sm italic text-gray-600 mt-1">“{selected.bio || 'Sin descripción.'}”</p>

              <div className="mt-4 flex flex-col gap-2 items-center">
                <div className="flex items-center gap-2 text-gray-700 text-sm">
                  <Clock3 className="text-emerald-500" size={16} />
                  <span>
                    {selected.years_experience ? `${selected.years_experience} años de experiencia` : 'Sin experiencia especificada'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-xs font-semibold">
                  <ShieldCheck size={14} /> Frecuente en tu zona
                </div>
                <p className="text-xs text-emerald-600 mt-1">{formatLastSeen(selected.updated_at)}</p>
              </div>

              <div className="mt-4 bg-gray-50 border rounded-xl p-3">
                <p className="text-xs text-gray-500">Especialidades</p>
                <p className="text-sm">{(selected.skills || []).join(', ') || 'Sin especialidades registradas'}</p>
              </div>

              {requested.has(selected.user_id) ? (
                <div className="mt-5 bg-gray-50 border rounded-xl p-3">
                  <CheckCircle2 className="text-emerald-500 mx-auto" />
                  <p className="text-emerald-600 font-semibold">Solicitud enviada</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 mt-5">
                  <button className="py-3 border rounded-xl">💬 Chatear</button>
                  <button
                    onClick={() => solicitar(selected)}
                    className="py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600"
                  >
                    🚀 Solicitar
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
