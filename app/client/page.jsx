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
// 📍 Radio máximo visible y de filtrado (coherente en TODO el archivo)
const MAX_RADIUS_KM = 999;
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
      right:-2px;
      bottom:-2px;
      width:14px;height:14px;
      border-radius:999px;
      background:#10b981;
      border:2px solid rgba(255,255,255,.95);
      box-shadow:0 6px 14px rgba(16,185,129,.35);
      z-index:6;
    ">
      <div style="
        position:absolute; inset:-6px;
        border-radius:999px;
        background:rgba(16,185,129,.12);
        animation:onlinePulse 1.4s ease-out infinite;
      "></div>
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
/* ✨ CTA Shine + Glow (Buscar Pros) */
if (typeof window !== 'undefined') {
  const styleCTA = document.createElement('style');
  styleCTA.innerHTML = `
    @keyframes ctaShine {
      0%   { transform: translateX(-120%) rotate(12deg); opacity: 0; }
      15%  { opacity: .65; }
      60%  { opacity: .65; }
      100% { transform: translateX(160%) rotate(12deg); opacity: 0; }
    }
    @keyframes ctaGlow {
      0%,100% { filter: drop-shadow(0 10px 18px rgba(16,185,129,.30)); transform: translateY(0); }
      50%     { filter: drop-shadow(0 18px 28px rgba(16,185,129,.55)); transform: translateY(-1px); }
    }
    .cta-glow { animation: ctaGlow 1.8s ease-in-out infinite; }
    .cta-shine::after{
      content:"";
      position:absolute;
      inset:-40%;
      background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,.55) 50%, transparent 65%);
      animation: ctaShine 2.6s ease-in-out infinite;
      pointer-events:none;
    }
  `;
  if (!document.head.querySelector('style[data-manosya-cta]')) {
    styleCTA.setAttribute('data-manosya-cta', '1');
    document.head.appendChild(styleCTA);
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

  /* ✅ NUEVA animación premium (ring) */
  @keyframes onlinePulse {
    0%   { transform: scale(0.6); opacity: .7; }
    70%  { transform: scale(1.25); opacity: 0; }
    100% { transform: scale(1.25); opacity: 0; }
  }
`;
if (typeof window !== 'undefined') {
  const style2 = document.createElement('style');

  // 👇 pegás el style2.innerHTML reemplazado acá

  if (!document.head.querySelector('style[data-manosya-pulse-green]')) {
    style2.setAttribute('data-manosya-pulse-green', '1');
    document.head.appendChild(style2);
  }
}
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
  const stamp =
    worker?.last_seen ||            // ✅ si lo guardás explícito
    worker?.location_updated_at ||  // ✅ si tu view lo trae
    worker?.loc_updated_at ||       // ✅ por si le pusiste otro nombre
    worker?.updated_at;             // fallback

  const mins = minutesSince(stamp);
  if (mins == null) return false;
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
function animateMarkerMove(marker, fromLat, fromLng, toLat, toLng, duration = 900) {
  try {
    if (!marker || typeof marker.setLatLng !== 'function') return;

    const start = performance.now();

    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const lat = fromLat + (toLat - fromLat) * t;
      const lng = fromLng + (toLng - fromLng) * t;
      marker.setLatLng([lat, lng]);
      if (t < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  } catch (e) {
    console.warn('animateMarkerMove error:', e);
  }
}
const LAST_GPS_KEY = 'manosya_last_gps';

function saveLastGps(lat, lon) {
  try { localStorage.setItem(LAST_GPS_KEY, JSON.stringify({ lat, lon, t: Date.now() })); } catch {}
}

function loadLastGps(maxAgeMs = 1000 * 60 * 60 * 24) { // 24h
  try {
    const v = JSON.parse(localStorage.getItem(LAST_GPS_KEY) || 'null');
    if (!v) return null;
    if (Date.now() - v.t > maxAgeMs) return null;
    if (!Number.isFinite(Number(v.lat)) || !Number.isFinite(Number(v.lon))) return null;
    return { lat: Number(v.lat), lon: Number(v.lon) };
  } catch { return null; }
}

function offsetLatLng(lat, lng, meters, angleRad) {
  const dLat = (meters * Math.cos(angleRad)) / 111320;
  const dLng =
    (meters * Math.sin(angleRad)) /
    (111320 * Math.cos((lat * Math.PI) / 180));
  return [lat + dLat, lng + dLng];
}
function metersPerPixel(lat, zoom) {
  // Leaflet / WebMercator aproximación estándar
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
}

// ✅ Anti-overlap “zoom-aware”: separa según tamaño del icono en píxeles
function addAntiOverlapZoomAware(workers, zoom, iconPx = 52, padPx = 10) {
  if (!workers?.length) return [];

  // si no sabemos zoom, fallback a tu versión fija
  if (!Number.isFinite(zoom)) return addAntiOverlap(workers, 120, 90);

  // usamos lat promedio para m/px
  const lat0 =
    workers.reduce((acc, w) => acc + Number(w?.lat || 0), 0) / Math.max(1, workers.length);

  const mpp = metersPerPixel(lat0 || 0, zoom);

  // “cuánto hay que mover” para que 52px no se pise
const gridMeters = Math.max(80, (iconPx + padPx) * mpp * 1.25);
const stepMeters = Math.max(60, (iconPx + padPx) * mpp * 1.05);

  return addAntiOverlap(workers, gridMeters, stepMeters);
}
// ✅ Anti-overlap por "grid" en metros (no por decimales)
function addAntiOverlap(workers, gridMeters = 60, stepMeters = 40) {
  if (!workers?.length) return [];

  const toCell = (lat, lng) => {
    const dLat = gridMeters / 111320;
    const dLng = gridMeters / (111320 * Math.cos((lat * Math.PI) / 180));
    const cy = Math.round(lat / dLat);
    const cx = Math.round(lng / dLng);
    return `${cy}|${cx}`;
  };

  const groups = new Map();
  for (const w of workers) {
    const lat = Number(w?.lat);
    const lng = Number(w?.lng ?? w?.lon ?? w?.long);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const key = toCell(lat, lng);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(w);
  }

  const out = [];
  for (const [, arr] of groups) {
    arr.sort((a, b) => String(a.user_id).localeCompare(String(b.user_id)));
    const n = arr.length;

    for (let i = 0; i < n; i++) {
      const w = arr[i];

      if (n === 1) {
        out.push({ ...w, _dlat: w.lat, _dlng: w.lng });
        continue;
      }

      const perRing = 10;
      const ring = Math.floor(i / perRing) + 1;
      const pos = i % perRing;
      const angle = (2 * Math.PI * pos) / perRing;
      const meters = stepMeters * ring;

      const [dlat, dlng] = offsetLatLng(Number(w.lat), Number(w.lng), meters, angle);
      out.push({ ...w, _dlat: dlat, _dlng: dlng, _stack: n, _stackIndex: i });
    }
  }

  return out;
}

export default function MapPage() {
  const supabase = getSupabase();
  const router = useRouter();
  const mapRef = useRef(null);
  const markerIdToUserIdRef = useRef(new Map());
  const [mapZoom, setMapZoom] = useState(11);
  // 🔥 NECESARIO para createPortal (evita error SSR)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ Refs GPS (evitan duplicar watch + centrar una sola vez)
  const gpsWatchIdRef = useRef(null);
  const gpsCenteredRef = useRef(false);

  // ✅ Refs para animación de marcadores
  const markersRef = useRef({});

  // ✅ Si usás "isTyping" en el chat
  const [isTyping, setIsTyping] = useState(false);


// ✅ Refs
const markerMetaRef = useRef(new Map());
const workersByIdRef = useRef(new Map());
// ✅ Workers state (mover aquí arriba)
const [workers, setWorkers] = useState([]);

useEffect(() => {
  workersByIdRef.current = new Map(
    (workers || []).map(w => [String(w.user_id), w])
  );
}, [workers]);

  const DEFAULT_CENTER = [-23.4437, -58.4400]; // Centro real del país
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [me, setMe] = useState({ id: null, lat: null, lon: null });
  

  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);
  const [clusterOpen, setClusterOpen] = useState(false);
  const [clusterList, setClusterList] = useState([]);
 // ✅ Coordenadas seguras (selected puede traer lng o lon)
const selLat = Number(selected?.lat);
const selLng = Number(selected?.lng ?? selected?.lon ?? selected?.long);
const hasSelCoords = Number.isFinite(selLat) && Number.isFinite(selLng);
const hasMeCoords  = Number.isFinite(Number(me?.lat)) && Number.isFinite(Number(me?.lon));
  const [showPrice, setShowPrice] = useState(false);
  const [route, setRoute] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
const distanceToSelectedKm =
  hasMeCoords && hasSelCoords
    ? haversineKm(Number(me.lat), Number(me.lon), selLat, selLng)
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
// ✅ Ref para evitar problemas de "estado viejo" dentro de callbacks
const gpsStatusRef = useRef('init');
useEffect(() => { gpsStatusRef.current = gpsStatus; }, [gpsStatus]);
useEffect(() => {
  let alive = true;

  async function bootGeo() {
    if (typeof window === 'undefined') return;

    if (!navigator?.geolocation) {
      if (!alive) return;
      setGpsStatus('error');
      setGpsError('Este dispositivo no soporta GPS (geolocation).');
      return;
    }

    // ⚠️ NO forzar el prompt al montar (PWA Android).
    // Solo si ya está concedido -> arrancamos watcher.
    try {
      if (navigator.permissions?.query) {
        const perm = await navigator.permissions.query({ name: 'geolocation' });
        if (!alive) return;

        if (perm.state === 'granted') {
          requestGPS(); // ✅ permiso ya concedido
        } else if (perm.state === 'denied') {
          setGpsStatus('denied');
          setGpsError('Permiso de ubicación denegado (activar en Permisos / Ubicación precisa).');
        } else {
          setGpsStatus('init'); // prompt: esperar botón
          setGpsError(null);
        }

        perm.onchange = () => {
          if (!alive) return;
          if (perm.state === 'granted') requestGPS();
          if (perm.state === 'denied') {
            setGpsStatus('denied');
            setGpsError('Permiso de ubicación denegado.');
          }
        };
      } else {
        setGpsStatus('init');
        setGpsError(null);
      }
    } catch {
      setGpsStatus('init');
      setGpsError(null);
    }
  }

  bootGeo();

  return () => {
    alive = false;
    try {
      if (gpsWatchIdRef.current != null && navigator?.geolocation) {
        navigator.geolocation.clearWatch(gpsWatchIdRef.current);
      }
    } catch {}
    gpsWatchIdRef.current = null;
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
// eslint-disable-next-line no-unused-vars
const [tick, setTick] = useState(0);

useEffect(() => {
  const t = setInterval(() => setTick(x => x + 1), 60000); // cada 1 minuto
  return () => clearInterval(t);
}, []);
async function requestGPS() {
  if (typeof window === 'undefined') return;

  if (!navigator?.geolocation) {
    setGpsStatus('error');
    setGpsError('Este dispositivo no soporta ubicación (geolocation).');
    toast.error('Tu dispositivo no soporta GPS.');
    return;
  }

  // ✅ Estado UX: buscando (no bloquea)
  setGpsStatus('requesting');
  setGpsError(null);

  // ✅ No mates el watcher cada vez; solo si había uno previo real
  try {
    if (gpsWatchIdRef.current != null) {
      navigator.geolocation.clearWatch(gpsWatchIdRef.current);
      gpsWatchIdRef.current = null;
    }
  } catch {}

  const onFix = (pos, playToast = false) => {
    const lat = Number(pos?.coords?.latitude);
    const lon = Number(pos?.coords?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    saveLastGps(lat, lon);

    setMe((prev) => ({ ...prev, lat, lon }));
    setCenter([lat, lon]);

    // ✅ centrar solo 1 vez
    if (!gpsCenteredRef.current && mapRef.current) {
      gpsCenteredRef.current = true;
      mapRef.current.flyTo([lat, lon], 13, { duration: 1.0 });
      setTimeout(() => mapRef.current?.invalidateSize?.(), 250);
    }

    setGpsStatus('granted');
    setGpsError(null);

    if (playToast) toast.success('📍 Ubicación activada');
  };

  // ✅ 0) fallback instantáneo: último GPS guardado (no espera)
  const cached = loadLastGps();
  if (cached && !gpsCenteredRef.current && mapRef.current) {
    setMe((prev) => ({ ...prev, lat: cached.lat, lon: cached.lon }));
    setCenter([cached.lat, cached.lon]);
    gpsCenteredRef.current = true;
    mapRef.current.flyTo([cached.lat, cached.lon], 12, { duration: 0.7 });
    setTimeout(() => mapRef.current?.invalidateSize?.(), 250);
  }

  // ✅ Mensajes UX correctos
  const msgDenied =
    'Permiso denegado. Activá Ubicación precisa para ver “Más cerca”.';
  const msgUnavailable =
    'Ubicación no disponible (GPS apagado / sin señal / ahorro de batería).';
  const msgTimeoutSoft =
    'Buscando ubicación… (podés usar la app igual).';

  // ✅ 1) WATCH “RÁPIDO” (network) — es el que salva móvil indoor
  const startFastWatch = () => {
    const id = navigator.geolocation.watchPosition(
      (pos) => onFix(pos, gpsStatusRef.current !== 'granted'),
      (err) => {
        // 🚫 denegado = sí es fatal
        if (err?.code === 1) {
          setGpsStatus('denied');
          setGpsError(msgDenied);
          toast.error(`📍 ${msgDenied}`);
          return;
        }

        // ⏳ timeout / unavailable = NO fatal (seguimos intentando)
        if (err?.code === 3) {
          setGpsStatus('requesting');
          setGpsError(msgTimeoutSoft);
          return;
        }

        setGpsStatus('requesting');
        setGpsError(msgUnavailable);
      },
      {
        enableHighAccuracy: false,
        maximumAge: 120000, // 2 min de cache ayuda muchísimo
        timeout: 15000,     // rápido
      }
    );
    gpsWatchIdRef.current = id;
  };

  // ✅ 2) WATCH “PRECISO” (GPS) — en paralelo, pero con timeout largo
  const startPreciseWatch = () => {
    navigator.geolocation.watchPosition(
      (pos) => onFix(pos, gpsStatusRef.current !== 'granted'),
      (err) => {
        if (err?.code === 1) return; // denied ya manejado arriba
        // timeout acá también NO fatal
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 90000, // 🔥 clave en Android (indoor tarda)
      }
    );
  };

  // ✅ 3) Intento rápido inmediato (una sola vez)
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      onFix(pos, true);
      startFastWatch();
      startPreciseWatch();
    },
    (err) => {
      if (err?.code === 1) {
        setGpsStatus('denied');
        setGpsError(msgDenied);
        toast.error(`📍 ${msgDenied}`);
        return;
      }

      // ⚠️ timeout/unavailable => NO “error”, dejamos buscando y arrancamos watch sí o sí
      setGpsStatus('requesting');
      setGpsError(err?.code === 3 ? msgTimeoutSoft : msgUnavailable);

      startFastWatch();
      startPreciseWatch();
    },
    { enableHighAccuracy: false, maximumAge: 120000, timeout: 8000 }
  );
}

// ✅ Reintento de centrado: cuando el mapa ya existe y el GPS ya llegó
useEffect(() => {
  if (gpsCenteredRef.current) return;
  if (!mapRef.current) return;
  if (!hasMeCoords) return;

  gpsCenteredRef.current = true;
  mapRef.current.flyTo([Number(me.lat), Number(me.lon)], 11, { duration: 1.2 });
  setTimeout(() => mapRef.current?.invalidateSize?.(), 250);
}, [me?.lat, me?.lon, hasMeCoords]);

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

  if (!Number(me?.lat) || !Number(me?.lon)) return;
  if (!hasMeCoords || !hasSelCoords) return;

  setRoute([[me.lat, me.lon], [selLat, selLng]]);
}, [jobId, jobStatus, me?.lat, me?.lon, selLat, selLng]);
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
      .not('lat', 'is', null);

    if (serviceFilter) {
      const normalized = serviceFilter
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

      query = query
        .not('skills', 'is', null)
        .ilike('skills', `%${normalized}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    // ✅ NORMALIZAR: dejá lat/lng SIEMPRE numéricos y en la misma llave
    const cleaned = (data || [])
      .map((w) => {
        const lat = Number(w?.lat);
        const lng = Number(w?.lng ?? w?.lon ?? w?.long);
        return { ...w, lat, lng };
      })
      .filter((w) => Number.isFinite(w.lat) && Number.isFinite(w.lng));

    console.log('🧠 Trabajadores total:', (data || []).length);
    console.log('✅ Trabajadores coords válidas:', cleaned.length);

    setWorkers(cleaned);
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

        setWorkers(prev =>
  prev.map(w =>
    String(w.user_id) === String(updated.user_id)
      ? {
          ...w,
          status: updated.status,
          busy_until: updated.busy_until,
          is_active: updated.is_active,
          updated_at: updated.updated_at,
        }
      : w
  )
);
      }
    )
    .subscribe();

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
        last_seen: updated.updated_at || new Date().toISOString(), // ✅
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
    lng: uLng, // ✅ normalizado
    last_seen: updated.updated_at || new Date().toISOString(),
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
// 🌍 Sincronización global en vivo (workers, jobs, perfiles)
useEffect(() => {
  const stop = startRealtimeCore((type, data) => {
    switch (type) {
      case 'worker': {
  setWorkers((prev) => {
    const exists = prev.some((w) => String(w.user_id) === String(data.user_id));

    // ✅ NO borrar por status
    if (exists) {
      return prev.map((w) =>
        String(w.user_id) === String(data.user_id)
          ? { ...w, ...data, _justUpdated: true }
          : w
      );
    }

    // ✅ si no existe, lo agregamos igual (si tiene coords, mejor)
    return [...prev, { ...data, _justUpdated: true }];
  });

  setTimeout(() => {
    setWorkers((prev) =>
      prev.map((w) =>
        String(w.user_id) === String(data.user_id)
          ? { ...w, _justUpdated: false }
          : w
      )
    );
  }, 2000);

  break;
}

      case 'job': {
        if (data.client_id === me.id) {
          setJobStatus(data.status);

          if (data.status === 'completed' || data.status === 'worker_completed') {
            toast.success('🎉 El trabajador finalizó el trabajo');
            setJobStatus('worker_completed');
          } else if (['cancelled', 'rejected', 'worker_rejected'].includes(data.status)) {
            toast.error('🚫 El trabajador rechazó o canceló el pedido');
            resetJobState();
          } else if (data.status === 'accepted') {
            toast.success('🟢 El trabajador aceptó tu pedido');
          } else if (data.status === 'assigned') {
            toast.info('📦 Pedido asignado correctamente');
          }
        }
        break;
      }

      case 'profile': {
        setWorkers((prev) =>
          prev.map((w) => (w.user_id === data.id ? { ...w, ...data } : w))
        );
        break;
      }

      default:
        console.log('Evento realtime desconocido:', type, data);
    }
  });

  return () => {
    try { stop?.(); } catch {}
    stopRealtimeCore?.();
  };
}, [me.id]); // ✅ NO metas chatId acá si no lo usás dentro
// 🛰️ ESCUCHAR MENSAJES NUEVOS GLOBALES (aunque el chat no esté abierto)
useEffect(() => {
  if (!me?.id) return;

  const channelGlobal = supabase
    .channel('global-messages')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => {
        const msg = payload.new;
if (
  msg.sender_id !== me.id &&     // no es mi propio mensaje
  msg.chat_id &&                 // pertenece a un chat
  chatId &&                      // hay un chat activo
  String(msg.chat_id) === String(chatId)  // es el chat actual
) {
  if (!isChatOpen) {
    setHasUnread(true);
    toast.info('💬 Nuevo mensaje de un profesional');
  }
}
        // ✅ Solo avisar si: no es mío, pertenece al chat activo y el chat está cerrado
        if (
          msg.sender_id !== me.id &&
          msg.chat_id &&
          chatId &&
          String(msg.chat_id) === String(chatId)
        ) {
          if (!isChatOpen) {
            setHasUnread(true);
            toast.info('💬 Nuevo mensaje de un profesional');
          }
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channelGlobal);
  };
}, [me?.id, chatId, isChatOpen]);


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
const wLat = Number(worker?.lat);
const wLng = Number(worker?.lng ?? worker?.lon ?? worker?.long);

if (mapRef.current && Number.isFinite(wLat) && Number.isFinite(wLng)) {
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
  [Number(me.lat), Number(me.lon)],
  [selLat, selLng],
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
      client_lat: me.lat,
      client_lng: me.lon,
      worker_lat: selLat,
      worker_lng: selLng,
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
// ✅ NO recortar la lista de workers, solo mantener selección visual
setWorkers((prev) =>
  (prev || []).map((w) => ({
    ...w,
    _selected: String(w.user_id) === String(selected.user_id),
  }))
);

// ✅ ruta SIEMPRE usando selLat/selLng (que ya contempla lon/lng)
setRoute([[me.lat, me.lon], [selLat, selLng]]);

if (mapRef.current && Number.isFinite(me.lat) && hasSelCoords) {
  mapRef.current.fitBounds([[me.lat, me.lon], [selLat, selLng]], { padding: [80, 80] });
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
          if (payload.new.sender_id !== me.id)
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
  fetchWorkers(selectedService || null);

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
  if (!Number(me?.lat) || !Number(me?.lon)) return;
  if (!selLat || !selLng) return;

  const km = haversineKm(
    Number(me.lat),
    Number(me.lon),
    selLat,
    selLng
  );

  setDistanciaKm(km);
}, [me?.lat, me?.lon, selLat, selLng]);

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
{(gpsStatus === 'init' || gpsStatus === 'requesting' || gpsStatus === 'denied' || gpsStatus === 'error') && (
  <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[20000]">
    <div className="bg-white/95 border border-gray-200 shadow-lg rounded-2xl px-4 py-3 text-sm">
      <div className="font-semibold text-gray-800">
        📍 {gpsStatus === 'requesting' ? 'Buscando tu ubicación…' : 'Activá tu ubicación'}
      </div>

      {gpsError && <div className="text-gray-500 mt-1">{gpsError}</div>}

      <div className="flex gap-2 mt-3">
        <button
          onClick={requestGPS}   // tu función actual
          className="px-3 py-2 rounded-xl bg-emerald-500 text-white font-semibold active:scale-95"
        >
          Activar GPS
        </button>

        <button
          onClick={() => toast('Abrí: Ajustes > Apps > ManosYA > Permisos > Ubicación (Precisa)')}
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
  <MapContainer
  key={Number(me?.lat) && Number(me?.lon) ? 'gps' : 'nogps'}
    center={center} // puede quedar así (pero ya no lo actualizamos por GPS)
    zoom={Number(me?.lat) && Number(me?.lon) ? 11 : 7}
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
whenCreated={(map) => {
  mapRef.current = map;

  // ✅ track zoom para anti-overlap
  setMapZoom(map.getZoom());
  map.on('zoomend', () => setMapZoom(map.getZoom()));

  const el = map.getContainer();
  el.style.touchAction = 'pan-x pan-y';
  el.style.overscrollBehavior = 'none';
  setTimeout(() => map.invalidateSize(), 200);
}}
  {/* 🎯 Radio visible (MAX_RADIUS_KM) */}
  {Number(me?.lat) && Number(me?.lon) && (
    <Circle
      center={[me.lat, me.lon]}
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


   {/* ✅ Bloque final actualizado — oculta 'paused' y muestra estados dinámicos */}
{/* ✅ BLOQUE CLUSTER + FILTRO FINAL (reemplazar completo) */}
{/* ✅ BLOQUE CLUSTER + FILTRO FINAL (REEMPLAZAR COMPLETO) */}
{/* ✅ SIN CLUSTER: mostramos todos los markers + anti-overlap para que no se pisen */}
{addAntiOverlapZoomAware(workers, mapZoom, 52, 28)
  ?.filter((w) => {
    const wLat = Number(w?._dlat ?? w?.lat);
    const wLng = Number(w?._dlng ?? w?.lng);
    if (!Number.isFinite(wLat) || !Number.isFinite(wLng)) return false;

    const meLat = Number(me?.lat);
    const meLng = Number(me?.lon);
    const meOk = Number.isFinite(meLat) && Number.isFinite(meLng);

    if (meOk) {
      const km = haversineKm(meLat, meLng, wLat, wLng);
      if (Number.isFinite(km) && km > MAX_RADIUS_KM) return false;
    }
    return true;
  })
  .map((w) => {
    const wLat = Number(w?._dlat ?? w?.lat);
    const wLng = Number(w?._dlng ?? w?.lng);

    return (
      <Marker
        key={`worker-${w.user_id}`}
        position={[wLat, wLng]}
        icon={avatarIcon(w.avatar_url, w) || undefined}
        eventHandlers={{
          add: (e) => {
            const m = e?.target;
            if (!m) return;
            const uid = String(w.user_id);
            markersRef.current[uid] = m;
            m.options.__userId = uid;
            markerIdToUserIdRef.current.set(m._leaflet_id, uid);
          },
          remove: (e) => {
            const m = e?.target;
            if (!m) return;
            const uid = String(m.options.__userId ?? '');
            markerIdToUserIdRef.current.delete(m._leaflet_id);
            if (uid) delete markersRef.current[uid];
          },
          click: () => handleMarkerClick(w),
        }}
      />
    );
  })}

</MapContainer>

{/* ✅ MODAL CLUSTER (PORTAL + estrellas) */}
{mounted && createPortal(
  <AnimatePresence>
    {clusterOpen && (
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center"
        style={{ zIndex: 60000 }} // 🔥 SIEMPRE arriba del panel inferior
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setClusterOpen(false)}
      >
        <motion.div
          className="w-full max-w-md bg-white rounded-t-3xl p-5 shadow-2xl"
          initial={{ y: 420 }}
          animate={{ y: 0 }}
          exit={{ y: 420 }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          onClick={(e) => e.stopPropagation()}
          style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-extrabold text-gray-800">
              Profesionales en esta zona ({clusterList.length})
            </h3>
            <button
              onClick={() => setClusterOpen(false)}
              className="text-gray-500 hover:text-red-500"
            >
              <XCircle size={22} />
            </button>
          </div>

         <div className="max-h-[55vh] overflow-y-auto space-y-2">
  {clusterList.map((w) => {
    const rating = Number(w?.avg_rating || 0);
    const reviews = Number(w?.total_reviews || 0);

    const goProfile = () => {
      setClusterOpen(false);
      handleMarkerClick(w); // ✅ abre panel del profesional (selected)
    };

    return (
      <div
        key={w.user_id}
        className="w-full flex items-center gap-3 p-3 rounded-2xl border border-gray-200 hover:bg-emerald-50 transition"
      >
        {/* ✅ Click en el cuerpo = seleccionar */}
        <button
          onClick={goProfile}
          className="flex-1 flex items-center gap-3 text-left active:scale-[0.99] transition"
        >
          <img
            src={w.avatar_url || "/avatar-fallback.png"}
            onError={(e) => (e.currentTarget.src = "/avatar-fallback.png")}
            className="w-12 h-12 rounded-full object-cover border-2 border-emerald-400"
            alt="avatar"
          />

          <div className="flex-1">
            <div className="font-bold text-gray-800 leading-5">
              {w.full_name || "Profesional"}
            </div>

            {/* ✅ ESTADO */}
            <div className="text-xs text-gray-500">
              {isOnlineRecent(w) ? "🟢 EN LÍNEA" : "⚪ Inactivo"}
            </div>

          {/* 📍 DISTANCIA (KM) — fallback _distKm -> _dist */}
<div className="mt-1">
  {(() => {
    const d =
      Number.isFinite(Number(w?._distKm)) ? Number(w._distKm)
      : Number.isFinite(Number(w?._dist)) ? Number(w._dist)
      : null;

    return d != null ? (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
        <span className="text-[12px] font-extrabold text-emerald-700">
          📍 {formatKm(d)}
        </span>
        <span className="text-[11px] font-semibold text-gray-500">(más cerca)</span>
      </div>
    ) : (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 border border-gray-200">
        <span className="text-[12px] font-bold text-gray-500">📍 —</span>
        <span className="text-[11px] font-semibold text-gray-400">
          activá GPS para ver km
        </span>
      </div>
    );
  })()}
</div>

            {/* ✅ ESTRELLAS + REVIEWS */}
            <div className="flex items-center gap-1 mt-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star
                  key={i}
                  size={14}
                  className={
                    i < Math.round(rating)
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-300"
                  }
                />
              ))}
              <span className="text-xs text-gray-500 ml-1">
                {rating ? rating.toFixed(1) : "0.0"} ({reviews})
              </span>
            </div>
          </div>
        </button>

        {/* ✅ CTA: Ver más (botón real) */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation(); // ✅ evita doble click / bubbling
            goProfile();
          }}
          className="
            px-3 py-2 rounded-xl
            bg-emerald-600 text-white
            font-extrabold text-[12px]
            shadow-[0_10px_22px_rgba(16,185,129,0.30)]
            active:scale-[0.98] transition
            whitespace-nowrap
          "
        >
          Ver más
        </button>
      </div>
    );
  })}
</div>
        </motion.div>
      </motion.div>
    )}
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
    grid grid-cols-3 gap-2
      rounded-2xl p-2
      bg-white/70 backdrop-blur-xl
      border border-gray-200/70
      shadow-[0_12px_40px_rgba(0,0,0,0.08)]
    "
  >

  {/* Más cerca (CTA principal cool) */}
<motion.button
  whileTap={{ scale: 0.96 }}
  whileHover={{ scale: 1.02 }}
  onClick={() => {
    if (!workers?.length) {
      toast.warning('Primero cargá los trabajadores');
      return;
    }

    const ranked = [...workers]
      .map((w) => {
        const wLat = Number(w?.lat);
        const wLng = Number(w?.lng ?? w?.lon ?? w?.long);

        const dist =
          hasMeCoords && Number.isFinite(wLat) && Number.isFinite(wLng)
            ? haversineKm(Number(me.lat), Number(me.lon), wLat, wLng)
            : null;

        return {
          ...w,
          _distKm: Number.isFinite(dist) ? dist : null,
          _dist: Number.isFinite(dist) ? dist : null,
          _online: isOnlineRecent(w),
          _rating: Number(w?.avg_rating || 0),
        };
      })
      .sort((a, b) => {
        if (a._distKm != null && b._distKm != null) return a._distKm - b._distKm;
        if (a._online !== b._online) return a._online ? -1 : 1;
        if (a._rating !== b._rating) return b._rating - a._rating;
        return 0;
      });

    setClusterList(ranked.slice(0, 30));
    setClusterOpen(true);
  }}
  className="
    relative col-span-1 overflow-hidden
    rounded-2xl px-2 py-3
    text-white
    border border-white/20
    shadow-[0_18px_40px_rgba(16,185,129,0.35)]
    active:scale-[0.98] transition
    flex flex-col items-center justify-center gap-1
  "
  style={{
    background:
      "radial-gradient(120% 120% at 20% 10%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 55%), linear-gradient(135deg, #10b981 0%, #059669 45%, #047857 100%)",
  }}
>
  {/* Aurora blobs */}
  <span className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-white/20 blur-xl" />
  <span className="absolute -bottom-8 -left-8 w-20 h-20 rounded-full bg-cyan-300/20 blur-xl" />

  {/* Shine */}
  <span className="absolute inset-0 opacity-60">
    <span className="absolute -left-10 top-0 h-full w-10 rotate-12 bg-white/25 blur-md animate-[ctaShine_2.6s_ease-in-out_infinite]" />
  </span>

  {/* Top dot */}
  <span className="absolute left-2 top-2 w-2.5 h-2.5 rounded-full bg-white">
    <span className="absolute inset-0 rounded-full bg-white animate-ping opacity-70" />
  </span>

  {/* Pin + badge */}
  <div className="relative mt-0.5">
    <span className="text-[20px] leading-none drop-shadow">📍</span>
    <span className="absolute -right-2 -top-1 text-[10px] font-black bg-white/20 px-2 py-0.5 rounded-full border border-white/15">
    </span>
  </div>

  <div className="leading-none text-center">
    <div className="text-[12px] font-extrabold">Más</div>
    <div className="text-[10px] font-semibold opacity-95 -mt-0.5">cerca</div>
    <div className="text-[9px] font-bold opacity-90 mt-1">Encontrá ya</div>
  </div>
</motion.button>
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

  {/* MODAL SERVICIOS */}
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
          style={{
            paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
          }}
          initial={{ y: 380 }}
          animate={{ y: 0 }}
          exit={{ y: 380 }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-extrabold text-gray-800">Seleccionar servicio</h3>
            <button
              onClick={() => setServicesOpen(false)}
              className="text-gray-500 hover:text-red-500 transition"
            >
              <XCircle size={22} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Opción: ver todos */}
            <button
              onClick={() => {
                toggleService(null);
                setServicesOpen(false);
              }}
              className={`
                p-3 rounded-2xl border font-semibold text-sm
                ${!selectedService ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-gray-50 text-gray-700 border-gray-200'}
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
                  ${selectedService === s.id ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-gray-50 text-gray-700 border-gray-200'}
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
  </AnimatePresence>
</motion.div>
  {/* PERFIL DEL TRABAJADOR / CHOFER (MODIFICADO) */}
<AnimatePresence>
  {selected && !showPrice && (() => {
    
 

       const km =
  hasMeCoords && hasSelCoords
    ? Math.round(haversineKm(Number(me.lat), Number(me.lon), selLat, selLng) * 10) / 10
    : null;

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
                  className="
                    w-20 h-20 rounded-full border-4 border-emerald-500 shadow-md
                    object-cover object-center
                  "
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

              {/* ⭐ Calificación dinámica */}
              <div className="flex justify-center items-center gap-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={
                      i < Math.round(selected.avg_rating)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    }
                  />
                ))}
                <span className="text-xs text-gray-500 ml-1">
                  ({selected.total_reviews || 0})
                </span>
              </div>

              {/* 🧠 Experiencia dinámica */}
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



{/* 📍 Distancia al profesional */}
<div className="mt-2 flex justify-center">
  {Number.isFinite(km) ? (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
      <span className="text-[12px] font-extrabold text-emerald-700">
        📍 {formatKm(km)}
      </span>
      <span className="text-[11px] font-semibold text-gray-500">
        desde tu ubicación
      </span>
    </div>
  ) : (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 border border-gray-200">
      <span className="text-[12px] font-bold text-gray-500">📍 —</span>
      <span className="text-[11px] font-semibold text-gray-400">
        activá GPS para ver km
      </span>
    </div>
  )}
</div>

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
</AnimatePresence>

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
              if (mapRef.current && me?.lat && me?.lon) {
                mapRef.current.flyTo([me.lat, me.lon], 13, { duration: 1.2 });
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