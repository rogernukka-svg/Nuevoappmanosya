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
  RefreshCcw,
} from 'lucide-react';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';
import { toast } from 'sonner';

/* ======================= Supabase ======================= */
const supabase = getSupabase();

/* ==================== React Leaflet (SSR off) ==================== */
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then(m => m.Circle), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(m => m.Tooltip), { ssr: false });
const MarkerClusterGroup = dynamic(() => import('react-leaflet-cluster').then(m => m.default), { ssr: false });

/* ======================= Aux: mover mapa ======================= */
import { useMap } from 'react-leaflet';
function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (map && center) map.setView(center);
  }, [center, map]);
  return null;
}

/* ======================= Utils ======================= */
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
const normalize = s =>
  (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/* =========================================================
   Página con mapa + sheet deslizable (40% mapa visible)
   ========================================================= */
export default function ClientPage() {
  const router = useRouter();

  /* ---- Map / user ---- */
  const [center, setCenter] = useState([-25.516, -54.616]);
  const [me, setMe] = useState({ id: null, lat: null, lon: null });
  const [workers, setWorkers] = useState([]);
  const [busy, setBusy] = useState(false);

  /* ---- Selection / chat ---- */
  const [selected, setSelected] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const chatChannelRef = useRef(null);

  /* ---- Client home pieces ---- */
  const [user, setUser] = useState(null);
  const [activeJob, setActiveJob] = useState(null);
  const jobsChannelRef = useRef(null);

  /* ---- Misc ---- */
  const [requestedWorkers, setRequestedWorkers] = useState(new Set());
  const [selectedService, setSelectedService] = useState(null);
  const inputRef = useRef(null);

  /* ---- Bottom sheet (snaps) ---- */
  const [sheetHeights, setSheetHeights] = useState({ min: 0, mid: 0, max: 0 });
  const [sheetY, setSheetY] = useState(0); // translateY px (0 = expandido)
  const sheetRef = useRef(null);

  const services = [
    { id: 'plomería', label: 'Plomería', icon: <Droplets size={18} /> },
    { id: 'electricidad', label: 'Electricidad', icon: <Wrench size={18} /> },
    { id: 'limpieza', label: 'Limpieza', icon: <Sparkles size={18} /> },
    { id: 'construcción', label: 'Construcción', icon: <Hammer size={18} /> },
    { id: 'jardinería', label: 'Jardinería', icon: <Leaf size={18} /> },
    { id: 'mascotas', label: 'Mascotas', icon: <PawPrint size={18} /> },
    { id: 'emergencia', label: 'Emergencia', icon: <Flame size={18} /> },
  ];

  /* ---------------- Session ---------------- */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (!uid) {
        router.replace('/login');
        return;
      }
      setUser(data.user);
      setMe(prev => ({ ...prev, id: uid }));
    })();
  }, [router]);

  /* ---------------- Active job + realtime ---------------- */
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const { data: aj } = await supabase
          .from('jobs')
          .select('*, worker:profiles!worker_id(full_name, avatar_url)')
          .eq('client_id', user.id)
          .in('status', ['taken', 'accepted', 'on_route', 'arrived', 'started', 'completed'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        setActiveJob(aj || null);
      } catch (e) {
        console.warn('Error cargando active job', e);
      }
    })();

    if (jobsChannelRef.current) supabase.removeChannel(jobsChannelRef.current);
    const channel = supabase
      .channel('realtime-jobs')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'jobs', filter: `client_id=eq.${user.id}` },
        payload => {
          const updated = payload.new;
          if (updated.id === activeJob?.id) {
            setActiveJob(updated);
            toast(`🔄 Estado actualizado: ${updated.status}`);
          }
        }
      )
      .subscribe();
    jobsChannelRef.current = channel;

    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /* ---------------- Geoloc ---------------- */
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
        async pos => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setCenter([lat, lon]);
          setMe(prev => ({ ...prev, lat, lon }));
          try {
            await supabase
              .from('worker_profiles')
              .upsert(
                { user_id: uid, lat, lng: lon, updated_at: new Date().toISOString() },
                { onConflict: 'user_id' }
              );
          } catch (e) {
            console.warn('upsert location failed', e);
          }
        },
        err => {
          console.warn('⚠️ Error GPS:', err.message);
          toast.warning('No pudimos obtener tu ubicación precisa');
        },
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 }
      );
    })();
    return () => watcher && navigator.geolocation.clearWatch(watcher);
  }, []);

  /* ---------------- Workers load + realtime ---------------- */
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
        filtered = filtered.filter(w => (w.skills || []).some(s => normalize(s).includes(needle)));
      }
      setWorkers(filtered);
    } catch (err) {
      toast.error('Error cargando Pros: ' + (err?.message || err));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const ch = supabase
      .channel('realtime-workers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'worker_profiles' }, () =>
        fetchWorkers()
      )
      .subscribe();
    fetchWorkers();
    return () => supabase.removeChannel(ch);
  }, [selectedService]);

  /* ---------------- Jobs: solicitar ---------------- */
  async function solicitar(worker) {
    if (!me.id) return toast.warning('Iniciá sesión');
    if (requestedWorkers.has(worker.user_id)) return;

    try {
      setRequestedWorkers(prev => new Set([...prev, worker.user_id]));
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
      toast.success(`🚀 Solicitud enviada a ${worker.full_name || 'el Pro'}`);
    } catch (err) {
      toast.error('Error al solicitar: ' + (err?.message || err));
    }
  }

  /* ---------------- Chat ---------------- */
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
          payload => setMessages(prev => [...prev, payload.new])
        )
        .subscribe();
      chatChannelRef.current = channel;
    } catch (e) {
      console.error(e);
      toast.error('No se pudo abrir el chat');
    }
  }
  async function sendMessage(content) {
    const text = (content || '').trim();
    if (!text || !chatId) return;
    await supabase.from('messages').insert([{ chat_id: chatId, sender_id: me.id, content: text }]);
  }

  /* ---------------- Map helpers ---------------- */
  function recenter() {
    if (me.lat && me.lon) setCenter([me.lat, me.lon]);
  }
  function clusterIconCreateFunction(cluster) {
    if (typeof window === 'undefined') return null;
    const L = require('leaflet');
    const count = cluster.getChildCount();
    return L.divIcon({
      html: `<div style="
        width:56px;height:56px;border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        background:#10b981;color:white;font-weight:800;font-size:18px;
        box-shadow:0 8px 22px rgba(16,185,129,.22);">${count}</div>`,
      className: '',
    });
  }

  /* ---------------- Sheet: definir snaps ---------------- */
  useEffect(() => {
    const h = typeof window !== 'undefined' ? window.innerHeight : 800;
    // translateY values (0 = abierto)
    const min = Math.max(64, h * 0.85); // casi oculto (solo handle visible)
    const mid = h * 0.60; // 40% del mapa visible
    const max = 0; // abierto
    setSheetHeights({ min, mid, max });
    setSheetY(mid); // arrancar con 40% mapa visible
  }, []);

  function snapTo(targetY) {
    // el más cercano de [min, mid, max]
    const opts = [sheetHeights.min, sheetHeights.mid, sheetHeights.max];
    const closest = opts.reduce((p, c) => (Math.abs(c - targetY) < Math.abs(p - targetY) ? c : p), opts[0]);
    setSheetY(closest);
  }

  /* ---------------- Cleanup ---------------- */
  useEffect(() => {
    return () => {
      if (chatChannelRef.current) supabase.removeChannel(chatChannelRef.current);
      if (jobsChannelRef.current) supabase.removeChannel(jobsChannelRef.current);
    };
  }, []);

  /* ======================= UI ======================= */
  return (
    <div className="relative min-h-screen bg-white">
      {/* ====== MAPA de fondo - ocupa toda la pantalla ====== */}
      <div className="fixed inset-0 z-0">
        <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }} className="leaflet-map">
          <ChangeView center={center} />
          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
          {me.lat && me.lon && (
            <Circle center={[me.lat, me.lon]} radius={60} pathOptions={{ color: '#10b981', fillOpacity: 0.12 }}>
              <Tooltip>📍 Mi ubicación</Tooltip>
            </Circle>
          )}
          <MarkerClusterGroup chunkedLoading maxClusterRadius={48} iconCreateFunction={clusterIconCreateFunction}>
            {workers.map(w => (
              <Marker
                key={w.user_id}
                position={[w.lat, w.lng]}
                icon={avatarIcon(w.avatar_url, w)}
                eventHandlers={{ click: () => setSelected(w) }}
              />
            ))}
          </MarkerClusterGroup>
        </MapContainer>

        {/* Recenter floating button */}
        <button
          onClick={recenter}
          className="absolute bottom-6 right-6 bg-white/95 p-3 rounded-full shadow-lg border hover:scale-95 transition z-20"
          title="Centrar en mi ubicación"
        >
          <Navigation2 className="text-emerald-600" size={22} />
        </button>
      </div>

      {/* ====== Header flotante ====== */}
      <header className="fixed top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-auto px-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/role-selector')}
            className="flex items-center gap-2 bg-white/85 backdrop-blur-sm px-3 py-2 rounded-full shadow-sm border hover:scale-[1.02] transition"
            title="Cambiar rol"
          >
            <RefreshCcw size={16} className="text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-600">Cambiar rol</span>
          </button>
        </div>
        <div className="flex-1 flex justify-center pointer-events-none">
          <div className="bg-white/85 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm pointer-events-auto">
            <h1 className="text-emerald-600 font-extrabold text-lg">ManosYA</h1>
          </div>
        </div>
        <div className="w-24" />
      </header>

      {/* ====== Bottom Sheet (deslizable) ====== */}
      <motion.div
        ref={sheetRef}
        className="fixed left-0 right-0 bottom-0 z-30 pointer-events-auto"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.15}
        onDragEnd={(_, info) => {
          const projected = sheetY + info.velocity.y * 0.2 + info.offset.y;
          snapTo(projected);
        }}
        animate={{ y: sheetY }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      >
        <div className="mx-auto w-full max-w-xl px-3 pb-6">
          <div className="rounded-t-3xl bg-white/95 backdrop-blur-md shadow-xl border">
            {/* Handle */}
            <div
              className="w-full flex items-center justify-center pt-2 cursor-pointer select-none"
              onClick={() => setSheetY(prev => (prev === sheetHeights.mid ? sheetHeights.max : sheetHeights.mid))}
            >
              <div className="h-1.5 w-16 rounded-full bg-gray-300" />
            </div>

            <div className="p-4">
              <h2 className="text-center text-emerald-700 font-extrabold text-xl mb-3">ManosYA</h2>

              {/* Row 1 */}
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    fetchWorkers();
                    toast.success(busy ? 'Buscando Pros…' : 'Pros cerca tuyo');
                  }}
                  className="h-16 rounded-2xl bg-emerald-500 text-white font-semibold shadow active:scale-95"
                >
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-lg">🔍 Buscar Pros</span>
                    <small className="text-[11px] text-white/85">cerca tuyo</small>
                  </div>
                </motion.button>

                <Link
                  href="/client/jobs"
                  className="h-16 rounded-2xl bg-white border text-gray-800 font-semibold shadow flex items-center justify-center active:scale-95"
                >
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-lg">📦 Mis pedidos</span>
                    <small className="text-[11px] text-gray-500">historial / estado</small>
                  </div>
                </Link>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-2 gap-3 mt-3">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={async () => {
                    if (activeJob?.id) {
                      try {
                        const { data: chatRow } = await supabase
                          .from('chats')
                          .select('id')
                          .eq('job_id', activeJob.id)
                          .maybeSingle();
                        if (!chatRow?.id) throw new Error('Chat no encontrado.');
                        const { data: msgs } = await supabase
                          .from('messages')
                          .select('*')
                          .eq('chat_id', chatRow.id)
                          .order('created_at', { ascending: true });
                        setMessages(msgs || []);
                        setChatId(chatRow.id);
                        setIsChatOpen(true);

                        if (chatChannelRef.current) supabase.removeChannel(chatChannelRef.current);
                        const channel = supabase
                          .channel(`chat-${chatRow.id}`)
                          .on(
                            'postgres_changes',
                            { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatRow.id}` },
                            payload => setMessages(prev => [...prev, payload.new])
                          )
                          .subscribe();
                        chatChannelRef.current = channel;
                      } catch (e) {
                        toast.error('No se pudo abrir el chat: ' + (e?.message || e));
                      }
                    } else {
                      toast.info('No tenés un chat activo. Primero iniciá un pedido con un Pro.');
                    }
                  }}
                  className="h-16 rounded-2xl bg-gray-100 text-gray-800 font-semibold shadow active:scale-95"
                >
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-lg">💬 Mi chat</span>
                    <small className="text-[11px] text-gray-500">
                      {activeJob?.worker ? 'con tu Pro' : 'sin activo'}
                    </small>
                  </div>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push('/role-selector')}
                  className="h-16 rounded-2xl bg-white border text-emerald-700 font-semibold shadow active:scale-95"
                >
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-lg">⚙️ Cambiar rol</span>
                    <small className="text-[11px] text-emerald-700/80">cliente / Pro</small>
                  </div>
                </motion.button>
              </div>

              {/* Chips servicios */}
              <div className="pt-4">
                <p className="text-center text-xs text-gray-600 mb-2">Elegí un servicio</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {services.map(s => (
                    <motion.button
                      key={s.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        const newSel = s.id === selectedService ? null : s.id;
                        setSelectedService(newSel);
                        setTimeout(fetchWorkers, 120);
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${
                        selectedService === s.id
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}
                    >
                      {s.icon}
                      {s.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ====== Modal Perfil + Chat ====== */}
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
                  {isChatOpen ? `Chat con ${selected.full_name || 'Pro'}` : 'Perfil'}
                </div>
                <button onClick={() => setSelected(null)}>
                  <XCircle size={22} className="text-gray-400 hover:text-red-400" />
                </button>
              </div>

              {!isChatOpen ? (
                <div className="px-6 pb-8 pt-4">
                  <img
                    src={selected.avatar_url || '/avatar-fallback.png'}
                    alt={selected.full_name || 'Pro'}
                    className="w-24 h-24 rounded-full mx-auto mb-3 border-4 border-emerald-500 object-cover"
                  />
                  <h3 className="text-xl font-bold capitalize">{selected.full_name || 'Pro'}</h3>
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
                    {messages.map(m => {
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
                    onSubmit={async e => {
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
    </div>
  );
}

/* ====== Pequeños SVG helpers ====== */
function BriefcaseIconSimple() {
  return (
    <div className="w-7 h-7 flex items-center justify-center rounded-full bg-transparent">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white">
        <path d="M3 7h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
function ClipboardIconSimple() {
  return (
    <div className="w-7 h-7 flex items-center justify-center rounded-full bg-white border shadow-sm">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-600">
        <path d="M9 7h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="8" y="3" width="8" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      </svg>
    </div>
  );
}
