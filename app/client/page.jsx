'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XCircle,
  Star,
  Clock3,
  Wrench,
  Droplets,
  Sparkles,
  Hammer,
  Leaf,
  PawPrint,
  Flame,
  MessageCircle,
} from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { toast } from 'sonner';

const supabase = getSupabase();
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(m => m.Tooltip), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false });
const MarkerClusterGroup = dynamic(() => import('react-leaflet-cluster').then(m => m.default), { ssr: false });
import { useMap } from 'react-leaflet';

/* ======= Utils ======= */
function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (map && center) map.setView(center, 14);
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

/* === Icono de clúster === */
function clusterIconCreateFunction(cluster) {
  if (typeof window === 'undefined') return null;
  const L = require('leaflet');
  const count = cluster.getChildCount();
  const html = `
    <div class="cluster-pulse" style="
      width:64px;height:64px;border-radius:50%;
      background:#10b981;display:flex;align-items:center;justify-content:center;
      box-shadow:0 0 12px rgba(16,185,129,0.6);
      color:#fff;font-weight:700;font-size:14px;position:relative;">
      <div style="position:absolute;inset:3px;border-radius:50%;background:#059669;z-index:1;"></div>
      <span style="position:relative;z-index:2;">${count}</span>
    </div>`;
  return L.divIcon({ html, iconSize: [64, 64], className: 'cluster-animated' });
}

/* CSS animación clúster */
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    .cluster-pulse { animation: pulse 2s infinite; }
    @keyframes pulse {
      0% { transform: scale(1); box-shadow: 0 0 0 rgba(16,185,129,0.35); }
      50% { transform: scale(1.08); box-shadow: 0 0 25px rgba(16,185,129,0.55); }
      100% { transform: scale(1); box-shadow: 0 0 0 rgba(16,185,129,0.35); }
    }`;
  if (!document.head.querySelector('style[data-manosya-pulse]')) {
    style.setAttribute('data-manosya-pulse', '1');
    document.head.appendChild(style);
  }
}

export default function MapPage() {
  const router = useRouter();
  const mapRef = useRef(null);

  const [center, setCenter] = useState([-25.516, -54.616]);
  const [me, setMe] = useState({ id: null, lat: null, lon: null });

  const [workers, setWorkers] = useState([]);
  const [busy, setBusy] = useState(false);

  const [selected, setSelected] = useState(null);
  const [showPrice, setShowPrice] = useState(false);
  const [route, setRoute] = useState(null);
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

  /* === Usuario === */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (!uid) router.replace('/login');
      else setMe(prev => ({ ...prev, id: uid }));
    })();
  }, [router]);

  /* === Geoloc === */
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watcher = navigator.geolocation.watchPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setCenter([lat, lon]);
        setMe({ ...me, lat, lon });
      },
      () => {},
      { enableHighAccuracy: true }
    );
    return () => watcher && navigator.geolocation.clearWatch(watcher);
  }, []);

  /* === Cargar trabajadores === */
  async function fetchWorkers(serviceFilter = null) {
    setBusy(true);
    try {
      let query = supabase
        .from('map_workers_view')
        .select('*')
        .not('lat', 'is', null)
        .not('lng', 'is', null);
      if (serviceFilter) query = query.ilike('skills', `%${serviceFilter}%`);
      const { data, error } = await query;
      if (error) throw error;
      setWorkers(data || []);
    } catch {
      toast.error('Error cargando trabajadores');
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => { fetchWorkers(); }, []);

  /* === Interacciones === */
  function handleMarkerClick(worker) {
    setSelected(worker);
    setShowPrice(false);
  }

  function solicitar() {
    setShowPrice(true);
  }

  // ✅ CONFIRMAR — muestra solo el trabajador seleccionado + línea verde
  function confirmarSolicitud() {
    toast.success('Solicitud confirmada ✅');
    setShowPrice(false);
    setWorkers([selected]); // 🔹 Muestra solo el trabajador elegido
    setRoute([[me.lat, me.lon], [selected.lat, selected.lng]]); // 🔹 Línea verde
    if (mapRef.current && me.lat && selected?.lat) {
      mapRef.current.fitBounds([[me.lat, me.lon], [selected.lat, selected.lng]], { padding: [80, 80] });
    }
  }

  // ✅ CANCELAR — borra línea y recarga todos los trabajadores
  function cancelarPedido() {
    setRoute(null);
    setSelected(null);
    fetchWorkers(selectedService || null);
  }

  function toggleService(id) {
    const next = selectedService === id ? null : id;
    setSelectedService(next);
    setSelected(null);
    setRoute(null);
    fetchWorkers(next);
  }

  return (
    <div className="relative min-h-screen bg-white">
      {/* Header */}
      <div className="absolute top-4 left-4 z-[1000]">
        <button
          onClick={() => router.push('/role-selector')}
          className="bg-white border text-emerald-600 font-medium px-3 py-1.5 rounded-xl shadow-sm hover:bg-gray-50 transition"
        >
          Cambiar rol
        </button>
      </div>

      {/* MAPA */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          whenCreated={(map) => (mapRef.current = map)}
        >
          <ChangeView center={center} />
          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
          {route && <Polyline positions={route} color="#10b981" weight={5} />}
          <MarkerClusterGroup chunkedLoading maxClusterRadius={48} iconCreateFunction={clusterIconCreateFunction}>
            {workers.map(w => (
              <Marker
                key={w.user_id}
                position={[w.lat, w.lng]}
                icon={avatarIcon(w.avatar_url, w)}
                eventHandlers={{ click: () => handleMarkerClick(w) }}
              >
                <Tooltip>
                  <div className="text-xs">
                    <strong>{w.full_name}</strong>
                    <p>Servicio: {w.main_skill || 'No especificado'}</p>
                    <p>💰 Desde ₲45.000</p>
                  </div>
                </Tooltip>
              </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </div>

      {/* PANEL INFERIOR */}
      <div
        className="fixed left-0 right-0 bottom-0 z-[9999] bg-white rounded-t-3xl border-t border-gray-200 overflow-y-auto"
        style={{ maxHeight: '45vh' }}
      >
        <div className="flex justify-center items-center py-3">
          <div className="h-1.5 w-12 rounded-full bg-emerald-500"></div>
        </div>
        <div className="px-5 pb-8">
          <h2 className="text-center text-lg font-bold text-emerald-600 mb-3">ManosYA</h2>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <button
              onClick={() => fetchWorkers(selectedService)}
              className="bg-emerald-500 text-white font-semibold py-3 rounded-xl"
            >
              🚀 Buscar Pros
            </button>
            <button
              onClick={() => router.push('/client/jobs')}
              className="bg-white border font-semibold py-3 rounded-xl"
            >
              📦 Mis pedidos
            </button>
            <button
              onClick={() => router.push('/client/new')}
              className="bg-white border font-semibold py-3 rounded-xl"
            >
              🏢 Empresarial
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm mb-4">
            {services.map(s => (
              <button
                key={s.id}
                onClick={() => toggleService(s.id)}
                className={`flex items-center justify-center gap-1 px-2 py-2 rounded-lg border ${
                  selectedService === s.id
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                {s.icon}
                <span className="capitalize">{s.label}</span>
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-500 italic text-center">
            {busy ? 'Buscando trabajadores cerca…' : `${workers.length} trabajadores activos cerca`}
          </p>
        </div>
      </div>

      {/* PERFIL DEL TRABAJADOR */}
      <AnimatePresence>
        {selected && !showPrice && (
          <motion.div
            key="perfil"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
            className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-xl p-6 z-[10000]"
          >
            <div className="text-center">
              <img
                src={selected.avatar_url || '/avatar-fallback.png'}
                className="w-20 h-20 mx-auto rounded-full border-4 border-emerald-500 mb-2"
                alt="avatar"
              />
              <h2 className="font-bold text-lg">{selected.full_name}</h2>
              <p className="text-sm italic text-gray-500 mb-2">“{selected.bio || 'Sin descripción'}”</p>
              <div className="flex justify-center items-center gap-1 mb-2">
                <Star size={14} className="text-yellow-400 fill-yellow-400" />
                <Star size={14} className="text-yellow-400 fill-yellow-400" />
                <Star size={14} className="text-yellow-400 fill-yellow-400" />
                <Star size={14} className="text-yellow-400 fill-yellow-400" />
                <Star size={14} className="text-gray-300" />
                <span className="text-xs text-gray-500 ml-1">(2)</span>
              </div>
              <p className="text-sm text-gray-600">
                <Clock3 size={14} className="inline mr-1" /> 12 años de experiencia
              </p>
              <p className="text-sm text-emerald-600 font-medium mt-1">Frecuente en tu zona</p>
              <p className="text-xs text-gray-500">Activo hace 12 días</p>
              <div className="mt-3 bg-gray-50 rounded-xl p-2 text-sm text-gray-700">
                Especialidades: {selected.skills || 'limpieza, plomería, jardinería'}
              </div>
              {!route ? (
                <div className="flex justify-center gap-3 mt-5">
                  <button onClick={() => setSelected(null)} className="px-5 py-3 rounded-xl border text-gray-700">
                    Cerrar
                  </button>
                  <button
                    onClick={solicitar}
                    className="px-6 py-3 rounded-xl bg-emerald-500 text-white font-semibold flex items-center gap-1"
                  >
                    🚀 Solicitar
                  </button>
                </div>
              ) : (
                <div className="flex justify-center gap-3 mt-5">
                  <button className="px-5 py-3 rounded-xl border flex items-center gap-1">
                    <MessageCircle size={16} /> Chatear
                  </button>
                  <button
                    onClick={cancelarPedido}
                    className="px-6 py-3 rounded-xl bg-red-500 text-white font-semibold flex items-center gap-1"
                  >
                    <XCircle size={16} /> Cancelar pedido
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL PRECIO */}
      <AnimatePresence>
        {showPrice && (
          <motion.div
            key="precio"
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10010]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-3xl w-[85%] max-w-md p-6 shadow-lg text-center"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <h3 className="text-lg font-bold text-emerald-600 mb-2">Precio estimado</h3>
              <p className="text-2xl font-extrabold text-emerald-700 mb-2">₲55.000</p>
              <div className="text-sm text-gray-600 space-y-1 mb-4">
                <p>🚗 Incluye traslado promedio (hasta 3 km)</p>
                <p>🌙 Urgencias nocturnas o feriados +20%</p>
                <p>💰 Tarifa mínima de visita ₲10.000</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <button onClick={() => setShowPrice(false)} className="py-3 border rounded-xl">
                  Cancelar
                </button>
                <button
                  onClick={confirmarSolicitud}
                  className="py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
