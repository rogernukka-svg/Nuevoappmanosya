'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Sparkles,
    MapPin,
  MapPinned,
  Star,
  MessageCircle,
  SendHorizontal,
  Compass,
  BadgeCheck,
  Check,
  Clock3,
  Users,
  Briefcase,
  ShieldCheck,
  Heart,
  Share2,
  Plus,
  UserPlus,
  Store,
  ShoppingCart,
PanelTop,
Bell,
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabase } from '@/lib/supabase';
import { cacheMediaUrls, collectWorkerMediaUrls } from '@/lib/mediaCache';

const supabase = getSupabase();

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then((m) => m.Polyline), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then((m) => m.Circle), { ssr: false });
const FitBounds = dynamic(
  () =>
    Promise.resolve(function FitBoundsInner({ points }) {
      const { useMap } = require('react-leaflet');
      const map = useMap();

      useEffect(() => {
        if (!map || !Array.isArray(points) || points.length < 2) return;

        const L = require('leaflet');
        const bounds = L.latLngBounds(points);

        setTimeout(() => {
          map.fitBounds(bounds, {
            paddingTopLeft: [36, 90],
            paddingBottomRight: [36, 190],
            maxZoom: 14,
            animate: true,
          });
        }, 250);
      }, [map, points]);

      return null;
    }),
  { ssr: false }
);
const LS_APP_ROLE = 'app_role';
const LAST_GPS_KEY = 'manosya_last_gps';
const FEED_SOUND_KEY = 'manosya_feed_sound_enabled';
const LOGIN_BG = '#62bfb9';

const HOME_VIEW = {
  center: [-25.5097, -54.6111],
  zoom: 12,
};

function isFeedSoundEnabled() {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(FEED_SOUND_KEY) === '1';
  } catch {
    return false;
  }
}

function unlockFeedSound() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FEED_SOUND_KEY, '1');
  } catch {}
  window.dispatchEvent(new Event('manosya-feed-sound-unlocked'));
}

const SERVICE_CATALOG = [
  { slug: 'taxi', name: 'Taxi', badge: 'Inmediato' },
  { slug: 'chofer', name: 'Chofer', badge: 'Inmediato' },
  { slug: 'plomeria', name: 'Plomería', badge: 'Urgente' },
  { slug: 'electricidad', name: 'Electricidad', badge: 'Urgente' },
  { slug: 'limpieza', name: 'Limpieza', badge: 'Por hora' },
  { slug: 'jardineria', name: 'Jardinería', badge: 'Agenda' },
  { slug: 'auxilio-vehicular', name: 'Auxilio vehicular', badge: 'Urgente' },
  { slug: 'fletes', name: 'Fletes y mudanzas', badge: 'Cotización' },
  { slug: 'contador', name: 'Contador', badge: 'Consulta' },
  { slug: 'abogado', name: 'Abogado', badge: 'Consulta' },
  { slug: 'peluqueria', name: 'Peluquería', badge: 'Turnos' },
  { slug: 'parrillero', name: 'Parrillero', badge: 'Evento' },
];

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeSlug(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
const SEARCH_KEYWORDS = {
  plomeria: [
    'plomero', 'plomeria', 'caño', 'cano', 'caneria', 'tuberia', 'tubo', 'agua',
    'perdida', 'pierde agua', 'gotea', 'gotera', 'lavamanos', 'pileta', 'baño', 'bano',
    'inodoro', 'cisterna', 'ducha', 'grifo', 'canilla', 'destape', 'desague'
  ],
  electricidad: [
    'electricista', 'electricidad', 'luz', 'cable', 'enchufe', 'tomacorriente',
    'llave', 'termica', 'disyuntor', 'corto', 'cortocircuito', 'instalacion',
    'ventilador', 'foco', 'lampara', 'tablero'
  ],
  limpieza: [
    'limpieza', 'limpiadora', 'limpiar', 'casa', 'departamento', 'oficina',
    'aseo', 'profunda', 'mucama', 'servicio domestico'
  ],
  refrigeracion: [
    'refrigeracion', 'aire', 'split', 'ac', 'acondicionado', 'heladera',
    'freezer', 'congelador', 'carga gas', 'gas', 'mantenimiento aire'
  ],
  jardineria: [
    'jardinero', 'jardineria', 'pasto', 'cesped', 'yuyal', 'maleza', 'podar',
    'poda', 'arbol', 'jardin'
  ],
  fletes: [
    'flete', 'mudanza', 'mudanzas', 'camioneta', 'camion', 'traslado',
    'llevar', 'muebles', 'carga'
  ],
  taxi: [
    'taxi', 'movil', 'viaje', 'llevarme', 'traslado', 'chofer', 'conductor'
  ],
  chofer: [
    'chofer', 'conductor', 'manejar', 'traslado', 'viaje', 'driver'
  ],
  contador: [
    'contador', 'contabilidad', 'factura', 'iva', 'set', 'ruc', 'declaracion',
    'impuesto', 'tributario'
  ],
  abogado: [
    'abogado', 'legal', 'demanda', 'contrato', 'documento', 'juicio',
    'asesoria legal'
  ],
  parrillero: [
    'parrillero', 'asado', 'parrilla', 'evento', 'cumple', 'fiesta'
  ],
};

function levenshtein(a, b) {
  const s = normalizeText(a);
  const t = normalizeText(b);
  if (!s) return t.length;
  if (!t) return s.length;

  const dp = Array.from({ length: s.length + 1 }, (_, i) => [i]);

  for (let j = 1; j <= t.length; j++) dp[0][j] = j;

  for (let i = 1; i <= s.length; i++) {
    for (let j = 1; j <= t.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (s[i - 1] === t[j - 1] ? 0 : 1)
      );
    }
  }

  return dp[s.length][t.length];
}

function fuzzyIncludes(text, query) {
  const cleanText = normalizeText(text);
  const cleanQuery = normalizeText(query);

  if (!cleanQuery) return true;
  if (cleanText.includes(cleanQuery)) return true;

  const words = cleanText.split(/\s+/).filter(Boolean);
  const queryWords = cleanQuery.split(/\s+/).filter(Boolean);

  return queryWords.some((q) =>
    words.some((w) => {
      if (w.includes(q) || q.includes(w)) return true;
      if (q.length >= 4 && levenshtein(w, q) <= 2) return true;
      return false;
    })
  );
}

function workerSearchScore(worker, query) {
  const q = normalizeText(query);
  if (!q) return 0;

  const name = normalizeText(worker?.full_name || worker?.username || '');
  const services = splitWorkerServices(worker).join(' ');
  const serviceText = normalizeText(`${services} ${serviceLabelForWorker(worker)} ${worker?.service_type || ''} ${worker?.main_skill || ''}`);
  const bio = normalizeText(worker?.bio || '');
  const city = normalizeText(worker?.city || worker?.address || '');
  const all = `${name} ${serviceText} ${bio} ${city}`;

  let score = 0;

  if (name.includes(q)) score += 120;
  if (serviceText.includes(q)) score += 100;
  if (bio.includes(q)) score += 55;
  if (city.includes(q)) score += 25;
  if (fuzzyIncludes(all, q)) score += 35;

  Object.entries(SEARCH_KEYWORDS).forEach(([slug, keywords]) => {
    const serviceMatch = serviceText.includes(normalizeText(slug));
    const keywordMatch = keywords.some((kw) => fuzzyIncludes(kw, q) || fuzzyIncludes(q, kw));

    if (keywordMatch && serviceMatch) score += 120;
    else if (keywordMatch) score += 80;
  });

  if (isOnlineRecent(worker)) score += 15;
  if (Number.isFinite(Number(worker?._distKm))) score += Math.max(0, 20 - Number(worker._distKm));
  score += Number(worker?.avg_rating || 0) * 3;

  return score;
}
function formatKm(km) {
  if (!Number.isFinite(km)) return '—';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function workerRatingValue(worker) {
  const count = Number(worker?.total_reviews || worker?.rating_count || 0);
  const rating = Number(worker?.avg_rating ?? worker?.rating_avg);
  if (!count || !Number.isFinite(rating) || rating <= 0) return null;
  return rating;
}

function formatWorkerRating(worker) {
  const rating = workerRatingValue(worker);
  return rating == null ? 'Sin reseÃ±as' : `â­ ${rating.toFixed(1)}`;
}

function formatWorkerRatingClean(worker) {
  const rating = workerRatingValue(worker);
  return rating == null ? 'Nuevo perfil' : `Rating ${rating.toFixed(1)}`;
}

function workerShareUrl(worker, path = '/client') {
  const configuredBase = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '';
  const base = (configuredBase || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/+$/, '');
  const workerId = encodeURIComponent(String(worker?.user_id || worker?.worker_id || worker?.id || ''));
  return `${base}${path}${workerId ? `?worker=${workerId}` : ''}`;
}

async function fetchWorkerReviewStats(workerIds) {
  const ids = [...new Set((workerIds || []).map((id) => String(id || '')).filter(Boolean))];
  if (!ids.length) return {};

  const { data, error } = await supabase
    .from('reviews')
    .select('worker_id, rating')
    .in('worker_id', ids);

  if (error) {
    console.warn('worker reviews stats error', error);
    return {};
  }

  const grouped = {};
  (data || []).forEach((review) => {
    const key = String(review.worker_id || '');
    const rating = Number(review.rating);
    if (!key || !Number.isFinite(rating) || rating <= 0) return;
    if (!grouped[key]) grouped[key] = { sum: 0, count: 0 };
    grouped[key].sum += rating;
    grouped[key].count += 1;
  });

  return Object.entries(grouped).reduce((acc, [key, value]) => {
    acc[key] = {
      avg_rating: value.count ? value.sum / value.count : null,
      total_reviews: value.count,
    };
    return acc;
  }, {});
}

function minutesSince(dateString) {
  if (!dateString) return null;
  const diffMs = Date.now() - new Date(dateString).getTime();
  return Math.floor(diffMs / 60000);
}

function isOnlineRecent(worker) {
  const stamp =
    worker?.last_seen ||
    worker?.location_updated_at ||
    worker?.loc_updated_at ||
    worker?.updated_at;

  const mins = minutesSince(stamp);
  return mins != null && mins >= 0 && mins <= 30;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
function shuffleBySeed(list, seed = 1) {
  const arr = [...(list || [])];

  const seededRandom = (index) => {
    const x = Math.sin(index + seed * 9999) * 10000;
    return x - Math.floor(x);
  };

  return arr
    .map((item, index) => ({
      item,
      sort: seededRandom(index),
    }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);
}
function splitWorkerServices(worker) {
  const raw = [];

  if (Array.isArray(worker?.skills)) raw.push(...worker.skills);
  else if (typeof worker?.skills === 'string') raw.push(...worker.skills.split(','));

  if (worker?.main_skill) raw.push(worker.main_skill);
  if (worker?.service_type) raw.push(worker.service_type);

  return raw
    .map((v) => String(v || '').trim())
    .filter(Boolean);
}

function serviceMetaBySlug(slug) {
  const normalized = normalizeSlug(slug);
  return SERVICE_CATALOG.find((item) => normalizeSlug(item.slug) === normalized) || null;
}

function serviceLabelForWorker(worker) {
  const first = splitWorkerServices(worker)[0];
  if (!first) return 'Servicio general';
  const meta = serviceMetaBySlug(first);
  return meta?.name || first;
}

function mapAccentColor(worker) {
  if (worker?.is_active === false) return '#9ca3af';
  return isOnlineRecent(worker) ? '#16a3a8' : '#94a3b8';
}

function avatarIcon(url, worker) {
  if (typeof window === 'undefined') return null;
  const L = require('leaflet');
  const size = 56;
  const color = mapAccentColor(worker);
  const html = `
    <div style="width:${size}px;height:${size}px;border-radius:999px;position:relative;background:#fff;box-shadow:0 14px 28px rgba(0,0,0,.18);overflow:visible;">
      <div style="position:absolute;inset:-4px;border-radius:999px;border:3px solid ${color};"></div>
      <img src="${url || '/avatar-fallback.png'}" onerror="this.src='/avatar-fallback.png'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:999px;" />
      ${isOnlineRecent(worker) ? '<div style="position:absolute;right:-2px;bottom:-2px;width:14px;height:14px;border-radius:999px;background:#10b981;border:2px solid #fff;"></div>' : ''}
    </div>
  `;
  return L.divIcon({
    html,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function clientLocationIcon() {
  if (typeof window === 'undefined') return null;
  const L = require('leaflet');
  const size = 24;
  const html = `
    <div style="width:${size}px;height:${size}px;border-radius:999px;background:linear-gradient(180deg,#16a3a8 0%, #0c6b70 100%);border:3px solid #fff;box-shadow:0 10px 22px rgba(37,99,235,.35);"></div>
  `;
  return L.divIcon({
    html,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

async function fetchRoadRoute(fromLat, fromLng, toLat, toLng) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data?.routes?.length) return null;

    return {
      route: data.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]),
      distanceKm: data.routes[0].distance / 1000,
      durationMin: Math.round(data.routes[0].duration / 60),
    };
  } catch (error) {
    console.warn('route error', error);
    return null;
  }
}

function SupplierProductStrip({ products, serviceName }) {
  if (!Array.isArray(products) || !products.length) return null;

  return (
    <div className="mt-2 rounded-[22px] border border-white/18 bg-black/34 p-2 backdrop-blur-xl">
      <div className="mb-2 flex items-center gap-2 px-1 text-[11px] font-black uppercase tracking-[0.12em] text-[#9ee5df]">
        <Store size={13} />
        Insumos para {serviceName || 'este servicio'}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {products.slice(0, 4).map((product) => (
          <a
            key={product.id}
            href={product.contact_url || '#'}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => {
              if (!product.contact_url) {
                event.preventDefault();
                toast.info('Pedido interno ManosYA: el proveedor vera esta consulta cuando activemos el inbox.');
              }
            }}
            className="flex min-w-[170px] items-center gap-2 rounded-[18px] bg-white/94 p-2 text-slate-950 shadow-[0_10px_20px_rgba(0,0,0,0.18)] active:scale-[0.98]"
          >
            <img src={product.image_url || '/avatar-fallback.png'} onError={(e) => { e.currentTarget.src = '/avatar-fallback.png'; }} alt={product.title} className="h-12 w-12 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-black">{product.title}</div>
              <div className="truncate text-[11px] font-bold text-slate-500">{product.price_text || 'Pedir en ManosYA'}</div>
            </div>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#62bfb9] text-white">
              <ShoppingCart size={14} />
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

function FeedCard({ worker, isActive, isFollowed, isLiked, products = [], onOpen, onAddFriend, onMessage, onRequest, onNearbyMap, onComments, onLike }) {
  const [bioOpen, setBioOpen] = useState(false);
  const [paused, setPaused] = useState(!isActive);
  const [muted, setMuted] = useState(() => !isFeedSoundEnabled());
  const videoRef = useRef(null);
  const primaryService = serviceLabelForWorker(worker);
  const mediaUrl = worker?.media_url || worker?.cover_url || worker?.video_thumb_url || worker?.avatar_url || '/avatar-fallback.png';
  const isVideo = worker?.media_type === 'video';
  const likes = worker?.likes_count || worker?.like_count || 0;
  const reviews = worker?.comments_count || worker?.total_reviews || 0;
  const isOnline = isOnlineRecent(worker);

  const workerName = worker?.full_name || 'trabajador';
  const postText = worker?.post_description || worker?.caption || worker?.bio || 'Mirá trabajos reales, consultá por chat y solicitá directo desde ManosYA.';
  const isLongBio = postText.length > 95;
  const shortBio = isLongBio ? `${postText.slice(0, 95).trim()}...` : postText;

  useEffect(() => {
    const markSoundEnabled = () => unlockFeedSound();
    const syncSound = () => {
      setMuted(false);
      const video = videoRef.current;
      if (!video || !isActive) return;
      video.muted = false;
      video.volume = 1;
      video.play().then(() => setPaused(false)).catch(() => {});
    };

    window.addEventListener('manosya-feed-sound-unlocked', syncSound);
    document.addEventListener('pointerdown', markSoundEnabled, { once: true, capture: true });
    document.addEventListener('touchstart', markSoundEnabled, { once: true, capture: true });
    document.addEventListener('keydown', markSoundEnabled, { once: true, capture: true });

    return () => {
      window.removeEventListener('manosya-feed-sound-unlocked', syncSound);
      document.removeEventListener('pointerdown', markSoundEnabled, true);
      document.removeEventListener('touchstart', markSoundEnabled, true);
      document.removeEventListener('keydown', markSoundEnabled, true);
    };
  }, [isActive]);

  useEffect(() => {
    if (!isVideo || !videoRef.current) return;

    const video = videoRef.current;

    if (isActive) {
      const shouldPlayWithSound = isFeedSoundEnabled();
      video.muted = !shouldPlayWithSound;
      video.volume = 1;
      video.playsInline = true;
      video.preload = 'auto';
      setMuted(!shouldPlayWithSound);
      video.play().then(() => setPaused(false)).catch((error) => {
        video.muted = true;
        setMuted(true);
        video.play().then(() => setPaused(false)).catch(() => setPaused(true));
        console.warn('Autoplay bloqueado:', error);
      });
    } else {
      video.pause();
      setPaused(true);
    }
  }, [isActive, isVideo, mediaUrl]);

  function toggleVideoPlay() {
    if (!isVideo || !videoRef.current) return;

    const video = videoRef.current;
    unlockFeedSound();

    if (video.paused || paused) {
      video.muted = false;
      video.volume = 1;
      setMuted(false);
      video.play().then(() => setPaused(false)).catch(() => {
        video.muted = true;
        setMuted(true);
        video.play().then(() => setPaused(false)).catch(() => setPaused(true));
      });
    } else {
      video.pause();
      setPaused(true);
    }
  }
  const shareWorker = async () => {
    const text = `Mirá este trabajo en ManosYA: ${workerName} · ${primaryService}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${workerName} en ManosYA`, text: `Mira este perfil en ManosYA: ${workerName} - ${primaryService}\n${workerShareUrl(worker, '/client')}`, url: workerShareUrl(worker, '/client') });
        return;
      }

      await navigator.clipboard.writeText(`Mira este perfil en ManosYA: ${workerName} - ${primaryService}\n${workerShareUrl(worker, '/client')}`);
      toast.success('Link copiado para compartir');
    } catch (error) {
      if (error?.name !== 'AbortError') toast.error('No pudimos compartir ahora');
    }
  };

  return (
    <motion.div
      layout
      className="relative h-[calc(var(--real-vh,100dvh)-74px)] w-full snap-start overflow-hidden bg-black"
    >
    {isVideo && mediaUrl ? (
  <div onClick={toggleVideoPlay} className="absolute inset-0 h-full w-full cursor-pointer">
    <video
      ref={videoRef}
      key={mediaUrl}
      src={mediaUrl}
      muted={muted}
      loop
      playsInline
      controls={false}
      preload="auto"
      className="absolute inset-0 h-full w-full bg-black object-contain"
      onPlay={() => setPaused(false)}
      onPause={() => setPaused(true)}
      onError={(e) => {
        console.warn('No se pudo reproducir video del feed:', mediaUrl, e);
      }}
    />
    {paused && (
      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/10">
        <div className="rounded-full bg-black/45 px-5 py-5 backdrop-blur-md">
          <span className="ml-1 block h-0 w-0 border-y-[15px] border-l-[22px] border-y-transparent border-l-white" />
        </div>
      </div>
    )}
  </div>
) : (
  <img
    src={mediaUrl || '/avatar-fallback.png'}
    onError={(e) => {
      e.currentTarget.src = '/avatar-fallback.png';
    }}
    alt={workerName}
    className="absolute inset-0 h-full w-full object-cover"
  />
)}

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.36)_22%,rgba(0,0,0,0.02)_56%,rgba(0,0,0,0.18)_100%)]" />

      <div className="absolute right-2 bottom-[118px] z-30 flex w-12 flex-col items-center text-white">
        <button
          type="button"
          onClick={onOpen}
          className="relative mb-4 flex h-14 w-14 items-center justify-center active:scale-95"
        >
          <img
            src={worker?.avatar_url || '/avatar-fallback.png'}
            onError={(e) => {
              e.currentTarget.src = '/avatar-fallback.png';
            }}
            alt={workerName}
            className="h-12 w-12 rounded-full border-2 border-white object-cover shadow-[0_12px_26px_rgba(0,0,0,0.55)]"
          />
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onAddFriend?.();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onAddFriend?.();
              }
            }}
            className={`absolute bottom-[1px] flex h-6 w-6 items-center justify-center rounded-full text-white shadow-[0_8px_18px_rgba(98,191,185,0.45)] ${isFollowed ? 'bg-sky-500' : 'bg-[#62bfb9]'}`}
            aria-label={isFollowed ? 'Siguiendo' : 'Agregar amigo'}
          >
            {isFollowed ? <Check size={14} strokeWidth={3.4} /> : <UserPlus size={14} strokeWidth={3.2} />}
          </span>
        </button>

        <button type="button" onClick={() => onLike(worker)} className="mb-3 flex w-12 flex-col items-center active:scale-95" aria-label={isLiked ? 'Quitar me gusta' : 'Dar me gusta'}>
          <Heart
            size={32}
            fill={isLiked ? '#ef4444' : 'white'}
            stroke={isLiked ? '#ef4444' : 'white'}
            strokeWidth={1.8}
            className="drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)]"
          />
          <span className="mt-0.5 text-[12px] font-black">{likes}</span>
        </button>

        <button type="button" onClick={() => onComments(worker)} className="mb-3 flex w-12 flex-col items-center active:scale-95">
          <MessageCircle size={32} fill="white" strokeWidth={1.8} className="drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)]" />
          <span className="mt-0.5 text-[12px] font-black">{reviews}</span>
        </button>

        <button type="button" onClick={shareWorker} className="mb-3 flex w-12 flex-col items-center active:scale-95">
          <Share2 size={30} className="drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)]" />
          <span className="mt-0.5 text-[10px] font-black">Compartir</span>
        </button>

        <button type="button" onClick={onNearbyMap} className="flex w-14 flex-col items-center active:scale-95">
          <MapPin size={32} fill="none" stroke="white" strokeWidth={2.8} className="drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)]" />
        </button>
      </div>

      <div className="absolute left-4 right-[66px] bottom-[76px] z-20 text-white">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1.5 text-[12px] font-black backdrop-blur-md">
          <span className={isOnline ? 'h-2 w-2 rounded-full bg-emerald-400' : 'h-2 w-2 rounded-full bg-white/55'} />
          {isOnline ? 'Activo ahora' : 'Disponible'}
        </div>

        <div className="flex items-center gap-3">
          <img
            src={worker?.avatar_url || '/avatar-fallback.png'}
            onError={(e) => {
              e.currentTarget.src = '/avatar-fallback.png';
            }}
            alt={workerName}
            className="h-10 w-10 rounded-full border-2 border-white object-cover"
          />

          <button type="button" onClick={onOpen} className="min-w-0 text-left">
            <div className="flex min-w-0 items-center gap-1.5">
              <div className="truncate text-[18px] font-black leading-tight">
                @{worker?.username || workerName}
              </div>
              {worker?.is_verified && (
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white shadow-[0_6px_14px_rgba(14,165,233,0.45)]" title="Verificado por ManosYA">
                  <BadgeCheck size={14} strokeWidth={3} />
                </span>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[13px] font-bold text-white/86">
              <span>{primaryService}</span>
              {worker?._distKm != null && <span>• {formatKm(worker._distKm)}</span>}
              <span>• {formatWorkerRatingClean(worker)}</span>
            </div>
          </button>
        </div>

        <div className="mt-1.5 text-[13px] font-semibold leading-5 text-white/95">
          <p className={bioOpen ? '' : 'truncate'}>
            {bioOpen ? postText : shortBio}
          </p>

          {isLongBio && (
            <button
              type="button"
              onClick={() => setBioOpen((prev) => !prev)}
              className="mt-0.5 text-[12px] font-black text-[#9ee5df]"
            >
              {bioOpen ? 'Ver menos' : 'Ver más'}
            </button>
          )}
        </div>

        <SupplierProductStrip products={products} serviceName={primaryService} />

        <div className="mt-2 flex items-center gap-2 rounded-[24px] border border-white/45 bg-black/28 px-3 py-2 shadow-[0_10px_22px_rgba(0,0,0,0.20)] backdrop-blur-md">
          <input
            defaultValue="Hola, ¿estás disponible?..."
            className="min-w-0 flex-1 bg-transparent px-2 text-[13px] font-semibold text-white/80 placeholder:text-white/55 outline-none"
          />

          <button
            type="button"
            onClick={() => {
              const message = `Hola ${workerName}, vi tu publicación. ¿Estás disponible?`;
              onMessage?.(worker, message);
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#62bfb9] text-white shadow-[0_10px_20px_rgba(98,191,185,0.42)] ring-1 ring-white/35 active:scale-95"
          >
            <SendHorizontal size={18} strokeWidth={2.6} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
function CommentsSheet({
  open,
  worker,
  comments,
  commentText,
  setCommentText,
  onClose,
  onSend,
}) {
  if (!open || !worker) return null;

  return (
    <div className="fixed inset-0 z-[67000] flex items-end bg-black/55 backdrop-blur-sm">
      <motion.div
        initial={{ y: 420, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 420, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        className="mx-auto flex max-h-[76vh] w-full max-w-xl flex-col overflow-hidden rounded-t-[34px] bg-white shadow-[0_-24px_80px_rgba(0,0,0,0.35)]"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#0c6b70]">
              Comentarios
            </div>
            <div className="mt-1 truncate text-[20px] font-black text-slate-900">
              {worker?.full_name || 'Trabajador'}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!comments?.length ? (
            <div className="flex min-h-[180px] items-center justify-center text-center">
              <div>
                <MessageCircle className="mx-auto mb-3 text-slate-300" size={34} />
                <div className="text-[17px] font-black text-slate-900">
                  Todavía no hay comentarios
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-500">
                  Sé el primero en comentar este perfil.
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <img
                    src={item.client_avatar || '/avatar-fallback.png'}
                    onError={(e) => {
                      e.currentTarget.src = '/avatar-fallback.png';
                    }}
                    alt={item.client_name || 'Cliente'}
                    className="h-10 w-10 rounded-full object-cover"
                  />

                  <div className="min-w-0 flex-1 rounded-[22px] bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-[14px] font-black text-slate-900">
                        {item.client_name || 'Cliente'}
                      </div>
                      <div className="shrink-0 text-[12px] font-black text-amber-500">
                        {Number(item.rating || 0) > 0 ? `⭐ ${Number(item.rating).toFixed(1)}` : 'Sin rating'}
                      </div>
                    </div>

                    <p className="mt-1 text-[14px] font-semibold leading-5 text-slate-600">
                      {item.comment}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3">
          <div className="flex items-center gap-2 rounded-[28px] border border-slate-200 bg-slate-50 px-3 py-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Escribí un comentario público..."
              className="h-11 min-w-0 flex-1 bg-transparent px-2 text-[14px] font-semibold text-slate-700 placeholder:text-slate-400 outline-none"
            />

            <button
              type="button"
              onClick={onSend}
              disabled={!commentText.trim()}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#62bfb9] text-white shadow-[0_10px_22px_rgba(98,191,185,0.35)] disabled:opacity-45 active:scale-95"
            >
              <SendHorizontal size={17} strokeWidth={2.8} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
function WorkerRow({ worker, onSelect, onMessage, onRequest }) {
  const online = isOnlineRecent(worker);
  return (
    <div className="flex items-center gap-3 rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm">
      <img
        src={worker?.avatar_url || '/avatar-fallback.png'}
        onError={(e) => {
          e.currentTarget.src = '/avatar-fallback.png';
        }}
        alt={worker?.full_name || 'Avatar'}
        className="h-16 w-16 rounded-full object-cover"
      />
      <div className="min-w-0 flex-1">
        <button type="button" onClick={onSelect} className="text-left">
         <div className="truncate text-[17px] font-black text-slate-900">{worker?.full_name || 'Trabajador'}</div>
        </button>
        <div className="mt-1 flex flex-wrap gap-2 text-[12px] text-slate-500">
          <span>{serviceLabelForWorker(worker)}</span>
          {worker?._distKm != null && <span>• {formatKm(worker._distKm)}</span>}
          <span>• {formatWorkerRatingClean(worker)}</span>
        </div>
        <div className="mt-2">
          {online ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">Activo ahora</span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">Disponible</span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2">
  <button type="button" onClick={onMessage} className="rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-700">
    <MessageCircle size={16} />
  </button>
  <button type="button" onClick={onSelect} className="rounded-full bg-emerald-500 p-2 text-white">
    <Sparkles size={16} />
  </button>
</div>
    </div>
  );
}

function ProfileMediaViewer({ media, onClose }) {
  const mediaRef = useRef(null);

  useEffect(() => {
    if (!media) return undefined;

    const viewerVideo = mediaRef.current;
    const pausedVideos = [];

    document.querySelectorAll('video').forEach((video) => {
      if (video === viewerVideo) return;
      if (!video.paused) {
        video.pause();
        pausedVideos.push(video);
      }
    });

    return () => {
      pausedVideos.forEach((video) => {
        if (!video.isConnected) return;
        video.play().catch(() => {});
      });
    };
  }, [media]);

  if (!media) return null;

  const mediaUrl = media.media_url || media.thumbnail_url;
  const isVideo = String(media.media_type || '').toLowerCase() === 'video';

  return (
    <div className="fixed inset-0 z-[70000] flex items-center justify-center bg-black/92 p-3">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/14 text-white backdrop-blur-md active:scale-95"
        aria-label="Cerrar"
      >
        <X size={20} />
      </button>
      <div className="flex h-full w-full max-w-3xl items-center justify-center">
        {isVideo ? (
          <video
            ref={mediaRef}
            src={mediaUrl}
            controls
            autoPlay
            playsInline
            className="max-h-full w-full rounded-[18px] object-contain"
          />
        ) : (
          <img
            src={mediaUrl}
            onError={(e) => {
              e.currentTarget.src = '/avatar-fallback.png';
            }}
            alt={media.caption || 'Trabajo publicado'}
            className="max-h-full w-full rounded-[18px] object-contain"
          />
        )}
      </div>
    </div>
  );
}

function WorkerProfileSheet({ worker, onClose, onRequest, onMessage }) {
  const [selectedMedia, setSelectedMedia] = useState(null);

  if (!worker) return null;

  const services = splitWorkerServices(worker);
  const online = isOnlineRecent(worker);
  const profileMedia = Array.isArray(worker?.profile_media) && worker.profile_media.length
    ? worker.profile_media
    : [{
        id: worker?.post_id || worker?.media_url || worker?.avatar_url,
        media_url: worker?.media_url || worker?.cover_url || worker?.avatar_url,
        thumbnail_url: worker?.thumbnail_url || worker?.cover_url || worker?.avatar_url,
        media_type: worker?.media_type || 'image',
        caption: worker?.post_description || worker?.caption || '',
      }].filter((item) => item.media_url);
  const followersCount = Number(worker?.followers_count || worker?.followers || worker?.total_followers || 0);
  const likesCount = Number(worker?.likes_count || worker?.like_count || 0);
  const reviewsCount = Number(worker?.total_reviews || worker?.rating_count || 0);

  return (
    <div className="absolute inset-0 z-[65000] bg-slate-950/58 p-3 backdrop-blur-sm sm:p-5">
      <ProfileMediaViewer media={selectedMedia} onClose={() => setSelectedMedia(null)} />
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        className="mx-auto flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-[34px] border border-white/18 bg-[linear-gradient(180deg,#eff6f7_0%,#ffffff_40%,#f8fbfc_100%)] shadow-[0_30px_90px_rgba(15,23,42,0.24)]"
      >
        <div className="relative h-[270px] overflow-hidden bg-slate-900">
          <img
            src={worker?.cover_url || worker?.video_thumb_url || worker?.avatar_url || '/avatar-fallback.png'}
            onError={(e) => {
              e.currentTarget.src = '/avatar-fallback.png';
            }}
            alt={worker?.full_name || 'Trabajador'}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(2,6,23,0.88),rgba(2,6,23,0.12))]" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/16 text-white backdrop-blur-md"
          >
            <X size={18} />
          </button>

          <div className="absolute bottom-5 left-5 right-5">
            <div className="flex items-end gap-4">
              <img
                src={worker?.avatar_url || '/avatar-fallback.png'}
                onError={(e) => {
                  e.currentTarget.src = '/avatar-fallback.png';
                }}
                alt={worker?.full_name || 'Avatar'}
                className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-[0_14px_30px_rgba(15,23,42,0.24)]"
              />
              <div className="pb-2 text-white">
               <div className="text-[28px] font-black leading-none">{worker?.full_name || 'Trabajador'}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/85">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 backdrop-blur-md">
                    <Sparkles size={14} />
                    {serviceLabelForWorker(worker)}
                  </span>
                  {online && (
                    <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-black text-emerald-200">
                      Activo ahora
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Rating</div>
              <div className="mt-2 text-2xl font-black text-slate-900">{workerRatingValue(worker) == null ? 'Nuevo' : workerRatingValue(worker).toFixed(1)}</div>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Reseñas</div>
              <div className="mt-2 text-2xl font-black text-slate-900">{Number(worker?.total_reviews || 0)}</div>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Radio</div>
              <div className="mt-2 text-2xl font-black text-slate-900">{Number(worker?.radius_km || 5)} km</div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-2 rounded-[26px] border border-slate-200 bg-white p-3 text-center shadow-sm">
            <div><div className="text-[18px] font-black text-slate-950">{profileMedia.length}</div><div className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">Posts</div></div>
            <div><div className="text-[18px] font-black text-slate-950">{followersCount}</div><div className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">Seguidores</div></div>
            <div><div className="text-[18px] font-black text-slate-950">{likesCount}</div><div className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">Me encanta</div></div>
            <div><div className="text-[18px] font-black text-slate-950">{workerRatingValue(worker) == null ? '-' : workerRatingValue(worker).toFixed(1)}</div><div className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">{reviewsCount ? 'Rating' : 'Nuevo'}</div></div>
          </div>

          <div className="mt-5">
            <div className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Trabajos publicados</div>
            <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-[18px] bg-slate-100">
              {profileMedia.slice(0, 9).map((item, idx) => (
                <button
                  type="button"
                  key={`${item.id || item.media_url}-${idx}`}
                  onClick={() => setSelectedMedia(item)}
                  className="relative aspect-[3/4] overflow-hidden bg-slate-200 text-left active:scale-[0.99]"
                >
                  {item.media_type === 'video' ? (
                    <video src={item.media_url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  ) : (
                    <img src={item.thumbnail_url || item.media_url} onError={(e) => { e.currentTarget.src = '/avatar-fallback.png'; }} alt={item.caption || 'Trabajo'} className="h-full w-full object-cover" />
                  )}
                  {item.media_type === 'video' && <span className="absolute right-2 top-2 rounded-full bg-black/45 px-2 py-1 text-[10px] font-black text-white">VIDEO</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
           <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Sobre este trabajador</div>
            <p className="mt-3 text-[15px] leading-7 text-slate-600">
            {worker?.bio || 'Perfil listo para mostrar trabajos, fotos, videos y recibir solicitudes directas como trabajador dentro de ManosYA.'}
            </p>
          </div>

          <div className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Servicios</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(services.length ? services : ['Servicio general']).map((item, idx) => (
                <span
                  key={`${item}-${idx}`}
                  className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-bold text-[#0c6b70]"
                >
                  {serviceMetaBySlug(item)?.name || item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onMessage}
              className="flex-1 rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-black text-slate-700"
            >
              Mensaje
            </button>
            <button
              type="button"
              onClick={onRequest}
              className="flex-1 rounded-[22px] bg-gradient-to-r from-[#0c6b70] via-[#62bfb9] to-[#9ee5df] px-5 py-4 text-sm font-black text-white shadow-[0_16px_34px_rgba(98,191,185,0.34)]"
            >
              Solicitar ahora
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
function NearbyMapSheet({ open, workers, center, hasMeCoords, me, selectedWorker, onSelectWorker, onClose, onMessage, onRequest }) {
 const [activeIndex, setActiveIndex] = useState(0);
 const [activeWorker, setActiveWorker] = useState(null);

  const validWorkers = (workers || []).filter((worker) => {
    return Number.isFinite(Number(worker?.lat)) && Number.isFinite(Number(worker?.lng));
  });

  const closeWorkers = validWorkers
  .filter((worker) => Number.isFinite(Number(worker?._distKm)))
  .filter((worker) => Number(worker._distKm) <= 12)
  .slice(0, 14);

const mapWorkers = closeWorkers.length ? closeWorkers : validWorkers.slice(0, 10);
const active =
  activeWorker ||
  selectedWorker ||
  mapWorkers[activeIndex] ||
  mapWorkers[0] ||
  validWorkers[0] ||
  null;

useEffect(() => {
  if (!open) return;

  const selectedId = selectedWorker?.user_id || selectedWorker?.worker_id;
  const selectedInMap = selectedId
    ? mapWorkers.find((worker) => String(worker.user_id || worker.worker_id) === String(selectedId))
    : null;

  const initialWorker = selectedInMap || mapWorkers[activeIndex] || mapWorkers[0] || validWorkers[0] || null;
  setActiveWorker(initialWorker);
}, [open, selectedWorker?.user_id, selectedWorker?.worker_id]);

if (!open) return null;

const fitPoints = [
  ...(hasMeCoords ? [[Number(me.lat), Number(me.lon)]] : []),
  ...mapWorkers.map((worker) => [Number(worker.lat), Number(worker.lng)]),
];
function selectMapWorker(worker) {
  if (!worker) return;

  const workerId = String(worker.user_id || worker.worker_id);
  const nextIndex = mapWorkers.findIndex((item) => String(item.user_id || item.worker_id) === workerId);
  const fallbackIndex = validWorkers.findIndex((item) => String(item.user_id || item.worker_id) === workerId);

  if (nextIndex >= 0) setActiveIndex(nextIndex);
  else if (fallbackIndex >= 0) setActiveIndex(fallbackIndex);

  setActiveWorker(worker);
  onSelectWorker(worker);
}

function goPrevWorker() {
  const list = mapWorkers.length ? mapWorkers : validWorkers;
  if (!list.length) return;
  const current = active
    ? list.findIndex((worker) => String(worker.user_id || worker.worker_id) === String(active.user_id || active.worker_id))
    : activeIndex;
  const safeIndex = current >= 0 ? current : activeIndex;
  const next = safeIndex <= 0 ? list.length - 1 : safeIndex - 1;
  setActiveIndex(next);
  selectMapWorker(list[next]);
}

function goNextWorker() {
  const list = mapWorkers.length ? mapWorkers : validWorkers;
  if (!list.length) return;
  const current = active
    ? list.findIndex((worker) => String(worker.user_id || worker.worker_id) === String(active.user_id || active.worker_id))
    : activeIndex;
  const safeIndex = current >= 0 ? current : activeIndex;
  const next = safeIndex >= list.length - 1 ? 0 : safeIndex + 1;
  setActiveIndex(next);
  selectMapWorker(list[next]);
}
  return (
    <div className="fixed inset-0 z-[66000] bg-slate-950/70 p-3 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 22, scale: 0.98 }}
        className="mx-auto flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-[34px] border border-white/18 bg-[#eef8f7] shadow-[0_30px_90px_rgba(0,0,0,0.32)]"
      >
        <div className="flex items-center justify-between border-b border-white/50 bg-white/70 px-4 py-3 backdrop-blur-xl">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#0c6b70]">
              Cerca tuyo
            </div>
            <div className="text-[20px] font-black text-slate-900">
              Elegí un trabajador cerca
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/8 text-slate-700 active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        <div className="relative flex-1 overflow-hidden bg-white">
          <MapContainer
  center={center}
  zoom={hasMeCoords ? 12 : 11}
  className="h-full w-full"
>
            <TileLayer
  attribution="&copy; CartoDB"
  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
/>
<FitBounds points={fitPoints} />
            {hasMeCoords && (
              <>
                <Marker
                  position={[Number(me.lat), Number(me.lon)]}
                  icon={clientLocationIcon() || undefined}
                />
                <Circle
                  center={[Number(me.lat), Number(me.lon)]}
                  radius={2500}
                  pathOptions={{
                    color: '#62bfb9',
                    fillColor: '#62bfb9',
                    fillOpacity: 0.12,
                  }}
                />
              </>
            )}

           {mapWorkers.map((worker) => (
              <Marker
                key={String(worker.user_id)}
                position={[Number(worker.lat), Number(worker.lng)]}
                icon={avatarIcon(worker.avatar_url, worker) || undefined}
                eventHandlers={{
                  click: () => {
  selectMapWorker(worker);
},
                }}
              />
            ))}
          </MapContainer>

         <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[999] bg-gradient-to-t from-white/82 via-white/20 to-transparent p-4">
  {active && (
    <div className="pointer-events-auto rounded-[30px] border border-white/80 bg-white/96 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={goPrevWorker}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 active:scale-95"
        >
          ←
        </button>

        <img
          src={active?.avatar_url || '/avatar-fallback.png'}
          onError={(e) => {
            e.currentTarget.src = '/avatar-fallback.png';
          }}
          alt={active?.full_name || 'Trabajador'}
          className="h-14 w-14 rounded-2xl object-cover"
        />

        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-black text-slate-900">
            {active?.full_name || 'Trabajador'}
          </div>

          <div className="mt-1 text-[12px] font-extrabold text-[#0c6b70]">
            {active?.full_name || 'El trabajador'} esta aca
            {active?._distKm != null ? `, a ${formatKm(Number(active._distKm))} de ti` : ''}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] font-bold text-slate-500">
            <span>{serviceLabelForWorker(active)}</span>
            {active?._distKm != null && <span>• {formatKm(active._distKm)}</span>}
            <span>• {formatWorkerRatingClean(active)}</span>
          </div>

          <div className="mt-1 text-[10px] font-black text-[#0c6b70]">
            {isOnlineRecent(active) ? 'En línea ahora' : 'Disponible'}
          </div>
        </div>

        <button
          type="button"
          onClick={goNextWorker}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 active:scale-95"
        >
          →
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onMessage(active)}
          className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-[13px] font-black text-slate-700"
        >
          Mensaje
        </button>

        <button
          type="button"
          onClick={() => onRequest(active)}
          className="rounded-[18px] bg-[#62bfb9] px-4 py-3 text-[13px] font-black text-white shadow-[0_12px_28px_rgba(98,191,185,0.35)]"
        >
          Elegir trabajador
        </button>
      </div>
    </div>
  )}
</div>
        </div>
      </motion.div>
    </div>
  );
}
function AllWorkersSheet({ open, workers, workersSheetTitle, onClose, onSelect, onMessage, onRequest }) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[64000] bg-slate-950/48 p-3 backdrop-blur-sm sm:p-5">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="mx-auto flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-[34px] border border-white/20 bg-[linear-gradient(180deg,#eff6f7_0%,#ffffff_40%,#f8fbfc_100%)] shadow-[0_30px_90px_rgba(15,23,42,0.22)]"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Explorar</div>
           <div className="mt-1 text-2xl font-black text-slate-900">
  {workersSheetTitle || 'Todos los trabajadores'}
</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white p-2 text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="space-y-3">
            {(workers || []).map((worker) => (
              <WorkerRow
                key={String(worker.user_id)}
                worker={worker}
                onSelect={() => onSelect(worker)}
                onMessage={() => onMessage(worker)}
                onRequest={() => onRequest(worker)}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
function ClientMessagesSheet({ open, chats, onClose, onOpenChat }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[69000] bg-black/60 p-3 backdrop-blur-sm">
      <motion.div
        initial={{ y: 32, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 32, opacity: 0, scale: 0.98 }}
        className="mx-auto flex h-full w-full max-w-xl flex-col overflow-hidden rounded-[34px] bg-white shadow-[0_30px_90px_rgba(0,0,0,0.35)]"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#0c6b70]">
              Mensajes
            </div>
            <div className="text-xl font-black text-slate-950">
              Tus conversaciones
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!chats?.length ? (
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <MessageCircle className="mx-auto mb-3 text-slate-300" size={36} />
                <div className="text-lg font-black text-slate-900">
                  Todavía no tenés mensajes
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Cuando hables con un trabajador, va a aparecer acá.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => onOpenChat(chat.id)}
                  className="flex w-full items-center gap-3 rounded-[24px] border border-slate-200 bg-white p-3 text-left shadow-sm active:scale-[0.99]"
                >
                  <img
                    src={chat.worker?.avatar_url || '/avatar-fallback.png'}
                    onError={(e) => {
                      e.currentTarget.src = '/avatar-fallback.png';
                    }}
                    alt={chat.worker?.full_name || 'Trabajador'}
                    className="h-14 w-14 rounded-full object-cover"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-black text-slate-900">
                      {chat.worker?.full_name || 'Trabajador'}
                    </div>
                    <div className="mt-1 truncate text-[13px] font-semibold text-slate-500">
  {chat.lastMessage?.text || 'Abrir conversación'}
</div>
                  </div>

                  <MessageCircle size={18} className="text-[#62bfb9]" />
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function CommentNotificationsSheet({ open, notifications, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[69000] bg-black/60 p-3 backdrop-blur-sm">
      <motion.div
        initial={{ y: 32, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 32, opacity: 0, scale: 0.98 }}
        className="mx-auto flex h-full w-full max-w-xl flex-col overflow-hidden rounded-[34px] bg-white shadow-[0_30px_90px_rgba(0,0,0,0.35)]"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#0c6b70]">
              Notificaciones
            </div>
            <div className="text-xl font-black text-slate-950">
              Comentarios
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!notifications?.length ? (
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <Bell className="mx-auto mb-3 text-slate-300" size={36} />
                <div className="text-lg font-black text-slate-900">
                  Sin notificaciones todavía
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Tus comentarios e interacciones van a aparecer acá.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="text-[13px] font-black text-slate-900">
                    Comentaste en una publicación
                  </div>
                  <p className="mt-1 text-[14px] font-semibold leading-5 text-slate-600">
                    {item.comment}
                  </p>
                  <div className="mt-2 text-[11px] font-bold text-slate-400">
                    {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
export default function ClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
const mapRef = useRef(null);
const feedRef = useRef(null);
const sharedWorkerOpenedRef = useRef('');
const [mounted, setMounted] = useState(false);

  const initialServiceFromUrl = normalizeSlug(searchParams?.get('service') || '');
  const initialTimingFromUrl = searchParams?.get('timing') || '';

const [me, setMe] = useState({ id: null, lat: null, lon: null });
const [clientProfile, setClientProfile] = useState(null);
const [workers, setWorkers] = useState([]);
const [supplierProducts, setSupplierProducts] = useState([]);
const [busy, setBusy] = useState(false);
const [selectedService, setSelectedService] = useState(initialServiceFromUrl || '');
const [serviceQuery, setServiceQuery] = useState('');
const [feedMode, setFeedMode] = useState('all');
const [feedSeed, setFeedSeed] = useState(Date.now());
const [feedIndex, setFeedIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showAllWorkers, setShowAllWorkers] = useState(false);
const [workersSheetTitle, setWorkersSheetTitle] = useState('Todos los trabajadores');
const [workersSheetList, setWorkersSheetList] = useState([]);
const [jobId, setJobId] = useState(null);
const [jobStatus, setJobStatus] = useState(null);
const [chatId, setChatId] = useState(null);
const [route, setRoute] = useState(null);
const [etaMinutes, setEtaMinutes] = useState(null);
const [trackingWorker, setTrackingWorker] = useState(null);
const [trackingOpen, setTrackingOpen] = useState(false);
const [nearbyMapOpen, setNearbyMapOpen] = useState(false);
const [commentsOpen, setCommentsOpen] = useState(false);
const [commentsWorker, setCommentsWorker] = useState(null);
const [workerComments, setWorkerComments] = useState([]);
const [commentText, setCommentText] = useState('');
const [messagesOpen, setMessagesOpen] = useState(false);
const [commentNotificationsOpen, setCommentNotificationsOpen] = useState(false);
const [clientChats, setClientChats] = useState([]);
const [commentNotifications, setCommentNotifications] = useState([]);
const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
const [unreadCommentsCount, setUnreadCommentsCount] = useState(0);
const [followedUserIds, setFollowedUserIds] = useState([]);
const [likedWorkerIds, setLikedWorkerIds] = useState([]);
const [nearbyMapWorker, setNearbyMapWorker] = useState(null);
const [isCancelling, setIsCancelling] = useState(false);
const [bookingTime] = useState(initialTimingFromUrl || '');

  const hasMeCoords = Number.isFinite(Number(me?.lat)) && Number.isFinite(Number(me?.lon));

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;

    const setRealVH = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty('--real-vh', `${Math.round(h)}px`);
    };

    setRealVH();
    window.addEventListener('resize', setRealVH);
    window.visualViewport?.addEventListener('resize', setRealVH);

    return () => {
      window.removeEventListener('resize', setRealVH);
      window.visualViewport?.removeEventListener('resize', setRealVH);
    };
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        const uid = data?.user?.id;

        if (error || !uid) {
          router.replace('/auth/login');
          return;
        }

        try {
  localStorage.setItem(LS_APP_ROLE, 'client');
} catch {}

if (alive) setMe((prev) => ({ ...prev, id: uid }));

const { data: profileData, error: profileError } = await supabase
  .from('profiles')
  .select('id, full_name, email, role, avatar_url')
  .eq('id', uid)
  .maybeSingle();

if (!profileError && alive) {
  setClientProfile(profileData || null);
}
      } catch (error) {
        console.warn('No se pudo validar la sesión del cliente', error);
        router.replace('/auth/login');
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

async function loadFollowingIds() {
  if (!me?.id) return;

  const { data, error } = await supabase
    .from('user_friendships')
    .select('addressee_id')
    .eq('requester_id', me.id)
    .eq('status', 'accepted');

  if (error) {
    if (error.code !== 'PGRST205' && error.code !== '42P01') {
      console.error('client following ids error:', error);
    }
    setFollowedUserIds([]);
    return;
  }

  setFollowedUserIds((data || []).map((item) => String(item.addressee_id)));
}

async function loadLikedWorkerIds() {
  if (!me?.id) return;

  const { data, error } = await supabase
    .from('worker_likes')
    .select('worker_id')
    .eq('client_id', me.id);

  if (error) {
    console.error('client liked workers error:', error);
    setLikedWorkerIds([]);
    return;
  }

  setLikedWorkerIds((data || []).map((item) => String(item.worker_id)));
}

useEffect(() => {
  loadFollowingIds();
  loadLikedWorkerIds();
}, [me?.id]);

async function loadSupplierProducts() {
  const { data, error } = await supabase
    .from('supplier_products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(80);

  if (error) {
    if (error.code !== 'PGRST205' && error.code !== '42P01') {
      console.warn('supplier products client error:', error);
    }
    setSupplierProducts([]);
    return;
  }

  setSupplierProducts(data || []);
}

useEffect(() => {
  if (!mounted) return;
  loadSupplierProducts();
}, [mounted]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const cached = (() => {
      try {
        const raw = localStorage.getItem(LAST_GPS_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })();

    if (cached?.lat && cached?.lon) {
      setMe((prev) => ({ ...prev, lat: Number(cached.lat), lon: Number(cached.lon) }));
    }

    const watcher = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        setMe((prev) => ({ ...prev, lat, lon }));

        try {
          localStorage.setItem(
            LAST_GPS_KEY,
            JSON.stringify({ lat, lon, t: Date.now() })
          );
        } catch {}
      },
      (err) => {
        console.warn('GPS client error', err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 12000,
        timeout: 10000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watcher);
    };
  }, []);

async function fetchWorkers(serviceFilter = '') {
  setBusy(true);

  try {
    const { data: workersData, error: workersError } = await supabase
      .from('map_workers_view')
      .select('*');

    if (workersError) throw workersError;

    const { data: postsData, error: postsError } = await supabase
      .from('worker_posts_public')
      .select('*')
      .order('created_at', { ascending: false });

    if (postsError) console.warn('posts public error', postsError);

    const workerIdsFromPosts = [
      ...new Set((postsData || []).map((p) => p.worker_id).filter(Boolean)),
    ];

    const { data: profilesData } = workerIdsFromPosts.length
      ? await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', workerIdsFromPosts)
      : { data: [] };

    const profilesMap = (profilesData || []).reduce((acc, profile) => {
      acc[String(profile.id)] = profile;
      return acc;
    }, {});

    const workersMap = {};

    (workersData || []).forEach((worker) => {
      const id = String(worker.user_id || worker.id || '');
      if (id) workersMap[id] = worker;
    });

    const postsByWorker = {};
    const postsListByWorker = {};

    (postsData || []).forEach((post) => {
      const key = String(post.worker_id || '');
      if (!key) return;
      if (!postsByWorker[key]) postsByWorker[key] = post;
      if (!postsListByWorker[key]) postsListByWorker[key] = [];
      postsListByWorker[key].push(post);
    });

    const allWorkerIds = [
      ...new Set([
        ...Object.keys(workersMap),
        ...Object.keys(postsByWorker),
      ]),
    ];

    const { data: verifiedProfilesData } = allWorkerIds.length
      ? await supabase
          .from('worker_profiles')
          .select('user_id, is_verified, cover_url')
          .in('user_id', allWorkerIds)
      : { data: [] };

    const workerProfileMap = (verifiedProfilesData || []).reduce((acc, item) => {
      acc[String(item.user_id)] = item;
      return acc;
    }, {});
    const verifiedMap = Object.fromEntries(
      Object.entries(workerProfileMap).map(([id, item]) => [id, Boolean(item.is_verified)])
    );

    const reviewStats = await fetchWorkerReviewStats(allWorkerIds);

    const followerCounts = {};
    if (allWorkerIds.length) {
      const { data: followersData, error: followersError } = await supabase
        .from('user_friendships')
        .select('addressee_id')
        .in('addressee_id', allWorkerIds)
        .eq('status', 'accepted');

      if (followersError) {
        console.warn('worker followers count error', followersError);
      } else {
        (followersData || []).forEach((item) => {
          const key = String(item.addressee_id);
          followerCounts[key] = (followerCounts[key] || 0) + 1;
        });
      }
    }

    const likeCounts = {};
    if (allWorkerIds.length) {
      const { data: likesData, error: likesError } = await supabase
        .from('worker_likes')
        .select('worker_id')
        .in('worker_id', allWorkerIds);

      if (likesError) {
        console.warn('worker likes count error', likesError);
      } else {
        (likesData || []).forEach((like) => {
          const key = String(like.worker_id);
          likeCounts[key] = (likeCounts[key] || 0) + 1;
        });
      }
    }

    const normalizedFilter = normalizeSlug(serviceFilter);

    let merged = allWorkerIds.map((workerId) => {
      const worker = workersMap[workerId] || {};
      const post = postsByWorker[workerId] || null;
      const workerPosts = postsListByWorker[workerId] || [];
      const profile = profilesMap[workerId] || {};

      const lat = Number(worker?.lat);
      const lng = Number(worker?.lng ?? worker?.lon ?? worker?.long);

      const distKm =
        hasMeCoords && Number.isFinite(lat) && Number.isFinite(lng)
          ? haversineKm(Number(me.lat), Number(me.lon), lat, lng)
          : null;

      const tokens = splitWorkerServices(worker).map((item) =>
        normalizeSlug(item)
      );

      const mediaUrl =
        post?.media_url ||
        post?.thumbnail_url ||
        workerProfileMap[workerId]?.cover_url ||
        worker?.cover_url ||
        worker?.video_thumb_url ||
        worker?.avatar_url ||
        profile?.avatar_url ||
        '/avatar-fallback.png';

      return {
        ...worker,

        user_id: worker.user_id || workerId,
        id: worker.id || workerId,

        full_name:
          worker.full_name ||
          profile.full_name ||
          'Trabajador ManosYA',

        avatar_url:
          worker.avatar_url ||
          profile.avatar_url ||
          '/avatar-fallback.png',
        is_verified: Boolean(verifiedMap[workerId]),
        avg_rating: reviewStats[workerId]?.avg_rating ?? null,
        rating_avg: reviewStats[workerId]?.avg_rating ?? null,
        total_reviews: reviewStats[workerId]?.total_reviews ?? 0,
        rating_count: reviewStats[workerId]?.total_reviews ?? 0,
        followers_count: Number(followerCounts[workerId] || 0),
        likes_count: Number(likeCounts[workerId] ?? worker.likes_count ?? worker.like_count ?? 0),

        lat,
        lng,
        _distKm: distKm,
        _serviceTokens: tokens,

        post_id: post?.post_id || post?.id || null,
        post_created_at: post?.created_at || null,

        media_url: mediaUrl,
        cover_url: workerProfileMap[workerId]?.cover_url || mediaUrl,
        thumbnail_url: post?.thumbnail_url || mediaUrl,
        profile_media: workerPosts.map((item) => ({
          id: item.post_id || item.id || item.media_url,
          media_url: item.media_url || item.thumbnail_url,
          thumbnail_url: item.thumbnail_url || item.media_url,
          media_type: String(item.media_type || '').toLowerCase() === 'video' ? 'video' : 'image',
          caption: item.caption || item.text_overlay || '',
        })).filter((item) => item.media_url),

        media_type:
          String(post?.media_type || '').toLowerCase() === 'video'
            ? 'video'
            : 'image',

        post_description:
          post?.caption ||
          post?.text_overlay ||
          worker?.bio ||
          'Trabajador disponible en ManosYA.',
      };
    });

    if (normalizedFilter) {
      merged = merged.filter((w) =>
        (w._serviceTokens || []).some((token) => {
          if (token === normalizedFilter) return true;
          if (token.includes(normalizedFilter)) return true;
          if (normalizedFilter.includes(token)) return true;
          return false;
        })
      );
    }

    merged.sort((a, b) => {
      const aHasPost = Boolean(a.post_id);
      const bHasPost = Boolean(b.post_id);
      if (aHasPost !== bHasPost) return aHasPost ? -1 : 1;

      const aPostTime = new Date(a.post_created_at || 0).getTime();
      const bPostTime = new Date(b.post_created_at || 0).getTime();
      if (aPostTime !== bPostTime) return bPostTime - aPostTime;

      const aOnline = isOnlineRecent(a);
      const bOnline = isOnlineRecent(b);
      if (aOnline !== bOnline) return aOnline ? -1 : 1;

      return Number(b?.avg_rating || 0) - Number(a?.avg_rating || 0);
    });

    console.log('CLIENT FEED MERGED', merged);

    setWorkers(merged);
    setFeedIndex(0);
  } catch (error) {
    console.error(error);
    toast.error('No pudimos cargar trabajadores');
  } finally {
    setBusy(false);
  }
}

 useEffect(() => {
  if (!mounted) return;

  if (feedMode === 'all') {
    fetchWorkers('');
    return;
  }

  fetchWorkers(selectedService);
}, [mounted, selectedService, hasMeCoords, feedMode]);
useEffect(() => {
  if (!me?.id) return;

  let mounted = true;

  const safeRefresh = async () => {
    if (!mounted) return;

    try {
      await refreshClientBadges();
    } catch (err) {
      console.warn('refreshClientBadges error', err);
    }
  };

  safeRefresh();

  const channel = supabase
    .channel(`client-notifications-${me.id}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
      },
      async () => {
        await safeRefresh();
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'worker_comments',
        filter: `client_id=eq.${me.id}`,
      },
      async () => {
        await safeRefresh();
      }
    )
    .subscribe((status) => {
      console.log('client notification channel:', status);
    });

  return () => {
    mounted = false;
    supabase.removeChannel(channel);
  };
}, [me?.id]);
  const filteredServices = useMemo(() => {
    const q = normalizeText(serviceQuery);
    if (!q) return SERVICE_CATALOG;
    return SERVICE_CATALOG.filter((item) => {
      return normalizeText(item.name).includes(q) || normalizeText(item.slug).includes(q);
    });
  }, [serviceQuery]);

const feedWorkers = useMemo(() => {
  const base = Array.isArray(workers) ? workers : [];
  const q = normalizeText(serviceQuery);

  if (q) {
    return base
      .map((worker) => ({
        ...worker,
        _searchScore: workerSearchScore(worker, q),
      }))
      .filter((worker) => worker._searchScore > 0)
      .sort((a, b) => {
        if (b._searchScore !== a._searchScore) return b._searchScore - a._searchScore;
        if (a._distKm != null && b._distKm != null) return a._distKm - b._distKm;
        return Number(b?.avg_rating || 0) - Number(a?.avg_rating || 0);
      })
      .slice(0, 60);
  }

  if (feedMode === 'near') {
    const nearby = base
      .filter((worker) => Number.isFinite(Number(worker?._distKm)))
      .filter((worker) => Number(worker._distKm) <= 15)
      .sort((a, b) => Number(a._distKm) - Number(b._distKm));

    const topNear = nearby.slice(0, 6);
    const restNear = shuffleBySeed(nearby.slice(6), feedSeed);

    return [...topNear, ...restNear].slice(0, 24);
  }

  const online = base.filter((worker) => isOnlineRecent(worker));
  const offline = base.filter((worker) => !isOnlineRecent(worker));

  return [
    ...shuffleBySeed(online, feedSeed),
    ...shuffleBySeed(offline, feedSeed + 77),
  ].slice(0, 60);
}, [workers, feedMode, feedSeed, serviceQuery]);

const currentWorker = feedWorkers[feedIndex] || null;

useEffect(() => {
  if (!feedWorkers.length) return;

  const mediaUrls = collectWorkerMediaUrls(feedWorkers, {
    limit: 12,
    minVideos: 3,
    minImages: 4,
  });
  const scheduleCache = window.requestIdleCallback || ((callback) => setTimeout(callback, 900));
  const cancelSchedule = window.cancelIdleCallback || clearTimeout;
  const handle = scheduleCache(() => {
    cacheMediaUrls(mediaUrls, 'manosya-client-feed-media-v1');
  });

  return () => cancelSchedule(handle);
}, [feedWorkers]);

const productsForWorker = (worker) => {
  const tokens = worker?._serviceTokens?.length
    ? worker._serviceTokens
    : splitWorkerServices(worker).map((item) => normalizeSlug(item));
  return (supplierProducts || []).filter((product) => {
    const slug = normalizeSlug(product.service_slug || '');
    if (!slug) return false;
    return tokens.some((token) => token === slug || token.includes(slug) || slug.includes(token));
  });
};
const nearbyWorkers = useMemo(() => {
  return (workers || [])
    .filter((worker) => Number.isFinite(Number(worker?._distKm)))
    .sort((a, b) => Number(a._distKm) - Number(b._distKm));
}, [workers]);
  useEffect(() => {
    if (currentWorker) setSelected(currentWorker);
  }, [currentWorker]);

  useEffect(() => {
    const workerId = String(searchParams?.get('worker') || '');
    if (!workerId || sharedWorkerOpenedRef.current === workerId || !feedWorkers.length) return;

    const idx = feedWorkers.findIndex((worker) => (
      String(worker?.user_id || worker?.worker_id || worker?.id || '') === workerId
    ));
    if (idx < 0) return;

    sharedWorkerOpenedRef.current = workerId;
    setFeedIndex(idx);
    setSelected(feedWorkers[idx]);
    setShowProfile(true);
    setTimeout(() => {
      const el = feedRef.current;
      if (!el) return;
      el.scrollTo({ top: idx * Math.max(1, el.clientHeight - 74), behavior: 'smooth' });
    }, 120);
  }, [feedWorkers, searchParams]);

  async function openProfile(worker) {
    setSelected(worker);
    setShowProfile(true);
  }
async function openComments(worker) {
  setCommentsWorker(worker);
  setCommentsOpen(true);

  const { data } = await supabase
  .from('worker_comments')
  .select('*')
  .eq('worker_id', worker.user_id)
  .order('created_at', { ascending: false });

  setWorkerComments(data || []);
}
async function sendPublicComment() {
  if (!commentsWorker || !commentText.trim()) return;

  const workerId = commentsWorker.user_id;

  const payload = {
    worker_id: workerId,
    client_id: me.id,
    client_name: clientProfile?.full_name || 'Cliente',
    client_avatar: clientProfile?.avatar_url || '',
    comment: commentText.trim(),
  };

  const { error } = await supabase.from('worker_comments').insert([payload]);

  if (error) {
    console.error('comment insert error', error);
    toast.error(error.message || 'No se pudo comentar');
    return;
  }

  setWorkers((prev) =>
    prev.map((w) =>
      String(w.user_id) === String(workerId)
        ? { ...w, comments_count: Number(w.comments_count || 0) + 1 }
        : w
    )
  );

  setCommentText('');
  openComments(commentsWorker);
}

async function addFriend(worker) {
  const targetId = worker?.user_id || worker?.worker_id;
  if (!targetId || !me?.id) return;

  if (String(targetId) === String(me.id)) {
    toast.message('Ese es tu propio perfil');
    return;
  }

  try {
    let result = null;
    const { data, error } = await supabase.rpc('request_friend', {
      addressee: targetId,
    });

    if (error) {
      if (error.code !== 'PGRST202') throw error;
      result = await requestFriendViaTable(targetId);
      setFollowedUserIds((prev) => (
        prev.includes(String(targetId)) ? prev : [...prev, String(targetId)]
      ));
    } else {
      result = data;
      setFollowedUserIds((prev) => (
        prev.includes(String(targetId)) ? prev : [...prev, String(targetId)]
      ));
    }

    if (result === 'accepted') toast.success('Ahora seguís a este trabajador');
    else toast.message('Ya seguís a este trabajador');
  } catch (error) {
    console.error('friend request error:', error);
    const missingSchema = error?.code === 'PGRST205' || error?.code === '42P01';
    toast.error(
      missingSchema
        ? 'Falta aplicar la migración social en Supabase'
        : error.message || 'No pudimos agregar amigo'
    );
  }
}

async function requestFriendViaTable(targetId) {
  const { data: direct, error: directError } = await supabase
    .from('user_friendships')
    .select('id, status')
    .eq('requester_id', me.id)
    .eq('addressee_id', targetId)
    .maybeSingle();

  if (directError) throw directError;
  if (direct?.id) return direct.status;

  const { data: reverse, error: reverseError } = await supabase
    .from('user_friendships')
    .select('id, status')
    .eq('requester_id', targetId)
    .eq('addressee_id', me.id)
    .maybeSingle();

  if (reverseError) throw reverseError;

  if (reverse?.id) {
    const { error: updateError } = await supabase
      .from('user_friendships')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', reverse.id);

    if (updateError) throw updateError;
    return 'accepted';
  }

  const { error: insertError } = await supabase.from('user_friendships').insert([
    {
      requester_id: me.id,
      addressee_id: targetId,
      status: 'accepted',
    },
  ]);

  if (insertError) throw insertError;
  return 'accepted';
}

async function toggleWorkerLike(worker) {
  if (!worker?.user_id || !me?.id) return;

  const workerId = worker.user_id;

  const { data: existing } = await supabase
    .from('worker_likes')
    .select('id')
    .eq('worker_id', workerId)
    .eq('client_id', me.id)
    .maybeSingle();

  if (existing?.id) {
    await supabase.from('worker_likes').delete().eq('id', existing.id);
    setLikedWorkerIds((prev) => prev.filter((id) => id !== String(workerId)));

    setWorkers((prev) =>
      prev.map((w) =>
        String(w.user_id) === String(workerId)
          ? { ...w, likes_count: Math.max(0, Number(w.likes_count || 0) - 1) }
          : w
      )
    );

    toast.success('Quitaste el me gusta');
    return;
  }

  const { error } = await supabase.from('worker_likes').insert([
    {
      worker_id: workerId,
      client_id: me.id,
    },
  ]);

  if (error) {
    toast.error(error.message || 'No se pudo guardar el me gusta');
    return;
  }

  setLikedWorkerIds((prev) => (
    prev.includes(String(workerId)) ? prev : [...prev, String(workerId)]
  ));

  setWorkers((prev) =>
    prev.map((w) =>
      String(w.user_id) === String(workerId)
        ? { ...w, likes_count: Number(w.likes_count || 0) + 1 }
        : w
    )
  );

  toast.success('Te gustó este trabajador');
}
async function openClientMessages() {
  if (!me?.id) return;

  const { data: chatsRaw, error: chatsError } = await supabase
    .from('chats')
    .select('id, worker_id, created_at')
    .eq('client_id', me.id)
    .order('created_at', { ascending: false });

  if (chatsError) {
    console.error('client chats error', chatsError);
    toast.error('No pudimos cargar tus mensajes');
    return;
  }

  const chatIds = (chatsRaw || []).map((c) => c.id);

  let messagesRaw = [];
  if (chatIds.length) {
    const { data: msgs } = await supabase
  .from('messages')
  .select('id, chat_id, text, content, created_at, sender_id')
  .in('chat_id', chatIds)
  .order('created_at', { ascending: false });

messagesRaw = (msgs || []).map((m) => ({
  ...m,
  text: m.text || m.content || '',
}));
  }

  const workerIds = [
    ...new Set((chatsRaw || []).map((chat) => chat.worker_id).filter(Boolean)),
  ];

  let profilesMap = {};

  if (workerIds.length) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', workerIds);

    profilesMap = (profiles || []).reduce((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {});
  }

  const enriched = (chatsRaw || []).map((chat) => {
    const sortedMessages = messagesRaw.filter(
      (m) => String(m.chat_id) === String(chat.id)
    );

    return {
      ...chat,
      worker: profilesMap[chat.worker_id] || null,
      lastMessage: sortedMessages[0] || null,
    };
  });

  localStorage.setItem('manosya_client_messages_seen_at', String(Date.now()));
  setUnreadMessagesCount(0);
  setClientChats(enriched);
  setMessagesOpen(true);
}
async function refreshClientBadges() {
  if (!me?.id) return;

  try {
    const lastMessagesOpen = Number(localStorage.getItem('manosya_client_messages_seen_at') || 0);
    const lastCommentsOpen = Number(localStorage.getItem('manosya_client_comments_seen_at') || 0);

    const { data: chatsRaw } = await supabase
      .from('chats')
      .select('id')
      .eq('client_id', me.id);

    const chatIds = (chatsRaw || []).map((c) => c.id);

    let messagesRaw = [];
    if (chatIds.length) {
      const { data: msgs } = await supabase
        .from('messages')
        .select('id, chat_id, created_at, sender_id')
        .in('chat_id', chatIds);

      messagesRaw = msgs || [];
    }

    const unreadMessages = messagesRaw.filter((msg) => {
      return (
        msg.sender_id !== me.id &&
        new Date(msg.created_at).getTime() > lastMessagesOpen
      );
    }).length;

    const { data: commentsData } = await supabase
      .from('worker_comments')
      .select('id, created_at')
      .eq('client_id', me.id);

    const unreadComments = (commentsData || []).filter((item) => {
      return new Date(item.created_at).getTime() > lastCommentsOpen;
    }).length;

    setUnreadMessagesCount(unreadMessages);
    setUnreadCommentsCount(unreadComments);
  } catch (error) {
    console.warn('badge refresh error', error);
  }
}
async function openCommentNotifications() {
  if (!me?.id) return;

  const { data, error } = await supabase
    .from('worker_comments')
    .select('*')
    .eq('client_id', me.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('comment notifications error', error);
    toast.error('No pudimos cargar notificaciones');
    return;
  }

  localStorage.setItem('manosya_client_comments_seen_at', String(Date.now()));
  setUnreadCommentsCount(0);
  setCommentNotifications(data || []);
  setCommentNotificationsOpen(true);
}
async function openMessage(worker, presetMessage = '') {
  const target = worker || selected || currentWorker;
  if (!target || !me?.id) return;

  try {
    const workerId = String(target.user_id);

    const chosenService =
      selectedService ||
      normalizeSlug(splitWorkerServices(target)[0] || target?.service_type || '');

    const serviceLabel =
      serviceMetaBySlug(chosenService)?.name || serviceLabelForWorker(target);

    const messageText =
      presetMessage?.trim() ||
      `Hola ${target.full_name || ''}, ¿estás disponible para ${String(serviceLabel).toLowerCase()}?`;

    const { data: activeJob, error: activeJobError } = await supabase
      .from('jobs')
      .select('id, status')
      .eq('client_id', me.id)
      .eq('worker_id', workerId)
      .in('status', ['open', 'accepted', 'assigned', 'scheduled'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeJobError) throw activeJobError;

    let jobId = activeJob?.id || null;

    if (!jobId) {
      const { data: newJob, error: jobError } = await supabase
        .from('jobs')
        .insert([
          {
            client_id: me.id,
            worker_id: workerId,
            service_type: chosenService || null,
            status: 'open',
            description: `Servicio: ${serviceLabel} · Consulta desde feed cliente`,
          },
        ])
        .select('id, status')
        .single();

      if (jobError) throw jobError;
      jobId = newJob.id;
    }

    const { data: existingChat, error: existingChatError } = await supabase
      .from('chats')
      .select('id, job_id')
      .eq('client_id', me.id)
      .eq('worker_id', workerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingChatError) throw existingChatError;

    let nextChatId = existingChat?.id || null;

    if (nextChatId) {
      await supabase
        .from('chats')
        .update({ job_id: jobId })
        .eq('id', nextChatId);
    } else {
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert([
          {
            job_id: jobId,
            client_id: me.id,
            worker_id: workerId,
          },
        ])
        .select('id')
        .single();

      if (chatError) throw chatError;
      nextChatId = newChat.id;
    }

    const { error: messageError } = await supabase.from('messages').insert([
      {
        chat_id: nextChatId,
        sender_id: me.id,
        text: messageText,
      },
    ]);

    if (messageError) throw messageError;

    setJobId(jobId);
    setChatId(nextChatId);

    toast.success('Mensaje enviado al trabajador');
    router.push(`/client/chat/${nextChatId}`);
  } catch (error) {
    console.error('openMessage error', error);
    toast.error(error?.message || 'No pudimos enviar el mensaje');
  }
}
 async function requestWorker(worker) {
  const activeWorker = worker || selected || currentWorker;
  if (!activeWorker || !me?.id) return;

  try {
    const workerId = String(activeWorker.user_id);

    const chosenService =
      selectedService ||
      normalizeSlug(splitWorkerServices(activeWorker)[0] || activeWorker?.service_type || '');

    const serviceLabel =
      serviceMetaBySlug(chosenService)?.name || serviceLabelForWorker(activeWorker);

    const descriptionParts = [`Servicio: ${serviceLabel}`];
    if (bookingTime) descriptionParts.push(`Hora solicitada: ${bookingTime}`);
    descriptionParts.push('Solicitado desde feed cliente');

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert([
        {
          client_id: me.id,
          worker_id: workerId,
          service_type: chosenService || null,
          status: 'open',
          description: descriptionParts.join(' · '),
        },
      ])
      .select('*')
      .single();

    if (jobError) throw jobError;

    const { data: existingChat, error: existingChatError } = await supabase
      .from('chats')
      .select('id, job_id')
      .eq('client_id', me.id)
      .eq('worker_id', workerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingChatError) throw existingChatError;

    let nextChatId = existingChat?.id || null;

    if (nextChatId) {
      await supabase
        .from('chats')
        .update({ job_id: job.id })
        .eq('id', nextChatId);
    } else {
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert([
          {
            job_id: job.id,
            client_id: me.id,
            worker_id: workerId,
          },
        ])
        .select('id')
        .single();

      if (chatError) throw chatError;
      nextChatId = chat?.id || null;
    }

    setJobId(job.id);
    setJobStatus(job.status);
    setChatId(nextChatId);
    setTrackingWorker(activeWorker);
    setTrackingOpen(true);
    setShowProfile(false);
    setShowAllWorkers(false);

    if (hasMeCoords) {
      const routeData = await fetchRoadRoute(
        Number(me.lat),
        Number(me.lon),
        Number(activeWorker.lat),
        Number(activeWorker.lng)
      );

      if (routeData?.route?.length) {
        setRoute(routeData.route);
        setEtaMinutes(routeData.durationMin);
      } else {
        setRoute([
          [Number(me.lat), Number(me.lon)],
          [Number(activeWorker.lat), Number(activeWorker.lng)],
        ]);
      }
    }

    try {
      localStorage.setItem(
        'activeJobChat',
        JSON.stringify({
          jid: job.id,
          jstatus: job.status,
          cid: nextChatId,
          selectedWorker: activeWorker,
        })
      );
    } catch {}

    toast.success('Solicitud enviada. Chat conectado con el trabajador.');
  } catch (error) {
    console.error(error);
    toast.error('No pudimos crear la solicitud');
  }
}
async function cancelActiveJob() {
  if (!jobId) {
    toast.error('No hay pedido activo para cancelar');
    return;
  }

  try {
    setIsCancelling(true);

    const { error } = await supabase.rpc('cancel_job', {
      job_id: jobId,
    });

    if (error) throw error;

    setJobStatus('cancelled');
    setTrackingOpen(false);
    setRoute(null);
    setEtaMinutes(null);
    setTrackingWorker(null);
    setChatId(null);
    setJobId(null);

    try {
      localStorage.removeItem('activeJobChat');
    } catch {}

    toast.success('Pedido cancelado');
  } catch (error) {
    console.error(error);
    toast.error(error?.message || 'No pudimos cancelar el pedido');
  } finally {
    setIsCancelling(false);
  }
}
  const mapCenter = useMemo(() => {
    if (hasMeCoords) return [Number(me.lat), Number(me.lon)];
    return HOME_VIEW.center;
  }, [hasMeCoords, me?.lat, me?.lon]);

  return (
   <div className="relative h-[var(--real-vh,100dvh)] overflow-hidden bg-black text-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-black" />

    <div className="relative z-10 mx-auto h-[var(--real-vh,100dvh)] w-full max-w-6xl overflow-hidden px-0">
  <div className="relative h-full">
    <div className="relative z-10 h-full">
          <div className="pointer-events-auto absolute left-0 right-0 top-0 z-40 px-4 pt-[calc(env(safe-area-inset-top)+10px)] text-white">
  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={() => {
        setFeedMode('all');
        setSelectedService('');
        setServiceQuery('');
      }}
      className="flex shrink-0 items-center text-[20px] font-black tracking-[-0.04em] text-white drop-shadow-[0_3px_8px_rgba(0,0,0,0.45)]"
    >
      ManosYA
    </button>

    <div className="relative min-w-0 flex-1 rounded-full border border-white/25 bg-black/18 shadow-[0_10px_24px_rgba(0,0,0,0.20)] backdrop-blur-xl">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/60"
        size={15}
      />

      <input
        value={serviceQuery}
        onChange={(e) => {
          const value = e.target.value;
          setServiceQuery(value);

          const normalizedValue = normalizeSlug(value);
          const matchedService = SERVICE_CATALOG.find((service) => {
            const slug = normalizeSlug(service.slug);
            const name = normalizeSlug(service.name);
            return (
              slug.includes(normalizedValue) ||
              name.includes(normalizedValue) ||
              normalizedValue.includes(slug)
            );
          });

          setSelectedService(matchedService ? matchedService.slug : '');
        }}
        placeholder="Buscar..."
        className="h-9 w-full rounded-full bg-transparent pl-8 pr-8 text-[12px] font-bold text-white placeholder:text-white/60 outline-none"
      />

      {serviceQuery && (
        <button
          type="button"
          onClick={() => {
            setServiceQuery('');
            setSelectedService('');
          }}
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white/14 text-white/80 active:scale-95"
        >
          <X size={14} />
        </button>
      )}
    </div>

    <button
      type="button"
      onClick={openCommentNotifications}
      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/28 text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)] backdrop-blur-xl active:scale-95"
    >
      <Bell size={18} />

      {unreadCommentsCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#62bfb9] px-1 text-[10px] font-black text-white shadow-[0_8px_18px_rgba(98,191,185,0.45)]">
          {unreadCommentsCount > 9 ? '9+' : unreadCommentsCount}
        </span>
      )}
    </button>
  </div>

  <div className="mt-3 flex justify-center">
    <div className="relative inline-flex items-center rounded-full bg-white/20 p-1 shadow-lg backdrop-blur-md">
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="absolute bottom-1 top-1 w-1/2 rounded-full bg-white"
        style={{
          left: feedMode === 'all' ? '4px' : 'calc(50% + 2px)',
        }}
      />

      <button
        type="button"
        onClick={() => {
          setFeedMode('all');
          setSelectedService('');
          setServiceQuery('');
          setFeedSeed(Date.now() + Math.random());
          setFeedIndex(0);
          setSelected(null);
          setNearbyMapWorker(null);
          fetchWorkers('');
          feedRef.current?.scrollTo({ top: 0, behavior: 'auto' });
        }}
        className={`relative z-10 rounded-full px-8 py-2 text-[12px] font-black transition ${
          feedMode === 'all' ? 'text-black' : 'text-white'
        }`}
      >
        Todos
      </button>

      <button
        type="button"
        onClick={() => {
          setFeedMode('near');
          setFeedSeed(Date.now() + Math.random());
          setFeedIndex(0);
          setSelected(null);
          setNearbyMapWorker(null);
          feedRef.current?.scrollTo({ top: 0, behavior: 'auto' });
        }}
        className={`relative z-10 rounded-full px-8 py-2 text-[12px] font-black transition ${
          feedMode === 'near' ? 'text-black' : 'text-white'
        }`}
      >
        Cerca tuyo
      </button>
    </div>
  </div>
</div>
            {!trackingOpen ? (
              <div className="h-full">
                {busy ? (
                 <div className="flex min-h-[calc(var(--real-vh,100dvh)-220px)] items-center justify-center rounded-[28px] bg-[#163943]/82 text-white backdrop-blur-xl">
                    <div className="text-center">
                     <div className="text-xl font-black">Cargando trabajadores</div>
                      <div className="mt-2 text-sm text-white/70">Estamos ordenando lo mejor para vos.</div>
                    </div>
                  </div>
                ) : !feedWorkers.length ? (
                  <div className="flex min-h-[calc(var(--real-vh,100dvh)-270px)] items-center justify-center rounded-[32px] border border-white/20 bg-[#081924]/72 text-white backdrop-blur-xl">
                    <div className="text-center">
                      <Compass className="mx-auto mb-3 text-white/70" size={28} />
                     <div className="text-xl font-black">No encontramos trabajadores</div>
                      <div className="mt-2 text-sm text-white/70">Probá cambiar el servicio o revisar tu zona.</div>
                    </div>
                  </div>
                ) : (
             <div
  key={`${feedMode}-${feedSeed}-${selectedService || 'todos'}`}
  ref={feedRef}
  onScroll={(e) => {
    const el = e.currentTarget;
    const cardHeight = Math.max(1, el.clientHeight - 74);
    const nextIndex = Math.round(el.scrollTop / cardHeight);

    if (nextIndex !== feedIndex && feedWorkers[nextIndex]) {
      setFeedIndex(nextIndex);
      setSelected(feedWorkers[nextIndex]);
    }
  }}
  className="h-[calc(var(--real-vh,100dvh)-0px)] overflow-y-auto snap-y snap-mandatory pb-[74px]"
>
  {feedWorkers.map((worker, idx) => (
  <div key={String(worker.user_id)} className="h-[calc(var(--real-vh,100dvh)-74px)] snap-start">
      <FeedCard
  worker={worker}
  products={productsForWorker(worker)}
  isActive={idx === feedIndex}
  isFollowed={followedUserIds.includes(String(worker.user_id || worker.worker_id))}
  isLiked={likedWorkerIds.includes(String(worker.user_id || worker.worker_id))}
  onOpen={() => openProfile(worker)}
  onAddFriend={() => addFriend(worker)}
  onComments={() => openComments(worker)}
  onMessage={() => openMessage(worker)}
  onRequest={() => requestWorker(worker)}
  onLike={() => toggleWorkerLike(worker)}
  onNearbyMap={() => {
    setNearbyMapWorker(worker);
    setNearbyMapOpen(true);
  }}
/>

    
    </div>
  ))}
</div>
                )}
              </div>
            ) : (
              <div className="overflow-hidden rounded-[28px] bg-[#163943]/82 backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-white">
                  <div className="min-w-0">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-200">Tracking</div>
                    <div className="mt-1 text-lg font-black">
  {trackingWorker?.full_name || 'Trabajador en camino'}
</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
  setTrackingOpen(false);
  setRoute(null);
  setEtaMinutes(null);
  setTrackingWorker(null);
}}
                    className="rounded-full border border-white/14 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white/90"
                  >
                    Volver
                  </button>
                </div>

                <div className="grid gap-0 md:grid-cols-[1.45fr_0.95fr]">
                  <div className="relative h-[320px] md:h-[calc(var(--real-vh,100dvh)-350px)]">
                    <MapContainer
                      center={mapCenter}
                      zoom={hasMeCoords ? 14 : HOME_VIEW.zoom}
                      className="h-full w-full"
                      whenReady={() => {
                        setTimeout(() => mapRef.current?.invalidateSize?.(), 250);
                      }}
                      ref={mapRef}
                    >
                      <TileLayer
                        attribution='&copy; OpenStreetMap'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />

                      {hasMeCoords && (
                        <>
                          <Marker
                            position={[Number(me.lat), Number(me.lon)]}
                            icon={clientLocationIcon() || undefined}
                          />
                          <Circle
                            center={[Number(me.lat), Number(me.lon)]}
                            radius={120}
                            pathOptions={{ color: '#16a3a8', fillColor: '#16a3a8', fillOpacity: 0.12 }}
                          />
                        </>
                      )}

                      {trackingWorker && Number.isFinite(Number(trackingWorker.lat)) && Number.isFinite(Number(trackingWorker.lng)) && (
                        <Marker
                          position={[Number(trackingWorker.lat), Number(trackingWorker.lng)]}
                          icon={avatarIcon(trackingWorker.avatar_url, trackingWorker) || undefined}
                        />
                      )}

                      {Array.isArray(route) && route.length > 1 && (
                        <Polyline
                          positions={route}
                          pathOptions={{ color: '#0ea5a4', weight: 5, opacity: 0.92 }}
                        />
                      )}
                    </MapContainer>
                  </div>

                  <div className="overflow-y-auto p-4 sm:p-5">
                    <div className="rounded-[28px] border border-white/12 bg-white/10 p-5 text-white shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
                      <div className="flex items-center gap-3">
                        <img
                          src={trackingWorker?.avatar_url || '/avatar-fallback.png'}
                          onError={(e) => {
                            e.currentTarget.src = '/avatar-fallback.png';
                          }}
                         alt={trackingWorker?.full_name || 'Trabajador'}
                          className="h-16 w-16 rounded-full border-2 border-white object-cover"
                        />
                        <div className="min-w-0">
                          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-200">Solicitud activa</div>
                          <div className="mt-1 text-xl font-black leading-none">{trackingWorker?.full_name || 'Trabajador'}</div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/80">
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1">
                              <Sparkles size={13} />
                              {serviceLabelForWorker(trackingWorker)}
                            </span>
                            {etaMinutes != null && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1">
                                <Clock3 size={13} />
                                ETA {etaMinutes} min
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[20px] border border-white/10 bg-slate-950/20 p-4">
                          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-white/55">Pedido</div>
                          <div className="mt-2 text-base font-black">{jobId ? `#${String(jobId).slice(0, 8)}` : 'Creado'}</div>
                          <div className="mt-1 text-sm text-white/70">{jobStatus || 'open'}</div>
                        </div>
                        <div className="rounded-[20px] border border-white/10 bg-slate-950/20 p-4">
                          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-white/55">Chat</div>
                          <div className="mt-2 text-base font-black">{chatId ? 'Listo' : 'Pendiente'}</div>
                          <div className="mt-1 text-sm text-white/70">Mensajería directa</div>
                        </div>
                      </div>

                     <div className="mt-5 space-y-3">
  <button
    type="button"
    onClick={() => openMessage(trackingWorker || selected || currentWorker)}
    className="w-full rounded-[20px] border border-white/12 bg-white/10 px-4 py-4 text-sm font-black text-white"
  >
    Abrir chat
  </button>

  {(jobStatus === 'open' || jobStatus === 'accepted' || jobStatus === 'assigned') && (
    <button
      type="button"
      onClick={cancelActiveJob}
      disabled={isCancelling}
      className="w-full rounded-[20px] border border-red-300/30 bg-red-500/15 px-4 py-4 text-sm font-black text-red-50 disabled:opacity-60"
    >
      {isCancelling ? 'Cancelando...' : 'Cancelar pedido'}
    </button>
  )}

  <button
    type="button"
    onClick={() => router.push('/client/jobs')}
   className="w-full rounded-[20px] bg-gradient-to-r from-[#0c6b70] via-[#62bfb9] to-[#9ee5df] px-4 py-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(98,191,185,0.30)]"
  >
    Ver pedido
  </button>


  <div className="rounded-[20px] border border-emerald-200/30 bg-emerald-500/10 p-4 text-sm text-emerald-50">
    <div className="flex items-start gap-2">
      <ShieldCheck size={16} className="mt-0.5 shrink-0" />
      <div>
        Primero elegís al trabajador. Después chateás, solicitás y recién ahí seguís todo en el mapa.
      </div>
    </div>
  </div>
</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
<div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-50 h-[74px] border-t border-white/10 bg-black/86 px-5 pb-[env(safe-area-inset-bottom)] pt-2 text-white backdrop-blur-xl">
  <div className="grid h-full grid-cols-4 items-center text-center text-[11px] font-bold">
    <button
      type="button"
      onClick={() => router.push('/role-selector')}
      className="flex flex-col items-center justify-center gap-1 active:scale-95"
    >
      <PanelTop size={24} strokeWidth={2.4} />
      Modos
    </button>

    <button
      type="button"
      onClick={() => router.push('/client/jobs')}
      className="flex flex-col items-center justify-center gap-1 active:scale-95"
    >
      <Briefcase size={24} />
      Pedidos
    </button>

    <button
      type="button"
      onClick={openClientMessages}
      className="relative flex flex-col items-center justify-center gap-1 active:scale-95"
    >
      <MessageCircle size={24} />
      Mensajes
    </button>

    <button
      type="button"
      onClick={() => router.push('/client/profile')}
      className="flex flex-col items-center justify-center gap-1 active:scale-95"
    >
      <img
        src={clientProfile?.avatar_url || '/avatar-fallback.png'}
        onError={(e) => {
          e.currentTarget.src = '/avatar-fallback.png';
        }}
        alt={clientProfile?.full_name || 'Mi perfil'}
        className="h-8 w-8 rounded-full border border-white object-cover"
      />
      Tú
    </button>
  </div>
</div>

{mounted &&
  createPortal(
    <AnimatePresence>
      {commentsOpen && (
        <CommentsSheet
          open={commentsOpen}
          worker={commentsWorker}
          comments={workerComments}
          commentText={commentText}
          setCommentText={setCommentText}
          onClose={() => {
            setCommentsOpen(false);
            setCommentsWorker(null);
            setWorkerComments([]);
            setCommentText('');
          }}
          onSend={sendPublicComment}
        />
      )}
    </AnimatePresence>,
    document.body
  )}

{mounted &&
  createPortal(
    <AnimatePresence>
      {nearbyMapOpen && (
        <NearbyMapSheet
          open={nearbyMapOpen}
          workers={nearbyWorkers.length ? nearbyWorkers.slice(0, 30) : workers.slice(0, 30)}
          center={mapCenter}
          hasMeCoords={hasMeCoords}
          me={me}
          selectedWorker={nearbyMapWorker}
          onSelectWorker={(worker) => setNearbyMapWorker(worker)}
          onClose={() => setNearbyMapOpen(false)}
          onMessage={(worker) => openMessage(worker)}
          onRequest={(worker) => {
            setNearbyMapOpen(false);
            requestWorker(worker);
          }}
        />
      )}
    </AnimatePresence>,
    document.body
  )}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {showProfile && (
              <WorkerProfileSheet
                worker={selected}
                onClose={() => setShowProfile(false)}
                onMessage={() => openMessage(selected)}
                onRequest={() => requestWorker(selected)}
              />
            )}
          </AnimatePresence>,
          document.body
        )}

      {mounted &&
        createPortal(
          <AnimatePresence>
            {showAllWorkers && (
              <AllWorkersSheet
  open={showAllWorkers}
  workers={workersSheetList.length ? workersSheetList : workers}
workersSheetTitle={workersSheetTitle}
                onClose={() => setShowAllWorkers(false)}
                onSelect={(worker) => {
                  setShowAllWorkers(false);
                  openProfile(worker);
                }}
                onMessage={(worker) => openMessage(worker)}
                onRequest={(worker) => requestWorker(worker)}
              />
            )}
          </AnimatePresence>,
          document.body
        )}

        {mounted &&
  createPortal(
    <AnimatePresence>
      {messagesOpen && (
        <ClientMessagesSheet
          open={messagesOpen}
          chats={clientChats}
          onClose={() => setMessagesOpen(false)}
          onOpenChat={(id) => router.push(`/client/chat/${id}`)}
        />
      )}
    </AnimatePresence>,
    document.body
  )}

{mounted &&
  createPortal(
    <AnimatePresence>
      {commentNotificationsOpen && (
        <CommentNotificationsSheet
          open={commentNotificationsOpen}
          notifications={commentNotifications}
          onClose={() => setCommentNotificationsOpen(false)}
        />
      )}
    </AnimatePresence>,
    document.body
  )}
    </div>
  );
}
