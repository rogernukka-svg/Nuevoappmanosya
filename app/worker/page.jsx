'use client';

import { useEffect, useState, useRef, useMemo, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  SendHorizontal,
  ChevronLeft,
  Map,
  CheckSquare,
  CheckCircle2,
  Power,
  MessageCircle,
  Home,
  User2,
  ArrowLeftCircle,
  Sparkles,
  BadgeCheck,
  Clock3,
  Briefcase,
  MapPin,
  Bell,
  XCircle,
  Bot,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabase } from '@/lib/supabase';
import { startRealtimeCore, stopRealtimeCore } from '@/lib/realtimeCore';

/* === Leaflet Map === */
import dynamic from 'next/dynamic';

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then((m) => m.Circle), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then((m) => m.CircleMarker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((m) => m.Popup), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then((m) => m.Polyline), { ssr: false });

const supabase = getSupabase();

/* =========================
   HELPERS
========================= */

function prettyStatus(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'open') return 'Disponible';
  if (s === 'accepted') return 'En curso';
  if (s === 'completed') return 'Finalizado';
  if (s === 'rejected') return 'Rechazado';
  if (s === 'cancelled') return 'Cancelado';
  if (s === 'assigned') return 'Asignado';
  return status || 'Sin estado';
}

function jobStatusPill(status) {
  const s = String(status || '').toLowerCase();

  if (s === 'open') {
    return 'bg-amber-50 text-amber-700 border border-amber-200';
  }
  if (s === 'accepted') {
    return 'bg-cyan-50 text-cyan-700 border border-cyan-200';
  }
  if (s === 'completed') {
    return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  }
  if (s === 'rejected' || s === 'cancelled') {
    return 'bg-red-50 text-red-600 border border-red-200';
  }

  return 'bg-gray-50 text-gray-700 border border-gray-200';
}
function parseJobRequestDetails(description) {
  const text = String(description || '');

  const parts = text
    .split(' · ')
    .map((p) => String(p || '').trim())
    .filter(Boolean);

  const result = {
    raw: text,
    summary: [],
    serviceLabel: null,
    requestedDate: null,
    requestedTime: null,
    notes: null,
    requestKind: 'standard',
  };

  for (const part of parts) {
    if (part.startsWith('Servicio:')) {
      result.serviceLabel = part.replace('Servicio:', '').trim();
      continue;
    }

    if (part.startsWith('Fecha solicitada:')) {
      result.requestedDate = part.replace('Fecha solicitada:', '').trim();
      result.requestKind = 'booking';
      continue;
    }

    if (part.startsWith('Hora solicitada:')) {
      result.requestedTime = part.replace('Hora solicitada:', '').trim();
      result.requestKind = 'booking';
      continue;
    }

    if (part.startsWith('Notas:')) {
      result.notes = part.replace('Notas:', '').trim();
      continue;
    }

    result.summary.push(part);
  }

  if (
    !result.requestedDate &&
    !result.requestedTime &&
    /presupuesto|cotización|cotizacion|diagnóstico|diagnostico/i.test(text)
  ) {
    result.requestKind = 'quote';
  }

  return result;
}
function workerModeMeta(status) {
  if (status === 'available') {
    return {
      title: 'Disponible',
      subtitle: 'Recibiendo solicitudes en tiempo real',
      tone: 'emerald',
      pill: 'Conectado',
      dot: 'bg-emerald-500',
      glow: 'shadow-[0_16px_34px_rgba(16,185,129,0.18)]',
      banner: 'from-emerald-500 to-cyan-400',
    };
  }

  if (status === 'paused') {
    return {
      title: 'En pausa',
      subtitle: 'No recibís pedidos temporalmente',
      tone: 'gray',
      pill: 'Pausado',
      dot: 'bg-gray-400',
      glow: 'shadow-[0_16px_34px_rgba(17,24,39,0.10)]',
      banner: 'from-gray-700 to-gray-900',
    };
  }

  return {
    title: 'Ocupado',
    subtitle: 'Tenés un trabajo en curso',
    tone: 'cyan',
    pill: 'Trabajando',
    dot: 'bg-cyan-500',
    glow: 'shadow-[0_16px_34px_rgba(34,211,238,0.18)]',
    banner: 'from-cyan-500 to-emerald-500',
  };
}

/* =========================
   PERFIL BASE
========================= */

async function ensureWorkerProfile(userId) {
  if (!userId) return;

  try {
    const { data: existing } = await supabase
      .from('worker_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existing) {
      await supabase.from('worker_profiles').insert([
        {
          user_id: userId,
          is_active: true,
          radius_km: 5,
          lat: null,
          lng: null,
        },
      ]);
    }
  } catch (err) {
    console.error('Error creando worker_profile:', err.message);
  }
}

const HOTSPOTS = [
  { name: 'Shopping Paris', lat: -25.5093, lng: -54.6111, intensity: 9 },
  { name: 'Shopping China', lat: -25.5091, lng: -54.6102, intensity: 9 },
  { name: 'Monalisa', lat: -25.5101, lng: -54.612, intensity: 8 },
  { name: 'Microcentro CDE', lat: -25.516, lng: -54.6118, intensity: 10 },
  { name: 'Km 4', lat: -25.5039, lng: -54.635, intensity: 7 },
  { name: 'Km 7', lat: -25.4812, lng: -54.625, intensity: 8 },
  { name: 'Km 8', lat: -25.475, lng: -54.635, intensity: 6 },
  { name: 'Km 9 Monday', lat: -25.467, lng: -54.642, intensity: 6 },
  { name: 'Barrio Boquerón', lat: -25.529, lng: -54.6078, intensity: 7 },
  { name: 'Barrio Obrero', lat: -25.5247, lng: -54.6172, intensity: 6 },
  { name: 'Área 1 Minga', lat: -25.4974, lng: -54.6621, intensity: 8 },
  { name: 'Área 2 Minga', lat: -25.502, lng: -54.671, intensity: 7 },
  { name: 'Km 14 Monday', lat: -25.437, lng: -54.712, intensity: 6 },
  { name: 'Centro Minga', lat: -25.5085, lng: -54.6398, intensity: 7 },
  { name: 'Aviación Minga', lat: -25.495, lng: -54.648, intensity: 7 },
  { name: 'Costanera Hernandarias', lat: -25.4052, lng: -54.6424, intensity: 7 },
  { name: 'Centro Hernandarias', lat: -25.4062, lng: -54.64, intensity: 8 },
  { name: 'UNINTER Hernandarias', lat: -25.43, lng: -54.635, intensity: 6 },
  { name: 'Itaipú Acceso 1', lat: -25.4105, lng: -54.5895, intensity: 8 },
  { name: 'Centro Franco', lat: -25.558, lng: -54.613, intensity: 7 },
  { name: 'Río Monday', lat: -25.554, lng: -54.62, intensity: 6 },
  { name: 'Fracción San Agustín', lat: -25.548, lng: -54.595, intensity: 7 },
  { name: 'Shopping del Sol', lat: -25.2914, lng: -57.5802, intensity: 10 },
  { name: 'Shopping Mariscal', lat: -25.2989, lng: -57.5889, intensity: 9 },
  { name: 'Villa Morra', lat: -25.2972, lng: -57.582, intensity: 8 },
  { name: 'Las Lomas', lat: -25.2849, lng: -57.566, intensity: 7 },
  { name: 'Centro Asunción', lat: -25.2836, lng: -57.6359, intensity: 9 },
  { name: 'Avenida Eusebio Ayala', lat: -25.3026, lng: -57.5837, intensity: 9 },
  { name: 'San Lorenzo Centro', lat: -25.3401, lng: -57.5078, intensity: 8 },
  { name: 'Universidad Nacional (UNA)', lat: -25.3385, lng: -57.5088, intensity: 7 },
  { name: 'Luque Centro', lat: -25.3204, lng: -57.4906, intensity: 7 },
  { name: 'Aeropuerto Silvio Pettirossi', lat: -25.2401, lng: -57.5139, intensity: 10 },
  { name: 'Zona Norte - Fdo', lat: -25.307, lng: -57.527, intensity: 7 },
  { name: 'Zona Sur - Fdo', lat: -25.325, lng: -57.531, intensity: 6 },
  { name: 'Lambaré Centro', lat: -25.345, lng: -57.606, intensity: 7 },
  { name: 'Yacht y Golf Club', lat: -25.3647, lng: -57.6004, intensity: 8 },
  { name: 'Ñemby Centro', lat: -25.394, lng: -57.535, intensity: 7 },
  { name: 'Limpio Centro', lat: -25.159, lng: -57.485, intensity: 6 },
];

/* =========================
   AVAILABILITY CAROUSEL
========================= */

export function AvailabilityCarousel({ value, onChange }) {
  const items = [
    {
      id: 'available',
      title: 'Disponible',
      subtitle: 'Recibir pedidos en tiempo real',
      pill: 'Conectado',
      tone: 'emerald',
    },
    {
      id: 'offline',
      title: 'No disponible',
      subtitle: 'Pausás pedidos temporalmente',
      pill: 'Pausado',
      tone: 'gray',
    },
  ];

  const idx = Math.max(0, items.findIndex((x) => x.id === value));
  const active = items[idx];

  function setByIndex(nextIdx) {
    const clamped = Math.max(0, Math.min(items.length - 1, nextIdx));
    const next = items[clamped].id;
    if (next !== value) {
      if (navigator?.vibrate) navigator.vibrate(20);
      onChange(next);
    }
  }

  return (
    <div className="w-full">
      <div className="rounded-3xl border border-gray-200 bg-white shadow-[0_18px_50px_rgba(16,24,40,0.10)] overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center justify-center w-9 h-9 rounded-2xl ${
                  active.tone === 'emerald'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                <Power size={18} />
              </span>
              <h3 className="text-[17px] font-extrabold text-gray-900">{active.title}</h3>
            </div>

            <p className="text-[13px] text-gray-500 mt-1">{active.subtitle}</p>
          </div>

          <span
            className={`text-[12px] font-bold px-3 py-1.5 rounded-full border ${
              active.tone === 'emerald'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-gray-50 text-gray-700 border-gray-200'
            }`}
          >
            {active.pill}
          </span>
        </div>

        <div className="px-4 pb-5">
          <div className="relative rounded-2xl bg-gray-50 border border-gray-200 p-2 overflow-hidden">
            <div
              className={`absolute inset-0 pointer-events-none ${
                active.tone === 'emerald'
                  ? 'bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.20),transparent_55%)]'
                  : 'bg-[radial-gradient(circle_at_30%_20%,rgba(17,24,39,0.10),transparent_55%)]'
              }`}
            />

            <motion.div
              className="flex gap-2"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.12}
              onDragEnd={(e, info) => {
                const x = info.offset.x;
                if (x < -40) setByIndex(idx + 1);
                if (x > 40) setByIndex(idx - 1);
              }}
              animate={{ x: -idx * 260 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              style={{ width: items.length * 260 }}
            >
              {items.map((it) => {
                const activeItem = it.id === value;
                return (
                  <button
                    key={it.id}
                    onClick={() => onChange(it.id)}
                    className={`w-[252px] shrink-0 rounded-2xl px-4 py-4 text-left border transition ${
                      activeItem
                        ? it.tone === 'emerald'
                          ? 'bg-white border-emerald-200 shadow-[0_12px_30px_rgba(16,185,129,0.18)]'
                          : 'bg-white border-gray-200 shadow-[0_12px_30px_rgba(17,24,39,0.12)]'
                        : 'bg-white/70 border-gray-200 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-[15px] font-extrabold text-gray-900">{it.title}</div>
                      <AnimatePresence>
                        {activeItem && (
                          <motion.span
                            initial={{ scale: 0.7, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.7, opacity: 0 }}
                            className={`inline-flex items-center gap-1 text-[12px] font-bold ${
                              it.tone === 'emerald' ? 'text-emerald-700' : 'text-gray-700'
                            }`}
                          >
                            <CheckCircle2 size={14} />
                            Activo
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="text-[12px] text-gray-500 mt-1">{it.subtitle}</div>

                    <div className="mt-3 flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          it.tone === 'emerald' ? 'bg-emerald-500' : 'bg-gray-400'
                        }`}
                      />
                      <span className="text-[12px] font-semibold text-gray-700">
                        Deslizá para cambiar
                      </span>
                    </div>
                  </button>
                );
              })}
            </motion.div>
          </div>

          <div className="flex justify-center gap-2 mt-3">
            {items.map((it, i) => (
              <button
                key={it.id}
                onClick={() => setByIndex(i)}
                className={`h-2.5 rounded-full transition-all ${
                  i === idx ? 'w-8 bg-emerald-500' : 'w-2.5 bg-gray-300'
                }`}
                aria-label={`Ir a ${it.title}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}



export default function WorkerPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [sending, setSending] = useState(false);
   const [isActive, setIsActive] = useState(true);
  const [hasUnread, setHasUnread] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [clientTyping, setClientTyping] = useState(false);
 const [mapOpen, setMapOpen] = useState(false);
const [previewMapOpen, setPreviewMapOpen] = useState(false);
const [previewTarget, setPreviewTarget] = useState(null);
const [previewRoute, setPreviewRoute] = useState(null);
const [workerLocation, setWorkerLocation] = useState(null);
const [sheetSnap, setSheetSnap] = useState('mid');

const inputRef = useRef(null);
const chatChannelRef = useRef(null);
const bottomRef = useRef(null);
const soundRef = useRef(null);
const typingTimeoutRef = useRef(null);

  const [status, setStatus] = useState(() => {
    if (typeof window === 'undefined') return 'available';
    return localStorage.getItem('worker_status') || 'available';
  });

  const [isConnected, setIsConnected] = useState(true);

  const meta = workerModeMeta(status);

async function fetchRoadRoute(fromLat, fromLng, toLat, toLng) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.routes?.length) return null;

    const coords = data.routes[0].geometry.coordinates;
    const route = coords.map((c) => [c[1], c[0]]);

    return {
      route,
      distanceKm: data.routes[0].distance / 1000,
      durationMin: Math.round(data.routes[0].duration / 60),
    };
  } catch (e) {
    console.warn('route error', e);
    return null;
  }
}

async function openGoogleMaps(lat, lng) {
  if (lat == null || lng == null) {
    toast.error('Ubicación no disponible');
    return;
  }

  const la = Number(lat);
  const lo = Number(lng);

  if (Number.isNaN(la) || Number.isNaN(lo)) {
    toast.error('Ubicación inválida');
    return;
  }

  setPreviewTarget({ lat: la, lng: lo });
  setPreviewRoute(null);
  setSheetSnap('mid');
  setPreviewMapOpen(true);

  if (workerLocation?.lat != null && workerLocation?.lng != null) {
    const result = await fetchRoadRoute(
      Number(workerLocation.lat),
      Number(workerLocation.lng),
      la,
      lo
    );

    if (result?.route?.length) {
      setPreviewRoute(result.route);
    } else {
      setPreviewRoute([
        [Number(workerLocation.lat), Number(workerLocation.lng)],
        [la, lo],
      ]);
    }
  }
}
  const stats = useMemo(() => {
    
    const total = jobs.length;
    const available = jobs.filter((j) => j.status === 'open').length;
    const inProgress = jobs.filter((j) => j.status === 'accepted').length;
    const completed = jobs.filter((j) => j.status === 'completed').length;

    return { total, available, inProgress, completed };
  }, [jobs]);
const sheetSnapMeta = useMemo(() => {
  if (sheetSnap === 'full') {
    return {
      y: 0,
      height: 'min(78dvh, 680px)',
    };
  }

  if (sheetSnap === 'mini') {
    return {
      y: 240,
      height: '170px',
    };
  }

  return {
    y: 110,
    height: '360px',
  };
}, [sheetSnap]);
  useEffect(() => {
    if (typeof window !== 'undefined' && status) {
      localStorage.setItem('worker_status', status);
    }
  }, [status]);

  /* === SESIÓN === */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    (async () => {
      try {
        if (typeof Audio !== 'undefined') {
          soundRef.current = new Audio('/notify.mp3');
          soundRef.current.load();
        }

        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;

        if (data?.user) {
          setUser(data.user);
          await ensureWorkerProfile(data.user.id);
        } else {
          router.replace('/login');
        }
      } catch (err) {
        console.error('Error inicializando sesión:', err);
        toast.error('Error al obtener usuario o sesión expirada');
        router.replace('/login');
      }
    })();
  }, [router]);


  /* === GEO === */
  useEffect(() => {
    if (!user?.id || !navigator.geolocation) return;

    let lastSent = 0;
    let lastLat = null;
    let lastLng = null;

    const distance = (a, b, c, d) => {
      const R = 6371000;
      const toRad = (x) => (x * Math.PI) / 180;
      const dLat = toRad(c - a);
      const dLon = toRad(d - b);
      const la1 = toRad(a);
      const la2 = toRad(c);
      const x =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(la1) * Math.cos(la2);
      return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    };

    const watcher = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setWorkerLocation({ lat, lng });

        const now = Date.now();
        const movedEnough = lastLat === null || distance(lastLat, lastLng, lat, lng) > 25;
        const timeOk = now - lastSent > 30000;

        if (!movedEnough && !timeOk) return;

        lastLat = lat;
        lastLng = lng;
        lastSent = now;

        try {
          const { error } = await supabase.from('worker_profiles').upsert(
            {
              user_id: user.id,
              lat,
              lng,
              last_lat: lat,
              last_lon: lng,
              status,
              is_active: status === 'available',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );

          if (error) {
            console.error('❌ Error al actualizar ubicación:', error.message);
          }
        } catch (err) {
          console.error('⚠️ Error inesperado al guardar ubicación:', err);
        }
      },
      (err) => console.warn('🚫 Error del GPS:', err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watcher);
  }, [user?.id, status]);

  /* === CARGAR STATUS === */
  useEffect(() => {
    if (!user?.id) return;

    const fetchStatus = async () => {
      const { data, error } = await supabase
        .from('worker_profiles')
        .select('status, is_active')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error obteniendo estado:', error.message);
        return;
      }

      if (data?.status) setStatus(data.status);
    };

    fetchStatus();
  }, [user?.id]);

  /* === INTERNET === */
  useEffect(() => {
    const updateStatus = () => {
      const online = navigator.onLine;
      setIsConnected(online);
    };

    updateStatus();

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  /* === JOBS === */
  async function loadJobs() {
    const workerId = user?.id;
    if (!workerId) return;

    try {
      setLoading(true);

      const { data: jobsData, error: jobsErr } = await supabase
  .from('jobs')
  .select(`
    id,
    title,
    description,
    status,
    client_id,
    worker_id,
    client_lat,
    client_lng,
    created_at,
    service_type
  `)
  .or(`status.eq.open,worker_id.eq.${workerId}`)
  .order('created_at', { ascending: false });

      if (jobsErr) throw jobsErr;

      const list = jobsData || [];
      const clientIds = [...new Set(list.map((j) => j.client_id).filter(Boolean))];

      let profilesMap = {};
      if (clientIds.length > 0) {
        const { data: profs, error: profErr } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', clientIds);

        if (profErr) throw profErr;

        profilesMap = (profs || []).reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }

      const enriched = list.map((j) => ({
        ...j,
        client: profilesMap[j.client_id] || null,
      }));

      setJobs(enriched);

      const activeJob = enriched.find(
        (j) => j.worker_id === workerId && ['accepted', 'assigned'].includes(j.status)
      );

      if (activeJob) {
        const busyUntil = new Date(Date.now() + 60 * 60000);

        setStatus('busy');

        await supabase
          .from('worker_profiles')
          .update({
            status: 'busy',
            is_active: true,
            busy_until: busyUntil.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', workerId);
      } else {
        const { data: wp, error: wpErr } = await supabase
          .from('worker_profiles')
          .select('status')
          .eq('user_id', workerId)
          .maybeSingle();

        if (wpErr) throw wpErr;

        const currentStatus = wp?.status || 'available';
        const finalStatus = currentStatus === 'busy' ? 'available' : currentStatus;
        const finalIsActive = finalStatus === 'available';

        setStatus(finalStatus);

        await supabase
          .from('worker_profiles')
          .update({
            status: finalStatus,
            is_active: finalIsActive,
            busy_until: null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', workerId);
      }
    } catch (err) {
      console.error('❌ Error cargando trabajos:', err);
      toast.error('Error al cargar trabajos');
    } finally {
      setLoading(false);
    }
  }

useEffect(() => {
  if (!user?.id) return;

  // ✅ carga inicial una sola vez
  loadJobs();

  // ✅ sin polling agresivo cada 15s
  // dejamos que realtime haga la mayor parte del trabajo
}, [user?.id]);

  useEffect(() => {
    if (mapOpen) {
      setTimeout(() => {
        const map = document.querySelector('.leaflet-container');
        if (map) window.dispatchEvent(new Event('resize'));
      }, 300);
    }
  }, [mapOpen]);
useEffect(() => {
  if (!selectedJob?.id) return;

  const fresh = jobs.find((j) => String(j.id) === String(selectedJob.id));
  if (!fresh) return;

  const ended = ['cancelled', 'completed', 'worker_completed'].includes(
    String(fresh.status || '').toLowerCase()
  );

  if (!ended) return;

  setPreviewMapOpen(false);
  setPreviewTarget(null);
  setPreviewRoute(null);
  setMapOpen(false);
  setSelectedJob(null);
  setIsChatOpen(false);

  toast(
    fresh.status === 'cancelled'
      ? '🚫 El cliente canceló el trabajo'
      : '✅ El cliente finalizó el trabajo'
  );
}, [jobs, selectedJob]);
/* === NUEVOS TRABAJOS === */
useEffect(() => {
  if (!user?.id) return;

  const playNotify = async () => {
    try {
      if (!soundRef.current) return;
      soundRef.current.pause();
      soundRef.current.currentTime = 0;
      await soundRef.current.play();
    } catch (err) {
      console.warn('Error reproduciendo sonido de nuevo trabajo:', err);
    }
  };

  const channel = supabase
    .channel(`worker-new-job-sound-${user.id}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'jobs' },
      async (payload) => {
        const job = payload.new;
        if (!job) return;

        if (job.status !== 'open') return;

        await playNotify();
        toast('🆕 ¡Nueva solicitud de trabajo disponible!');
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user?.id]);

/* === REALTIME CORE === */
useEffect(() => {
  if (!user?.id) return;

  const stop = startRealtimeCore((type, data) => {
    try {
      switch (type) {
        case 'job': {
          if (data.__source === 'insert' && data.status === 'open') {
            if (status === 'available') {
              (async () => {
                let client = null;

                if (data.client_id) {
                  const { data: profile, error: profileErr } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url')
                    .eq('id', data.client_id)
                    .maybeSingle();

                  if (!profileErr) {
                    client = profile || null;
                  }
                }

                const enrichedJob = { ...data, client };

                setJobs((prev) => {
                  const exists = prev.some((j) => j.id === enrichedJob.id);
                  return exists ? prev : [enrichedJob, ...prev];
                });

               try {
  soundRef.current?.pause?.();
  if (soundRef.current) soundRef.current.currentTime = 0;
  soundRef.current?.play?.();
} catch (err) {
  console.warn('Error reproduciendo sonido en realtime core:', err);
}

toast('🆕 Nuevo pedido disponible cerca tuyo');
              })();
            }
            return;
          }

          if (data.worker_id === user.id) {
            setJobs((prev) =>
              prev.some((j) => j.id === data.id)
                ? prev.map((j) => (j.id === data.id ? { ...j, ...data } : j))
                : [data, ...prev]
            );

            if (selectedJob?.id === data.id) {
              setSelectedJob((prev) => (prev ? { ...prev, status: data.status } : prev));
            }

            if (data.status === 'cancelled') {
              toast.warning('🚫 El cliente canceló el trabajo.');

              (async () => {
                const { data: wp } = await supabase
                  .from('worker_profiles')
                  .select('status')
                  .eq('user_id', user.id)
                  .maybeSingle();

                const nextStatus = wp?.status === 'paused' ? 'paused' : 'available';

                await supabase
                  .from('worker_profiles')
                  .update({
                    status: nextStatus,
                    is_active: nextStatus === 'available',
                    busy_until: null,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('user_id', user.id);

                setStatus(nextStatus);
              })();
            } else if (data.status === 'completed') {
              toast.success('🎉 Trabajo finalizado por el cliente.');

              (async () => {
                const { data: wp } = await supabase
                  .from('worker_profiles')
                  .select('status')
                  .eq('user_id', user.id)
                  .maybeSingle();

                const nextStatus = wp?.status === 'paused' ? 'paused' : 'available';

                await supabase
                  .from('worker_profiles')
                  .update({
                    status: nextStatus,
                    is_active: nextStatus === 'available',
                    busy_until: null,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('user_id', user.id);

                setStatus(nextStatus);
              })();

              setIsChatOpen(false);
            } else if (data.status === 'accepted') {
              setStatus('busy');
            }
          }

          if (data.__source === 'delete') {
            setJobs((prev) => prev.filter((j) => j.id !== data.id));
          }
          break;
        }

               case 'message': {
          if (selectedJob?.chat_id === data.chat_id && isChatOpen) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.id)) return prev;
              return [...prev, data];
            });

            if (data.sender_id !== user.id) {
              setHasUnread(false);
              setUnreadCount(0);

              try {
                soundRef.current?.pause?.();
                if (soundRef.current) soundRef.current.currentTime = 0;
                soundRef.current?.play?.();
              } catch (err) {
                console.warn('Error reproduciendo sonido mensaje:', err);
              }
            }
          } else if (data.sender_id !== user.id) {
            setHasUnread(true);
            setUnreadCount((prev) => prev + 1);

            try {
              soundRef.current?.pause?.();
              if (soundRef.current) soundRef.current.currentTime = 0;
              soundRef.current?.play?.();
            } catch (err) {
              console.warn('Error reproduciendo sonido mensaje:', err);
            }
          }
          break;
        }

        case 'profile': {
          if (data.user_id === user.id && data.status) {
            setStatus(data.status);
          }
          break;
        }

        default:
          console.log('Evento realtime desconocido:', type, data);
      }
    } catch (err) {
      console.warn('⚠️ Error en RealtimeCore worker:', err);
    }
  });

  return () => stopRealtimeCore();
}, [user?.id, selectedJob?.chat_id, status, isChatOpen]);

/* === MENSAJES GLOBALES === */
useEffect(() => {
  if (!user?.id) return;

  const globalMessagesChannel = supabase
    .channel('global-message-listener')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      async (payload) => {
        const msg = payload.new;

        if (msg.sender_id === user.id) return;

        if (!isChatOpen || msg.chat_id !== selectedJob?.chat_id) {
          setHasUnread(true);
          setUnreadCount((prev) => prev + 1);

          try {
            if (soundRef.current) {
              soundRef.current.currentTime = 0;
              await soundRef.current.play();
            }
          } catch (err) {
            console.warn('Error reproduciendo sonido global:', err);
          }
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(globalMessagesChannel);
  };
}, [user?.id, isChatOpen, selectedJob?.chat_id]);

   useEffect(() => {
    if (isChatOpen) {
      setHasUnread(false);
      setUnreadCount(0);
    }
  }, [isChatOpen]);

  /* === TOGGLE STATUS === */
  async function toggleStatus() {
    try {
      let newStatus;
      let newIsActive;

      if (status === 'available') {
        newStatus = 'paused';
        newIsActive = false;
      } else if (status === 'paused') {
        newStatus = 'available';
        newIsActive = true;
      } else {
        newStatus = 'available';
        newIsActive = true;
      }

      setStatus(newStatus);

      const { error } = await supabase
        .from('worker_profiles')
        .update({
          status: newStatus,
          is_active: newIsActive,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success(
        newStatus === 'available'
          ? '🟢 Estás disponible'
          : newStatus === 'paused'
          ? '⏸️ Estás en pausa'
          : '🔵 Estás trabajando'
      );
    } catch (err) {
      console.error('Error cambiando estado:', err.message);
      toast.error('No se pudo cambiar tu estado');
    }
  }

  /* === ACCEPT JOB === */
  async function acceptJob(job) {
    try {
      if (job.status !== 'open') {
        return toast.warning('Este trabajo ya fue tomado');
      }

      const { error: jobError } = await supabase
        .from('jobs')
        .update({
          status: 'accepted',
          worker_id: user.id,
          accepted_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      if (jobError) throw jobError;

      const busyUntil = new Date(Date.now() + 60 * 60000);

      const { error: workerError } = await supabase
        .from('worker_profiles')
        .update({
          status: 'busy',
          is_active: true,
          busy_until: busyUntil.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (workerError) throw workerError;

      setStatus('busy');

      toast.success('✅ Trabajo aceptado correctamente');

      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: 'accepted', worker_id: user.id } : j))
      );
    } catch (err) {
      toast.error('No se pudo aceptar el trabajo');
      console.error(err);
    }
  }

  /* === REJECT JOB === */
  async function rejectJob(job) {
    try {
      const { error } = await supabase.from('jobs').update({ status: 'rejected' }).eq('id', job.id);
      if (error) throw error;
      toast('🚫 Trabajo rechazado correctamente');
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
    } catch (err) {
      toast.error('Error al rechazar trabajo');
      console.error(err);
    }
  }

  /* === COMPLETE JOB === */
  async function completeJob(job) {
    try {
      const { error: jobError } = await supabase
        .from('jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      if (jobError) throw jobError;

      const { data: wp, error: wpErr } = await supabase
        .from('worker_profiles')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (wpErr) throw wpErr;

      const nextStatus = wp?.status === 'paused' ? 'paused' : 'available';
      const nextIsActive = nextStatus === 'available';

      const { error: workerError } = await supabase
        .from('worker_profiles')
        .update({
          status: nextStatus,
          is_active: nextIsActive,
          busy_until: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (workerError) throw workerError;

      setStatus(nextStatus);

      toast.success('🎉 Trabajo finalizado correctamente');

      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: 'completed' } : j)));

      setSelectedJob(null);
      setIsChatOpen(false);

      await loadJobs();
    } catch (err) {
      toast.error('Error al finalizar el trabajo');
      console.error(err);
    }
  }

  /* === OPEN CHAT === */
  async function openChat(job) {
    try {
      const { data: chatIdData, error: chatErr } = await supabase.rpc('ensure_chat_for_job', {
        p_job_id: job.id,
      });
      if (chatErr) throw chatErr;
      const cid = chatIdData;

      const { data: msgs, error: msgErr } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', cid)
        .order('created_at', { ascending: true });
      if (msgErr) throw msgErr;

      setMessages(msgs || []);
setSelectedJob({ ...job, chat_id: cid });
setIsChatOpen(true);
setHasUnread(false);
setUnreadCount(0);

      if (chatChannelRef.current) supabase.removeChannel(chatChannelRef.current);

      const ch = supabase
  .channel(`chat-${cid}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `chat_id=eq.${String(cid)}`,
    },
    (payload) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === payload.new.id)) return prev;
        return [...prev, payload.new];
      });

      if (payload.new.sender_id !== user.id) {
        setClientTyping(false);

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }

        soundRef.current?.play?.();
      }

      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
    }
  )
  .on('broadcast', { event: 'typing' }, (payload) => {
    if (payload?.sender_id !== user.id) {
      setClientTyping(true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        setClientTyping(false);
        typingTimeoutRef.current = null;
      }, 2000);
    }
  })
  .subscribe();

      chatChannelRef.current = ch;
    } catch (err) {
      console.error('❌ Error abriendo chat:', err);
      toast.error('No se pudo abrir el chat');
    }
  }

  /* === SEND MESSAGE === */
  async function sendMessage() {
    const text = inputRef.current?.value?.trim();
    if (!text) return;

    if (!selectedJob?.chat_id) {
      toast.error('No hay chat activo');
      return;
    }

    if (selectedJob?.status === 'completed') {
      toast.info('✅ Este trabajo ya fue finalizado. No se pueden enviar más mensajes.');
      return;
    }

    try {
      setSending(true);
      const { data, error } = await supabase
        .from('messages')
        .insert([{ chat_id: selectedJob.chat_id, sender_id: user.id, text }])
        .select();

      if (error) throw error;

      setMessages((prev) => {
        if (prev.some((m) => m.id === data[0]?.id)) return prev;
        return [...prev, data[0]];
      });

      inputRef.current.value = '';
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
    } catch (err) {
      console.error('❌ Error enviando mensaje:', err);
      toast.error('No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fffd_0%,#ffffff_40%,#f8fafc_100%)] flex flex-col items-center justify-center text-emerald-600">
        <Loader2 className="animate-spin w-6 h-6 mb-2" />
        <p className="font-semibold">Cargando trabajos...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[linear-gradient(180deg,#f8fffd_0%,#ffffff_40%,#f8fafc_100%)] text-gray-900 pb-28"
    >
      <div className="max-w-screen-md mx-auto px-4 pt-5">
        {/* HEADER PRINCIPAL */}
        <div className="relative overflow-hidden rounded-[30px] border border-emerald-100 bg-white shadow-[0_20px_60px_rgba(16,185,129,0.08)] mb-5">
          <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-emerald-300/20 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl" />

          <div className="relative z-10 p-5">
            <div className="flex items-center justify-between gap-3">
              <button
  type="button"
  onClick={() => router.push('/role-selector')}
  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-[15px] font-semibold text-slate-700 shadow-[0_10px_28px_rgba(15,23,42,0.10)] transition-all duration-200 hover:-translate-y-[1px] hover:border-emerald-200 hover:text-emerald-700 hover:shadow-[0_16px_34px_rgba(16,185,129,0.14)] active:scale-[0.98]"
>
  <ChevronLeft size={18} className="opacity-80" />
  <span>Volver</span>
</button>

              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-bold text-emerald-700">
                <Sparkles size={14} />
                ManosYA Worker
              </div>
            </div>

            <div className="mt-5 flex items-start gap-4">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.banner} text-white ${meta.glow}`}
              >
                <Briefcase size={28} />
              </div>

              <div className="min-w-0">
                <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
                  Panel del profesional
                </h1>
                <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                  Gestioná solicitudes, respondé rápido, seguí tus chats y mantené tu estado actualizado.
                </p>
              </div>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <StatCard label="Disponibles" value={stats.available} tone="emerald" />
              <StatCard label="En curso" value={stats.inProgress} tone="cyan" />
              <StatCard label="Finalizados" value={stats.completed} tone="emerald" />
              <StatCard label="Total" value={stats.total} tone="gray" />
            </div>
          </div>
        </div>

        {/* ESTADO */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <div className="rounded-[28px] border border-gray-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] overflow-hidden">
            <div className={`px-5 py-4 bg-gradient-to-r ${meta.banner} text-white`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full bg-white`} />
                    <span className="text-lg font-extrabold">{meta.title}</span>
                  </div>
                  <p className="text-white/85 text-sm mt-1">{meta.subtitle}</p>
                </div>

                <div className="flex flex-col items-end gap-2">
  <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-white/15 border border-white/20">
    {meta.pill}
  </span>

  {!isConnected && (
    <span className="text-[11px] font-bold px-3 py-1.5 rounded-full border bg-red-500/20 text-white border-red-200/20">
      Sin internet
    </span>
  )}
</div>
              </div>
            </div>

            <div className="p-4">
              <button
                onClick={toggleStatus}
                disabled={status === 'busy'}
                className={`relative w-full h-14 rounded-2xl border overflow-hidden shadow-[0_10px_30px_rgba(16,24,40,0.10)] transition ${
                  status === 'busy'
                    ? 'bg-gray-100 border-gray-200 opacity-70 cursor-not-allowed'
                    : 'bg-white border-gray-200'
                }`}
              >
                <motion.div
                  className="absolute inset-0"
                  initial={false}
                  animate={{
                    opacity: status === 'available' ? 1 : 0,
                    scale: status === 'available' ? 1 : 0.98,
                  }}
                  transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                  style={{
                    background:
                      'radial-gradient(circle at 30% 20%, rgba(16,185,129,0.28), transparent 55%), linear-gradient(90deg, rgba(16,185,129,0.18), rgba(34,211,238,0.08))',
                  }}
                />

                <div className="absolute inset-0 flex items-center justify-between px-4 text-[12px] font-semibold">
                  <span className={`${status === 'available' ? 'text-gray-400' : 'text-gray-900'} transition`}>
                    Pausa
                  </span>
                  <span className={`${status === 'available' ? 'text-emerald-700' : 'text-gray-400'} transition`}>
                    Disponible
                  </span>
                </div>

                <motion.div
                  className={`absolute top-1 bottom-1 w-[132px] rounded-2xl flex items-center justify-center gap-2 shadow-[0_12px_28px_rgba(16,24,40,0.18)] ${
                    status === 'available' ? 'bg-emerald-600 text-white' : 'bg-gray-900 text-white'
                  }`}
                  initial={false}
                  animate={{
                    left: status === 'available' ? 'calc(100% - 136px)' : '4px',
                    rotate: status === 'available' ? 0 : -2,
                    scale: 1,
                  }}
                  transition={{
                    left: { type: 'spring', stiffness: 420, damping: 28 },
                    rotate: { type: 'spring', stiffness: 420, damping: 28 },
                    scale: { type: 'tween', duration: 0.18 },
                  }}
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <motion.div
                    initial={false}
                    animate={{ rotate: status === 'available' ? 0 : -25 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="flex items-center"
                  >
                    <Power size={16} />
                  </motion.div>

                  <span className="text-[12px] font-extrabold tracking-tight">
                    {status === 'available' ? 'ON' : 'OFF'}
                  </span>
                </motion.div>
              </button>

              <p className="mt-3 text-[12px] text-gray-500 text-center">
                {status === 'available'
                  ? 'Estás visible para recibir solicitudes.'
                  : status === 'paused'
                  ? 'No recibirás nuevos pedidos hasta reactivarte.'
                  : 'Finalizá el trabajo actual para volver a recibir pedidos.'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* LISTA DE TRABAJOS */}
        {jobs.length === 0 ? (
          <div className="mt-10 rounded-[28px] border border-dashed border-emerald-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Briefcase size={28} />
            </div>

            <h3 className="mt-4 text-xl font-bold text-gray-800">Aún no tenés solicitudes disponibles</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
              Cuando lleguen nuevos trabajos, van a aparecer acá para que puedas aceptarlos rápidamente.
            </p>
          </div>
        ) : (
          <section className="grid gap-4 mt-5">
            {jobs.map((job, index) => {
  const details = parseJobRequestDetails(job.description);

  return (
    <motion.div
      key={job.id}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      whileHover={{ y: -2 }}
      className="relative overflow-hidden rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]"
    >
      <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-emerald-300/10 blur-3xl" />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide">
                {prettyStatus(job.status)}
              </span>

              {details.requestKind === 'booking' && (
                <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-cyan-700 border border-cyan-200">
                  Con agenda
                </span>
              )}

              {details.requestKind === 'quote' && (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-amber-700 border border-amber-200">
                  Presupuesto
                </span>
              )}
            </div>

            <h3 className="text-lg font-extrabold text-gray-800 leading-tight">
              {job?.client?.full_name
                ? `Trabajo con ${job.client.full_name}`
                : job.title || 'Trabajo de servicio'}
            </h3>

            <p className="mt-1 text-sm font-semibold text-emerald-700">
              {details.serviceLabel || job.service_type || 'Servicio general'}
            </p>

            {details.summary.length > 0 && (
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                {details.summary.join(' · ')}
              </p>
            )}
          </div>

          <span className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold ${jobStatusPill(job.status)}`}>
            {prettyStatus(job.status)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <MiniInfo
            icon={<BadgeCheck size={14} />}
            label="Servicio"
            value={details.serviceLabel || job.service_type || 'Servicio general'}
          />
          <MiniInfo
  icon={<Clock3 size={14} />}
  label="Tarifa"
  value={
    details.requestKind === 'quote'
      ? 'A presupuestar'
      : details.requestKind === 'booking'
      ? 'Agendado por cliente'
      : 'A definir'
  }
/>
        </div>

        {(details.requestedDate || details.requestedTime) && (
          <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-700">
              Agenda solicitada
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {details.requestedDate && (
                <span className="rounded-full border border-cyan-200 bg-white px-3 py-1 text-[12px] font-bold text-cyan-700">
                  📅 {details.requestedDate}
                </span>
              )}

              {details.requestedTime && (
                <span className="rounded-full border border-cyan-200 bg-white px-3 py-1 text-[12px] font-bold text-cyan-700">
                  ⏰ {details.requestedTime}
                </span>
              )}
            </div>
          </div>
        )}

        {details.notes && (
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">
              Detalles del cliente
            </div>
            <p className="mt-2 text-sm leading-6 text-gray-700">
              {details.notes}
            </p>
          </div>
        )}

        {job.client && (
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-cyan-50/50 p-3">
            <div className="flex items-center gap-3">
              <img
                src={job.client?.avatar_url || '/avatar-fallback.png'}
                onError={(e) => {
                  e.currentTarget.src = '/avatar-fallback.png';
                }}
                alt={job.client?.full_name || 'Cliente'}
                className="w-12 h-12 rounded-full border-2 border-emerald-400 object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-gray-800 truncate">
                  {job.client?.full_name || 'Cliente'}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Cliente asignado al servicio
                </div>
              </div>
            </div>
          </div>
        )}

        {job.status === 'open' && (
          <div className="grid grid-cols-2 gap-3 mt-4">
            <button
              onClick={() => acceptJob(job)}
              className="rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-400 text-white py-3 font-extrabold shadow-[0_16px_34px_rgba(16,185,129,0.20)] hover:from-emerald-600 hover:to-cyan-500 transition"
            >
              {details.requestKind === 'booking'
                ? '📅 Aceptar agenda'
                : '✅ Aceptar'}
            </button>
            <button
              onClick={() => rejectJob(job)}
              className="rounded-2xl bg-gray-100 text-gray-700 py-3 font-bold hover:bg-gray-200 transition"
            >
              Rechazar
            </button>
          </div>
        )}

        {job.status === 'accepted' && (
          <div className="mt-5">
            <div className="overflow-hidden rounded-[28px] border border-gray-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,250,252,0.98)_100%)] shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
                      Acción principal
                    </div>
                    <div className="mt-1 text-[15px] font-extrabold text-gray-900">
                      Seguimiento del servicio
                    </div>
                  </div>

                  <div className="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-[11px] font-bold text-cyan-700">
                    En curso
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedJob(job);
                    openGoogleMaps(job.client_lat, job.client_lng);
                  }}
                  className="group mt-4 relative w-full overflow-hidden rounded-[24px] bg-gradient-to-r from-slate-900 via-emerald-700 to-cyan-500 px-4 py-4 text-left text-white shadow-[0_18px_40px_rgba(16,185,129,0.22)] transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_24px_46px_rgba(16,185,129,0.28)] active:scale-[0.99]"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_38%)] opacity-80" />

                  <div className="relative flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/16 backdrop-blur-md ring-1 ring-white/20">
                      <Map size={20} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-[16px] font-extrabold tracking-tight">
                        Ver ruta y detalles
                      </div>
                      <div className="mt-0.5 text-[12px] text-white/80">
                        Abrí la vista premium del servicio dentro de ManosYA
                      </div>
                    </div>

                    <div className="text-white/80 transition-transform duration-200 group-hover:translate-x-0.5">
                      <MapPin size={18} />
                    </div>
                  </div>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-gray-100 px-4 py-4">
                <button
                  onClick={() => openChat(job)}
                  className="group relative rounded-[22px] border border-gray-200 bg-white px-4 py-3.5 text-gray-800 shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-[1px] hover:border-emerald-200 hover:bg-emerald-50/60 active:scale-[0.99]"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="relative">
                      <MessageCircle
                        size={17}
                        className="text-gray-600 transition-colors group-hover:text-emerald-700"
                      />

                      {hasUnread && unreadCount > 0 && (
                        <span className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-extrabold text-white shadow-[0_8px_18px_rgba(239,68,68,0.35)] ring-2 ring-white">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </div>

                    <span className="text-[14px] font-extrabold">Chat</span>
                  </div>
                </button>

                <button
                  onClick={() => completeJob(job)}
                  className="group rounded-[22px] border border-emerald-200 bg-emerald-600 px-4 py-3.5 text-white shadow-[0_14px_30px_rgba(16,185,129,0.20)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-emerald-700 hover:shadow-[0_18px_36px_rgba(16,185,129,0.24)] active:scale-[0.99]"
                >
                  <div className="flex items-center justify-center gap-2">
                    <CheckSquare size={17} className="text-white" />
                    <span className="text-[14px] font-extrabold">Finalizar</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {job.status === 'completed' && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 py-3 text-center text-emerald-700 font-bold">
            ✅ Trabajo finalizado
          </div>
        )}
      </div>
    </motion.div>
  );
})}
          </section>
        )}

        {/* CHAT MODAL */}
        <AnimatePresence>
          {isChatOpen && selectedJob && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end z-[80]"
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 18 }}
                className="bg-white rounded-t-[32px] w-full max-w-md shadow-[0_-20px_60px_rgba(0,0,0,0.20)] overflow-hidden"
              >
                <div className="px-4 py-4 border-b border-gray-100 bg-white">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setIsChatOpen(false)}
                      className="flex items-center gap-1 text-gray-600 hover:text-red-500"
                    >
                      <ChevronLeft size={18} /> Volver
                    </button>

                    <div className="text-center">
                      <h2 className="font-extrabold text-gray-800">
                        {selectedJob?.client?.full_name || 'Cliente'}
                      </h2>
                      <div className="text-[11px] text-emerald-600 font-semibold">Canal activo</div>
                    </div>

                    <button
  onClick={() => {
    openGoogleMaps(selectedJob.client_lat, selectedJob.client_lng);
  }}
  className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800 text-sm font-semibold"
>
  <Map size={16} /> Mapa
</button>
                  </div>

                  {clientTyping && (
  <div className="mt-2 flex items-center justify-center gap-2 text-xs text-emerald-600 font-semibold animate-pulse">
    <span className="inline-flex gap-1">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
    </span>
    <span>{selectedJob?.client?.full_name || 'El cliente'} está escribiendo…</span>
  </div>
)}
                </div>
{selectedJob && (() => {
  const details = parseJobRequestDetails(selectedJob.description);

  return (
    <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-cyan-50 text-sm text-gray-700">
      <div className="font-extrabold text-emerald-700">
        {details.serviceLabel || selectedJob?.service_type || 'Servicio'}
      </div>

      {(details.requestedDate || details.requestedTime) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {details.requestedDate && (
            <span className="rounded-full border border-cyan-200 bg-white px-3 py-1 text-[11px] font-bold text-cyan-700">
              📅 {details.requestedDate}
            </span>
          )}
          {details.requestedTime && (
            <span className="rounded-full border border-cyan-200 bg-white px-3 py-1 text-[11px] font-bold text-cyan-700">
              ⏰ {details.requestedTime}
            </span>
          )}
        </div>
      )}

      {details.notes && (
        <p className="mt-2 text-[12px] leading-5 text-gray-600">
          {details.notes}
        </p>
      )}
    </div>
  );
})()}

                <div className="flex flex-col h-[70vh] bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                    {messages.map((m) => {
                      const mine = m.sender_id === user?.id;
                      return (
                        <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[82%] px-4 py-3 rounded-2xl text-sm shadow-sm ${
                              mine
                                ? 'bg-gradient-to-r from-emerald-500 to-cyan-400 text-white rounded-br-md'
                                : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'
                            }`}
                          >
                            {m.text}
                            <div
                              className={`text-[10px] mt-1 opacity-75 ${
                                mine ? 'text-white' : 'text-gray-500'
                              }`}
                            >
                              {new Date(m.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>

                  <form
                    className="p-3 border-t border-gray-100 bg-white flex gap-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await sendMessage();
                    }}
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Escribí un mensaje…"
                      className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-400 border border-gray-200"
                    />
                    <button
                      disabled={sending}
                      className="h-12 w-12 flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-400 text-white font-semibold hover:from-emerald-600 hover:to-cyan-500 transition disabled:opacity-60"
                    >
                      <SendHorizontal size={18} />
                    </button>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
            {/* PREVIEW MAP MODAL PRO */}
      <AnimatePresence>
        {previewMapOpen && previewTarget && (
                   <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-black/70"
          >
            <motion.div
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.01 }}
              transition={{ duration: 0.2 }}
              className="relative h-[100dvh] w-full overflow-hidden bg-black"
            >
              {/* MAPA FULL */}
              <div className="absolute inset-0 z-0">
                <MapContainer
  whenReady={(e) => {
    setTimeout(() => {
      e.target.invalidateSize();
    }, 350);
  }}
  center={[previewTarget.lat, previewTarget.lng]}
  zoom={16}
  scrollWheelZoom={true}
  style={{ height: '100%', width: '100%' }}
>
  <TileLayer
    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
    attribution="&copy; OpenStreetMap contributors &copy; CARTO"
  />

  {previewRoute && (
    <>
      <Polyline
        positions={previewRoute}
        pathOptions={{
          color: '#34d399',
          weight: 14,
          opacity: 0.18,
          lineJoin: 'round',
          lineCap: 'round',
        }}
      />

      <Polyline
        positions={previewRoute}
        pathOptions={{
          color: '#10b981',
          weight: 8,
          opacity: 0.35,
          lineJoin: 'round',
          lineCap: 'round',
        }}
      />

      <Polyline
        positions={previewRoute}
        pathOptions={{
          color: '#059669',
          weight: 5,
          opacity: 0.95,
          lineJoin: 'round',
          lineCap: 'round',
          dashArray: '10 10',
        }}
      />
    </>
  )}

  <CircleMarker
    center={[previewTarget.lat, previewTarget.lng]}
    radius={13}
    pathOptions={{
      color: '#ffffff',
      weight: 4,
      fillColor: '#ef4444',
      fillOpacity: 1,
    }}
  >
    <Popup>
      <div className="min-w-[180px]">
        <div className="font-extrabold text-gray-800">Cliente</div>
        <div className="text-sm text-gray-500 mt-1">
          {selectedJob?.client?.full_name || 'Ubicación del cliente'}
        </div>
      </div>
    </Popup>
  </CircleMarker>

  {workerLocation?.lat != null && workerLocation?.lng != null && (
    <>
      <CircleMarker
        center={[Number(workerLocation.lat), Number(workerLocation.lng)]}
        radius={11}
        pathOptions={{
          color: '#ffffff',
          weight: 4,
          fillColor: '#10b981',
          fillOpacity: 1,
        }}
      >
        <Popup>
          <div className="min-w-[180px]">
            <div className="font-extrabold text-gray-800">Tu ubicación</div>
            <div className="text-sm text-gray-500 mt-1">
              Posición actual del trabajador
            </div>
          </div>
        </Popup>
      </CircleMarker>

      <Circle
        center={[Number(workerLocation.lat), Number(workerLocation.lng)]}
        radius={55}
        pathOptions={{
          color: '#10b981',
          weight: 1,
          fillColor: '#10b981',
          fillOpacity: 0.12,
        }}
      />
    </>
  )}
</MapContainer>
              </div>

                           {/* TOP ACTIONS */}
              <div className="pointer-events-none absolute inset-x-0 top-0 z-[1200]">
                <div className="flex items-start justify-between p-4">
                  <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.20)] backdrop-blur">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    <span className="text-[13px] font-bold text-gray-800">
                      Ubicación del cliente
                    </span>
                  </div>

                 <button
  onClick={() => {
    setPreviewMapOpen(false);
    setPreviewTarget(null);
    setPreviewRoute(null);
  }}
                    className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-gray-700 shadow-[0_10px_30px_rgba(0,0,0,0.20)] backdrop-blur hover:bg-white"
                  >
                    <XCircle size={22} />
                  </button>
                </div>
              </div>

                           {/* GRADIENTE INFERIOR */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/55 via-black/20 to-transparent z-[1150]" />

             {/* BOTTOM SHEET PRO */}
<div className="absolute inset-x-0 bottom-0 z-[1300] px-3 pb-3">
  <motion.div
    initial={{ y: 360, opacity: 0 }}
    animate={{ y: sheetSnapMeta.y, opacity: 1, height: sheetSnapMeta.height }}
    exit={{ y: 320, opacity: 0 }}
    transition={{ type: 'spring', stiffness: 260, damping: 28 }}
    drag="y"
    dragConstraints={{ top: 0, bottom: 0 }}
    dragElastic={0.08}
    onDragEnd={(e, info) => {
      const y = info.offset.y;

      if (y > 120) {
        setSheetSnap('mini');
        return;
      }

      if (y < -120) {
        setSheetSnap('full');
        return;
      }

      setSheetSnap('mid');
    }}
    className="mx-auto flex w-full max-w-md flex-col overflow-hidden rounded-[32px] border border-white/40 bg-white/72 shadow-[0_30px_80px_rgba(0,0,0,0.26)] backdrop-blur-2xl"
    style={{
      background:
        'linear-gradient(180deg, rgba(255,255,255,0.86) 0%, rgba(255,255,255,0.74) 100%)',
    }}
  >
    <div className="relative shrink-0 px-4 pt-3 pb-2">
      <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-gray-300/90" />

      <div className="flex items-start gap-3">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-md" />
          <img
            src={selectedJob?.client?.avatar_url || '/avatar-fallback.png'}
            alt={selectedJob?.client?.full_name || 'Cliente'}
            className="relative h-14 w-14 rounded-full border-2 border-emerald-200 object-cover shadow-[0_10px_24px_rgba(16,185,129,0.18)]"
          />
          <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-red-500" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-[18px] font-extrabold tracking-tight text-gray-900">
            {selectedJob?.client?.full_name || 'Cliente'}
          </div>
          <div className="mt-0.5 text-[12px] font-medium text-gray-500">
            {selectedJob?.service_type || 'Servicio general'}
          </div>

          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
              Servicio activo
            </span>

            <span className="inline-flex items-center rounded-full border border-white/60 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-gray-600 backdrop-blur">
              Vista interna
            </span>
          </div>
        </div>

        <div className="rounded-[20px] border border-emerald-100 bg-emerald-50/90 px-3 py-2 text-right shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wide text-emerald-600">
            Tarifa
          </div>
          <div className="text-[15px] font-extrabold text-gray-900">
            {selectedJob?.price
              ? `₲${Number(selectedJob.price).toLocaleString('es-PY')}/h`
              : 'A definir'}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          onClick={() => setSheetSnap('mini')}
          className={`rounded-full px-3 py-2 text-[11px] font-bold transition ${
            sheetSnap === 'mini'
              ? 'bg-gray-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.24)]'
              : 'border border-gray-200 bg-white/75 text-gray-600'
          }`}
        >
          Mini
        </button>

        <button
          onClick={() => setSheetSnap('mid')}
          className={`rounded-full px-3 py-2 text-[11px] font-bold transition ${
            sheetSnap === 'mid'
              ? 'bg-emerald-600 text-white shadow-[0_10px_24px_rgba(16,185,129,0.24)]'
              : 'border border-gray-200 bg-white/75 text-gray-600'
          }`}
        >
          Medio
        </button>

        <button
          onClick={() => setSheetSnap('full')}
          className={`rounded-full px-3 py-2 text-[11px] font-bold transition ${
            sheetSnap === 'full'
              ? 'bg-cyan-600 text-white shadow-[0_10px_24px_rgba(6,182,212,0.24)]'
              : 'border border-gray-200 bg-white/75 text-gray-600'
          }`}
        >
          Full
        </button>
      </div>
    </div>

    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[22px] border border-white/60 bg-white/62 px-3 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
            Estado
          </div>
          <div className="mt-1 text-sm font-extrabold text-gray-800">
            En camino al cliente
          </div>
        </div>

        <div className="rounded-[22px] border border-white/60 bg-white/62 px-3 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
            Vista
          </div>
          <div className="mt-1 text-sm font-extrabold text-gray-800">
            Interna de ManosYA
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-[24px] border border-white/60 bg-white/60 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
              Cliente
            </div>
            <div className="mt-1 text-sm font-extrabold text-gray-800">
              {selectedJob?.client?.full_name || 'Cliente'}
            </div>
          </div>

          <div className="text-right">
            <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
              Tipo
            </div>
            <div className="mt-1 text-sm font-extrabold text-gray-800">
              {selectedJob?.service_type || 'General'}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <button
          onClick={() => setSheetSnap(sheetSnap === 'full' ? 'mid' : 'full')}
          className="w-full rounded-[22px] bg-gradient-to-r from-slate-900 via-emerald-700 to-cyan-500 py-3.5 text-white font-extrabold shadow-[0_18px_40px_rgba(16,185,129,0.22)] transition hover:scale-[1.01] active:scale-[0.99]"
        >
          {sheetSnap === 'full' ? 'Vista compacta' : 'Ver detalles'}
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              setPreviewMapOpen(false);
              if (selectedJob) openChat(selectedJob);
            }}
            className="group relative w-full rounded-[22px] border border-white/60 bg-white/78 py-3 text-gray-800 font-bold shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur transition hover:bg-white"
          >
            <div className="flex items-center justify-center gap-2">
              <div className="relative">
                <MessageCircle
                  size={18}
                  className="text-gray-700 transition-colors group-hover:text-emerald-700"
                />

                {hasUnread && unreadCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-extrabold text-white shadow-[0_8px_18px_rgba(239,68,68,0.35)] ring-2 ring-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>

              <span>Chat</span>
            </div>
          </button>

         <button
  onClick={() => {
    setPreviewMapOpen(false);
    setPreviewTarget(null);
    setPreviewRoute(null);
  }}
  className="w-full rounded-[22px] border border-white/60 bg-white/78 py-3 text-gray-700 font-bold shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur transition hover:bg-white"
>
  Cerrar
</button>
        </div>
      </div>

      {sheetSnap === 'full' && (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 18 }}
          className="mt-4 space-y-3"
        >
          <div className="rounded-[24px] border border-white/60 bg-white/62 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur">
            <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
              Resumen del servicio
            </div>
            <div className="mt-2 text-[15px] font-bold text-gray-900">
              {selectedJob?.description || 'Solicitud generada desde ManosYA.'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[22px] border border-white/60 bg-white/62 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur">
              <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                Modalidad
              </div>
              <div className="mt-1 text-sm font-extrabold text-gray-800">
                Atención inmediata
              </div>
            </div>

            <div className="rounded-[22px] border border-white/60 bg-white/62 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur">
              <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                Sistema
              </div>
              <div className="mt-1 text-sm font-extrabold text-gray-800">
                ManosYA Live
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  </motion.div>
</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* NAVBAR */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="max-w-screen-md mx-auto px-4 pb-3">
          <div className="rounded-[28px] border border-gray-200 bg-white/95 backdrop-blur-xl shadow-[0_18px_40px_rgba(15,23,42,0.10)] px-3 py-2 flex justify-around">
            <button className="flex flex-col items-center text-emerald-600 min-w-[70px] py-2">
              <Home size={18} />
              <span className="text-[11px] font-bold mt-1">Trabajos</span>
            </button>

                        <button
              onClick={async () => {
                setHasUnread(false);
                setUnreadCount(0);

                if (!selectedJob) {
                  const activeJob = jobs.find((j) => j.status === 'accepted') || jobs[0];
                  if (activeJob) {
                    await openChat(activeJob);
                  } else {
                    toast.info('No tenés chats activos actualmente');
                  }
                } else {
                  setIsChatOpen(true);
                }
              }}
              className="relative flex flex-col items-center text-gray-500 min-w-[70px] py-2"
            >
              <MessageCircle size={18} />

              {unreadCount > 0 && (
                <span className="absolute -top-0.5 right-3 min-w-[20px] h-5 px-1 bg-red-500 text-white text-[11px] font-extrabold rounded-full flex items-center justify-center shadow-md animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}

              <span className="text-[11px] font-bold mt-1">Chats</span>
            </button>

            <button
  onClick={() => router.push('/worker/onboard')}
  className="flex flex-col items-center text-gray-500 min-w-[70px] py-2"
>
  <User2 size={18} />
  <span className="text-[11px] font-bold mt-1">Perfil</span>
</button>
          </div>
        </div>
      </div>

      {/* BOTÓN MAPA */}
      <button
        onClick={() => setMapOpen(true)}
        className="fixed bottom-24 left-4 z-50 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-cyan-500 text-white px-4 py-3 shadow-[0_16px_34px_rgba(16,185,129,0.24)] font-bold"
      >
        <Map size={18} />
        Zonas
      </button>

      {/* MAP MODAL */}
      <AnimatePresence>
        {mapOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex justify-center items-end"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 18 }}
              className="bg-white rounded-t-[32px] w-full max-w-md shadow-[0_-20px_60px_rgba(0,0,0,0.20)] p-2"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div>
                  <h3 className="font-extrabold text-gray-800">Zonas activas</h3>
                  <p className="text-xs text-gray-500">Mapa estratégico de alta circulación</p>
                </div>

                <button onClick={() => setMapOpen(false)} className="text-gray-600 hover:text-red-500">
                  <XCircle size={22} />
                </button>
              </div>

              <div
                className="w-full rounded-2xl overflow-hidden mt-2 border border-gray-200"
                style={{ height: '70vh', minHeight: '380px', position: 'relative' }}
              >
                <MapContainer
  whenReady={(e) => {
    setTimeout(() => {
      e.target.invalidateSize();
    }, 350);
  }}
  center={[-25.5093, -54.6111]}
  zoom={12}
  scrollWheelZoom={true}
  style={{ height: '100%', width: '100%' }}
>
  <TileLayer
    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
    attribution="&copy; OpenStreetMap contributors &copy; CARTO"
  />

  {HOTSPOTS.map((p) => {
    const outerRadius = Math.max(180, p.intensity * 55);
    const innerRadius = Math.max(10, p.intensity + 6);
    const zoneColor =
      p.intensity >= 9 ? '#ef4444' : p.intensity >= 7 ? '#f59e0b' : '#10b981';

    return (
      <Fragment key={p.name}>
        <Circle
          center={[p.lat, p.lng]}
          radius={outerRadius}
          pathOptions={{
            color: zoneColor,
            fillColor: zoneColor,
            fillOpacity: 0.14,
            weight: 2,
          }}
        />

        <CircleMarker
          center={[p.lat, p.lng]}
          radius={innerRadius}
          pathOptions={{
            color: '#ffffff',
            weight: 3,
            fillColor: zoneColor,
            fillOpacity: 0.95,
          }}
        >
          <Popup>
            <div className="min-w-[180px]">
              <div className="font-extrabold text-gray-800">{p.name}</div>
              <div className="text-sm text-gray-500 mt-1">
                Zona de alta circulación
              </div>
              <div className="mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border bg-white text-gray-700 border-gray-200">
                Intensidad: {p.intensity}/10
              </div>
            </div>
          </Popup>
        </CircleMarker>
      </Fragment>
    );
  })}
</MapContainer>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Bot360
        stats={{
          totalWorkers: jobs.length,
          jobsCompleted: jobs.filter((j) => j.status === 'completed').length,
          efficiency: jobs.length > 0 ? jobs.filter((j) => j.status === 'completed').length / jobs.length : 0,
        }}
        workerStatus={status}
      />
    </motion.div>
  );
}

/* =========================
   UI MINI COMPONENTS
========================= */

function StatCard({ label, value, tone = 'gray' }) {
  const toneMap = {
    emerald: 'border-emerald-100 bg-white text-emerald-700',
    cyan: 'border-cyan-100 bg-white text-cyan-700',
    gray: 'border-gray-200 bg-white text-gray-700',
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneMap[tone]}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function MiniInfo({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-3">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-gray-700">{value}</div>
    </div>
  );
}

/* =========================
   BOT 360
========================= */

function Bot360({ stats = {}, workerStatus = 'available' }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [mode, setMode] = useState('motivador');
  const [showParty, setShowParty] = useState(false);

  const memoryRef = useRef({
    greeted: false,
    lastTopic: null,
    motivationCount: 0,
    lastSummary: null,
  });

  const COLORS = {
    motivador: 'from-emerald-500 to-cyan-400',
    analitico: 'from-sky-500 to-blue-600',
    zen: 'from-lime-400 to-emerald-500',
    humoristico: 'from-pink-400 to-rose-600',
  };

  const MESSAGES = {
    motivador: [
      '💪 Che ra’a, cada día que salís a laburar, estás construyendo tu propio futuro.',
      '🔥 Ñandejára bendice al que trabaja con el corazón. ¡Vos estás dejando huella!',
      '🌞 Aunque no te digan, tu esfuerzo se nota. Rodolfo te ve, y te aplaude desde su teclado 🐾.',
      '🐾 No aflojés, que la suerte llega a los que no se rinden.',
      '💚 No hay trabajo chico cuando se hace con ganas. Vos sos grande.',
    ],
    humoristico: [
      '😹 Si trabajar fuera delito, ya tendrías cadena perpetua con tereré libre.',
      '🙀 Con ese ritmo te contrata Itaipú directo.',
      '😼 “Modo leyenda” activado: ¡rendimiento nivel guaraní power! 💥',
      '🐾 Rodolfo vio tus números y dijo: “ha upéicha mismo, mi héroe del esfuerzo”.',
    ],
    consejos: [
      '🧠 Consejo del día: saludá siempre con una sonrisa, eso vale más que mil currículums.',
      '🌱 No corras, che amigo, lo importante es avanzar constante.',
      '💬 Escuchá bien al cliente, y tratale como te gustaría que te traten.',
      '🚀 Mantenete visible, respondé rápido, y los pedidos van a venir solitos.',
      '💡 Recordá: el descanso también es parte del trabajo.',
    ],
  };

  useEffect(() => {
    let newMode = 'motivador';
    const hour = new Date().getHours();

    if (workerStatus === 'busy') newMode = 'analitico';
    else if (workerStatus === 'paused') newMode = 'zen';
    else if (hour >= 19) newMode = 'zen';
    else if (stats?.jobsCompleted > 20) newMode = 'humoristico';
    else if (stats?.jobsCompleted > 10) newMode = 'analitico';

    setMode(newMode);
  }, [workerStatus, stats]);

  useEffect(() => {
    if (stats?.jobsCompleted && stats.jobsCompleted % 10 === 0 && stats.jobsCompleted > 0) {
      setShowParty(true);
      simulateBotTyping(
        `🎉 ¡Epa che! Ya hiciste ${stats.jobsCompleted} trabajos. Rodolfo está bailando polka en tu honor 💃🐾`
      );
      const timer = setTimeout(() => setShowParty(false), 7000);
      return () => clearTimeout(timer);
    }
  }, [stats.jobsCompleted]);

  function simulateBotTyping(text, delay = 1000) {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((m) => [...m, { from: 'bot', text }]);
    }, delay);
  }

  const hasWelcomedRef = useRef(false);
  useEffect(() => {
    if (hasWelcomedRef.current) return;
    hasWelcomedRef.current = true;

    const hour = new Date().getHours();
    let saludo = '';
    let cierre = '';
    let extra = '';

    if (hour < 12) {
      saludo = '☀️ Buen día, compa. A empezar con el mate y buena energía.';
      cierre = 'Hoy es un buen día para avanzar 💪';
    } else if (hour < 18) {
      saludo = '🧉 Buenas tardes, che. Con tereré en mano seguimos firmes.';
      cierre = 'Cada trabajo te acerca más a tus metas 💚';
    } else {
      saludo = '🌙 Buenas noches, trabajador/a del alma.';
      cierre = 'Descansá bien, mañana seguimos con todo 🌿';
    }

    if (workerStatus === 'available') saludo += ' Estás disponible, listo/a para ayudar y ganar.';
    else if (workerStatus === 'busy') saludo += ' Estás ocupado, pero Rodolfo te acompaña.';
    else if (workerStatus === 'paused') saludo += ' Estás en pausa, tomá un respiro y recargá energía.';

    const jobs = stats?.jobsCompleted || 0;
    if (jobs === 0) extra = '🌱 Todavía no arrancaste, pero cada conexión ya es un paso adelante.';
    else if (jobs < 5) extra = `💪 Ya completaste ${jobs} trabajo${jobs > 1 ? 's' : ''}. Buen comienzo.`;
    else if (jobs < 15) extra = `🔥 Llevás ${jobs} trabajos hechos, se nota el compromiso.`;
    else if (jobs < 30) extra = `🚀 ${jobs} trabajos completados. Estás dejando huella, che.`;
    else extra = `🏆 ${jobs} trabajos… ¡una máquina total!`;

    simulateBotTyping(saludo, 600);
    setTimeout(() => simulateBotTyping(extra, 1400), 1000);
    setTimeout(() => simulateBotTyping(cierre, 2000), 1600);

    setTimeout(() => {
      simulateBotTyping(`📋 Podés decirme:
• "¿Cuántos trabajos hice?"
• "¿Cómo voy?"
• "Mi último trabajo"
• "Cuánto gané"
• "Necesito motivación"
• "Dame un consejo"`);
    }, 3200);
  }, [workerStatus, stats]);

  function handleInput() {
    if (!input.trim()) return;
    const q = input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    setMessages((m) => [...m, { from: 'user', text: input }]);
    setInput('');
    memoryRef.current.lastTopic = q;

    if (q.includes('hola') || q.includes('buenas') || q.includes('rodolfo')) {
      simulateBotTyping('😸 ¡Hola che! Rodolfo al servicio. Listo para darte empuje y ánimo 💪.');
      return;
    }

    if (q.includes('trabajo') && (q.includes('cuanto') || q.includes('hice') || q.includes('complet'))) {
      const total = stats?.jobsCompleted || 0;
      const msg =
        total === 0
          ? '😺 Todavía sin trabajos completados, pero tranquilo, que el primero llega.'
          : `📋 Llevás ${total} trabajo${total !== 1 ? 's' : ''} completado${total !== 1 ? 's' : ''}.`;
      simulateBotTyping(msg);
      return;
    }

    if (q.includes('como voy') || q.includes('rendimiento') || q.includes('eficiencia')) {
      const eff = ((stats?.efficiency || 0) * 100).toFixed(1);
      let msg = `📊 Tu eficiencia actual es del ${eff}%. `;
      if (eff > 85) msg += '🔥 Excelente nivel.';
      else if (eff > 50) msg += '💪 Buen ritmo.';
      else msg += '🌱 Vamos de a poco.';
      simulateBotTyping(msg);
      return;
    }

    if (q.includes('gane') || q.includes('ganancia') || q.includes('plata') || q.includes('dinero')) {
      const earn = stats?.earnings || 0;
      simulateBotTyping(`💰 Hasta ahora juntaste ₲${earn.toLocaleString('es-PY')}.`);
      return;
    }

    if (q.includes('motivacion') || q.includes('frase') || q.includes('animo')) {
      const frases = [...MESSAGES.motivador, ...MESSAGES.humoristico];
      const frase = frases[Math.floor(Math.random() * frases.length)];
      simulateBotTyping(frase);
      return;
    }

    if (q.includes('consejo') || q.includes('mejorar')) {
      const consejo = MESSAGES.consejos[Math.floor(Math.random() * MESSAGES.consejos.length)];
      simulateBotTyping(consejo);
      return;
    }

    const fallback = [
      '🐾 No entendí del todo, pero sé que sos un luchador nato.',
      '💚 A veces no hay que hablar mucho, solo seguir metiéndole ganas.',
      '😸 Si querés ver tu resumen, escribí "mi rendimiento" o "progreso".',
    ];

    simulateBotTyping(fallback[Math.floor(Math.random() * fallback.length)]);
  }

  useEffect(() => {
    try {
      if (!open) return;
      if (!stats || typeof stats !== 'object') return;
      if (!memoryRef.current) return;

      const alreadyShown = memoryRef.current.lastSummary;
      if ((stats.jobsCompleted || 0) > 0 && !alreadyShown) {
        const eff = (((stats.efficiency || 0) * 100) || 0).toFixed(1);
        const earn = stats.earnings || 0;

        simulateBotTyping(
          `📊 Resumen rápido:
• Completados: ${stats.jobsCompleted || 0}
• Eficiencia: ${eff}%
• Ganancias: ₲${Number(earn).toLocaleString('es-PY')}
🐾 Seguimos metiendo garra, compa 💪`
        );

        memoryRef.current.lastSummary = new Date().toISOString();
      }
    } catch (err) {
      console.warn('Error en mini analizador:', err);
    }
  }, [open, stats]);

  return (
    <div className="fixed bottom-24 right-5 z-[60]">
      {showParty && (
        <div className="fixed inset-0 bg-emerald-100/70 backdrop-blur-sm flex flex-col items-center justify-center z-[70] animate-fade-in">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="text-5xl mb-2">🎊</div>
            <div className="text-2xl font-bold text-emerald-700">¡Excelente trabajo!</div>
            <p className="text-emerald-600 font-medium mt-1">
              Tu esfuerzo deja huella. Seguí así 💚
            </p>
          </motion.div>
        </div>
      )}

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="bg-gradient-to-r from-emerald-500 to-cyan-400 text-white rounded-full px-4 py-4 shadow-[0_18px_34px_rgba(16,185,129,0.28)] hover:scale-105 transition flex items-center gap-2 font-extrabold"
        >
          <motion.span animate={{ rotate: [0, 10, 0, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
            <Bot size={18} />
          </motion.span>
          <span>360Bot</span>
        </button>
      )}

      {open && (
        <div className="bg-white rounded-[28px] shadow-[0_24px_70px_rgba(0,0,0,0.18)] border border-gray-200 w-80 h-[500px] flex flex-col overflow-hidden">
          <div
            className={`p-4 bg-gradient-to-r ${COLORS[mode]} text-white font-semibold rounded-t-[28px] flex justify-between items-center`}
          >
            <div className="flex items-center gap-2">
              <motion.span animate={{ rotate: [0, 10, 0, -10, 0] }} transition={{ repeat: Infinity, duration: 3 }}>
                <Bot size={18} />
              </motion.span>
              <span className="font-extrabold">360Bot</span>
            </div>
            <button onClick={() => setOpen(false)} className="hover:opacity-80">
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 bg-[linear-gradient(180deg,#f8fffd_0%,#ffffff_100%)] space-y-2 text-sm">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`px-3 py-2 rounded-2xl max-w-[88%] ${
                  m.from === 'bot'
                    ? 'bg-emerald-50 text-gray-800 border border-emerald-100'
                    : 'bg-gradient-to-r from-emerald-500 to-cyan-400 text-white self-end ml-auto'
                }`}
              >
                {m.text}
              </div>
            ))}
            {typing && <div className="italic text-gray-400 text-xs animate-pulse">Rodolfo está escribiendo...</div>}
          </div>

          <div className="flex items-center border-t bg-white p-3 gap-2">
            <input
              className="flex-1 text-sm border rounded-2xl px-3 py-3 outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50"
              placeholder="Decile algo a Rodolfo..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInput()}
            />
            <button
              onClick={handleInput}
              className="bg-gradient-to-r from-emerald-500 to-cyan-400 text-white rounded-2xl p-3 hover:from-emerald-600 hover:to-cyan-500"
            >
              <SendHorizontal size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}