'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
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
// ✅ Cluster (react-leaflet-cluster)
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

const MarkerClusterGroup = dynamic(
  () => import('react-leaflet-cluster').then((m) => m.default),
  { ssr: false }
);
const Circle = dynamic(() => import('react-leaflet').then(m => m.Circle), { ssr: false });
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false });
const MapEffectBinder = dynamic(
  async () => {
    const React = await import('react');
    const { useMap } = await import('react-leaflet');

    return function MapEffectBinderInner({ onReady }) {
      const map = useMap();

      React.useEffect(() => {
        if (!map) return;
        onReady?.(map);
      }, [map, onReady]);

      return null;
    };
  },
  { ssr: false }
);
// 📍 Radio máximo visible y de filtrado (coherente en TODO el archivo)
const MAX_RADIUS_KM = 999;
const MAX_RADIUS_M = MAX_RADIUS_KM * 1000;

// ✅ “Más cerca” solo mostrará gente dentro de este rango
const NEAREST_MAX_KM = 5; // 👈 ajustá: 3, 5, 8, 10... (yo recomiendo 5)
function mapAccentColor(worker) {
  // 🔒 Si está desactivado manualmente → gris siempre
  if (worker?.is_active === false) {
    return '#9ca3af';
  }

  const updatedAt = worker?.updated_at
    ? new Date(worker.updated_at).getTime()
    : Date.now();

  const diffMin = (Date.now() - updatedAt) / 60000;

  // 🟢 Activo y reciente
  if (diffMin <= 30) {
    return '#10b981';
  }

  // ⚪ Activo pero sin actividad reciente
  return '#9ca3af';
}
// 🎯 2 capas de cluster (evita 10 taps)
const CLUSTER_STAGE_ZOOM = 11; // 1er salto (macro -> ciudad/barrio)
const CLUSTER_LIST_ZOOM  = 13; // desde aquí, ya mostramos lista (barrio)
// ✅ Icono del clúster (iconCreateFunction)
function clusterIconCreateFunction(cluster) {
  if (typeof window === 'undefined') return null;

  const L = require('leaflet');
  const count = cluster.getChildCount?.() ?? 0;

  const size =
    count < 10 ? 44 :
    count < 50 ? 52 :
    count < 100 ? 60 : 68;

  const html = `
    <div
      class="cluster-pulse"
      style="
        width:${size}px;height:${size}px;
        border-radius:999px;
        display:flex;align-items:center;justify-content:center;
        background: radial-gradient(circle at 30% 25%, rgba(255,255,255,.45), rgba(16,185,129,.92) 60%, rgba(4,120,87,1) 100%);
        border: 3px solid rgba(255,255,255,.92);
        box-shadow: 0 18px 45px rgba(16,185,129,.35);
        font-weight: 900;
        color: #fff;
        letter-spacing: -0.5px;
      "
    >
      <span style="font-size:${Math.max(12, Math.floor(size / 3.2))}px;">
        ${count}
      </span>
    </div>
  `;

  return L.divIcon({
    html,
    className: '',
    iconSize: [size, size],
  });
}

// ✅ CSS GLOBAL ROBUSTO (1 sola vez, 1 solo <style>, Fast Refresh safe)
function ensureManosyaGlobalStyles() {
  if (typeof window === 'undefined') return;

  const ID = 'manosya-global-styles-v1';
  if (document.getElementById(ID)) return;

  const s = document.createElement('style');
  s.id = ID;
  s.innerHTML = `
    @keyframes bounceMarker {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }

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

    .cluster-pulse { animation: pulse 2s infinite; }
    @keyframes pulse {
      0%   { transform: scale(1); box-shadow: 0 0 0 rgba(16,185,129,0.35); }
      50%  { transform: scale(1.08); box-shadow: 0 0 25px rgba(16,185,129,0.55); }
      100% { transform: scale(1); box-shadow: 0 0 0 rgba(16,185,129,0.35); }
    }

    @keyframes pulseGreen {
      0%   { transform: scale(0.6); opacity: 0.7; }
      50%  { transform: scale(1.3); opacity: 0.3; }
      100% { transform: scale(0.6); opacity: 0; }
    }

       @keyframes onlinePulse {
      0%   { transform: scale(0.6); opacity: .7; }
      70%  { transform: scale(1.25); opacity: 0; }
      100% { transform: scale(1.25); opacity: 0; }
    }

    @keyframes clientGpsPulse {
      0%   { transform: scale(0.75); opacity: 0.55; }
      70%  { transform: scale(1.9); opacity: 0; }
      100% { transform: scale(1.9); opacity: 0; }
    }

    @keyframes clientGpsGlow {
      0%, 100% { transform: scale(1); box-shadow: 0 0 0 rgba(14,165,233,0.0); }
      50%      { transform: scale(1.06); box-shadow: 0 0 26px rgba(37,99,235,0.35); }
    }
  `;
  document.head.appendChild(s);
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

function clientLocationIcon() {
  if (typeof window === 'undefined') return null;
  const L = require('leaflet');

  const size = 54;

  const html = `
    <div style="
      width:${size}px;
      height:${size}px;
      position:relative;
      display:flex;
      align-items:center;
      justify-content:center;
      pointer-events:none;
    ">
      <div style="
        position:absolute;
        width:54px;
        height:54px;
        border-radius:999px;
        background:rgba(14,165,233,0.18);
        animation:clientGpsPulse 1.8s ease-out infinite;
      "></div>

      <div style="
        position:absolute;
        width:34px;
        height:34px;
        border-radius:999px;
        background:rgba(59,130,246,0.18);
        border:2px solid rgba(14,165,233,0.35);
        animation:clientGpsGlow 1.8s ease-in-out infinite;
      "></div>

      <div style="
        position:absolute;
        width:18px;
        height:18px;
        border-radius:999px;
        background:linear-gradient(180deg,#38bdf8 0%, #2563eb 100%);
        border:3px solid #ffffff;
        box-shadow:
          0 0 0 4px rgba(14,165,233,0.20),
          0 10px 22px rgba(37,99,235,0.35);
      "></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
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
async function fetchRoadRoute(fromLat, fromLng, toLat, toLng) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.routes?.length) return null;

    const coords = data.routes[0].geometry.coordinates;

    const route = coords.map(c => [c[1], c[0]]);

    return {
      route,
      distanceKm: data.routes[0].distance / 1000,
      durationMin: Math.round(data.routes[0].duration / 60)
    };

  } catch (e) {
    console.warn("route error", e);
    return null;
  }
}
export default function MapPage() {
  const supabase = getSupabase();
  const router = useRouter();
  const mapRef = useRef(null);
  const markerIdToUserIdRef = useRef(new Map());
  const [mapZoom, setMapZoom] = useState(11);
  const [etaMinutes, setEtaMinutes] = useState(null);
  // 🔥 NECESARIO para createPortal (evita error SSR)
 const [mounted, setMounted] = useState(false);

 useEffect(() => {
  setMounted(true);

  if (typeof window === 'undefined') return;

  // ✅ CSS global 1 sola vez
  ensureManosyaGlobalStyles();

  const setRealVH = () => {
    // ✅ visualViewport es lo más confiable en Android/PWA
    const h = window.visualViewport?.height ?? window.innerHeight;
    document.documentElement.style.setProperty('--real-vh', `${Math.round(h)}px`);
  };

  // ✅ set inicial
  setRealVH();

  // ✅ listeners robustos
  const vv = window.visualViewport;
  window.addEventListener('resize', setRealVH);
  window.addEventListener('orientationchange', setRealVH);

  // 🔥 cuando abrís/cerrás modales, Android suele cambiar visualViewport sin “resize” clásico
  vv?.addEventListener('resize', setRealVH);
  vv?.addEventListener('scroll', setRealVH); // en algunos devices cambia al scrollear UI

  // ✅ “micro-recalc” luego de animaciones de framer (cierre modal)
  const t1 = setTimeout(setRealVH, 50);
  const t2 = setTimeout(setRealVH, 250);

  return () => {
    clearTimeout(t1);
    clearTimeout(t2);
    window.removeEventListener('resize', setRealVH);
    window.removeEventListener('orientationchange', setRealVH);
    vv?.removeEventListener('resize', setRealVH);
    vv?.removeEventListener('scroll', setRealVH);
  };
}, []);
  // ✅ Refs GPS (evitan duplicar watch + centrar una sola vez)
  const gpsWatchFastRef = useRef(null);
  const gpsWatchPreciseRef = useRef(null);
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
  

const [selected, setSelected] = useState(null);
const [profileSheetMode, setProfileSheetMode] = useState('full'); // 'full' | 'mini'
const [isTrackingWorker, setIsTrackingWorker] = useState(false);
const [busy, setBusy] = useState(false);


// ✅ MODAL GRANDE (Más cerca) — si no está, revienta "clusterOpen is not defined"
const [clusterOpen, setClusterOpen] = useState(false);
const [clusterList, setClusterList] = useState([]);
const [clusterMode, setClusterMode] = useState(null);
useEffect(() => {
  if (typeof window === 'undefined') return;

  const h = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty('--real-vh', `${Math.round(h)}px`);

  setTimeout(() => mapRef.current?.invalidateSize?.(), 200);
}, [clusterOpen]);

// ✅ Mini modal flotante SOLO para click en CLUSTER (separado de "Más cerca")
const [clusterMiniOpen, setClusterMiniOpen] = useState(false);
const [clusterMiniList, setClusterMiniList] = useState([]);
const [clusterMiniPos, setClusterMiniPos] = useState({ left: 16, top: 120 });

// ✅ Punto de referencia para “Más cerca” (GPS o centro del mapa)
function getRefPoint() {
  // 1) GPS real si existe
  if (hasMeCoords) return { lat: Number(me.lat), lng: Number(me.lon), mode: 'gps' };

  // 2) Centro actual del mapa si existe (sirve en móvil aunque GPS falle)
  try {
    const c = mapRef.current?.getCenter?.();
    const lat = Number(c?.lat);
    const lng = Number(c?.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng, mode: 'map' };
  } catch {}

  // 3) Fallback: HOME_VIEW
  return { lat: Number(HOME_VIEW.center[0]), lng: Number(HOME_VIEW.center[1]), mode: 'home' };
}

// ✅ Construye lista “más cerca” (con GPS o con centro del mapa)
function buildNearestList(srcWorkers, limit = 30) {
  const ref = getRefPoint();
  const refOk = Number.isFinite(ref?.lat) && Number.isFinite(ref?.lng);

  // ✅ Si no hay punto de referencia (sin GPS y sin mapa), devolvemos vacío
  if (!refOk) return [];

  const list = (srcWorkers || [])
    .map((w) => {
      const wLat = Number(w?.lat);
      const wLng = Number(w?.lng ?? w?.lon ?? w?.long);

      const dist =
        Number.isFinite(wLat) && Number.isFinite(wLng)
          ? haversineKm(Number(ref.lat), Number(ref.lng), wLat, wLng)
          : null;

      return {
        ...w,
        _distKm: Number.isFinite(dist) ? dist : null,
        _dist: Number.isFinite(dist) ? dist : null,
        _online: isOnlineRecent(w),
        _rating: Number(w?.avg_rating || 0),
      };
    })
    // ✅ coords válidas
    .filter((w) => {
      const wLat = Number(w?.lat);
      const wLng = Number(w?.lng ?? w?.lon ?? w?.long);
      return Number.isFinite(wLat) && Number.isFinite(wLng);
    })
    // ✅ FILTRO CLAVE: solo los que están realmente cerca
    .filter((w) => w._distKm != null && w._distKm <= NEAREST_MAX_KM);

  // ✅ Orden: distancia primero, luego online, luego rating
  list.sort((a, b) => {
    if (a._distKm != null && b._distKm != null) return a._distKm - b._distKm;
    if (a._distKm != null) return -1;
    if (b._distKm != null) return 1;

    if (a._online !== b._online) return a._online ? -1 : 1;
    if (a._rating !== b._rating) return b._rating - a._rating;
    return String(a.user_id).localeCompare(String(b.user_id));
  });

  return list.slice(0, limit);
}

// ✅ Abrir modal “Más cerca”
function openNearestModal() {
  if (!workers?.length) {
    toast.warning('Primero cargá los trabajadores');
    return;
  }

  const ref = getRefPoint();
 const ranked = buildNearestList(workers, 30);

if (!ranked.length) {
  toast(`No hay profesionales dentro de ${NEAREST_MAX_KM} km`, { duration: 1600 });
  return;
}

setClusterMode('nearest');
setClusterList(ranked);
setClusterOpen(true);

  // ✅ Mensaje claro según si hay GPS o no
  if (ref.mode === 'gps') toast.success('📍 Ordenado por tu ubicación', { duration: 1200 });
  else toast('📍 Sin GPS: ordenado por la zona del mapa', { duration: 1400 });
}
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

    // ✅ No depender de navigator.permissions.query() para iniciar GPS.
    // Dejamos la UI lista y el permiso se pide desde el botón.
    if (!alive) return;
    setGpsStatus('init');
    setGpsError(null);
  }

  bootGeo();

  return () => {
    alive = false;
    try {
      if (navigator?.geolocation) {
        if (gpsWatchFastRef.current != null) {
          navigator.geolocation.clearWatch(gpsWatchFastRef.current);
        }
        if (gpsWatchPreciseRef.current != null) {
          navigator.geolocation.clearWatch(gpsWatchPreciseRef.current);
        }
      }
    } catch {}

    gpsWatchFastRef.current = null;
    gpsWatchPreciseRef.current = null;
  };
}, []);
 async function requestGPS() {
  if (typeof window === 'undefined') return;

  if (!window.isSecureContext) {
    setGpsStatus('error');
    setGpsError('GPS requiere HTTPS o abrir la app desde el dominio seguro.');
    toast.error('GPS requiere HTTPS');
    return;
  }

  if (!navigator?.geolocation) {
    setGpsStatus('error');
    setGpsError('Este dispositivo no soporta ubicación (geolocation).');
    toast.error('Tu dispositivo no soporta GPS.');
    return;
  }

  setGpsStatus('requesting');
  setGpsError(null);

  try {
    if (gpsWatchFastRef.current != null) {
      navigator.geolocation.clearWatch(gpsWatchFastRef.current);
    }
    if (gpsWatchPreciseRef.current != null) {
      navigator.geolocation.clearWatch(gpsWatchPreciseRef.current);
    }
  } catch {}

  gpsWatchFastRef.current = null;
  gpsWatchPreciseRef.current = null;

  const msgDenied = 'Permiso denegado. Activá Ubicación precisa para ver “Más cerca”.';
  const msgUnavailable = 'Ubicación no disponible.';
  const msgTimeout = 'No se pudo obtener tu ubicación a tiempo.';

  const onFix = (pos, playToast = false) => {
    const lat = Number(pos?.coords?.latitude);
    const lon = Number(pos?.coords?.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setGpsStatus('error');
      setGpsError('Ubicación no disponible.');
      return;
    }

    saveLastGps(lat, lon);
    setMe((prev) => ({ ...prev, lat, lon }));
    setCenter([lat, lon]);
    setGpsStatus('granted');
    setGpsError(null);

    if (mapRef.current && !gpsCenteredRef.current) {
      gpsCenteredRef.current = true;
      mapRef.current.flyTo([lat, lon], 15, { duration: 1.1 });
      setTimeout(() => mapRef.current?.invalidateSize?.(), 250);
    }

    if (playToast) {
      toast.success('📍 Ubicación activada');
    }
  };

  const cached = loadLastGps();
  if (cached && !gpsCenteredRef.current && mapRef.current) {
    setMe((prev) => ({ ...prev, lat: cached.lat, lon: cached.lon }));
    setCenter([cached.lat, cached.lon]);
    gpsCenteredRef.current = true;
    mapRef.current.flyTo([cached.lat, cached.lon], 12, { duration: 0.7 });
    setTimeout(() => mapRef.current?.invalidateSize?.(), 250);
  }

  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });
    });

    onFix(pos, true);

    gpsWatchPreciseRef.current = navigator.geolocation.watchPosition(
      (watchPos) => onFix(watchPos, false),
      (err) => {
        if (err?.code === 1) {
          setGpsStatus('denied');
          setGpsError(msgDenied);
          return;
        }

        if (err?.code === 2) {
          setGpsStatus('error');
          setGpsError(msgUnavailable);
          return;
        }

        if (err?.code === 3) {
          setGpsStatus('error');
          setGpsError(msgTimeout);
          return;
        }

        setGpsStatus('error');
        setGpsError(msgUnavailable);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 5000,
      }
    );
  } catch (err) {
    if (err?.code === 1) {
      setGpsStatus('denied');
      setGpsError(msgDenied);
      toast.error(`📍 ${msgDenied}`);
      return;
    }

    if (err?.code === 2) {
      setGpsStatus('error');
      setGpsError(msgUnavailable);
      toast.error(`📍 ${msgUnavailable}`);
      return;
    }

    if (err?.code === 3) {
      setGpsStatus('error');
      setGpsError(msgTimeout);
      toast.error(`📍 ${msgTimeout}`);
      return;
    }

    setGpsStatus('error');
    setGpsError(msgUnavailable);
    toast.error(`📍 ${msgUnavailable}`);
  }
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
const [unreadCount, setUnreadCount] = useState(0);
const [statusBanner, setStatusBanner] = useState(null);

// 🔊 sonido de notificación
const notificationAudioRef = useRef(null);

useEffect(() => {
  if (typeof window === 'undefined') return;

  notificationAudioRef.current = new Audio('/notify.mp3'); // 👈 cambiá extensión si no es mp3
  notificationAudioRef.current.preload = 'auto';
  notificationAudioRef.current.volume = 0.9;

  return () => {
    if (notificationAudioRef.current) {
      notificationAudioRef.current.pause();
      notificationAudioRef.current = null;
    }
  };
}, []);

function playIncomingMessageSound() {
  try {
    if (!notificationAudioRef.current) return;

    notificationAudioRef.current.currentTime = 0;
    notificationAudioRef.current.play().catch((err) => {
      console.warn('No se pudo reproducir sonido:', err);
    });
  } catch (err) {
    console.warn('Error reproduciendo sonido:', err);
  }
}
 const bindMapInstance = useMemo(() => {
  return (map) => {
    if (!map) return;

    mapRef.current = map;

    setMapZoom(map.getZoom());

    map.off('zoomend');
    map.on('zoomend', () => setMapZoom(map.getZoom()));

    map.setView(HOME_VIEW.center, HOME_VIEW.zoom, { animate: false });

    const el = map.getContainer?.();
    if (el) {
      el.style.touchAction = 'pan-x pan-y';
      el.style.overscrollBehavior = 'none';
    }

    setTimeout(() => map.invalidateSize(), 200);

    console.log('✅ mapRef enlazado correctamente', map);
  };
}, []); 
 
const services = [
  { id: 'plomería', label: 'Plomería', icon: <Droplets size={18} /> },
  { id: 'electricidad', label: 'Electricidad', icon: <Wrench size={18} /> },
  { id: 'limpieza', label: 'Limpieza', icon: <Sparkles size={18} /> },
  { id: 'construcción', label: 'Construcción', icon: <Hammer size={18} /> },
  { id: 'jardinería', label: 'Jardinería', icon: <Leaf size={18} /> },
  { id: 'mascotas', label: 'Mascotas', icon: <PawPrint size={18} /> },
  { id: 'emergencia', label: 'Emergencia', icon: <Flame size={18} /> },
  { id: 'car detailing', label: 'Car Detailing', icon: <Sparkles size={18} /> },

  // ✅ nuevos servicios profesionales
  { id: 'peluquero', label: 'Peluquero/a', icon: <Sparkles size={18} /> },
  { id: 'abogado', label: 'Abogado/a', icon: <CheckCircle2 size={18} /> },
  { id: 'contador', label: 'Contador/a', icon: <Clock3 size={18} /> },
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

  async function loadRoute() {

    if (!jobId) return;

    if (jobStatus === "completed" || jobStatus === "cancelled") return;

    if (!Number(me?.lat) || !Number(me?.lon)) return;

    if (!hasMeCoords || !hasSelCoords) return;

    const wLat = Number(selLat);
    const wLng = Number(selLng);

    const result = await fetchRoadRoute(
      Number(me.lat),
      Number(me.lon),
      wLat,
      wLng
    );

    if (!result) return;

    setRoute(result.route);
    setEtaMinutes(result.durationMin);

    mapRef.current?.fitBounds(result.route, { padding: [80, 80] });

  }

  loadRoute();

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
setProfileSheetMode('full');
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


// ✅ Vista inicial fija (NO mover por workers)
const HOME_VIEW = {
  center: [-25.55, -55.75], // Central + Alto Paraná entra bien
  zoom: 7,
};

const didSetHomeViewRef = useRef(false);

useEffect(() => {
  if (!mapRef.current) return;
  if (didSetHomeViewRef.current) return;

  didSetHomeViewRef.current = true;

  try {
    mapRef.current.setView(HOME_VIEW.center, HOME_VIEW.zoom, { animate: false });
    setTimeout(() => mapRef.current?.invalidateSize?.(), 200);
  } catch (e) {
    console.warn('set home view error:', e);
  }
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

/* === TRACKING DEL TRABAJADOR DEL PEDIDO (LIVE GPS) === */
useEffect(() => {
  if (!jobId) return;
  if (!selected?.user_id) return;

  const workerId = String(selected.user_id);

  const channel = supabase
    .channel(`worker-live-${workerId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'worker_locations',
        filter: `user_id=eq.${workerId}`,
      },
      async (payload) => {
        const loc = payload.new;

        const lat = Number(loc?.lat);
        const lng = Number(loc?.lng ?? loc?.lon ?? loc?.long);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        setSelected((prev) =>
          prev && String(prev.user_id) === workerId
            ? { ...prev, lat, lng, last_seen: loc?.updated_at || new Date().toISOString() }
            : prev
        );

        setWorkers((prev) =>
          prev.map((w) =>
            String(w.user_id) === workerId
              ? {
                  ...w,
                  lat,
                  lng,
                  last_seen: loc?.updated_at || new Date().toISOString(),
                  _justUpdated: true,
                }
              : w
          )
        );

        const marker = markersRef.current?.[workerId];
        if (marker) {
          const current = marker.getLatLng?.();
          if (current) {
            animateMarkerMove(marker, current.lat, current.lng, lat, lng);
          } else {
            marker.setLatLng([lat, lng]);
          }
        }

        const cLat = Number(me?.lat);
        const cLng = Number(me?.lon);

  if (Number.isFinite(cLat) && Number.isFinite(cLng)) {
  if (isTrackingWorker) {
    const result = await fetchRoadRoute(cLat, cLng, lat, lng);

    if (result?.route?.length) {
      setRoute(result.route);
      setEtaMinutes(result.durationMin ?? null);

      mapRef.current?.flyToBounds(result.route, {
        paddingTopLeft: [40, 100],
        paddingBottomRight: [40, 240],
        maxZoom: 15, // 🔥 antes 18
        duration: 0.8,
      });

      setTimeout(() => {
        mapRef.current?.invalidateSize?.();
      }, 250);
    } else {
      const fallbackRoute = [
        [cLat, cLng],
        [lat, lng],
      ];

      setRoute(fallbackRoute);

      const distKm = haversineKm(cLat, cLng, lat, lng);
      const fallbackMin = Math.max(1, Math.round((distKm / 35) * 60));
      setEtaMinutes(fallbackMin);

      mapRef.current?.flyToBounds(fallbackRoute, {
        paddingTopLeft: [40, 100],
        paddingBottomRight: [40, 240],
        maxZoom: 15, // 🔥 antes 17
        duration: 0.8,
      });

      setTimeout(() => {
        mapRef.current?.invalidateSize?.();
      }, 250);
    }
  } else {
    setRoute([
      [cLat, cLng],
      [lat, lng],
    ]);
  }
}
        setTimeout(() => {
          setWorkers((prev) =>
            prev.map((w) =>
              String(w.user_id) === workerId
                ? { ...w, _justUpdated: false }
                : w
            )
          );
        }, 1800);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [jobId, selected?.user_id, me?.lat, me?.lon, isTrackingWorker]);

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
    } 
    else if (['cancelled', 'rejected', 'worker_rejected'].includes(data.status)) {
      toast.error('🚫 El trabajador rechazó o canceló el pedido');
      resetJobState();
    } 
   else if (data.status === 'accepted' || data.status === 'assigned') {
  setIsTrackingWorker(true);

  toast.success('🟢 Tu profesional aceptó y ya está en camino');

  // ✅ cerrar overlays para dejar solo mapa + seguimiento
  setShowPrice(false);
  setClusterOpen(false);
  setClusterMiniOpen(false);
  setServicesOpen(false);
  setIsChatOpen(false);

  const workerFresh =
    workersByIdRef.current?.get(String(data.worker_id)) || selected;

  if (workerFresh) {
    setSelected(workerFresh);

    const wLat = Number(workerFresh?.lat);
    const wLng = Number(workerFresh?.lng ?? workerFresh?.lon ?? workerFresh?.long);
    const cLat = Number(me?.lat);
    const cLng = Number(me?.lon);

    // ✅ dejamos la UI en modo simplificado
    setProfileSheetMode('mini');

    if (
      Number.isFinite(cLat) &&
      Number.isFinite(cLng) &&
      Number.isFinite(wLat) &&
      Number.isFinite(wLng)
    ) {
      const liveRoute = [
        [cLat, cLng],
        [wLat, wLng],
      ];

      setRoute(liveRoute);

      // ✅ mostrar automáticamente al trabajador viniendo
      runSuperFocusOnWorker(wLat, wLng, liveRoute);

      const distKm = haversineKm(cLat, cLng, wLat, wLng);
      const fallbackMin = Math.max(1, Math.round((distKm / 35) * 60));
      setEtaMinutes(fallbackMin);

      setTimeout(() => {
        mapRef.current?.invalidateSize?.();
      }, 250);

      setTimeout(() => {
        mapRef.current?.invalidateSize?.();
      }, 800);
    }
  }
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
  if (!jobId) return;

  const channelGlobal = supabase
    .channel(`global-messages-${jobId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      async (payload) => {
        const msg = payload?.new;
        if (!msg) return;

        const isMine = String(msg.sender_id) === String(me.id);
        if (isMine) return;

        let activeChatId = chatId;

        // ✅ si todavía no tenemos chatId en memoria, lo aseguramos en caliente
        if (!activeChatId && jobId) {
          try {
            const { data: ensuredChatId, error: ensureErr } = await supabase.rpc('ensure_chat_for_job', {
              p_job_id: jobId,
            });

            if (!ensureErr && ensuredChatId) {
              activeChatId = ensuredChatId;
              setChatId(ensuredChatId);
            }
          } catch (err) {
            console.warn('No se pudo asegurar chat en listener global:', err);
          }
        }

        const isSameChat =
          msg.chat_id &&
          activeChatId &&
          String(msg.chat_id) === String(activeChatId);

        if (!isSameChat) return;

        if (!isChatOpen) {
          setHasUnread(true);
          setUnreadCount((prev) => prev + 1);

          // 🔊 reproducir sonido
          playIncomingMessageSound();

          // 📳 vibración opcional en celular
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([120, 60, 120]);
          }

          toast.info('💬 Nuevo mensaje de un profesional');
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channelGlobal);
  };
}, [me?.id, jobId, chatId, isChatOpen, supabase]);
/* === Interacciones mejoradas === */
function handleMarkerClick(worker) {
  if (jobId && jobStatus !== 'completed' && jobStatus !== 'cancelled') {
    toast.warning('⚠️ Ya tenés un pedido activo. Finalizalo o cancelalo antes de seleccionar otro.');
    return;
  }

  setWorkers((prev) =>
    prev.map((w) => ({
      ...w,
      _selected: w.user_id === worker.user_id,
    }))
  );

  setSelected(worker);
  setProfileSheetMode('full');
  setRoute(null);

  const wLat = Number(worker?.lat);
  const wLng = Number(worker?.lng ?? worker?.lon ?? worker?.long);

  if (mapRef.current && Number.isFinite(wLat) && Number.isFinite(wLng)) {
    mapRef.current.flyTo([wLat, wLng], 15, { duration: 1.2 });
  }

  setShowPrice(false);

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

// ✅ asegurar chat DESDE EL INICIO para que el contador funcione aunque el cliente nunca abra el modal
try {
  const { data: ensuredChatId, error: ensureErr } = await supabase.rpc('ensure_chat_for_job', {
    p_job_id: inserted.id,
  });

  if (ensureErr) {
    console.warn('No se pudo asegurar chat al crear solicitud:', ensureErr);
  } else if (ensuredChatId) {
    setChatId(ensuredChatId);
  }
} catch (chatBootErr) {
  console.warn('Error creando chat inicial:', chatBootErr);
}

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
          const newMsg = payload?.new;
          if (!newMsg) return;

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // ✅ si el chat está abierto, limpiar contador
          setHasUnread(false);
          setUnreadCount(0);

          if (String(newMsg.sender_id) !== String(me?.id)) {
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
          }
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
async function sendCurrentLocationMessage() {
  try {
    if (!chatId || !me?.id) {
      toast.error('No se puede compartir la ubicación todavía');
      return;
    }

    let lat = Number(me?.lat);
    let lng = Number(me?.lon);

    // ✅ si ya tenemos GPS en estado, usamos eso
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      const cached = loadLastGps();
      if (cached) {
        lat = Number(cached.lat);
        lng = Number(cached.lon);
      }
    }

    // ✅ si aún no hay coords, intentamos pedir una ubicación puntual
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      if (!navigator?.geolocation) {
        toast.error('Tu dispositivo no soporta GPS');
        return;
      }

      toast.loading('Obteniendo ubicación...', { id: 'share-location' });

      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000,
          }
        );
      });

      lat = Number(pos?.coords?.latitude);
      lng = Number(pos?.coords?.longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        toast.error('No se pudo obtener tu ubicación', { id: 'share-location' });
        return;
      }

      saveLastGps(lat, lng);
      setMe((prev) => ({ ...prev, lat, lon: lng }));
      toast.dismiss('share-location');
    }

    const payload = {
      chat_id: chatId,
      sender_id: me.id,
      text: '📍 Ubicación compartida',
      message_type: 'location',
      lat,
      lng,
      meta: {
        label: 'Ubicación compartida',
        shared_at: new Date().toISOString(),
      },
    };

    const { data, error } = await supabase
      .from('messages')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    setMessages((prev) => {
      if (prev.some((m) => m.id === data.id)) return prev;
      return [...prev, data];
    });

    toast.success('Ubicación enviada');
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
  } catch (err) {
    console.error('❌ Error compartiendo ubicación:', err);
    toast.error('No se pudo compartir la ubicación');
  }
}

function openLocationMessageOnMap(message) {
  const lat = Number(message?.lat);
  const lng = Number(message?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    toast.error('Este mensaje no tiene una ubicación válida');
    return;
  }

  // ✅ cerrar chat para que el usuario vea el mapa
  setIsChatOpen(false);

  setTimeout(() => {
    if (mapRef.current) {
      mapRef.current.flyTo([lat, lng], 17, { duration: 1.2 });
    }
    toast.success('Ubicación abierta en el mapa');
  }, 250);
}
function runSuperFocusOnWorker(workerLat, workerLng, routePoints = null) {
  const map = mapRef.current;

  if (
    !map ||
    typeof map.flyTo !== 'function' ||
    typeof map.flyToBounds !== 'function'
  ) {
    toast.error('El mapa todavía no está listo');
    console.warn('❌ mapRef.current inválido en verTrabajadorViniendo:', map);
    return;
  }

  setTimeout(() => {
    try {
      map.invalidateSize();

      // ✅ si hay ruta, mostrarla bien pero sin pasarse de zoom
      if (Array.isArray(routePoints) && routePoints.length >= 2) {
        map.flyToBounds(routePoints, {
          paddingTopLeft: [40, 100],
          paddingBottomRight: [40, 240],
          maxZoom: 15, // 🔥 antes 18
          duration: 1.1,
        });

        // ✅ segundo foco más suave
        setTimeout(() => {
          map.flyTo([workerLat, workerLng], 15, {
            duration: 0.9,
          });
        }, 850);

        setTimeout(() => {
          map.invalidateSize();
        }, 300);

        setTimeout(() => {
          map.invalidateSize();
        }, 900);

        return;
      }

      // ✅ fallback sin ruta: acercar pero no exagerar
      map.flyTo([workerLat, workerLng], 15, {
        duration: 1.0,
      });

      setTimeout(() => {
        map.invalidateSize();
      }, 300);
    } catch (err) {
      console.warn('runSuperFocusOnWorker error:', err);
    }
  }, 120);
}
async function verTrabajadorViniendo() {
  if (!selected) {
    toast.error('No hay trabajador seleccionado');
    return;
  }

  const wLat = Number(selected?.lat);
  const wLng = Number(selected?.lng ?? selected?.lon ?? selected?.long);
  const cLat = Number(me?.lat);
  const cLng = Number(me?.lon);

  if (!Number.isFinite(wLat) || !Number.isFinite(wLng)) {
    toast.error('No se pudo ubicar al trabajador en el mapa');
    return;
  }

  setIsChatOpen(false);
  setShowPrice(false);
  setClusterOpen(false);
  setClusterMiniOpen(false);
  setServicesOpen(false);

  setIsTrackingWorker(true);
  setProfileSheetMode('mini');

  const map = mapRef.current;
  console.log('🧪 mapRef.current en verTrabajadorViniendo:', map);

  if (!map) {
    toast.error('El mapa todavía no está listo');
    console.warn('❌ mapRef.current vacío en verTrabajadorViniendo');
    return;
  }

  map.invalidateSize();

  if (Number.isFinite(cLat) && Number.isFinite(cLng)) {
    const result = await fetchRoadRoute(cLat, cLng, wLat, wLng);

    if (result?.route?.length) {
      setRoute(result.route);
      setEtaMinutes(result.durationMin ?? null);

      runSuperFocusOnWorker(wLat, wLng, result.route);

      toast.success(
        `🚗 ${selected?.full_name || 'El trabajador'} llega en aprox ${result.durationMin ?? '—'} min`
      );
    } else {
      const fallbackRoute = [
        [cLat, cLng],
        [wLat, wLng],
      ];

      setRoute(fallbackRoute);

      const fallbackKm = haversineKm(cLat, cLng, wLat, wLng);
      const fallbackMin = Math.max(1, Math.round((fallbackKm / 35) * 60));
      setEtaMinutes(fallbackMin);

      runSuperFocusOnWorker(wLat, wLng, fallbackRoute);

      toast.success(
        `🚗 ${selected?.full_name || 'El trabajador'} llega en aprox ${fallbackMin} min`
      );
    }
  } else {
    setEtaMinutes(null);
    runSuperFocusOnWorker(wLat, wLng, null);
    toast.success('📍 Viendo al trabajador en tiempo real');
  }

  setTimeout(() => {
    mapRef.current?.invalidateSize?.();
  }, 250);

  setTimeout(() => {
    mapRef.current?.invalidateSize?.();
  }, 800);
}

// ✅ Finalizar pedido — cambia estado en Supabase y limpia todo
async function finalizarPedido() {
  const currentJobId = jobId;
  const currentChatId = chatId;
  const currentWorkerName = selected?.full_name || 'el profesional';

  try {
    if (!currentJobId) {
      toast.warning('⚠️ No hay pedido activo para finalizar');
      return;
    }

    const { error } = await supabase
      .from('jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', currentJobId);

    if (error) throw error;

    // ✅ mandar mensaje ANTES de limpiar estado
    if (currentChatId && me?.id) {
      const { error: msgError } = await supabase.from('messages').insert([
        {
          chat_id: currentChatId,
          sender_id: me.id,
          text: '✅ El cliente marcó el trabajo como finalizado.',
        },
      ]);

      if (msgError) {
        console.warn('No se pudo enviar mensaje de finalización:', msgError);
      }
    }

    // ✅ detener tracking visual, pero NO limpiar todo todavía
    setIsTrackingWorker(false);
    setRoute(null);
    setEtaMinutes(null);
    setIsChatOpen(false);

    // ✅ importante: dejar selected/job vivos para el modal de valoración
    setJobStatus('completed');
    setProfileSheetMode('full');

    toast.success(`✅ Pedido finalizado con ${currentWorkerName}`);
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
  setProfileSheetMode('full');

  // ✅ apagar tracking
  setIsTrackingWorker(false);
  setEtaMinutes(null);

  setWorkers((prev) =>
    (prev || []).map((w) => ({
      ...w,
      _selected: false,
    }))
  );

  localStorage.removeItem('activeJobChat');

  fetchWorkers(selectedService || null);

  // ✅ volver SIEMPRE a la vista general de Paraguay + clusters
  if (mapRef.current) {
    mapRef.current.setView(HOME_VIEW.center, HOME_VIEW.zoom, { animate: true });

    setTimeout(() => {
      mapRef.current?.invalidateSize?.();
    }, 250);

    setTimeout(() => {
      mapRef.current?.invalidateSize?.();
    }, 700);
  }
}



// ⭐ Guardar reseña del trabajador
async function confirmarReseña() {
  try {
    if (!jobId || !selected?.user_id) return;

    if (!rating || rating < 1 || rating > 5) {
      toast.error('Elegí una calificación de 1 a 5 estrellas');
      return;
    }

    const { error } = await supabase.from('reviews').insert([
      {
        job_id: jobId,
        worker_id: selected.user_id,
        client_id: me.id,
        rating,
        comment: comment?.trim() || null,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) throw error;

    toast.success('✅ ¡Gracias por tu valoración!');
    setRating(0);
    setComment('');
    resetJobState();
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
  <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[20000] px-3 w-full max-w-sm">
    <div className="bg-white/95 border border-gray-200 shadow-lg rounded-2xl px-4 py-4 text-sm">
      <div className="font-bold text-gray-800 text-[15px]">
        📍 {gpsStatus === 'requesting' ? 'Buscando tu ubicación...' : 'Usá tu ubicación'}
      </div>

      <div className="text-gray-600 mt-2 leading-relaxed">
        {gpsStatus === 'requesting'
          ? 'Estamos buscando dónde estás para mostrarte tu punto en el mapa y los profesionales más cercanos.'
          : 'Tocá el botón verde para que el mapa te muestre dónde estás y quién está más cerca de vos.'}
      </div>

      {gpsStatus === 'denied' && (
        <div className="mt-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          No diste permiso para ver tu ubicación.
        </div>
      )}

      {gpsStatus === 'error' && (
        <div className="mt-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          No pudimos encontrar tu ubicación. Probá otra vez.
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <button
          onClick={requestGPS}
          className="flex-1 px-3 py-3 rounded-xl bg-emerald-500 text-white font-bold active:scale-95"
        >
          {gpsStatus === 'requesting' ? 'Buscando...' : 'Ver mi ubicación'}
        </button>

        <button
          onClick={() =>
            toast('Abrí Ajustes del celular > Aplicaciones > ManosYA > Permisos > Ubicación > Permitir')
          }
          className="flex-1 px-3 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold active:scale-95"
        >
          Cómo activar
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
  center={HOME_VIEW.center}
  zoom={HOME_VIEW.zoom}
  minZoom={5}
  maxZoom={19}
  zoomControl={false}
  scrollWheelZoom={false}
  style={{
    height: '100%',
    width: '100%',
    touchAction: 'pan-x pan-y',
    overscrollBehavior: 'none',
    WebkitOverflowScrolling: 'auto',
  }}
>
  <MapEffectBinder onReady={bindMapInstance} />
    {/* 🗺️ CARTO Light (mapa blanco minimalista) */}
    <TileLayer
      url="https://tile.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
      attribution='&copy; <a href="https://carto.com/">CARTO</a>'
      updateWhenIdle={true}
      
      updateWhenZooming={false}
      keepBuffer={2}
    />

   {/* ✅ Bloque final actualizado — oculta 'paused' y muestra estados dinámicos */}
{/* ✅ BLOQUE CLUSTER + FILTRO FINAL (reemplazar completo) */}
{/* ✅ BLOQUE CLUSTER + FILTRO FINAL (REEMPLAZAR COMPLETO) */}
{/* ✅ CLUSTER REAL: markers reales (sin anti-overlap) */}
{/* ✅ CLUSTER REAL (ordenado + UX claro + modal por zona) */}
{/* 🛣 Ruta premium cliente → trabajador */}
{route && (
  <>
    {/* base glow */}
    <Polyline
      positions={route}
      pathOptions={{
        color: "#34d399",
        weight: 14,
        opacity: 0.18,
        lineJoin: "round",
        lineCap: "round",
      }}
    />

    {/* capa media */}
    <Polyline
      positions={route}
      pathOptions={{
        color: "#10b981",
        weight: 8,
        opacity: 0.35,
        lineJoin: "round",
        lineCap: "round",
      }}
    />

    {/* línea principal */}
    <Polyline
      positions={route}
      pathOptions={{
        color: "#059669",
        weight: 5,
        opacity: 0.95,
        lineJoin: "round",
        lineCap: "round",
        dashArray: "10 10",
      }}
    />
  </>
)}

{/* ✅ MARKER LIVE DEL TRABAJADOR CUANDO ESTÁ VINIENDO */}
{isTrackingWorker && selected && hasSelCoords && (
  <Marker
    key={`tracking-worker-${String(selected.user_id)}-${selLat}-${selLng}`}
    position={[selLat, selLng]}
    icon={
      avatarIcon(selected.avatar_url, {
        ...selected,
        _selected: true,
        _justUpdated: true,
      }) || undefined
    }
    eventHandlers={{
      add: (e) => {
        const leafletMarker = e?.target;
        if (!leafletMarker || !selected?.user_id) return;

        markersRef.current[String(selected.user_id)] = leafletMarker;
      },
      click: () => {
        setProfileSheetMode('full');
      },
    }}
  />
)}

{/* ✅ TU UBICACIÓN PREMIUM CUANDO EL GPS ESTÁ ACTIVO */}
{hasMeCoords && (
  <>
    {/* área visible de referencia del cliente */}
    <Circle
      center={[Number(me.lat), Number(me.lon)]}
      radius={500}
      pathOptions={{
        color: '#0ea5e9',
        fillColor: '#38bdf8',
        fillOpacity: 0.10,
        weight: 2,
      }}
    />

    {/* aro tecnológico elegante */}
    <Circle
      center={[Number(me.lat), Number(me.lon)]}
      radius={120}
      pathOptions={{
        color: '#38bdf8',
        fillColor: '#38bdf8',
        fillOpacity: 0.08,
        weight: 3,
      }}
    />

    {/* marcador premium animado tipo GPS/Uber */}
    <Marker
      key={`client-location-${Number(me.lat)}-${Number(me.lon)}`}
      position={[Number(me.lat), Number(me.lon)]}
      icon={clientLocationIcon() || undefined}
      interactive={false}
      zIndexOffset={1200}
    />
  </>
)}

{!isTrackingWorker && (
  <MarkerClusterGroup
    chunkedLoading
    showCoverageOnHover={false}
    removeOutsideVisibleBounds={true}
    disableClusteringAtZoom={16}
    spiderfyOnMaxZoom={false}
    zoomToBoundsOnClick={false}
    maxClusterRadius={(zoom) => {
      if (zoom <= 7) return 120;
      if (zoom <= 10) return 95;
      if (zoom <= 12) return 70;
      return 55;
    }}
    iconCreateFunction={clusterIconCreateFunction}
    eventHandlers={{
      clusterclick: (e) => {
        try {
          e?.originalEvent?.preventDefault?.();
          e?.originalEvent?.stopPropagation?.();

          const cluster = e.layer;
          if (!cluster) return;

          const childMarkers = cluster.getAllChildMarkers?.() || [];
          if (!childMarkers.length) return;

          const ref = typeof getRefPoint === 'function'
            ? getRefPoint()
            : { lat: Number(me?.lat), lng: Number(me?.lon), mode: 'home' };

          const refOk = Number.isFinite(Number(ref?.lat)) && Number.isFinite(Number(ref?.lng));
          const refLat = Number(ref?.lat);
          const refLng = Number(ref?.lng);

          const uniq = new Map();

          for (const m of childMarkers) {
            const w0 = m?.options?.__worker;
            const uid = String(m?.options?.__userId ?? w0?.user_id ?? '');
            if (!uid) continue;

            const fresh = workersByIdRef.current?.get(uid);
            const w = fresh || w0;
            if (!w) continue;

            const wLat = Number(w?.lat);
            const wLng = Number(w?.lng ?? w?.lon ?? w?.long);
            if (!Number.isFinite(wLat) || !Number.isFinite(wLng)) continue;

            if (refOk) {
              const km = haversineKm(refLat, refLng, wLat, wLng);
              if (Number.isFinite(km) && km > MAX_RADIUS_KM) continue;
            }

            uniq.set(uid, w);
          }

          let list = Array.from(uniq.values());
          if (!list.length) {
            toast('No hay profesionales disponibles en este clúster', { duration: 1200 });
            return;
          }

          list = list
            .map((w) => {
              const wLat = Number(w?.lat);
              const wLng = Number(w?.lng ?? w?.lon ?? w?.long);

              const dist =
                refOk && Number.isFinite(wLat) && Number.isFinite(wLng)
                  ? haversineKm(refLat, refLng, wLat, wLng)
                  : null;

              return {
                ...w,
                _distKm: Number.isFinite(dist) ? dist : null,
                _dist: Number.isFinite(dist) ? dist : null,
                _online: isOnlineRecent(w),
                _rating: Number(w?.avg_rating || 0),
                _reviews: Number(w?.total_reviews || 0),
              };
            })
            .sort((a, b) => {
              if (a._distKm != null && b._distKm != null) return a._distKm - b._distKm;
              if (a._distKm != null) return -1;
              if (b._distKm != null) return 1;

              if (a._online !== b._online) return a._online ? -1 : 1;
              if (a._rating !== b._rating) return b._rating - a._rating;
              if (a._reviews !== b._reviews) return b._reviews - a._reviews;

              return String(a.user_id).localeCompare(String(b.user_id));
            });

          setClusterMode('cluster');
          setClusterList(list);
          setClusterOpen(true);

          toast.success(`👥 ${list.length} en esta zona`, { duration: 900 });
        } catch (err) {
          console.warn('cluster click error', err);
        }
      },
    }}
  >
    {(workers || [])
      .filter((w) => {
        const wLat = Number(w?.lat);
        const wLng = Number(w?.lng ?? w?.lon ?? w?.long);
        if (!Number.isFinite(wLat) || !Number.isFinite(wLng)) return false;

        const ref = typeof getRefPoint === 'function'
          ? getRefPoint()
          : { lat: Number(me?.lat), lng: Number(me?.lon), mode: 'home' };

        const refOk = Number.isFinite(Number(ref?.lat)) && Number.isFinite(Number(ref?.lng));
        if (refOk) {
          const km = haversineKm(Number(ref.lat), Number(ref.lng), wLat, wLng);
          if (Number.isFinite(km) && km > MAX_RADIUS_KM) return false;
        }

        return true;
      })
      .map((w) => {
        const wLat = Number(w?.lat);
        const wLng = Number(w?.lng ?? w?.lon ?? w?.long);

        return (
          <Marker
            key={String(w.user_id)}
            position={[wLat, wLng]}
            icon={avatarIcon(w.avatar_url, w) || undefined}
            __userId={String(w.user_id)}
            __worker={workersByIdRef.current?.get(String(w.user_id)) || w}
            eventHandlers={{
              add: (e) => {
                const leafletMarker = e?.target;
                if (!leafletMarker) return;

                const uid = String(w.user_id);
                markersRef.current[uid] = leafletMarker;
              },
              click: () => {
                const uid = String(w.user_id);
                const fresh = workersByIdRef.current?.get(uid);
                handleMarkerClick(fresh || w);
              },
            }}
          />
        );
      })}
  </MarkerClusterGroup>
)}


</MapContainer>
{/* ✅ MODAL CLUSTER (PORTAL + estrellas) */}
{mounted && createPortal(
  <AnimatePresence>
    {clusterOpen && (
     <motion.div
  className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center ${
    clusterMode === 'cluster' ? 'items-center' : 'items-end'
  }`}
  style={{ zIndex: 60000, height: 'var(--real-vh)' }} // ✅ clave anti-recorte en PWA
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  onClick={() => setClusterOpen(false)}
>
        {/* =========================
            ✅ MODO CLUSTER: CARD CENTRADA
           ========================= */}
        {clusterMode === 'cluster' ? (
          <motion.div
            className="w-[92vw] max-w-lg bg-white rounded-3xl p-5 shadow-2xl border border-gray-200"
            initial={{ scale: 0.92, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 10, opacity: 0 }}
            transition={{ type: "spring", stiffness: 160, damping: 18 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="text-lg font-extrabold text-gray-800">
                  Zona seleccionada ({clusterList.length})
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Tocá un profesional para ver su perfil.
                </p>
              </div>

              <button
                onClick={() => setClusterOpen(false)}
                className="text-gray-500 hover:text-red-500"
              >
                <XCircle size={22} />
              </button>
            </div>

            {/* ✅ Scroll adentro */}
            <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
              {clusterList.map((w) => {
                const rating = Number(w?.avg_rating || 0);
                const reviews = Number(w?.total_reviews || 0);

                const goProfile = () => {
                  setClusterOpen(false);
                  handleMarkerClick(w);
                };

                const d =
                  Number.isFinite(Number(w?._distKm)) ? Number(w._distKm)
                  : Number.isFinite(Number(w?._dist)) ? Number(w._dist)
                  : null;

                return (
                  <div
                    key={w.user_id}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl border border-gray-200 hover:bg-emerald-50 transition"
                  >
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

                        <div className="text-xs text-gray-500">
                          {isOnlineRecent(w) ? "🟢 EN LÍNEA" : "⚪ Inactivo"}
                        </div>

                        <div className="mt-1">
                          {d != null ? (
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                              <span className="text-[12px] font-extrabold text-emerald-700">
                                📍 {formatKm(d)}
                              </span>
                              <span className="text-[11px] font-semibold text-gray-500">
                                (referencia)
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

                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
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
                      Ver perfil
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          /* =========================
              ✅ MODO NEAREST: TU BOTTOM-SHEET (igual al actual)
             ========================= */
          <motion.div
  className="w-full max-w-md bg-white rounded-t-3xl p-5 shadow-2xl"
  initial={{ y: 420 }}
  animate={{ y: 0 }}
  exit={{ y: 420 }}
  transition={{ type: "spring", stiffness: 120, damping: 18 }}
  onClick={(e) => e.stopPropagation()}
  style={{
    paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
    maxHeight: "calc(var(--real-vh) - 10px)",   // ✅ no se corta
    width: "min(100%, 28rem)",
  }}
>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-extrabold text-gray-800">
                  Profesionales cerca tuyo ({clusterList.length})
                </h3>
                <p className="text-xs text-gray-500 -mt-1">
                  Tocá “Ver perfil” para elegir rápido. Si activás GPS, te mostramos quién está más cerca.
                </p>
              </div>
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
                  handleMarkerClick(w);
                };

                return (
                  <div
                    key={w.user_id}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl border border-gray-200 hover:bg-emerald-50 transition"
                  >
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

                        <div className="text-xs text-gray-500">
                          {isOnlineRecent(w) ? "🟢 EN LÍNEA" : "⚪ Inactivo"}
                        </div>

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

                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
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
        )}
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
    // ✅ usa la función ya creada: GPS -> orden por GPS / sin GPS -> orden por centro del mapa
    openNearestModal();
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
  SERVICIOS — MÁS VISIBLE Y MÁS ENTENDIBLE
=========================== */}
<div className="px-3 pb-3">
  <div
    className="
      flex items-stretch gap-2
      rounded-[26px] p-2
      bg-white/90 backdrop-blur-xl
      border border-gray-200
      shadow-[0_14px_38px_rgba(0,0,0,0.10)]
    "
  >
    {/* CTA principal: abrir servicios */}
    <button
      onClick={() => setServicesOpen(true)}
      aria-label="Elegir servicio"
      className="
        relative flex-1 overflow-hidden
        rounded-[22px] px-4 py-3.5
        text-left
        bg-gradient-to-br from-emerald-100 via-cyan-50 to-emerald-50
        border border-emerald-300/80
        active:scale-[0.99] transition
        shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_10px_28px_rgba(16,185,129,0.16)]
      "
    >
      {/* glow fuerte */}
      <span className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full bg-emerald-300/30 blur-2xl" />
      <span className="pointer-events-none absolute -bottom-10 -left-10 w-28 h-28 rounded-full bg-cyan-300/25 blur-2xl" />

      {/* brillo sutil */}
      <span className="pointer-events-none absolute inset-0 opacity-70">
        <span className="absolute -left-10 top-0 h-full w-10 rotate-12 bg-white/30 blur-md animate-[ctaShine_2.6s_ease-in-out_infinite]" />
      </span>

      <div className="relative flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white border border-emerald-300 text-[14px] shadow-sm">
              ⚡
            </span>

            <div className="min-w-0">
              <div className="text-[14px] font-extrabold text-gray-800 tracking-tight leading-none">
                Elegí qué necesitás
              </div>

              <div className="text-[11px] font-semibold text-gray-600 mt-1">
                Tocá acá para ver los servicios.
              </div>
            </div>
          </div>
        </div>

        {/* CTA más notorio */}
        <div
          className="
            shrink-0 inline-flex items-center gap-1.5
            text-[11px] font-black
            text-white
            bg-gradient-to-r from-emerald-500 to-teal-500
            rounded-full
            px-4 py-2
            shadow-[0_10px_22px_rgba(16,185,129,0.28)]
            border border-white/30
          "
        >
          Abrir
          <span className="text-[12px]">→</span>
        </div>
      </div>
    </button>

    {/* Estado visible del filtro */}
    <button
      onClick={() => setServicesOpen(true)}
      aria-label="Ver o cambiar filtro actual"
      className="
        min-w-[118px]
        rounded-[22px] px-3 py-3.5
        bg-gradient-to-b from-white to-gray-50
        border border-gray-200
        shadow-[0_10px_24px_rgba(0,0,0,0.08)]
        flex items-center justify-center
        active:scale-[0.98] transition
      "
    >
      <div className="text-center leading-tight">
        <div className="text-[10px] font-extrabold text-gray-500">
          📌 Mostrando
        </div>

        <div className="text-[15px] font-black text-emerald-700 mt-1">
          {selectedService
            ? (services.find(s => s.id === selectedService)?.label || selectedService)
            : 'Todos'}
        </div>

        <div className="text-[9px] font-semibold text-gray-400 mt-1">
          tocar para cambiar
        </div>
      </div>
    </button>
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
{/* PERFIL DEL TRABAJADOR / CHOFER */}
<AnimatePresence>
  {selected && !showPrice && jobStatus !== 'completed' && jobStatus !== 'cancelled' && (() => {
    const km =
      hasMeCoords && hasSelCoords
        ? Math.round(haversineKm(Number(me.lat), Number(me.lon), selLat, selLng) * 10) / 10
        : null;

    const skillsList = Array.isArray(selected?.skills)
      ? selected.skills
      : typeof selected?.skills === 'string'
      ? selected.skills.split(',')
      : ['Limpieza', 'Plomería', 'Jardinería'];

    const renderActionButtons = () => {
      if (!jobId) {
        return (
          <div className="flex justify-center gap-3 mt-5">
            <button
              onClick={() => {
                setSelected(null);
                setProfileSheetMode('full');
              }}
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
        );
      }

     if (jobStatus === 'open') {
  return (
    <div className="flex flex-col gap-3 w-full mt-5">
      <button
        onClick={() => {
          openChat();
          setHasUnread(false);
          setUnreadCount(0);
        }}
        className="relative px-6 py-3 rounded-2xl border-2 border-emerald-400 text-emerald-700 font-semibold flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all duration-200 shadow-sm active:scale-95"
      >
        <MessageCircle size={18} className="text-emerald-600" />
        Chatear

        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-red-500 text-white text-[11px] font-extrabold rounded-full flex items-center justify-center shadow-md animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <button
        onClick={cancelarPedido}
        className="px-6 py-3 rounded-xl bg-red-500 text-white font-semibold flex items-center justify-center gap-1"
      >
        <XCircle size={16} /> Cancelar pedido
      </button>
    </div>
  );
}

      if (jobStatus === 'accepted' || jobStatus === 'assigned') {
  return (
    <div className="flex flex-col gap-3 w-full mt-5">
      {/* Estado principal ultra claro */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-4 py-4 text-center shadow-sm">
        <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-600">
          En camino
        </div>

        <div className="mt-1 text-lg font-black text-gray-800">
          {selected?.full_name || 'Tu profesional'} ya viene hacia vos
        </div>

        <div className="mt-2 flex items-center justify-center gap-2 flex-wrap">
          {Number.isFinite(km) && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[12px] font-extrabold">
              📍 {formatKm(km)}
            </span>
          )}

          {etaMinutes != null && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-700 text-[12px] font-extrabold">
              ⏱ {etaMinutes} min aprox
            </span>
          )}
        </div>

        <p className="mt-2 text-xs text-gray-500">
          Mirá el mapa para seguir su llegada en tiempo real.
        </p>
      </div>

      {/* Acción principal */}
      <button
        onClick={verTrabajadorViniendo}
        className="
          relative overflow-hidden
          px-6 py-4 rounded-2xl
          bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600
          text-white font-extrabold text-[15px]
          flex items-center justify-center gap-2
          shadow-[0_18px_35px_rgba(16,185,129,0.28)]
          active:scale-[0.98] transition
        "
      >
        <span className="absolute inset-0 opacity-60">
          <span className="absolute -left-10 top-0 h-full w-10 rotate-12 bg-white/25 blur-md animate-[ctaShine_2.6s_ease-in-out_infinite]" />
        </span>
        <span className="relative z-10">📍 Ver llegada en el mapa</span>
      </button>

      {/* Acciones secundarias simplificadas */}
      <div className="grid grid-cols-2 gap-3">
       <button
  onClick={() => {
    openChat();
    setHasUnread(false);
    setUnreadCount(0);
  }}
  className="
    relative px-4 py-3 rounded-2xl
    border-2 border-emerald-300 bg-white
    text-emerald-700 font-bold
    flex items-center justify-center gap-2
    shadow-sm active:scale-[0.98] transition
  "
>
  <MessageCircle size={18} className="text-emerald-600" />
  Chatear

  {unreadCount > 0 && (
    <>
      <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-red-500 text-white text-[11px] font-extrabold rounded-full flex items-center justify-center shadow-md animate-pulse">
        {unreadCount > 99 ? '99+' : unreadCount}
      </span>
    </>
  )}
</button>

        <button
          onClick={cancelarPedido}
          className="
            px-4 py-3 rounded-2xl
            bg-red-500 text-white font-bold
            flex items-center justify-center gap-2
            shadow-sm active:scale-[0.98] transition
          "
        >
          <XCircle size={16} />
          Cancelar
        </button>
      </div>

      <button
        onClick={finalizarPedido}
        className="
          px-6 py-3 rounded-2xl
          bg-gray-900 text-white font-bold
          flex items-center justify-center gap-2
          shadow-[0_12px_26px_rgba(17,24,39,0.18)]
          active:scale-[0.98] transition
        "
      >
        <CheckCircle2 size={16} />
        Finalizar trabajo
      </button>
    </div>
  );
}

      return null;
    };

    return (
      <motion.div
        key="perfil"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        className="fixed inset-x-0 bottom-0 z-[10000]"
      >
        {profileSheetMode === 'mini' ? (
          <div
            className="mx-3 mb-3 rounded-3xl bg-white shadow-2xl border border-gray-200 p-4"
            style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
          >
            <button
              onClick={() => setProfileSheetMode('full')}
              className="w-full flex items-center justify-center mb-3"
            >
              <div className="h-1.5 w-12 bg-gray-300 rounded-full"></div>
            </button>

            <div className="flex items-center gap-3">
              <img
                src={selected.avatar_url || '/avatar-fallback.png'}
                onError={(e) => {
                  e.currentTarget.src = '/avatar-fallback.png';
                }}
                className="w-14 h-14 rounded-full border-2 border-emerald-500 object-cover object-center shadow-sm"
                alt="avatar"
              />

              <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-800 truncate">
                  {selected.full_name || 'Profesional'}
                </div>

                <div className="text-xs text-gray-500 mt-0.5">
                  {jobStatus === 'accepted' || jobStatus === 'assigned'
                    ? '🟢 Trabajador en camino'
                    : 'Pedido activo'}
                </div>

                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {Number.isFinite(km) && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-700">
                      📍 {formatKm(km)}
                    </span>
                  )}

                  {etaMinutes != null && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-700">
                      ⏱ {etaMinutes} min
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setProfileSheetMode('full')}
                className="px-3 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold"
              >
                Ver
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
  onClick={() => {
    openChat();
    setHasUnread(false);
    setUnreadCount(0);
  }}
  className="relative px-4 py-3 rounded-2xl border-2 border-emerald-400 text-emerald-700 font-semibold flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all duration-200 shadow-sm active:scale-95"
>
  <MessageCircle size={18} className="text-emerald-600" />
  Chatear
  {unreadCount > 0 && (
    <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-red-500 text-white text-[11px] font-extrabold rounded-full flex items-center justify-center shadow-md animate-pulse">
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  )}
</button>

              <button
  onClick={() => setProfileSheetMode('full')}
  className="px-4 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold"
>
  Ver detalles
</button>

              <button
                onClick={cancelarPedido}
                className="px-4 py-3 rounded-2xl bg-red-500 text-white font-semibold flex items-center justify-center gap-2"
              >
                <XCircle size={16} />
                Cancelar
              </button>

              <button
                onClick={finalizarPedido}
                className="px-4 py-3 rounded-2xl bg-emerald-600 text-white font-semibold flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} />
                Finalizar
              </button>
            </div>
          </div>
        ) : (
          <div
            className="bg-white rounded-t-3xl shadow-xl p-6"
            style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}
          >
            <button
              onClick={() => setProfileSheetMode('mini')}
              className="w-full flex items-center justify-center mb-3"
            >
              <div className="h-1.5 w-12 bg-gray-300 rounded-full"></div>
            </button>

            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-2">
                <img
                  src={selected.avatar_url || '/avatar-fallback.png'}
                  onError={(e) => {
                    e.currentTarget.src = '/avatar-fallback.png';
                  }}
                  className="w-20 h-20 rounded-full border-4 border-emerald-500 shadow-md object-cover object-center"
                  alt="avatar"
                />

                {selected.worker_verified && selected.profile_verified && (
                  <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-1.5 border-2 border-white shadow">
                    <CheckCircle2 size={14} className="text-white" />
                  </div>
                )}
              </div>

              <h2 className="font-bold text-lg">{selected.full_name}</h2>

              <p className="text-sm italic text-gray-500 mb-2">
                “{selected.bio || 'Sin descripción'}”
              </p>

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

              <p className="text-sm text-gray-600">
                <Clock3 size={14} className="inline mr-1" />
                {selected?.years_experience
                  ? `${selected.years_experience} ${
                      selected.years_experience === 1 ? 'año' : 'años'
                    } de experiencia`
                  : 'Sin experiencia registrada'}
              </p>

              <p className="text-xs text-gray-500 mt-1">
                {(() => {
                  const mins = minutesSince(selected?.updated_at);
                  if (mins == null) return 'Sin actividad reciente';
                  if (mins < 60) return `Activo hace ${mins} min`;
                  if (mins < 1440) return `Activo hace ${Math.floor(mins / 60)} h`;
                  return `Activo hace ${Math.floor(mins / 1440)} d`;
                })()}
              </p>

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

              {etaMinutes != null && (
                <div className="mt-2 flex justify-center">
                  <div className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                    ⏱️ llega en aprox {etaMinutes} min
                  </div>
                </div>
              )}

              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Especialidades</h3>
                <div className="flex flex-wrap justify-center gap-2">
                  {skillsList.map((skill, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium text-sm shadow-sm border border-emerald-200"
                    >
                      {String(skill).trim()}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-3">{jobId && <StatusBadge />}</div>

              {renderActionButtons()}
            </div>
          </div>
        )}
      </motion.div>
    );
  })()}
</AnimatePresence>
{/* 💵 MODAL INFORMACIÓN DE SOLICITUD — SIN PRECIOS FIJOS AÚN */}
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
        {/* 🧠 Encabezado */}
        <h3 className="text-lg font-bold text-emerald-700 mb-1">
          Estás a un paso de tu solución ✨
        </h3>

        <p className="text-sm text-gray-500 mb-5">
          Enviá tu solicitud ahora y conectate con un profesional cerca tuyo.
        </p>

        {/* 📢 Estado actual de precios */}
        <div className="rounded-2xl border border-emerald-200 bg-white p-4 mb-5 shadow-sm">
          <p className="text-2xl font-extrabold text-emerald-600 mb-1">
            Solicitud sin costo
          </p>
          <p className="text-xs text-gray-500">
            Todavía estamos en etapa de reclutamiento y activación de profesionales.
          </p>
        </div>

        {/* 🧩 Explicación clara para clientes */}
        <div className="text-sm text-gray-600 space-y-2 mb-6 text-left">
          <p>✅ Ya podés explorar profesionales y enviar tu solicitud.</p>
          <p>🛠️ Las tarifas oficiales se activarán después del reclutamiento.</p>
          <p>📲 Muy pronto vas a ver precios claros antes de confirmar cada servicio.</p>
          <p>🚀 Estamos preparando una experiencia más rápida, transparente y profesional para vos.</p>
        </div>

        {/* 🔘 Botones CTA */}
        <div className="flex justify-center gap-3">
          <button
            onClick={() => setShowPrice(false)}
            className="py-3 w-1/2 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition"
          >
            Volver
          </button>

          <button
            onClick={confirmarSolicitud}
            className="py-3 w-1/2 rounded-xl bg-emerald-500 text-white font-semibold shadow-md hover:bg-emerald-600 active:scale-[0.98] transition"
          >
            Enviar solicitud
          </button>
        </div>

        {/* 💚 Refuerzo final */}
        <p className="text-[11px] text-gray-400 mt-5 italic">
          ManosYA se está preparando para ofrecerte una nueva forma de pedir servicios.
        </p>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>



{/* 🌟 MODAL DE CALIFICACIÓN MANOSYA */}
<AnimatePresence>
  {(jobStatus === 'worker_completed' || jobStatus === 'completed') && (
    <motion.div
      key="modal-review"
      className="fixed inset-0 z-[10020] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onAnimationStart={() => {
        if (navigator.vibrate) navigator.vibrate(30);
      }}
    >
      <motion.div
        initial={{ scale: 0.94, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.94, y: 30, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 160, damping: 18 }}
        className="
          relative w-full max-w-md overflow-hidden
          rounded-[30px]
          border border-emerald-100
          bg-white
          shadow-[0_30px_80px_rgba(0,0,0,0.35)]
        "
      >

        {/* decoración suave marca */}
        <div className="pointer-events-none absolute -top-20 -right-20 h-44 w-44 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-44 w-44 rounded-full bg-emerald-300/10 blur-3xl" />

        {/* botón cerrar */}
        <button
          onClick={() => {
            setJobStatus(null);
            setTimeout(() => {
              resetJobState();
            }, 400);
          }}
          className="
            absolute top-4 right-4
            h-9 w-9 rounded-full
            bg-gray-100
            text-gray-400
            hover:text-red-500
            transition
            flex items-center justify-center
          "
        >
          <XCircle size={18} />
        </button>

        <div className="px-7 pt-7 pb-6 text-center">

          {/* encabezado */}
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-[12px] font-semibold text-emerald-700">
            ✅ Servicio finalizado
          </div>

          {/* avatar */}
          <div className="relative mx-auto mb-4 h-24 w-24">
            <div className="absolute inset-0 rounded-full bg-emerald-400/25 blur-xl" />
            <img
              src={selected?.avatar_url || '/avatar-fallback.png'}
              alt="avatar trabajador"
              onError={(e) => {
                e.currentTarget.src = '/avatar-fallback.png';
              }}
              className="
                relative z-10 h-24 w-24 rounded-full
                object-cover object-center
                border-4 border-emerald-500
                shadow-[0_10px_25px_rgba(16,185,129,0.35)]
              "
            />
          </div>

          {/* título */}
          <h3 className="text-[22px] font-bold text-gray-800">
            ¿Cómo fue tu experiencia?
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Valorá a <span className="font-semibold text-emerald-600">{selected?.full_name || 'el profesional'}</span> y ayudá a mejorar ManosYA.
          </p>

          {/* estrellas */}
          <div className="mt-6 mb-3">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setRating(n);
                    if (navigator.vibrate) navigator.vibrate(15);
                  }}
                  className={`
                    h-11 w-11 rounded-xl
                    flex items-center justify-center
                    border transition
                    ${
                      n <= rating
                        ? 'bg-emerald-500 border-emerald-500 shadow-md'
                        : 'bg-white border-gray-200 hover:bg-emerald-50'
                    }
                  `}
                >
                  <Star
                    size={22}
                    className={
                      n <= rating
                        ? 'fill-white text-white'
                        : 'text-gray-300'
                    }
                  />
                </button>
              ))}
            </div>

            <div className="mt-3 text-xs text-gray-500 font-medium">
              {rating === 0 && 'Seleccioná una cantidad de estrellas'}
              {rating === 1 && 'Muy mala experiencia'}
              {rating === 2 && 'Podría mejorar'}
              {rating === 3 && 'Experiencia aceptable'}
              {rating === 4 && 'Muy buena atención'}
              {rating === 5 && 'Excelente servicio'}
            </div>
          </div>

          {/* comentario */}
          <div className="mt-5 text-left">
            <label className="mb-2 block text-[12px] font-semibold text-gray-500">
              COMENTARIO OPCIONAL
            </label>

            <textarea
              rows={4}
              placeholder="Comentá cómo fue la atención, puntualidad y calidad del servicio..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="
                w-full resize-none rounded-2xl
                border border-gray-200
                px-4 py-3 text-sm
                shadow-inner
                outline-none
                focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100
              "
            />
          </div>

          {/* botones */}
          <div className="mt-6 flex gap-3">

            <button
              onClick={() => {
                toast('Valoración omitida');
                setJobStatus(null);
                setTimeout(() => {
                  resetJobState();
                }, 400);
              }}
              className="
                flex-1 rounded-2xl
                bg-gray-100
                py-3 text-sm font-semibold
                text-gray-600
                hover:bg-gray-200
                transition
              "
            >
              Omitir
            </button>

            <button
              onClick={async () => {
                try {
                  await confirmarReseña();
                  toast.success('Gracias por valorar al profesional 🙌');

                  setTimeout(() => {
                    setJobStatus(null);
                    resetJobState();
                  }, 600);
                } catch (err) {
                  console.error('❌ Error al guardar reseña:', err);
                  toast.error('No se pudo guardar la valoración');
                }
              }}
              className="
                flex-[1.4]
                rounded-2xl
                bg-emerald-500
                py-3
                text-sm font-bold text-white
                shadow-lg shadow-emerald-400/30
                hover:bg-emerald-600
                transition
              "
            >
              Finalizar y valorar
            </button>

          </div>

          <div className="mt-4 text-[11px] text-gray-400">
            Tu opinión ayuda a mejorar la calidad de los servicios en ManosYA.
          </div>

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
          
          <button
  onClick={() => {
    setIsChatOpen(false);
    setMessages([]);
    setHasUnread(false);
    setUnreadCount(0);

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
  const mine = String(m.sender_id) === String(me?.id);
  const isLocation = m?.message_type === 'location';
  const hasCoords = Number.isFinite(Number(m?.lat)) && Number.isFinite(Number(m?.lng));

  return (
    <div
      key={m.id}
      className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
    >
      {isLocation ? (
        <button
          type="button"
          onClick={() => openLocationMessageOnMap(m)}
          className={`
            max-w-[82%] text-left overflow-hidden
            rounded-2xl shadow-sm border
            transition active:scale-[0.98]
            ${mine
              ? 'bg-emerald-500 text-white border-emerald-500 rounded-br-none'
              : 'bg-white text-gray-800 border-gray-200 rounded-bl-none'
            }
          `}
        >
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-[18px]">📍</span>
              <div>
                <div className="text-[14px] font-extrabold leading-none">
                  Ubicación compartida
                </div>
                <div className={`text-[11px] mt-1 ${mine ? 'text-white/80' : 'text-gray-500'}`}>
                  Tocá para abrir en el mapa
                </div>
              </div>
            </div>
          </div>

          <div
            className={`
              mx-3 mb-3 rounded-2xl px-3 py-3
              ${mine ? 'bg-white/12 border border-white/15' : 'bg-emerald-50 border border-emerald-100'}
            `}
          >
            <div className="text-[12px] font-bold">
              {hasCoords
                ? `${Number(m.lat).toFixed(6)}, ${Number(m.lng).toFixed(6)}`
                : 'Ubicación no disponible'}
            </div>

            <div className={`text-[11px] mt-1 ${mine ? 'text-white/80' : 'text-gray-500'}`}>
              Ver punto exacto en el mapa
            </div>
          </div>
        </button>
      ) : (
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
      )}
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