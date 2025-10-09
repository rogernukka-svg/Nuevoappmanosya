'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XCircle,
  Star,
  Navigation2,
  SendHorizontal,
  ChevronLeft,
  CheckCircle2,
  Clock3,
  ShieldCheck,
  Wrench,
  Droplets,
  Sparkles,
  Hammer,
  Leaf,
  PawPrint,
  Flame,
} from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { toast } from 'sonner';

const supabase = getSupabase();

/* === React Leaflet dinámico === */
const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then((m) => m.Circle), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then((m) => m.Tooltip), { ssr: false });
const MarkerClusterGroup = dynamic(() => import('react-leaflet-cluster').then((m) => m.default), { ssr: false });

/* === Auxiliar: mover mapa === */
import { useMap } from 'react-leaflet';
function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (map && center) map.setView(center);
  }, [center, map]);
  return null;
}

/* === Utilidades === */
function formatLastSeen(updatedAt, status) {
  if (!updatedAt) return 'Sin datos';
  if (status === 'working') return 'En trabajo';
  const diff = Date.now() - new Date(updatedAt).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Activo hace segundos';
  if (min < 60) return `Activo hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Activo hace ${h}h`;
  const d = Math.floor(h / 24);
  return `Activo hace ${d} día${d > 1 ? 's' : ''}`;
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
      box-shadow:0 4px 10px rgba(0,0,0,.2);">
      <div style="position:absolute;inset:-4px;border-radius:50%;
        border:3px solid ${color};
        filter:drop-shadow(0 0 6px ${color}40);"></div>
      <img src="${url || '/avatar-fallback.png'}"
           style="position:absolute;inset:0;width:100%;height:100%;
           object-fit:cover;border-radius:50%;" />
    </div>`;
  return L.divIcon({ html, iconSize: [size, size], className: '' });
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
/* normaliza para que 'plomería' coincida con 'plomeria' */
const normalize = (s) =>
  (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/* === Página principal === */
export default function MapPage() {
  const router = useRouter();
  const [center, setCenter] = useState([-25.516, -54.616]);
  const [me, setMe] = useState({ id: null, lat: null, lon: null });
  const [workers, setWorkers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [requestedWorkers, setRequestedWorkers] = useState(new Set());
  const [selectedService, setSelectedService] = useState(null);
  const inputRef = useRef(null);
  const chatChannelRef = useRef(null);

  const services = [
    { id: 'plomería', label: 'Plomería', icon: <Droplets size={18} /> },
    { id: 'electricidad', label: 'Electricidad', icon: <Wrench size={18} /> },
    { id: 'limpieza', label: 'Limpieza', icon: <Sparkles size={18} /> },
    { id: 'construcción', label: 'Construcción', icon: <Hammer size={18} /> },
    { id: 'jardinería', label: 'Jardinería', icon: <Leaf size={18} /> },
    { id: 'mascotas', label: 'Mascotas', icon: <PawPrint size={18} /> },
    { id: 'emergencia', label: 'Emergencia', icon: <Flame size={18} /> },
  ];

  /* === Sesión === */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (!uid) return router.replace('/login');
      setMe((prev) => ({ ...prev, id: uid }));
    })();
  }, [router]);

  /* === Geolocalización === */
  useEffect(() => {
    if (!navigator.geolocation) {
      toast.error('Tu navegador no soporta geolocalización');
      return;
    }
    let watcher;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;

      watcher = navigator.geolocation.watchPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setCenter([lat, lon]);
          setMe({ id: uid, lat, lon });

          await supabase
            .from('worker_profiles')
            .upsert(
              { user_id: uid, lat, lng: lon, updated_at: new Date().toISOString() },
              { onConflict: 'user_id' }
            );
        },
        (err) => {
          console.warn('⚠️ Error GPS:', err.message);
          toast.warning('No pudimos obtener tu ubicación precisa');
        },
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 }
      );
    })();
    return () => watcher && navigator.geolocation.clearWatch(watcher);
  }, []);

  /* === Cargar trabajadores === */
  async function fetchWorkers() {
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from('map_workers_view')
        .select('*')
        .not('lat', 'is', null)
        .not('lng', 'is', null);
      if (error) throw error;

      let filtered = data;
      if (selectedService) {
        const needle = normalize(selectedService);
        filtered = filtered.filter((w) =>
          (w.skills || []).some((s) => normalize(s).includes(needle))
        );
      }
      setWorkers(filtered);
    } catch (err) {
      toast.error('Error cargando trabajadores: ' + err.message);
    } finally {
      setBusy(false);
    }
  }

  /* === Solicitar trabajo === */
  async function solicitar(worker) {
    if (!me.id) return toast.warning('Iniciá sesión');
    if (requestedWorkers.has(worker.user_id)) return;

    try {
      setRequestedWorkers((prev) => new Set([...prev, worker.user_id]));

      const { error } = await supabase
        .from('jobs')
        .insert([
          {
            status: 'open',
            title: `Trabajo de ${worker.skills?.[0] || 'servicio'}`,
            worker_id: worker.user_id,
            client_id: me.id,
            client_lat: me.lat,
            client_lng: me.lon,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      toast.success(`🚀 Solicitud enviada a ${worker.full_name || 'el trabajador'}`);
    } catch (err) {
      toast.error('Error al solicitar: ' + err.message);
    }
  }

  /* === Chat === */
  async function openChat(worker) {
    if (!me.id) return toast.warning('Iniciá sesión');
    try {
      const { data: existing } = await supabase
        .from('chats')
        .select('id')
        .eq('client_id', me.id)
        .eq('worker_id', worker.user_id)
        .maybeSingle();

      let cid = existing?.id;
      if (!cid) {
        const { data: created } = await supabase
          .from('chats')
          .insert([{ client_id: me.id, worker_id: worker.user_id }])
          .select('id')
          .single();
        cid = created.id;
      }

      setChatId(cid);
      setIsChatOpen(true);

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', cid)
        .order('created_at', { ascending: true });
      setMessages(msgs || []);

      if (chatChannelRef.current) supabase.removeChannel(chatChannelRef.current);
      const channel = supabase
        .channel(`chat-${cid}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${cid}` },
          (payload) => setMessages((prev) => [...prev, payload.new])
        )
        .subscribe();
      chatChannelRef.current = channel;
    } catch {
      toast.error('No se pudo abrir el chat');
    }
  }

  async function sendMessage(content) {
    const text = content.trim();
    if (!text || !chatId) return;
    await supabase.from('messages').insert([{ chat_id: chatId, sender_id: me.id, content: text }]);
  }

  function recenter() {
    if (me.lat && me.lon) setCenter([me.lat, me.lon]);
  }

  function clusterIconCreateFunction(cluster) {
    if (typeof window === 'undefined') return null;
    const L = require('leaflet');
    const count = cluster.getChildCount();
    return L.divIcon({
      html: `<div class="flex items-center justify-center w-10 h-10 bg-emerald-500 text-white font-bold rounded-full shadow">${count}</div>`,
      className: '',
    });
  }

  /* === UI === */
  return (
    <motion.div className="container max-w-screen-md mx-auto px-4 pb-20 bg-white text-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pt-6">
        <button onClick={() => router.push('/client')} className="text-emerald-600 font-semibold flex items-center gap-1">
          ← Atrás
        </button>
        <h1 className="text-lg font-bold text-emerald-600">Mapa de servicios</h1>
        <div className="w-8" />
      </div>

      {/* Filtro */}
      <section className="p-5 bg-white border rounded-2xl shadow-sm text-center">
        <h2 className="font-extrabold text-2xl mb-3">⚡ ¿Qué necesitás hoy?</h2>

        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {services.map((s) => (
            <motion.button
              key={s.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedService(s.id === selectedService ? null : s.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                selectedService === s.id
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {s.icon}
              {s.label}
            </motion.button>
          ))}
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={fetchWorkers}
          className="mt-2 w-full py-3 text-lg font-semibold rounded-xl bg-emerald-500 text-white shadow hover:bg-emerald-600"
        >
          {busy ? 'Buscando…' : '🌍 Mostrar en mapa'}
        </motion.button>
      </section>

      {/* Mapa */}
      <div className="mt-5 rounded-2xl overflow-hidden border shadow bg-gray-50 relative" style={{ height: '65vh' }}>
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <ChangeView center={center} />
          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
          {me.lat && me.lon && (
            <Circle center={[me.lat, me.lon]} radius={60} pathOptions={{ color: '#10b981', fillOpacity: 0.15 }}>
              <Tooltip>📍 Mi ubicación</Tooltip>
            </Circle>
          )}
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

        <button
          onClick={recenter}
          className="absolute bottom-5 right-5 bg-white p-3 rounded-full shadow border hover:bg-gray-50"
        >
          <Navigation2 className="text-emerald-600" size={22} />
        </button>
      </div>

      {/* Perfil + Chat */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex items-end justify-center z-[9999]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-t-3xl w-full max-w-md shadow-2xl text-center overflow-y-auto max-h-[88vh]"
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              exit={{ y: 50 }}
            >
              <div className="flex justify-between items-center px-5 py-4 border-b sticky top-0 bg-white">
                {isChatOpen ? (
                  <button onClick={() => setIsChatOpen(false)} className="flex items-center gap-1 text-gray-600">
                    <ChevronLeft size={20} /> Perfil
                  </button>
                ) : (
                  <div className="w-6" />
                )}
                <div className="font-semibold">
                  {isChatOpen ? `Chat con ${selected.full_name || 'Trabajador'}` : 'Perfil'}
                </div>
                <button onClick={() => setSelected(null)}>
                  <XCircle size={22} className="text-gray-400 hover:text-red-400" />
                </button>
              </div>

              {!isChatOpen ? (
                <div className="px-6 pb-8 pt-4">
                  <img
                    src={selected.avatar_url || '/avatar-fallback.png'}
                    alt={selected.full_name || 'Trabajador'}
                    className="w-24 h-24 rounded-full mx-auto mb-3 border-4 border-emerald-500 object-cover"
                  />
                  <h3 className="text-xl font-bold capitalize">{selected.full_name || 'Trabajador'}</h3>
                  <StarRating avg={selected.rating_avg || 0} count={selected.rating_count || 0} />
                  <p className="text-sm italic text-gray-600 mt-2">“{selected.bio || 'Sin descripción.'}”</p>

                  <div className="mt-4 flex flex-col gap-2 items-center">
                    <div className="flex items-center gap-2 text-gray-700 text-sm">
                      <Clock3 className="text-emerald-500" size={16} />
                      <span>
                        {typeof selected.years_experience === 'number' && selected.years_experience > 0
                          ? `${selected.years_experience} años de experiencia`
                          : 'Sin experiencia especificada'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-xs font-semibold">
                      <ShieldCheck size={14} /> Frecuente en tu zona
                    </div>
                    <p className="text-xs text-emerald-600 mt-1">
                      {formatLastSeen(selected.updated_at, selected.status)}
                    </p>
                  </div>

                  <div className="mt-4 text-left space-y-2">
                    <div className="bg-gray-50 border rounded-xl p-3">
                      <p className="text-xs text-gray-500">Especialidades</p>
                      <p className="text-sm">
                        {(selected.skills || []).length
                          ? (selected.skills || []).join(', ')
                          : 'Sin especialidades registradas'}
                      </p>
                    </div>
                  </div>

                  {requestedWorkers.has(selected.user_id) ? (
                    <div className="mt-5 bg-gray-50 border rounded-xl p-3">
                      <CheckCircle2 className="text-emerald-500 mx-auto" />
                      <p className="text-emerald-600 font-semibold">Solicitud enviada</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 mt-5">
                      <button onClick={() => openChat(selected)} className="py-3 border rounded-xl">
                        💬 Chatear
                      </button>
                      <button
                        onClick={() => solicitar(selected)}
                        className="py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600"
                      >
                        🚀 Solicitar
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col h-[70vh]">
                  <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                    {messages.map((m) => {
                      const mine = m.sender_id === me.id;
                      return (
                        <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm shadow-sm ${
                              mine ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {m.content}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <form
                    className="p-3 border-t flex gap-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const value = inputRef.current?.value || '';
                      await sendMessage(value);
                      if (inputRef.current) inputRef.current.value = '';
                    }}
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Escribí un mensaje…"
                      className="flex-1 bg-gray-100 rounded-xl px-3 py-3 border"
                    />
                    <button className="px-4 bg-emerald-500 text-white rounded-xl">
                      <SendHorizontal size={18} />
                    </button>
                  </form>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
