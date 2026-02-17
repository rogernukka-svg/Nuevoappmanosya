'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  SendHorizontal,
  ChevronLeft,
  CheckCircle2,
} from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { startRealtimeCore, stopRealtimeCore } from '@/lib/realtimeCore';


import { toast } from 'sonner';

const Circle = dynamic(() => import('react-leaflet').then(m => m.Circle), { ssr: false });
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false });
const MarkerClusterGroup = dynamic(() => import('react-leaflet-cluster').then(m => m.default), { ssr: false });
// 📍 Radio máximo visible y de filtrado (coherente en TODO el archivo)
const MAX_RADIUS_KM = 12;
const MAX_RADIUS_M = MAX_RADIUS_KM * 1000;


function mapAccentColor(worker) {
  const diffMin = (Date.now() - new Date(worker?.updated_at || Date.now()).getTime()) / 60000;
  return diffMin <= 30 ? '#10b981' : '#9ca3af';
}

function avatarIcon(url, worker) {
  if (typeof window === 'undefined') return null;
  const L = require('leaflet');
  const size = 52;
  const color = mapAccentColor(worker);

  // ✨ Nuevo: animación de rebote si el marcador está seleccionado
  const bounce = worker._selected
    ? 'animation:bounceMarker 0.8s ease-in-out infinite alternate;'
    : '';


  // 💫 Si acaba de actualizar su posición, mostrar efecto "ping"
  const pulse =
    worker._justUpdated
      ? `<div class="ping" style="
            position:absolute;
            inset:-10px;
            border-radius:50%;
            background:rgba(16,185,129,0.35);
            animation:pulseGreen 1s ease-out infinite;
         "></div>`
      : '';

    const online = isOnlineRecent(worker);

  const onlineBadge = online
    ? `<div style="
        position:absolute;
        top:-12px;
        left:50%;
        transform:translateX(-50%);
        background:linear-gradient(135deg,#10b981,#059669);
        color:white;
        font-weight:900;
        font-size:10px;
        padding:4px 10px;
        border-radius:999px;
        border:2px solid rgba(255,255,255,.95);
        box-shadow:0 10px 24px rgba(16,185,129,.35), 0 6px 14px rgba(0,0,0,.12);
        letter-spacing:.5px;
        text-transform:uppercase;
        z-index:5;
        white-space:nowrap;
      ">
        <span style="display:inline-flex;align-items:center;gap:6px;">
          <span style="
            width:8px;height:8px;border-radius:999px;
            background:#34d399;
            box-shadow:0 0 0 6px rgba(52,211,153,.18);
            animation:onlineDot 1.2s ease-in-out infinite;
          "></span>
          EN LÍNEA
        </span>
      </div>`
    : '';

  const html = `
    <div style="width:${size}px;height:${size}px;border-radius:50%;
      position:relative;background:#fff;overflow:visible;
      box-shadow:0 10px 26px rgba(0,0,0,.14);
      ${bounce}">
      ${onlineBadge}
      ${pulse}
      <div style="position:absolute;inset:-4px;border-radius:50%;
        border:3px solid ${color};
        filter:drop-shadow(0 0 10px ${color}50);"></div>

      <div style="
        position:absolute;
        inset:-10px;
        border-radius:50%;
        background:radial-gradient(circle, rgba(16,185,129,.12) 0%, rgba(16,185,129,0) 70%);
        pointer-events:none;
      "></div>

      <img src="${url || '/avatar-fallback.png'}"
        onerror="this.src='/avatar-fallback.png'"
        style="
          position:absolute;
          top:0; left:0;
          width:100%; height:100%;
          object-fit:cover;
          object-position:center;
          border-radius:50%;
          aspect-ratio:1/1;
        "
      />
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
/* 🎯 Animación rebote marcador seleccionado */
if (typeof window !== 'undefined') {
  const styleBounce = document.createElement('style');
  styleBounce.innerHTML = `
    @keyframes bounceMarker {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
  `;
  if (!document.head.querySelector('[data-bounce-marker]')) {
    styleBounce.setAttribute('data-bounce-marker', '1');
    document.head.appendChild(styleBounce);
  }
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
/* 💫 CSS global dinámico adicional para animaciones */
if (typeof window !== 'undefined') {
  const style2 = document.createElement('style');
    style2.innerHTML = `
    /* 💚 animación para actualización (ping en marcadores) */
    @keyframes pulseGreen {
      0% { transform: scale(0.6); opacity: 0.7; }
      50% { transform: scale(1.3); opacity: 0.3; }
      100% { transform: scale(0.6); opacity: 0; }
    }

    /* 🟢 punto online del badge */
    @keyframes onlineDot {
      0%   { transform: scale(1);   opacity: 1; }
      50%  { transform: scale(1.25); opacity: .85; }
      100% { transform: scale(1);   opacity: 1; }
    }
  `;
  if (!document.head.querySelector('style[data-manosya-pulse-green]')) {
    style2.setAttribute('data-manosya-pulse-green', '1');
    document.head.appendChild(style2);
  }
}


function minutesSince(dateString) {
  if (!dateString) return null;
  const diffMs = Date.now() - new Date(dateString).getTime();
  return Math.floor(diffMs / 60000);
}

// ✅ ONLINE si se conectó / actualizó entre 1 y 30 minutos
function isOnlineRecent(worker) {
  const mins = minutesSince(worker?.updated_at);
  if (mins == null) return false;

  // ✅ ONLINE también si actualizó "hace 0 min"
  return mins >= 0 && mins <= 30;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function getDriverTier(selected) {
  // Ajustá estos campos según tu DB/view:
  // plan_tier | tier | membership | driver_tier
  const t = (selected?.plan_tier || selected?.tier || selected?.membership || selected?.driver_tier || 'normal')
    .toString()
    .toLowerCase();

  if (t.includes('prem')) return 'premium';
  if (t.includes('eco')) return 'eco';
  return 'normal';
}

function avatarRingClassForTier(tier) {
  if (tier === 'premium') return 'border-yellow-400';  // dorado
  if (tier === 'eco') return 'border-emerald-500';     // verde
  return 'border-gray-300';                            // plateado
}

function formatKm(km) {
  if (!Number.isFinite(km)) return '—';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}
function distanceFromClientKm(meLatNum, meLonNum, worker) {
  const wLat = Number(worker?.lat);
  const wLng = Number(worker?.lng ?? worker?.lon ?? worker?.long);

  if (!Number.isFinite(meLatNum) || !Number.isFinite(meLonNum)) return null;
  if (!Number.isFinite(wLat) || !Number.isFinite(wLng)) return null;

  return haversineKm(meLatNum, meLonNum, wLat, wLng);
}
function animateMarkerMove(markerRef, fromLat, fromLng, toLat, toLng, duration = 900) {
  try {
    const marker = markerRef?.getLatLng ? markerRef : markerRef?.leafletElement;
    if (!marker?.setLatLng) return;

    const start = performance.now();

    const step = (now) => {
      const progress = Math.min(1, (now - start) / duration);

      const lat = fromLat + (toLat - fromLat) * progress;
      const lng = fromLng + (toLng - fromLng) * progress;

      marker.setLatLng([lat, lng]);

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  } catch (e) {
    console.warn("animateMarkerMove error:", e);
  }
}
export default function MapPage() {
  const supabase = getSupabase();
  const router = useRouter();
  const mapRef = useRef(null);

  // 🔥 NECESARIO para createPortal (evita error SSR)
  const [mounted, setMounted] = useState(false);

  // ✅ primero state que vas a usar en effects
  const [followMe, setFollowMe] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

   // ✅ refs
  const soundRef = useRef(null);
  const sendSoundRef = useRef(null);
  const gpsWatchIdRef = useRef(null);
  const markersRef = useRef({});
  const followMeRef = useRef(false);

  // ✅ FIX: evita recenter repetido / loops
  const gpsCenteredRef = useRef(false);

  // ✅ ahora sí: effects que dependen de followMe
  useEffect(() => {
    followMeRef.current = followMe;
  }, [followMe]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const DEFAULT_CENTER = [-23.4437, -58.4400]; // Centro real del país
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [me, setMe] = useState({ id: null, lat: null, lon: null });
  const [workers, setWorkers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);
  const [clusterOpen, setClusterOpen] = useState(false);
  const [clusterList, setClusterList] = useState([]);
// ✅ Coordenadas seguras (evita el bug: Number(null) = 0)
const toNumOrNull = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

const meLatNum = toNumOrNull(me?.lat);
const meLonNum = toNumOrNull(me?.lon);

const selLatNum = toNumOrNull(selected?.lat);
const selLngNum = toNumOrNull(selected?.lng ?? selected?.lon ?? selected?.long);

const hasMeCoords = meLatNum !== null && meLonNum !== null;
const hasSelCoords = selLatNum !== null && selLngNum !== null;

// ✅ valores “canon” para usar en todo el archivo
const selLat = selLatNum;
const selLng = selLngNum;
  const [showPrice, setShowPrice] = useState(false);
  const [route, setRoute] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
const distanceToSelectedKm =
  hasMeCoords && hasSelCoords
    ? haversineKm(meLatNum, meLonNum, selLatNum, selLngNum)
    : null;
  // 🟢 Panel estilo Uber (3 niveles)
const [panelLevel, setPanelLevel] = useState("hidden"); 
// niveles: "mini" | "mid" | "full"
const [servicesOpen, setServicesOpen] = useState(false);
const togglePanel = (level) => {
  setPanelLevel(level);
};


 // ✨ Nuevo: estado del job + chat
const [jobId, setJobId] = useState(null);
const [jobStatus, setJobStatus] = useState(null); // open | accepted | completed | cancelled | assigned ...
const [isChatOpen, setIsChatOpen] = useState(false);
const [chatId, setChatId] = useState(null);
const [messages, setMessages] = useState([]);
const [sending, setSending] = useState(false);
const inputRef = useRef(null);
const bottomRef = useRef(null);
const chatChannelRef = useRef(null);
const [gpsStatus, setGpsStatus] = useState('init'); // init | requesting | granted | denied | error
const [gpsError, setGpsError] = useState(null);

// eslint-disable-next-line no-unused-vars
const [tick, setTick] = useState(0);

useEffect(() => {
  const t = setInterval(() => setTick(x => x + 1), 60000); // cada 1 minuto
  return () => clearInterval(t);
}, []);
function stopGPSWatch() {
  if (typeof window === 'undefined') return;
  if (!navigator.geolocation) return;

  if (gpsWatchIdRef.current != null) {
    navigator.geolocation.clearWatch(gpsWatchIdRef.current);
    gpsWatchIdRef.current = null;
  }
}

function startWatchHighAccuracy() {
  if (typeof window === 'undefined') return;
  if (!navigator.geolocation) return;

  // 🔁 reinicia watcher
  stopGPSWatch();

  gpsWatchIdRef.current = navigator.geolocation.watchPosition(
    (p) => {
      const la = Number(p.coords.latitude);
      const lo = Number(p.coords.longitude);

      if (!Number.isFinite(la) || !Number.isFinite(lo)) return;

      // ✅ setMe UNA sola vez (evita duplicados)
      setMe((prev) => ({ ...prev, lat: la, lon: lo }));

      // ✅ usar ref para evitar "stale state" en el watcher
      if (followMeRef.current && mapRef.current) {
        mapRef.current.flyTo([la, lo], mapRef.current.getZoom(), { duration: 0.6 });
      }

      setGpsStatus('granted');
    },
    (err) => {
      console.warn('GPS watchPosition error:', err);
      // no spamear toast acá
    },
    {
      enableHighAccuracy: true,
      maximumAge: 3000,
      timeout: 25000,
    }
  );
}

async function requestGPS() {
  if (typeof window === 'undefined') return;

  if (!navigator.geolocation) {
    setGpsStatus('error');
    setGpsError('Este dispositivo no soporta GPS.');
    toast.error('Tu dispositivo no soporta GPS.');
    return;
  }

  setGpsStatus('requesting');
  setGpsError(null);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const timeoutValue = isIOS ? 35000 : 25000;

  const onSuccess = (pos) => {
    const lat = Number(pos.coords.latitude);
const lon = Number(pos.coords.longitude);
if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
  setGpsStatus('error');
  setGpsError('Ubicación inválida.');
  return;
}

    setMe((prev) => ({ ...prev, lat, lon }));
    setCenter([lat, lon]);

    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
        mapRef.current.flyTo([lat, lon], 13, { duration: 1.4 });
      }
    }, 400);

    gpsCenteredRef.current = true;
    setGpsStatus('granted');
    toast.success('📍 GPS activado');

    startWatchHighAccuracy();
  };

  const onFail = (err) => {
    console.warn('GPS error:', err);

    if (err.code === 1) {
      setGpsStatus('denied');
      setGpsError('Permiso denegado. Activá ubicación en Ajustes.');
      toast.error('Activá permisos de ubicación.');
      return;
    }

    setGpsStatus('error');
    setGpsError('No se pudo obtener ubicación.');
    toast.error('No se pudo obtener ubicación.');
  };

  navigator.geolocation.getCurrentPosition(onSuccess, onFail, {
    enableHighAccuracy: true,
    maximumAge: 10000,
    timeout: timeoutValue,
  });
}
// ✅ NO forzar GPS “agresivo” al montar.
// Hacemos un intento suave, pero el botón "Activar GPS" es el intento fuerte.
useEffect(() => {
  if (typeof window === 'undefined') return;

  let cancelled = false;

  async function initGPS() {
    // intento suave: no spamear permisos ni toasts
    try {
      if (!navigator.geolocation) {
        setGpsStatus('error');
        setGpsError('Este dispositivo no soporta GPS.');
        return;
      }

      // Si existe Permissions API, consultamos sin pedir popup
      if (navigator.permissions?.query) {
        const perm = await navigator.permissions.query({ name: 'geolocation' });

        if (cancelled) return;

        if (perm.state === 'granted') {
          // ✅ Ya está permitido: centramos y activamos watch
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (cancelled) return;
              const lat = Number(pos.coords.latitude);
              const lon = Number(pos.coords.longitude);
              if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

              setMe((prev) => ({ ...prev, lat, lon }));
              setCenter([lat, lon]);
              setGpsStatus('granted');

              setTimeout(() => {
                mapRef.current?.invalidateSize?.();
                mapRef.current?.flyTo?.([lat, lon], 13, { duration: 1.2 });
              }, 250);

              gpsCenteredRef.current = true;
              startWatchHighAccuracy();
            },
            () => {
              // si falla igual, dejamos que el usuario toque "Activar GPS"
              setGpsStatus('error');
              setGpsError('No se pudo obtener ubicación.');
            },
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 25000 }
          );
          return;
        }

        if (perm.state === 'denied') {
          setGpsStatus('denied');
          setGpsError('Permiso denegado. Activá ubicación en Ajustes.');
          return;
        }

        // perm.state === 'prompt' → NO pedimos todavía (esperamos el botón)
        setGpsStatus('init');
        return;
      }

      // Si no hay permissions API, hacemos un intento suave SIN toast
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          const lat = Number(pos.coords.latitude);
          const lon = Number(pos.coords.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

          setMe((prev) => ({ ...prev, lat, lon }));
          setCenter([lat, lon]);
          setGpsStatus('granted');

          setTimeout(() => {
            mapRef.current?.invalidateSize?.();
            mapRef.current?.flyTo?.([lat, lon], 13, { duration: 1.2 });
          }, 250);

          gpsCenteredRef.current = true;
          startWatchHighAccuracy();
        },
        () => {
          // sin permissions API, no sabemos si negó o solo falló → dejamos banner
          setGpsStatus('init');
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
      );
    } catch {
      setGpsStatus('init');
    }
  }

  initGPS();

  return () => {
    cancelled = true;
    stopGPSWatch();
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
// ✅ Reintento de centrado: cuando el mapa ya existe y el GPS ya llegó
useEffect(() => {
  if (gpsCenteredRef.current) return;
  if (!mapRef.current) return;
  if (!hasMeCoords) return;

  gpsCenteredRef.current = true;

  mapRef.current.flyTo([meLatNum, meLonNum], 11, { duration: 1.2 });
  setTimeout(() => mapRef.current?.invalidateSize?.(), 250);
}, [hasMeCoords, meLatNum, meLonNum]);

const [rating, setRating] = useState(0);
const [comment, setComment] = useState('') 

// 🧩 Nuevo: indicador de mensajes sin leer
const [hasUnread, setHasUnread] = useState(false);
const [statusBanner, setStatusBanner] = useState(null);
  
 
  const services = [
    { id: 'plomería', label: 'Plomería', icon: <Droplets size={18} /> },
    { id: 'electricidad', label: 'Electricidad', icon: <Wrench size={18} /> },
    { id: 'limpieza', label: 'Limpieza', icon: <Sparkles size={18} /> },
    { id: 'construcción', label: 'Construcción', icon: <Hammer size={18} /> },
    { id: 'jardinería', label: 'Jardinería', icon: <Leaf size={18} /> },
    { id: 'mascotas', label: 'Mascotas', icon: <PawPrint size={18} /> },
    { id: 'emergencia', label: 'Emergencia', icon: <Flame size={18} /> },
    { id: 'car detailing', label: 'Car Detailing', icon: <Sparkles size={18} /> },
    


  ];
/* 🧠 Restaurar estado completo (pedido + chat) desde localStorage */
useEffect(() => {
  if (typeof window === 'undefined') return;

  const saved = localStorage.getItem('activeJobChat');
  if (!saved) return;

  let parsed = null;
  try {
    parsed = JSON.parse(saved);
  } catch {
    localStorage.removeItem('activeJobChat');
    return;
  }

  const { jid, jstatus, cid, selectedWorker } = parsed || {};

  if (jid) setJobId(jid);
  if (jstatus) setJobStatus(jstatus);
  if (selectedWorker) setSelected(selectedWorker);

  setTimeout(() => {
    if (cid && jid && jstatus !== 'completed' && jstatus !== 'cancelled') {
      setChatId(cid);
      setIsChatOpen(true);
      openChat(cid);
    }
  }, 300);
}, []);
// ✅ Ruta SOLO si hay pedido activo (y no está finalizado/cancelado)
useEffect(() => {
  if (!jobId) return;
  if (jobStatus === 'completed' || jobStatus === 'cancelled') return;

  if (!hasMeCoords) return;
  if (!hasSelCoords) return;

  setRoute([[meLatNum, meLonNum], [selLatNum, selLngNum]]);
}, [jobId, jobStatus, hasMeCoords, hasSelCoords, meLatNum, meLonNum, selLatNum, selLngNum]);
/* 💬 Banner elegante de estado */
useEffect(() => {
  if (jobStatus === 'completed') {
    setStatusBanner({
      text: '✅ Trabajo finalizado con éxito',
      color: 'bg-emerald-500',
    });
    setTimeout(() => setStatusBanner(null), 3000);
  } else if (jobStatus === 'cancelled') {
    setStatusBanner({
      text: '🚫 Pedido cancelado',
      color: 'bg-red-500',
    });
    setTimeout(() => setStatusBanner(null), 3000);
  }
}, [jobStatus]);


/* 💾 Guardar estado actual del pedido y chat */
useEffect(() => {
  if (isChatOpen && chatId && selected && jobId) {
    localStorage.setItem(
      'activeJobChat',
      JSON.stringify({
        jid: jobId,
        jstatus: jobStatus,
        cid: chatId,
        selectedWorker: selected,
      })
    );
  } else if (!isChatOpen) {
    localStorage.removeItem('activeJobChat');
  }
}, [isChatOpen, chatId, selected, jobId, jobStatus]);


/* 🔴 Estado: indicador de mensaje no leído
   ---------------------------------------------------
   Activa una alerta visual y sonora cuando llega un
   mensaje nuevo y el chat está cerrado.
   Se limpia automáticamente al abrir el chat.
*/




// 🧩 Recuperar pedido activo desde Supabase si no hay nada en localStorage
useEffect(() => {
  if (jobId || !me?.id) return;

  // ✅ Esperar coordenadas del cliente antes de setRoute
  if (!Number(me?.lat) || !Number(me?.lon)) return;

  (async () => {
    try {
      const { data: job } = await supabase
        .from('jobs')
        .select('id, status, worker_id')
        .eq('client_id', me.id)
        .in('status', ['open', 'accepted', 'assigned'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!job) return;

      setJobId(job.id);
      setJobStatus(job.status);

      const { data: worker } = await supabase
        .from('map_workers_view')
        .select('*')
        .eq('user_id', job.worker_id)
        .maybeSingle();

      const wLat = Number(worker?.lat);
const wLng = Number(worker?.lng ?? worker?.lon ?? worker?.long);

if (Number.isFinite(wLat) && Number.isFinite(wLng)) {
  setSelected(worker);
  setRoute([[Number(me.lat), Number(me.lon)], [wLat, wLng]]);
  toast.success(`Pedido restaurado (${job.status})`);
}
    } catch (err) {
      console.warn('Sin pedido activo para restaurar:', err?.message || err);
    }
  })();
}, [me?.id, me?.lat, me?.lon, jobId]);

/* === Usuario === */
useEffect(() => {
  let alive = true;

  (async () => {
    const { data } = await supabase.auth.getUser();
    const uid = data?.user?.id;

    if (!uid) {
      router.replace('/login');
      return;
    }

    if (alive) setMe((prev) => ({ ...prev, id: uid }));

    

    // 🔊 audios (una sola vez)
    if (typeof Audio !== 'undefined') {
      soundRef.current = new Audio('/notify.mp3');
      sendSoundRef.current = new Audio('/send.mp3');
    }
  })();

  return () => {
    alive = false;
  };
}, [router, supabase]);


/* === Cargar trabajadores === */
async function fetchWorkers(serviceFilter = null) {
  setBusy(true);
  try {
    let query = supabase
  .from('map_workers_view')
  .select('*')
  .not('lat', 'is', null)
  // ✅ NO obligues lng acá (muchos vienen como lon)
  .eq('is_active', true); // ✅ Solo muestra trabajadores activos

    // ✅ Filtro seguro y compatible con REST
    if (serviceFilter) {
      // Normaliza acentos (ej. "plomería" → "plomeria")
      const normalized = serviceFilter
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // elimina tildes
        .toLowerCase();

      // 💡 Reemplazamos .or(...) por ilike simple para evitar error 404
      query = query
        .not('skills', 'is', null)
        .ilike('skills', `%${normalized}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    // 🧠 Log para verificar qué datos llegan (incluye rating y reviews)
    console.log('🧠 Trabajadores desde Supabase:', data);

 // ✅ Mostrar TODOS sin filtrar por radio
setWorkers(data || []);

    
  } catch (err) {
    console.error('Error cargando trabajadores:', err.message);
    toast.error('Error cargando trabajadores');
  } finally {
    setBusy(false);
  }
} 

// ⚡ Cargar trabajadores DESPUÉS del mapa (mejora la velocidad)
useEffect(() => {
  setTimeout(() => {
    fetchWorkers();
  }, 350);
}, []);




// 🛰️ Realtime instantáneo de cambios de estado (busy / available / paused)
useEffect(() => {
  const channel = supabase
    .channel('worker-status-sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'worker_profiles' },
      payload => {
        const updated = payload.new;

const uLat = Number(updated?.lat);
const uLng = Number(updated?.lng ?? updated?.lon ?? updated?.long);
if (!Number.isFinite(uLat) || !Number.isFinite(uLng)) return;

        setWorkers(prev =>
          prev.map(w =>
            w.user_id === updated.user_id
              ? { 
                  ...w, 
                  status: updated.status, 
                  busy_until: updated.busy_until, 
                  is_active: updated.is_active 
                }
              : w
          )
        );
      }
    )
    .subscribe();

  console.log('⚡ Canal realtime worker-status-sync activo');

  return () => {
    supabase.removeChannel(channel);
  };
}, []);


  
/* === 🛰️ Escuchar actualizaciones en tiempo real de los trabajadores (ubicación + datos generales) === */
useEffect(() => {
  // ✅ Canal 1: actualizaciones de ubicación con animación
  const channelLocation = supabase
    .channel('realtime-worker-locations')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'worker_locations' }, // 👈 AJUSTÁ el nombre de tabla si es otro
      (payload) => {
        const updated = payload.new;

        // ✅ aceptar lat + (lng o lon/long)
        const uLat = Number(updated?.lat);
        const uLng = Number(updated?.lng ?? updated?.lon ?? updated?.long);
        if (!Number.isFinite(uLat) || !Number.isFinite(uLng)) return;

        setWorkers((prev) => {
          const exists = prev.find((w) => w.user_id === updated.user_id);

          if (exists) {
  const marker = markersRef.current?.[updated.user_id];

  const pLat = Number(exists?.lat);
  const pLng = Number(exists?.lng ?? exists?.lon ?? exists?.long);

  // ✅ Animación suave si hay marcador previo
  if (marker && Number.isFinite(pLat) && Number.isFinite(pLng)) {
    animateMarkerMove(marker, pLat, pLng, uLat, uLng);
  }

  return prev.map((w) =>
    w.user_id === updated.user_id
      ? {
          ...w,
          lat: uLat,
          lng: uLng,
          updated_at: updated.updated_at,
          _justUpdated: true,
        }
      : w
  );
}
          return [
            ...prev,
            {
              user_id: updated.user_id,
              lat: uLat,
              lng: uLng,
              updated_at: updated.updated_at,
              full_name: updated.full_name || 'Nuevo trabajador',
              avatar_url: updated.avatar_url || '/avatar-fallback.png',
              _justUpdated: true,
            },
          ];
        });

        setTimeout(() => {
          setWorkers((prev) =>
            prev.map((w) =>
              w.user_id === updated.user_id ? { ...w, _justUpdated: false } : w
            )
          );
        }, 2000);
      }
    )
    .subscribe((status) => console.log('📡 Canal realtime ubicaciones:', status));

  // ✅ Canal 2a: cambios generales del perfil profesional (no-ubicación)
  const channelGeneralWorker = supabase
    .channel('realtime-workers-general-worker')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'worker_profiles' }, () => {
      fetchWorkers();
    })
    .subscribe();

  // ✅ Canal 2b: cambios del perfil base (nombre, foto)
  const channelGeneralProfile = supabase
    .channel('realtime-workers-general-profile')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
      fetchWorkers();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channelLocation);
    supabase.removeChannel(channelGeneralWorker);
    supabase.removeChannel(channelGeneralProfile);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  /* === Realtime global jobs (informativo) === */
useEffect(() => {
  const channel = supabase
    .channel('jobs-realtime-client')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'jobs' },
      payload => {
        if (payload.new?.client_id === me.id) {
          toast.info(`🔄 Pedido actualizado: ${payload.new.status}`);

          // 👇 Si el pedido se cancela, limpiar todo automáticamente
          if (payload.new.status === 'cancelled') {
            resetJobState();
          }
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [me.id]);


  /* === Realtime del job actual para estado (accepted/completed) === */
  useEffect(() => {
    if (!jobId) return;
    const ch = supabase
      .channel(`job-${jobId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'jobs', filter: `id=eq.${jobId}` },
        (payload) => {
          const st = payload.new?.status;
          if (st) setJobStatus(st);
        }
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [jobId]);
// 🌍 Sincronización global en vivo (workers, jobs, mensajes, perfiles)
useEffect(() => {
  const stop = startRealtimeCore((type, data) => {
    switch (type) {
      case 'worker': {
        setWorkers((prev) => {
          const exists = prev.some((w) => w.user_id === data.user_id);

          // 🧹 Si el trabajador se pausó o está inactivo → quitarlo del mapa
          if (
            data.is_active === false ||
            data.status === 'paused' ||
            data.status === 'inactive'
          ) {
            return prev.filter((w) => w.user_id !== data.user_id);
          }

          // 🟢 Si ya existe → actualizar sus datos (ubicación, estado, etc.)
          if (exists) {
            return prev.map((w) =>
              w.user_id === data.user_id
                ? { ...w, ...data, _justUpdated: true }
                : w
            );
          }

          // ➕ Si no existe pero está activo → agregarlo
          if (data.is_active === true || data.status === 'available') {
            return [...prev, { ...data, _justUpdated: true }];
          }

          return prev;
        });

        // ✨ Elimina la marca visual "_justUpdated" después de 2 s
        setTimeout(() => {
          setWorkers((prev) =>
            prev.map((w) =>
              w.user_id === data.user_id ? { ...w, _justUpdated: false } : w
            )
          );
        }, 2000);
        break;
      }

    case 'job': {
  // 📦 Actualiza pedidos del cliente en tiempo real (con control de estados)
  if (data.client_id === me.id) {
    setJobStatus(data.status);

    // 🟢 Si el trabajador FINALIZA el pedido correctamente
    if (data.status === 'completed' || data.status === 'worker_completed') {
      console.log('✅ El trabajador finalizó el pedido. Mostrando modal de reseña...');
      toast.success('🎉 El trabajador finalizó el trabajo');
      setJobStatus('worker_completed'); // fuerza abrir el modal de calificación
    }

    // 🚫 Si el pedido fue cancelado o rechazado
    else if (['cancelled', 'rejected', 'worker_rejected'].includes(data.status)) {
      console.log(`🚫 Pedido cancelado (${data.status})`);
      toast.error('🚫 El trabajador rechazó o canceló el pedido');
      resetJobState();
    }

    // 🟢 Si el trabajador acepta el pedido
    else if (data.status === 'accepted') {
      toast.success('🟢 El trabajador aceptó tu pedido');
    }

    // 🔵 Si el pedido se asigna correctamente
    else if (data.status === 'assigned') {
      toast.info('📦 Pedido asignado correctamente');
    }
  }
  break;
}

case 'message': {
  // 💬 Mensajería instantánea (chat)
  if (data.chat_id === chatId) {
    setMessages((prev) => {
      // ✅ Evita duplicar mensajes por ID
      if (prev.some((m) => m.id === data.id)) return prev;
      return [...prev, data];
    });

    // 🧠 Si llega un mensaje y el chat está cerrado
    if (!isChatOpen && data.sender_id !== me.id) {
      toast.info(`💬 ${selected?.full_name || 'El trabajador'} te envió un mensaje`, {
        duration: 4000,
      });
      soundRef.current?.play?.(); // 🔔 notify.mp3
      setHasUnread(true); // 🔴 activa el punto rojo
    } 
    // 🔊 Si el chat está abierto y el mensaje viene del otro
    else if (isChatOpen && data.sender_id !== me.id) {
      soundRef.current?.play?.(); // 🔔 notify.mp3
    }
    // 💬 Si el mensaje lo enviaste vos → sonido de envío
    else if (data.sender_id === me.id) {
      sendSoundRef.current?.play?.(); // 💬 send.mp3
    }
  }
  break;
}

case 'profile': {
  // 👤 Actualización de perfil o avatar
  setWorkers((prev) =>
    prev.map((w) =>
      w.user_id === data.id ? { ...w, ...data } : w
    )
  );
  break;
}

default:
  console.log('Evento realtime desconocido:', type, data);
}
});

// 🧹 Limpieza segura al desmontar
return () => {
  stopRealtimeCore();
};
}, [me.id, chatId]);
// 🛰️ ESCUCHAR MENSAJES NUEVOS GLOBALES (aunque el chat no esté abierto)
useEffect(() => {
  const channelGlobal = supabase
    .channel('global-messages')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => {
        const msg = payload.new;

        // Si el mensaje pertenece a un chat del cliente
        if (msg.sender_id !== me.id && msg.chat_id) {
          // 💡 Si el chat NO está abierto
          if (!isChatOpen) {
            setHasUnread(true);
            toast.info('💬 Nuevo mensaje de un profesional');
            soundRef.current?.play?.();
          }
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channelGlobal);
  };
}, [me.id, isChatOpen]);


/* === Interacciones mejoradas === */
function handleMarkerClick(worker) {
  // ✅ Si ya hay un pedido activo, evitamos cambiar de trabajador
  if (jobId && jobStatus !== 'completed' && jobStatus !== 'cancelled') {
    toast.warning('⚠️ Ya tenés un pedido activo. Finalizalo o cancelalo antes de seleccionar otro.');
    return;
  }

  // 🔹 Guardar trabajador seleccionado y activar animación de rebote
  setWorkers(prev =>
    prev.map(w => ({
      ...w,
      _selected: w.user_id === worker.user_id, // solo este rebota
    }))
  );

  // 🎯 Guarda el trabajador seleccionado
setSelected(worker);

// 🚫 NO generar ruta aquí (solo cuando el cliente presiona "Solicitar")
setRoute(null);

// ✨ Efecto visual al hacer clic en marcador
const wLat = toNumOrNull(worker?.lat);
const wLng = toNumOrNull(worker?.lng ?? worker?.lon ?? worker?.long);

if (mapRef.current && wLat !== null && wLng !== null) {
  mapRef.current.flyTo([wLat, wLng], 15, { duration: 1.2 });
}


  // 💬 Cierra cualquier modal de precio si estuviera abierto
  setShowPrice(false);

  // 🔊 Pequeña alerta visual
  toast.success(`👷 ${worker.full_name || 'Trabajador'} seleccionado`, {
    duration: 1500,
  });
}

function solicitar() {
  if (!selected) {
    toast.error('Seleccioná un trabajador primero');
    return;
  }

  // 🎬 Mostrar el modal de precio
  setShowPrice(true);
}


  // ✅ CONFIRMAR — guarda el pedido en Supabase y muestra visualmente el flujo
async function confirmarSolicitud() {
  try {
    setShowPrice(false);
    toast.loading('Enviando solicitud...', { id: 'pedido' });

    // 1️⃣ Usuario logueado
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Sesión no encontrada');

    // 2️⃣ Trabajador seleccionado válido
    if (!selected || !selected.user_id) {
      throw new Error('No se seleccionó un trabajador válido');
    }

  // 3️⃣ 🔒 Asegurar perfil del cliente (profiles.id = auth.user.id)
const { error: profileErr } = await supabase
  .from('profiles')
  .upsert(
    {
      id: user.id,               // PK = auth.uid
      email: user.email ?? null,
    },
    { onConflict: 'id' }
  );

if (profileErr) {
  console.error('Error asegurando perfil:', profileErr);
  throw profileErr; // ✅ cortar acá porque luego FK depende de profiles
}
   // 🔒 VALIDACIÓN DE RUTA — blindado 100% (sin errores por 0 o strings)
const canMakeRoute = hasMeCoords && hasSelCoords;

if (!canMakeRoute) {
  toast.error('No se puede crear el pedido. Coordenadas incompletas.');
  console.warn('❌ Ruta inválida — coordenadas incompletas:', {
    meLat: me?.lat,
    meLon: me?.lon,
    selLat,
    selLng,
  });
  return;
}

// ✔ Generar ruta ANTES de crear pedido
setRoute([
  [meLatNum, meLonNum],
  [selLatNum, selLngNum],
]);


    // 4️⃣ Insertar el pedido con servicio y precio
const { data: inserted, error: insertError } = await supabase
  .from('jobs')
  .insert([
    {
      title: `Trabajo con ${selected.full_name || 'Trabajador'}`,
      description: `Pedido generado desde el mapa (${selectedService || 'servicio general'})`,
      status: 'open',
      client_id: user.id, // ← FK a profiles.user_id (asegurado arriba)
      worker_id: selected.user_id,
    client_lat: meLatNum,
client_lng: meLonNum,
worker_lat: selLatNum,
worker_lng: selLngNum,
      created_at: new Date().toISOString(),

      // 🧩 Nuevos campos agregados
      service_type: selectedService || selected?.main_skill || 'servicio general',
      price: precioEstimado || 0,
    },
  ])
  .select('id, status')
  .single();

if (insertError) throw insertError;

    // 5️⃣ Actualizar estado local y UI
    setJobId(inserted.id);
    setJobStatus(inserted.status);
    toast.success(`✅ Pedido enviado a ${selected.full_name}`, { id: 'pedido' });

   

// ✅ ruta SIEMPRE usando selLat/selLng (que ya contempla lon/lng)
setRoute([[meLatNum, meLonNum], [selLatNum, selLngNum]]);

if (mapRef.current && hasMeCoords && hasSelCoords) {
  mapRef.current.fitBounds([[meLatNum, meLonNum], [selLatNum, selLngNum]], { padding: [80, 80] });
}
  } catch (err) {
    console.error('Error al confirmar solicitud:', err?.message || err);
    toast.error(err?.message || 'No se pudo enviar el pedido', { id: 'pedido' });
  }
}

// ✅ CANCELAR PEDIDO — cancela en Supabase y limpia todo
async function cancelarPedido() {
  try {
    if (!jobId) {
      toast.warning('⚠️ No hay pedido activo para cancelar');
      return;
    }
    

    // 🔥 Cambiar el estado en la base de datos
    const { error } = await supabase
      .from('jobs')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .select()
      .maybeSingle(); // ✅ evita error 406 si no retorna nada

    if (error) throw error;

    toast.success('🚫 Pedido cancelado correctamente');

    // 🧹 Limpiar estado local y UI
    resetJobState();

    // 📨 Notificar al trabajador (opcional)
    if (chatId) {
      await supabase.from('messages').insert([{
        chat_id: chatId,
        sender_id: me.id,
        text: '🚫 El cliente canceló el pedido.',
      }]);
    }
  } catch (err) {
    console.error('Error al cancelar pedido:', err.message);
    toast.error('No se pudo cancelar el pedido');
  }
}
 // 🔔 Abrir chat (crea/garantiza chat y se suscribe a mensajes)
async function openChat(forceChatId = null) {
  try {
    if (!jobId || !jobStatus || ['completed', 'cancelled'].includes(jobStatus)) {
      toast.warning('⚠️ Esperá un momento, cargando pedido activo...');
      return;
    }

    const activeJob = localStorage.getItem('activeJobChat');
    if (!jobId && activeJob) {
      const parsed = JSON.parse(activeJob);
      if (parsed?.jid) setJobId(parsed.jid);
      if (parsed?.cid) setChatId(parsed.cid);
    }

    const finalJobId = jobId || JSON.parse(localStorage.getItem('activeJobChat') || '{}')?.jid;
    const finalChatId = forceChatId || chatId || JSON.parse(localStorage.getItem('activeJobChat') || '{}')?.cid;

    if (!finalJobId) {
      toast.warning('⚠️ No hay pedido activo. Confirmá uno primero.');
      return;
    }

    const { data: chatIdData, error: chatErr } = await supabase.rpc('ensure_chat_for_job', {
      p_job_id: finalJobId,
    });
    if (chatErr) throw chatErr;

    const cid = chatIdData || finalChatId;
    setChatId(cid);

    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', cid)
      .order('created_at', { ascending: true });

    setMessages(msgs || []);
    setIsChatOpen(true);

    if (chatChannelRef.current) supabase.removeChannel(chatChannelRef.current);

    const channel = supabase
      .channel(`chat-${cid}`, {
        config: {
          broadcast: { self: true },
          presence: { key: me.id || 'client' },
          reconnect: true,
        },
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${String(cid)}` },
        (payload) => {
          console.log('💬 Nuevo mensaje recibido:', payload.new);
          setMessages((prev) => {
            // ✅ Evita duplicar mensajes por ID
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          if (payload.new.sender_id !== me.id) soundRef.current?.play?.();
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
        }
      )
      .subscribe((status) => console.log('📡 Canal de chat conectado:', status));

    chatChannelRef.current = channel;
  } catch (e) {
    console.error('❌ Error abriendo chat:', e);
    toast.error('No se pudo abrir el chat');
  }
}


// ✉️ Enviar mensaje (acepta texto opcional)
async function sendMessage(textOverride = null) {
  const text = (textOverride ?? inputRef.current?.value)?.trim();
  if (!text) return;

  if (!chatId || !me?.id) {
    console.error('❌ Falta chatId o sender_id');
    toast.error('No se puede enviar el mensaje');
    return;
  }

  try {
    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          chat_id: chatId,
          sender_id: me.id,
          text,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('❌ Error enviando mensaje:', error);
      toast.error('No se pudo enviar el mensaje');
      return;
    }

    setMessages((prev) => {
      if (prev.some((m) => m.id === data?.id)) return prev;
      return [...prev, data];
    });

    if (inputRef.current) inputRef.current.value = '';
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
  } catch (err) {
    console.error('❌ Error general al enviar mensaje:', err);
    toast.error('No se pudo enviar el mensaje');
  }
}

// ✅ Finalizar pedido — cambia estado en Supabase y limpia todo
async function finalizarPedido() {
  try {
    if (!jobId) {
      toast.warning('⚠️ No hay pedido activo para finalizar');
      return;
    }

    const { error } = await supabase
      .from('jobs')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', jobId);

    if (error) throw error;

    toast.success('✅ Pedido finalizado correctamente');
    resetJobState(); // limpia mapa y estado local

    if (chatId) {
      await supabase.from('messages').insert([
        {
          chat_id: chatId,
          sender_id: me.id,
          text: '✅ El cliente marcó el trabajo como finalizado',
        },
      ]);
    }
  } catch (err) {
    console.error('Error al finalizar pedido:', err.message);
    toast.error('No se pudo finalizar el pedido');
  }
}
// 🧹 Limpia todo el estado del pedido y refresca el mapa
function resetJobState() {
  console.log('🧹 Limpieza de estado del pedido');
  setRoute(null);
  setSelected(null);
  setJobId(null);
  setJobStatus(null);
  setChatId(null);
  setIsChatOpen(false);
  setMessages([]);
  localStorage.removeItem('activeJobChat');
  fetchWorkers(null); // o el que quieras por defecto

  // 🗺️ Recentrar mapa al cliente con animación suave
  if (mapRef.current && me?.lat && me?.lon) {
    mapRef.current.flyTo([me.lat, me.lon], 13, { duration: 1.2 });
  }
}


// ⭐ Guardar reseña del trabajador
async function confirmarReseña() {
  try {
    if (!jobId || !selected?.user_id) return;

    // Insertar reseña en base de datos
    const { error } = await supabase.from('reviews').insert([
      {
        job_id: jobId,
        worker_id: selected.user_id,
        client_id: me.id,
        rating,
        comment,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) throw error;

    toast.success('✅ ¡Gracias por tu valoración!');
    setRating(0);
    setComment('');
    resetJobState(); // limpia todo tras enviar
  } catch (err) {
    console.error('Error guardando reseña:', err.message);
    toast.error('No se pudo guardar la valoración');
  }
}

 function toggleService(id) {
  const next = selectedService === id ? null : id; // id puede ser null
  setSelectedService(next);
  setSelected(null);
  setRoute(null);
  fetchWorkers(next);
}

  // Etiqueta estado bonita
  function StatusBadge() {
    if (!jobId) return null;
    const base = 'text-xs px-2 py-1 rounded-lg font-semibold inline-flex items-center gap-1';
    if (jobStatus === 'accepted') {
      return (
        <span className={`${base} bg-green-100 text-green-700`}>
          🟢 Trabajador en camino
        </span>
      );
    }
    if (jobStatus === 'completed') {
      return (
        <span className={`${base} bg-emerald-100 text-emerald-700`}>
          <CheckCircle2 size={14} /> Trabajo finalizado
        </span>
      );
    }
    if (jobStatus === 'cancelled') {
      return <span className={`${base} bg-red-100 text-red-600`}>Cancelado</span>;
    }
    if (jobStatus === 'assigned') {
      return <span className={`${base} bg-blue-100 text-blue-700`}>Asignado</span>;
    }
    return <span className={`${base} bg-emerald-50 text-emerald-700`}>{jobStatus || 'open'}</span>;
  }
/* 💰 Algoritmo de cálculo de precios dinámico (versión estable y flexible) */
function calcularPrecio(
  servicio,
  distanciaKm,
  horas = 1,
  esUrgencia = false,
  esNocturno = false,
  worker = null
) {
 const tarifas = {
  "plomería":     { tipo: "fijo",  base: 45000, porKm: 2000 },
  "electricidad": { tipo: "fijo",  base: 50000, porKm: 2000 },
  "limpieza":     { tipo: "hora",  hora: 30000, porKm: 1500 },
  "jardinería":   { tipo: "hora",  hora: 25000, porKm: 1500 },
  "mascotas":     { tipo: "hora",  hora: 20000, porKm: 1000 },
  "construcción": { tipo: "mixto", base: 60000, horaExtra: 25000, porKm: 2500 },
  "emergencia":   { tipo: "fijo",  base: 60000, porKm: 2500, urgencia: 0.3 },
  "car detailing": { tipo: "fijo", base: 70000, porKm: 2000 },
};
  let servicioBase = servicio?.toLowerCase();

  // 🧠 Si no hay servicio seleccionado, intentar deducirlo desde worker.skills
  if (!servicioBase && worker?.skills) {
    const skillsArray = Array.isArray(worker.skills)
      ? worker.skills
      : String(worker.skills).split(',').map((s) => s.trim());

    const posibles = skillsArray
      .map((s) => s.toLowerCase())
      .filter((s) => tarifas[s]);

    if (posibles.length > 0) {
      servicioBase = posibles.sort(
        (a, b) => (tarifas[a].base || 0) - (tarifas[b].base || 0)
      )[0];
    }
  }

  const t = tarifas[servicioBase || ''];
  if (!t) return 55000; // precio base por defecto

  let precio = 0;
  if (t.tipo === 'hora') precio = t.hora * horas;
  else if (t.tipo === 'fijo') precio = t.base;
  else if (t.tipo === 'mixto')
    precio = t.base + Math.max(0, horas - 1) * t.horaExtra;

  if (distanciaKm > 3) precio += (distanciaKm - 3) * t.porKm;

  const horaActual = new Date().getHours();
  if (horaActual >= 19 || horaActual < 6) precio *= 1.2; // nocturno
  if (esUrgencia && t.urgencia) precio *= 1 + t.urgencia; // urgencia

  if (precio < 10000) precio = 10000;
  return Math.round(precio);
}

/* ⚙️ Estados auxiliares para el cálculo dinámico */
const [horasTrabajo, setHorasTrabajo] = useState(1);
const [distanciaKm, setDistanciaKm] = useState(0);
const [precioEstimado, setPrecioEstimado] = useState(55000);
// ✅ Distancia real al seleccionado (para precio) — ahora sí, después de declarar setDistanciaKm
useEffect(() => {
  if (!hasMeCoords) return;
  if (!hasSelCoords) return;

  const km = haversineKm(meLatNum, meLonNum, selLatNum, selLngNum);
  setDistanciaKm(km);
}, [hasMeCoords, hasSelCoords, meLatNum, meLonNum, selLatNum, selLngNum]);

/* 🔁 Recalcular automáticamente el precio */
useEffect(() => {
  let nuevoPrecio = 55000;

  // ✅ Si el usuario selecciona un servicio manualmente
  if (selectedService) {
    nuevoPrecio = calcularPrecio(selectedService, distanciaKm, horasTrabajo);
  }
  // ✅ Si no selecciona servicio pero elige un trabajador (modo búsqueda directa)
  else if (selected) {
    nuevoPrecio = calcularPrecio(null, distanciaKm, horasTrabajo, false, false, selected);
  }

  setPrecioEstimado(nuevoPrecio);
}, [selectedService, distanciaKm, horasTrabajo, selected]);


  return (
    <div className="no-pull-refresh fixed inset-0 bg-white overflow-hidden">

    {/* Header superior — volver atrás */}
<div className="fixed top-4 left-4 z-[10000] pointer-events-auto">
  <button
    onClick={() => router.replace('/role-selector')}
    className="
      flex items-center gap-2
      bg-white/90 backdrop-blur
      text-gray-800 font-semibold
      px-4 py-2
      rounded-full
      shadow-lg
      border border-gray-200
      hover:bg-emerald-50 hover:text-emerald-700
      active:scale-95
      transition
    "
  >
    <ChevronLeft size={20} />
    <span className="text-sm">Volver</span>
  </button>
</div>

{/* Mensaje marketing sutil centrado */}
<div className="absolute top-4 left-1/2 -translate-x-1/2 z-[999]">
  <div className="
    bg-emerald-500 text-white
    px-4 py-2
    rounded-full
    shadow-md
    text-sm font-semibold
    hidden sm:block
  ">
    Estás a un paso de tu solución 💚
  </div>
</div>

{/* 🔔 Banner elegante de estado */}
{statusBanner && (
  <div
    className={`fixed top-4 left-1/2 -translate-x-1/2 px-5 py-2 text-white text-sm font-semibold rounded-full shadow-lg ${statusBanner.color} z-[20000]`}
  >
    {statusBanner.text}
  </div>
)}
{(gpsStatus === 'denied' || gpsStatus === 'error') && (
  <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[20000]">
    <div className="bg-white/95 border border-gray-200 shadow-lg rounded-2xl px-4 py-3 text-sm">
      <div className="font-semibold text-gray-800">📍 No se pudo activar tu ubicación</div>
      {gpsError && <div className="text-gray-500 mt-1">{gpsError}</div>}
      <div className="flex gap-2 mt-3">
        <button
          onClick={requestGPS}
          className="px-3 py-2 rounded-xl bg-emerald-500 text-white font-semibold active:scale-95"
        >
          Activar GPS
        </button>
        <button
          onClick={() => toast('Abrí: Ajustes > Apps > ManosYA > Permisos > Ubicación')}
          className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold active:scale-95"
        >
          Cómo habilitar
        </button>
      </div>
    </div>
  </div>
)}
{/* MAPA */}
<div
  className="absolute inset-x-0 top-0 z-0"
  style={{
    height: 'calc(var(--real-vh) - 160px)',
    overscrollBehavior: 'none',
    touchAction: 'pan-x pan-y', // ✅ permite drag del mapa en móvil
  }}
>
  {/* 🎯 Botón flotante: Centrarme */}
<div className="absolute right-4 bottom-24 z-[12000] pointer-events-auto">
  <button
    onClick={() => {
      if (!hasMeCoords) {
        toast.warning('Primero activá tu GPS');
        return;
      }

      // 🔥 Centra el mapa en tu ubicación
      mapRef.current?.invalidateSize?.();
      mapRef.current?.flyTo([meLatNum, meLonNum], 15, { duration: 1.2 });
    }}
    className="
      w-12 h-12 rounded-2xl
      bg-white/90 backdrop-blur
      border border-gray-200
      shadow-[0_12px_30px_rgba(0,0,0,0.18)]
      flex items-center justify-center
      active:scale-95 transition
    "
    title="Centrarme"
  >
    🎯
  </button>
</div>
 <MapContainer
  key={hasMeCoords ? 'gps' : 'nogps'}
  center={center}
  zoom={hasMeCoords ? 11 : 7}
    minZoom={5}
    maxZoom={19}
    zoomControl={false}
    scrollWheelZoom={false}
    style={{
      height: '100%',
      width: '100%',
      touchAction: 'pan-x pan-y', // ✅
      overscrollBehavior: 'none',
      WebkitOverflowScrolling: 'auto',
      paddingBottom: '160px',
    }}
    whenCreated={(map) => {
      mapRef.current = map;

      const el = map.getContainer();
      el.style.touchAction = 'pan-x pan-y'; // ✅
      el.style.overscrollBehavior = 'none';
      setTimeout(() => map.invalidateSize(), 200); // ✅ ayuda iOS/Android
    }}
  >
    {/* 🗺️ CARTO Light (mapa blanco minimalista) */}
    <TileLayer
      url="https://tile.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
      attribution='&copy; <a href="https://carto.com/">CARTO</a>'
      updateWhenIdle={true}
      
      updateWhenZooming={false}
      keepBuffer={2}
    />

  {/* 🎯 Radio visible (MAX_RADIUS_KM) */}
 {hasMeCoords && (
  <Circle
    center={[meLatNum, meLonNum]}
    radius={MAX_RADIUS_M}
    pathOptions={{
      color: '#10b981',
      weight: 2,
      fillOpacity: 0.08,
    }}
  />
)}
   {Array.isArray(route) &&
  route.length === 2 &&
  Array.isArray(route[0]) &&
  Array.isArray(route[1]) &&
  route[0].length === 2 &&
  route[1].length === 2 &&
  Number.isFinite(Number(route[0][0])) &&
  Number.isFinite(Number(route[0][1])) &&
  Number.isFinite(Number(route[1][0])) &&
  Number.isFinite(Number(route[1][1])) && (
    <Polyline positions={route} color="#10b981" weight={5} />
  )
}


{/* ✅ BLOQUE CLUSTER + FILTRO FINAL — ESTABLE */}
<MarkerClusterGroup
  chunkedLoading
  maxClusterRadius={42}
  iconCreateFunction={clusterIconCreateFunction}
  zoomToBoundsOnClick={false}
  spiderfyOnMaxZoom={false}
  showCoverageOnHover={false}
  spiderfyDistanceMultiplier={1.6}
  eventHandlers={{
    clusterclick: (e) => {
  e?.originalEvent?.preventDefault?.();
  e?.originalEvent?.stopPropagation?.();

  const clusterLayer = e?.layer;
  const children = clusterLayer?.getAllChildMarkers?.() || [];

 const listRaw = children
  .map((m) => m?.options?.__worker)
  .filter(Boolean);

const ranked = listRaw
  .map((w) => {
    const wLat = Number(w?.lat);
    const wLng = Number(w?.lng ?? w?.lon ?? w?.long);

    const dist =
      hasMeCoords && Number.isFinite(wLat) && Number.isFinite(wLng)
        ? haversineKm(meLatNum, meLonNum, wLat, wLng)
        : null;

    return {
      ...w,
      _dist: dist,                       // km (number) o null
      _online: isOnlineRecent(w),
      _rating: Number(w?.avg_rating || 0),
    };
  })
  // ✅ FILTRO por radio (solo si hay GPS)
  .filter((w) => {
    if (!hasMeCoords) return true;       // si no hay GPS, no filtra por distancia
    if (w._dist == null) return false;   // si hay GPS pero no se puede calcular, fuera
    return w._dist <= MAX_RADIUS_KM;     // 👈 filtro por km
  })
  // ✅ ORDEN: más cerca primero, luego online, luego rating
  .sort((a, b) => {
    if (a._dist != null && b._dist != null) return a._dist - b._dist;
    if (a._online !== b._online) return a._online ? -1 : 1;
    if (a._rating !== b._rating) return b._rating - a._rating;
    return 0;
  });

setClusterList(ranked);
setClusterOpen(true);
},
  }}
>
  {(workers || [])
    .filter((w) => {
      const wLat = Number(w?.lat);
      const wLng = Number(w?.lng ?? w?.lon ?? w?.long);
      if (!Number.isFinite(wLat) || !Number.isFinite(wLng)) return false;

      if (w?.status === 'paused' || w?.status === 'inactive') return false;
      if (w?.is_active === false) return false;

      if (hasMeCoords) {
        const km = haversineKm(meLatNum, meLonNum, wLat, wLng);
        if (!Number.isFinite(km)) return false;
        if (km > MAX_RADIUS_KM) return false;
      }
      return true;
    })
    .map((w) => {
      const wLat = Number(w?.lat);
      const wLng = Number(w?.lng ?? w?.lon ?? w?.long);

      return (
        <Marker
          key={`worker-${w.user_id}`}
          position={[wLat, wLng]}
          icon={avatarIcon(w.avatar_url, w) || undefined}
          eventHandlers={{
            click: () => handleMarkerClick(w),
            add: (e) => {
              const mk = e?.target;
              if (mk?.options) mk.options.__worker = w;
            },
          }}
          ref={(m) => {
            if (!m) return;
            markersRef.current[w.user_id] = m;
          }}
        />
      );
    })}
</MarkerClusterGroup>

</MapContainer>
{/* ✅ MODAL CLUSTER (LISTA DE TRABAJADORES DEL CÚMULO) */}
{mounted && createPortal(
  <AnimatePresence>
    {clusterOpen && (
      <motion.div
        className="fixed inset-0 z-[20010] bg-black/55 backdrop-blur-sm flex items-end justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setClusterOpen(false)}
      >
        <motion.div
          className="w-full max-w-md bg-white rounded-t-3xl p-5 shadow-2xl border border-gray-200"
          style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}
          initial={{ y: 420 }}
          animate={{ y: 0 }}
          exit={{ y: 420 }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-extrabold text-gray-800">
              Profesionales cerca ({clusterList?.length || 0})
            </h3>
            <button
              onClick={() => setClusterOpen(false)}
              className="text-gray-500 hover:text-red-500 transition"
            >
              <XCircle size={22} />
            </button>
          </div>

          <div className="max-h-[55vh] overflow-y-auto space-y-2 pr-1">
            {(clusterList || []).map((w) => (
              <button
                key={`cl-${w.user_id}`}
                onClick={() => {
                  setClusterOpen(false);
                  handleMarkerClick(w); // ✅ reutiliza tu lógica
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl border border-gray-200 hover:bg-emerald-50 active:scale-[0.99] transition"
              >
                <img
                  src={w.avatar_url || "/avatar-fallback.png"}
                  onError={(e) => (e.currentTarget.src = "/avatar-fallback.png")}
                  className="w-12 h-12 rounded-full object-cover border border-gray-200"
                  alt="avatar"
                />

                <div className="flex-1 text-left">
                  <div className="font-bold text-gray-800 leading-tight">
                    {w.full_name || "Profesional"}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 flex items-center justify-between gap-2">
  <span>
    {isOnlineRecent(w) ? "🟢 En línea" : "⚪️ Offline"} • ⭐ {Number(w.avg_rating || 0).toFixed(1)} • ({w.total_reviews || 0})
  </span>

  {/* ✅ KM claro (usa _dist si ya lo calculamos; si no, lo calcula) */}
  <span className="text-[12px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">
    📍 {(() => {
      const km =
        w?._dist != null
          ? w._dist
          : distanceFromClientKm(meLatNum, meLonNum, w);
      return km != null ? formatKm(km) : "—";
    })()}
  </span>
</div>
                </div>

                <div className="text-xs font-extrabold text-emerald-700">
                  Ver
                </div>
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-500 mt-3">
            Tip: tocá un profesional para abrir su perfil.
          </p>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>,
  document.body
)}
{/* ✅ MODAL CLUSTER (PORTAL + estrellas) */}
{mounted && createPortal(
  <AnimatePresence>
  {selected && !showPrice && (() => {
    // ✅ calculamos km acá adentro (porque acá existe selected)
    const km = distanceFromClientKm(meLatNum, meLonNum, selected);

    // 🏅 Aro por plan (premium dorado / normal plateado / eco verde)
    const tier = String(selected?.plan_tier || 'normal').toLowerCase();
    const ringClass =
      tier === 'premium'
        ? 'border-yellow-400'
        : tier === 'eco'
        ? 'border-emerald-500'
        : 'border-gray-300';

    const tierLabel =
      tier === 'premium' ? '⭐ Premium' : tier === 'eco' ? '🌿 Eco' : '🩶 Normal';

    return (
      <motion.div
        key="perfil"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-xl p-6 z-[10000]"
      >
        <div className="text-center">
          <>
            {/* 🧑 Avatar con verificación */}
            <div className="relative w-20 h-20 mx-auto mb-2">
              <img
                src={selected.avatar_url || '/avatar-fallback.png'}
                onError={(e) => {
                  e.currentTarget.src = '/avatar-fallback.png';
                }}
                className={`w-20 h-20 rounded-full border-4 ${ringClass} shadow-md object-cover object-center`}
                alt="avatar"
              />

              {selected.worker_verified && selected.profile_verified && (
                <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-1.5 border-2 border-white shadow">
                  <CheckCircle2 size={14} className="text-white" />
                </div>
              )}
            </div>

            {/* 🧾 Nombre y descripción */}
            <h2 className="font-bold text-lg">{selected.full_name}</h2>
            <p className="text-sm italic text-gray-500 mb-2">
              “{selected.bio || 'Sin descripción'}”
            </p>

            {/* 🏷️ Plan */}
            <div className="text-xs font-bold text-gray-600 mb-2">
              {tierLabel}
            </div>

            {/* ⭐ Calificación dinámica */}
            <div className="flex justify-center items-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  className={
                    i < Math.round(Number(selected.avg_rating || 0))
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300'
                  }
                />
              ))}
              <span className="text-xs text-gray-500 ml-1">
                ({selected.total_reviews || 0})
              </span>
            </div>

            {/* 🧠 Experiencia */}
            <p className="text-sm text-gray-600">
              <Clock3 size={14} className="inline mr-1" />
              {selected?.years_experience
                ? `${selected.years_experience} ${
                    selected.years_experience === 1 ? 'año' : 'años'
                  } de experiencia`
                : 'Sin experiencia registrada'}
            </p>

            {/* ⏰ Última actividad */}
            <p className="text-xs text-gray-500 mt-1">
              {(() => {
                const mins = minutesSince(selected?.updated_at);
                if (mins == null) return 'Sin actividad reciente';
                if (mins < 60) return `Activo hace ${mins} min`;
                if (mins < 1440) return `Activo hace ${Math.floor(mins / 60)} h`;
                return `Activo hace ${Math.floor(mins / 1440)} d`;
              })()}
            </p>

            {/* 📍 Distancia */}
            <p className="text-sm text-gray-600 mt-1">
              📍 {km != null ? formatKm(km) : '—'}
            </p>

            {/* 🧰 Especialidades */}
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Especialidades</h3>
              <div className="flex flex-wrap justify-center gap-2">
                {(() => {
                  let skillsList = [];

                  if (Array.isArray(selected?.skills)) {
                    skillsList = selected.skills;
                  } else if (typeof selected?.skills === 'string') {
                    skillsList = selected.skills.split(',');
                  } else {
                    skillsList = ['Limpieza', 'Plomería', 'Jardinería'];
                  }

                  return skillsList.map((skill, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium text-sm shadow-sm border border-emerald-200"
                    >
                      {skill.trim()}
                    </span>
                  ));
                })()}
              </div>
            </div>

            {/* Estado de pedido si existe */}
            <div className="mt-3">{jobId && <StatusBadge />}</div>

            {/* 🔘 Botones dinámicos */}
            {!route ? (
              <div className="flex justify-center gap-3 mt-5">
                <button
                  onClick={() => setSelected(null)}
                  className="px-5 py-3 rounded-xl border text-gray-700"
                >
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
              <div className="flex flex-col items-center gap-3 mt-5">
                <button
                  onClick={() => {
                    openChat();
                    setHasUnread(false);
                  }}
                  className="relative px-6 py-3 rounded-2xl border-2 border-emerald-400 text-emerald-700 font-semibold flex items-center gap-2 hover:bg-emerald-50 transition-all duration-200 shadow-sm active:scale-95"
                >
                  <MessageCircle size={18} className="text-emerald-600" />
                  Chatear
                  {hasUnread && (
                    <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 rounded-full animate-ping"></span>
                  )}
                  {hasUnread && (
                    <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 rounded-full"></span>
                  )}
                </button>

                {jobStatus === 'accepted' || jobStatus === 'assigned' ? (
                  <button
                    onClick={finalizarPedido}
                    className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold flex items-center gap-1"
                  >
                    <CheckCircle2 size={16} /> Finalizar pedido
                  </button>
                ) : jobStatus === 'open' ? (
                  <button
                    onClick={cancelarPedido}
                    className="px-6 py-3 rounded-xl bg-red-500 text-white font-semibold flex items-center gap-1"
                  >
                    <XCircle size={16} /> Cancelar pedido
                  </button>
                ) : null}
              </div>
            )}
          </>
        </div>
      </motion.div>
    );
  })()}
</AnimatePresence>,
  document.body
)}
</div>
{/* ===========================
     PANEL MINI PROFESIONAL — FIX (MOBILE SAFE)
   =========================== */}
<motion.div
  animate={{ y: 0 }}
  transition={{ type: "spring", stiffness: 150, damping: 20 }}
  className="
    fixed left-0 right-0 bottom-0
    z-[9999]
    bg-white rounded-t-3xl shadow-xl border-t border-gray-200
  "
  style={{
    paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
  }}
>
  {/* ===== Handle ===== */}
  <div className="w-full flex justify-center pt-2 pb-2 select-none">
    <div className="h-1.5 w-12 bg-gray-300 rounded-full"></div>
  </div>

  {/* ===== Título ===== */}
  <h2 className="text-center text-[17px] font-bold text-emerald-600 mb-2 tracking-tight">
    ManosYA
  </h2>
 {/* ===== Botones principales (PREMIUM) ===== */}
<div className="px-3 mb-3">
  <div
    className="
      grid grid-cols-4 gap-2
      rounded-2xl p-2
      bg-white/70 backdrop-blur-xl
      border border-gray-200/70
      shadow-[0_12px_40px_rgba(0,0,0,0.08)]
    "
  >
    {/* Buscar Pros (CTA principal) */}
    <button
      onClick={() => fetchWorkers(selectedService)}
      className="
        col-span-1
        rounded-2xl px-2 py-3
        text-white font-extrabold text-[12px]
        bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700
        shadow-[0_10px_22px_rgba(16,185,129,0.35)]
        active:scale-[0.98] transition
        flex flex-col items-center justify-center gap-1
      "
    >
      <span className="text-[18px] leading-none">🚀</span>
      <span className="leading-none">Buscar</span>
      <span className="text-[10px] font-semibold opacity-90 -mt-0.5">Pros</span>
    </button>

    {/* Más cerca */}
    <button
      onClick={() => {
        if (!workers?.length) {
          toast.warning('Primero cargá los trabajadores');
          return;
        }

        const ranked = [...workers]
          .map(w => {
            const wLat = Number(w?.lat);
            const wLng = Number(w?.lng ?? w?.lon ?? w?.long);

           const dist = hasMeCoords && Number.isFinite(wLat) && Number.isFinite(wLng)
  ? haversineKm(meLatNum, meLonNum, wLat, wLng)
  : null;

            return {
              ...w,
              _dist: dist,
              _online: isOnlineRecent(w),
              _rating: Number(w?.avg_rating || 0),
            };
          })
          .sort((a, b) => {
            if (a._dist != null && b._dist != null) return a._dist - b._dist;
            if (a._online !== b._online) return a._online ? -1 : 1;
            if (a._rating !== b._rating) return b._rating - a._rating;
            return 0;
          });

        setClusterList(ranked.slice(0, 30));
        setClusterOpen(true);
      }}
      className="
        col-span-1
        rounded-2xl px-2 py-3
        bg-white
        border border-gray-200/80
        shadow-[0_10px_26px_rgba(0,0,0,0.07)]
        active:scale-[0.98] transition
        flex flex-col items-center justify-center gap-1
      "
    >
      <span className="text-[18px] leading-none">🏆</span>
      <span className="text-[12px] font-extrabold text-gray-800 leading-none">Más</span>
      <span className="text-[10px] font-semibold text-gray-500 -mt-0.5">cerca</span>
    </button>

    {/* Mis pedidos */}
    <button
      onClick={() => router.push('/client/jobs')}
      className="
        col-span-1
        rounded-2xl px-2 py-3
        bg-white
        border border-gray-200/80
        shadow-[0_10px_26px_rgba(0,0,0,0.07)]
        active:scale-[0.98] transition
        flex flex-col items-center justify-center gap-1
      "
    >
      <span className="text-[18px] leading-none">📦</span>
      <span className="text-[12px] font-extrabold text-gray-800 leading-none">Mis</span>
      <span className="text-[10px] font-semibold text-gray-500 -mt-0.5">pedidos</span>
    </button>

    {/* Empresarial */}
    <button
      onClick={() => router.push('/client/new')}
      className="
        col-span-1
        rounded-2xl px-2 py-3
        bg-white
        border border-gray-200/80
        shadow-[0_10px_26px_rgba(0,0,0,0.07)]
        active:scale-[0.98] transition
        flex flex-col items-center justify-center gap-1
      "
    >
      <span className="text-[18px] leading-none">🏢</span>
      <span className="text-[12px] font-extrabold text-gray-800 leading-none">Empre</span>
      <span className="text-[10px] font-semibold text-gray-500 -mt-0.5">sarial</span>
    </button>
  </div>
</div>

  {/* ===========================
    SERVICIOS (PREMIUM) + badge
 =========================== */}
<div className="px-3 pb-3">
  <div
    className="
      flex items-center gap-2
      rounded-2xl p-2
      bg-white/70 backdrop-blur-xl
      border border-gray-200/70
      shadow-[0_12px_40px_rgba(0,0,0,0.08)]
    "
  >
    <button
      onClick={() => setServicesOpen(true)}
      className="
        flex-1
        rounded-2xl px-4 py-3
        text-left
        bg-gradient-to-br from-cyan-50 to-emerald-50
        border border-emerald-200/60
        active:scale-[0.99] transition
        shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]
      "
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[12px] font-extrabold text-gray-800 tracking-tight">
            🧰 Servicios
          </div>
          <div className="text-[11px] font-semibold text-gray-500 mt-0.5">
            Filtrá y encontrá más rápido
          </div>
        </div>

        <div className="text-[11px] font-extrabold text-emerald-700 bg-white/80 border border-emerald-200 rounded-full px-3 py-1">
          Ver
        </div>
      </div>
    </button>

    {/* Badge seleccionado */}
    <div
      className="
        min-w-[92px]
        rounded-2xl px-3 py-3
        bg-white
        border border-gray-200/80
        shadow-[0_10px_26px_rgba(0,0,0,0.07)]
        flex items-center justify-center
      "
    >
      <div className="text-center leading-tight">
        <div className="text-[10px] font-bold text-gray-500">Filtro</div>
        <div className="text-[12px] font-extrabold text-emerald-700">
          {selectedService
            ? (services.find(s => s.id === selectedService)?.label || selectedService)
            : 'Todos'}
        </div>
      </div>
    </div>
  </div>
</div>

 {/* MODAL SERVICIOS — PORTAL (FIX: siempre arriba) */}
{mounted && createPortal(
  <AnimatePresence>
    {servicesOpen && (
      <motion.div
        className="fixed inset-0 z-[20000] bg-black/55 backdrop-blur-sm flex items-end justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setServicesOpen(false)}
      >
        <motion.div
          className="
            w-full max-w-md
            bg-white rounded-t-3xl
            p-5 shadow-2xl
            border border-gray-200
          "
          style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}
          initial={{ y: 380 }}
          animate={{ y: 0 }}
          exit={{ y: 380 }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-extrabold text-gray-800">
              Seleccionar servicio
            </h3>
            <button
              onClick={() => setServicesOpen(false)}
              className="text-gray-500 hover:text-red-500 transition"
            >
              <XCircle size={22} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                toggleService(null);
                setServicesOpen(false);
              }}
              className={`
                p-3 rounded-2xl border font-semibold text-sm
                ${!selectedService
                  ? "bg-emerald-500 text-white border-emerald-500"
                  : "bg-gray-50 text-gray-700 border-gray-200"}
                active:scale-95 transition
              `}
            >
              🌍 Todos
            </button>

            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  toggleService(s.id);
                  setServicesOpen(false);
                }}
                className={`
                  p-3 rounded-2xl border font-semibold text-sm
                  flex items-center justify-center gap-2
                  ${selectedService === s.id
                    ? "bg-emerald-500 text-white border-emerald-500"
                    : "bg-gray-50 text-gray-700 border-gray-200"}
                  active:scale-95 transition
                `}
              >
                {s.icon}
                <span>{s.label}</span>
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Tip: elegí un servicio para filtrar el mapa.
          </p>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>,
  document.body
)}
</motion.div>

    {/* 💵 MODAL PRECIO — versión final (dinámica y adaptativa) */}
<AnimatePresence>
  {showPrice && (
    <motion.div
      key="modal-precio"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10010]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-gradient-to-br from-white to-emerald-50 rounded-3xl w-[85%] max-w-md p-7 shadow-2xl text-center border border-emerald-100"
        initial={{ scale: 0.9, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 50 }}
        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      >
        {/* 🧠 Encabezado emocional */}
        <h3 className="text-lg font-semibold text-emerald-700 mb-1">
          Estás a un paso de tu solución ✨
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Confirmá tu pedido y un profesional irá a ayudarte.
        </p>

        {/* 💰 Precio dinámico central */}
        <p className="text-4xl font-extrabold text-emerald-700 mb-1 drop-shadow-sm transition-all duration-300">
          ₲{precioEstimado.toLocaleString('es-PY')}
        </p>
        <p className="text-xs text-gray-500 mb-4">Precio estimado total</p>

        {/* ⏱️ Control de horas dinámico (solo si aplica) */}
        {(() => {
          const serviciosPorHora = ['limpieza', 'jardinería', 'mascotas'];
          const esPorHora = serviciosPorHora.includes(selectedService?.toLowerCase?.() || '');
          return (
            esPorHora && (
              <div className="flex items-center justify-center gap-4 mb-5">
                <button
                  onClick={() => {
                    const nuevaHora = Math.max(1, horasTrabajo - 1);
                    setHorasTrabajo(nuevaHora);
                    const nuevoPrecio = calcularPrecio(
                      selectedService,
                      distanciaKm,
                      nuevaHora,
                      false,
                      false,
                      selected
                    );
                    setPrecioEstimado(nuevoPrecio);
                  }}
                  className="w-9 h-9 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full text-xl font-bold text-gray-700 shadow-inner"
                >
                  −
                </button>

                <span className="text-base font-semibold text-gray-800">
                  {horasTrabajo} hora{horasTrabajo > 1 ? 's' : ''}
                </span>

                <button
                  onClick={() => {
                    const nuevaHora = horasTrabajo + 1;
                    setHorasTrabajo(nuevaHora);
                    const nuevoPrecio = calcularPrecio(
                      selectedService,
                      distanciaKm,
                      nuevaHora,
                      false,
                      false,
                      selected
                    );
                    setPrecioEstimado(nuevoPrecio);
                  }}
                  className="w-9 h-9 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full text-xl font-bold text-gray-700 shadow-inner"
                >
                  +
                </button>
              </div>
            )
          );
        })()}

        {/* 🌟 Beneficios subconscientes */}
        <div className="text-sm text-gray-600 space-y-1 mb-6">
          <p>🚗 Incluye traslado promedio (hasta 3 km)</p>
          <p>🌙 Urgencias nocturnas o feriados +20%</p>
          <p>💰 Tarifa mínima garantizada ₲10.000</p>
        </div>

        {/* 🔘 Botones CTA */}
        <div className="flex justify-center gap-3">
          <button
            onClick={() => setShowPrice(false)}
            className="py-3 w-1/2 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition"
          >
            Cancelar
          </button>
          <button
            onClick={confirmarSolicitud}
            className="py-3 w-1/2 rounded-xl bg-emerald-500 text-white font-semibold shadow-md hover:bg-emerald-600 active:scale-[0.98] transition"
          >
            Confirmar pedido
          </button>
        </div>

        {/* 💚 Refuerzo psicológico final */}
        <p className="text-[11px] text-gray-400 mt-5 italic">
          Tu tranquilidad comienza en minutos 💚
        </p>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>



{/* 🌟 MODAL DE CALIFICACIÓN (cliente o trabajador finalizan) */}
<AnimatePresence>
  {(jobStatus === 'worker_completed' || jobStatus === 'completed') && (
    <motion.div
      key="modal-review"
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[10020]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onAnimationStart={() => {
        // 📱 Vibración leve al abrir
        if (navigator.vibrate) navigator.vibrate(30);
        // 🔊 Sonido “pop” al aparecer
        const audio = new Audio('/sounds/pop.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      }}
    >
      <motion.div
        className="bg-white rounded-3xl p-6 w-[85%] max-w-md text-center shadow-xl relative"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 150, damping: 18 }}
      >
        {/* ✖️ Cerrar modal manual */}
        <button
          onClick={() => {
            // 🧹 Cierra modal y vuelve al mapa con animación suave
            setJobStatus(null);
            setTimeout(() => {
              resetJobState();
              if (mapRef.current && hasMeCoords) {
  mapRef.current.flyTo([meLatNum, meLonNum], 13, { duration: 1.2 });
}
            }, 400);
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition"
        >
          <XCircle size={20} />
        </button>

        <img
  src={selected?.avatar_url || '/avatar-fallback.png'}
  alt="avatar trabajador"
  onError={(e) => {
    e.currentTarget.src = '/avatar-fallback.png';
  }}
  className="
    w-16 h-16 aspect-square shrink-0
    rounded-full border-4 border-emerald-500 shadow-sm mb-2
    object-cover object-center
  "
  style={{ aspectRatio: '1 / 1' }}
/>

        {/* ⭐ Calificación */}
        <div className="flex justify-center gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              size={28}
              onClick={() => {
                setRating(n);
                // 💫 Vibración mini + click sound
                if (navigator.vibrate) navigator.vibrate(15);
                const click = new Audio('/sounds/click.mp3');
                click.volume = 0.2;
                click.play().catch(() => {});
              }}
              className={`cursor-pointer transition-transform ${
                n <= rating
                  ? 'fill-yellow-400 text-yellow-400 scale-110'
                  : 'text-gray-300 hover:scale-105'
              }`}
            />
          ))}
        </div>

        {/* 💬 Comentario */}
        <textarea
          className="w-full border rounded-xl p-3 text-sm resize-none focus:ring-2 focus:ring-emerald-400"
          rows={3}
          placeholder="Comentá cómo fue la atención..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        {/* ⚙️ Botones */}
        <div className="flex justify-center gap-3 mt-5">
          {/* Omitir */}
          <button
            onClick={() => {
              toast('Valoración omitida');
              setJobStatus(null);
              setTimeout(() => {
                resetJobState();
                if (mapRef.current && me?.lat && me?.lon) {
                  mapRef.current.flyTo([me.lat, me.lon], 13, { duration: 1.2 });
                }
              }, 400);
            }}
            className="px-5 py-2 rounded-xl border text-gray-600 hover:bg-gray-50"
          >
            Omitir
          </button>

          {/* Finalizar y valorar */}
          <button
            onClick={async () => {
              try {
                await confirmarReseña();
                toast.success('Gracias por valorar al profesional 🙌');
                // 🧹 Limpieza total + zoom animado al mapa
                setTimeout(() => {
                  setJobStatus(null);
                  resetJobState();
                  if (mapRef.current && me?.lat && me?.lon) {
                    mapRef.current.flyTo([me.lat, me.lon], 13, { duration: 1.2 });
                  }
                }, 600);
              } catch (err) {
                console.error('❌ Error al guardar reseña:', err);
                toast.error('No se pudo guardar la valoración');
              }
            }}
            className="px-6 py-2 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition"
          >
            Finalizar y valorar
          </button>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>


      {/* 💬 CHAT MODAL FLOTANTE PREMIUM (AGRANDADO) */}
<AnimatePresence>
  {isChatOpen && selected && (
    <motion.div
      className="fixed inset-0 z-[10020] bg-black/45 backdrop-blur-md flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        className="
          w-full 
          max-w-md 
          h-[85vh]                  /* 🔥 AGRANDADO: 85% de la pantalla */
          bg-white 
          rounded-t-[38px] 
          shadow-[0_-18px_60px_rgba(0,0,0,0.28)]
          flex flex-col 
          overflow-hidden
          border border-gray-200/40
        "
        initial={{ y: 320 }}
        animate={{ y: 0 }}
        exit={{ y: 320 }}
        transition={{ type: 'spring', stiffness: 110, damping: 16 }}
      >

        {/* 🧊 HEADER ESTILO IPHONE */}
        <div className="
          flex items-center justify-between 
          px-6 py-5 
          border-b border-gray-100 
          bg-white/70 backdrop-blur-xl
        ">
          
          {/* VOLVER */}
          <button
            onClick={() => {
              setIsChatOpen(false);
              setMessages([]);
              if (chatChannelRef.current) {
                supabase.removeChannel(chatChannelRef.current);
                chatChannelRef.current = null;
              }
            }}
            className="flex items-center gap-1 text-gray-500 hover:text-emerald-600 transition font-medium"
          >
            <ChevronLeft size={22} />
            Volver
          </button>

          {/* NOMBRE + ESTADO */}
          <div className="flex items-center gap-3">
            <img
              src={selected.avatar_url || '/avatar-fallback.png'}
              className="
                w-11 h-11 rounded-full 
                shadow-md border border-gray-200 object-cover
              "
            />
            <div className="leading-4">
              <p className="font-semibold text-gray-800 text-[15px] tracking-tight">
                {selected.full_name || 'Profesional'}
              </p>
              <p className="text-xs text-emerald-600 flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                {jobStatus === 'accepted' ? 'En camino' : 'Disponible'}
              </p>
            </div>
          </div>

          <div className="w-6"></div>
        </div>

        {/* 🗨 MENSAJES — MÁS GRANDE */}
        <div className="
          flex-1 
          overflow-y-auto 
          px-5 py-5 
          space-y-4 
          bg-gradient-to-b from-white to-gray-50
        ">
          {messages.length === 0 ? (
            <p className="text-center text-gray-400 mt-8 text-sm">
              Inicia la conversación ✨
            </p>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === me?.id;
              return (
                <div 
                  key={m.id} 
                  className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`
                      max-w-[80%] px-4 py-3 
                      rounded-2xl text-[15px] 
                      shadow-sm leading-relaxed
                      ${mine 
                        ? 'bg-emerald-500 text-white rounded-br-none shadow-emerald-300/30' 
                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                      }
                    `}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })
          )}

          {/* “ESCRIBIENDO...” efecto lujo */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="
                bg-white border border-gray-200 
                px-4 py-[7px] 
                rounded-2xl shadow-sm flex gap-[4px]
              ">
                <span className="animate-bounce text-gray-500">•</span>
                <span className="animate-bounce text-gray-500 delay-100">•</span>
                <span className="animate-bounce text-gray-500 delay-200">•</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ✨ INPUT PREMIUM — MÁS ALTO & MEJOR DISEÑO */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const value = inputRef.current?.value?.trim() || '';
            if (value) sendMessage(value);
            inputRef.current.value = '';
          }}
          className="
            flex items-center gap-3 
            p-5 
            bg-white/85 backdrop-blur-lg
            border-t border-gray-200
          "
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Escribí un mensaje…"
            className="
              flex-1 
              px-5 py-3.5 
              rounded-2xl 
              bg-gray-100/70 
              border border-gray-200 
              focus:ring-2 focus:ring-emerald-400/40
              text-gray-700 shadow-inner 
              text-[15px]
            "
          />

          <button
            type="submit"
            className="
              p-4 rounded-2xl 
              bg-emerald-500 hover:bg-emerald-600 
              active:scale-95 
              text-white 
              shadow-lg shadow-emerald-300/30
              transition
            "
          >
            <SendHorizontal size={22} />
          </button>
        </form>

      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
</div>
);
}