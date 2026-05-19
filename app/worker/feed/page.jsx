'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Sparkles,
  MapPin,
  MessageCircle,
  SendHorizontal,
  Compass,
  ShieldCheck,
  Heart,
  Share2,
  Plus,
  UserPlus,
   ArrowLeft,
    Upload,
  Music2,
  Type,
  ImagePlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabase } from '@/lib/supabase';

const supabase = getSupabase();
const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then((m) => m.Circle), { ssr: false });

const LS_APP_ROLE = 'app_role';
const LAST_GPS_KEY = 'manosya_worker_feed_gps';
const HOME_VIEW = { center: [-25.5097, -54.6111], zoom: 12 };

const SERVICE_CATALOG = [
  { slug: 'taxi', name: 'Taxi' },
  { slug: 'chofer', name: 'Chofer' },
  { slug: 'plomeria', name: 'Plomería' },
  { slug: 'electricidad', name: 'Electricidad' },
  { slug: 'limpieza', name: 'Limpieza' },
  { slug: 'jardineria', name: 'Jardinería' },
  { slug: 'auxilio-vehicular', name: 'Auxilio vehicular' },
  { slug: 'fletes', name: 'Fletes y mudanzas' },
  { slug: 'contador', name: 'Contador' },
  { slug: 'abogado', name: 'Abogado' },
  { slug: 'peluqueria', name: 'Peluquería' },
  { slug: 'parrillero', name: 'Parrillero' },
  { slug: 'refrigeracion', name: 'Refrigeración' },
  { slug: 'informatica', name: 'Informática' },
];
const MUSIC_LIBRARY = [
  { title: 'Sin música', url: '' },
  { title: 'ManosYA suave', url: '/sounds/manosya-suave.mp3' },
  { title: 'Trabajo pro', url: '/sounds/trabajo-pro.mp3' },
  { title: 'Ambiente obras', url: '/sounds/ambiente-obras.mp3' },
];
const SEARCH_KEYWORDS = {
  plomeria: ['plomero', 'plomeria', 'caño', 'cano', 'caneria', 'agua', 'perdida', 'gotea', 'baño', 'inodoro', 'canilla'],
  electricidad: ['electricista', 'electricidad', 'luz', 'cable', 'enchufe', 'tomacorriente', 'termica', 'corto'],
  limpieza: ['limpieza', 'limpiadora', 'limpiar', 'casa', 'oficina', 'mucama'],
  refrigeracion: ['refrigeracion', 'aire', 'split', 'heladera', 'freezer', 'gas'],
  jardineria: ['jardinero', 'jardineria', 'pasto', 'cesped', 'yuyal', 'podar'],
  fletes: ['flete', 'mudanza', 'camioneta', 'camion', 'muebles'],
  taxi: ['taxi', 'movil', 'viaje', 'traslado'],
  chofer: ['chofer', 'conductor', 'manejar'],
  contador: ['contador', 'contabilidad', 'factura', 'iva', 'set', 'ruc'],
  abogado: ['abogado', 'legal', 'demanda', 'contrato', 'juicio'],
  parrillero: ['parrillero', 'asado', 'parrilla', 'evento'],
  informatica: ['informatica', 'computadora', 'pc', 'notebook', 'internet', 'wifi'],
};

function normalizeText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
function normalizeSlug(value) {
  return normalizeText(value).replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, '-').replace(/-+/g, '-');
}
function levenshtein(a, b) {
  const s = normalizeText(a);
  const t = normalizeText(b);
  if (!s) return t.length;
  if (!t) return s.length;
  const dp = Array.from({ length: s.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= t.length; j++) dp[0][j] = j;
  for (let i = 1; i <= s.length; i++) {
    for (let j = 1; j <= t.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (s[i - 1] === t[j - 1] ? 0 : 1));
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
  return queryWords.some((q) => words.some((w) => w.includes(q) || q.includes(w) || (q.length >= 4 && levenshtein(w, q) <= 2)));
}
function minutesSince(dateString) {
  if (!dateString) return null;
  return Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
}
function isOnlineRecent(worker) {
  const stamp = worker?.last_seen || worker?.location_updated_at || worker?.loc_updated_at || worker?.updated_at;
  const mins = minutesSince(stamp);
  return mins != null && mins >= 0 && mins <= 30;
}
function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
function formatKm(km) {
  if (!Number.isFinite(km)) return '—';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}
function shuffleBySeed(list, seed = 1) {
  return [...(list || [])]
    .map((item, index) => ({ item, sort: Math.sin(index + seed * 9999) * 10000 % 1 }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);
}
function splitWorkerServices(worker) {
  const raw = [];
  if (Array.isArray(worker?.skills)) raw.push(...worker.skills);
  else if (typeof worker?.skills === 'string') raw.push(...worker.skills.split(','));
  if (worker?.main_skill) raw.push(worker.main_skill);
  if (worker?.service_type) raw.push(worker.service_type);
  return raw.map((v) => String(v || '').trim()).filter(Boolean);
}
function serviceMetaBySlug(slug) {
  const normalized = normalizeSlug(slug);
  return SERVICE_CATALOG.find((item) => normalizeSlug(item.slug) === normalized) || null;
}
function serviceLabelForWorker(worker) {
  const first = splitWorkerServices(worker)[0];
  if (!first) return 'Servicio general';
  return serviceMetaBySlug(first)?.name || first;
}
function workerSearchScore(worker, query) {
  const q = normalizeText(query);
  if (!q) return 0;
  const name = normalizeText(worker?.full_name || worker?.username || '');
  const serviceText = normalizeText(`${splitWorkerServices(worker).join(' ')} ${serviceLabelForWorker(worker)} ${worker?.service_type || ''} ${worker?.main_skill || ''}`);
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
function avatarIcon(url, worker) {
  if (typeof window === 'undefined') return null;
  const L = require('leaflet');
  const color = isOnlineRecent(worker) ? '#16a3a8' : '#94a3b8';
  const html = `<div style="width:56px;height:56px;border-radius:999px;position:relative;background:#fff;box-shadow:0 14px 28px rgba(0,0,0,.18);overflow:visible;"><div style="position:absolute;inset:-4px;border-radius:999px;border:3px solid ${color};"></div><img src="${url || '/avatar-fallback.png'}" onerror="this.src='/avatar-fallback.png'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:999px;" /></div>`;
  return L.divIcon({ html, className: '', iconSize: [56, 56], iconAnchor: [28, 28] });
}
function meLocationIcon() {
  if (typeof window === 'undefined') return null;
  const L = require('leaflet');
  const html = `<div style="width:24px;height:24px;border-radius:999px;background:linear-gradient(180deg,#16a3a8 0%, #0c6b70 100%);border:3px solid #fff;box-shadow:0 10px 22px rgba(98,191,185,.35);"></div>`;
  return L.divIcon({ html, className: '', iconSize: [24, 24], iconAnchor: [12, 12] });
}

function WorkerFeedCard({ worker, isActive, onOpen, onAddFriend, onComments, onLike, onNearbyMap }) {
  const [bioOpen, setBioOpen] = useState(false);
  const videoRef = useRef(null);
   const [paused, setPaused] = useState(!isActive);

  const primaryService = serviceLabelForWorker(worker);
  const mediaUrl =
    worker?.media_url ||
    worker?.cover_url ||
    worker?.video_thumb_url ||
    worker?.avatar_url ||
    '/avatar-fallback.png';

  const isVideo = worker?.media_type === 'video';
  const likes = worker?.likes_count || worker?.like_count || 0;
  const reviews = worker?.comments_count || worker?.total_reviews || 0;
  const isOnline = isOnlineRecent(worker);

  const workerName = worker?.full_name || 'trabajador';
  const postText =
    worker?.post_description ||
    worker?.caption ||
    worker?.bio ||
    'Mirá trabajos reales, fotos, videos y presentación profesional dentro de ManosYA.';

  const isLongBio = postText.length > 95;
  const shortBio = isLongBio ? `${postText.slice(0, 95).trim()}...` : postText;

    useEffect(() => {
    if (!isVideo || !videoRef.current) return;

    const video = videoRef.current;

    if (isActive) {
      video.currentTime = video.currentTime || 0;
      video.muted = false;

      video
        .play()
        .then(() => setPaused(false))
        .catch(() => {
          video.muted = true;
          video.play().catch(() => {});
          setPaused(false);
        });
    } else {
      video.pause();
      video.currentTime = 0;
      setPaused(true);
    }
  }, [isActive, isVideo, mediaUrl]);

    function toggleVideoPlay() {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.muted = false;

      video
        .play()
        .then(() => setPaused(false))
        .catch(() => {
          video.muted = true;
          video.play().catch(() => {});
          setPaused(false);
        });

      return;
    }

    video.pause();
    setPaused(true);
  }

  
  const shareWorker = async () => {
    const text = `Mirá este trabajo en ManosYA: ${workerName} · ${primaryService}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${workerName} en ManosYA`,
          text,
          url: window.location.href,
        });
        return;
      }

      await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
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
      {isVideo ? (
        <div onClick={toggleVideoPlay} className="absolute inset-0 h-full w-full">
          <video
            ref={videoRef}
            src={mediaUrl}
            loop
                       muted={false}
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover"
          />

         

          {paused && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/10">
              <div className="rounded-full bg-black/45 px-5 py-5 backdrop-blur-md">
                <span className="text-4xl text-white">▶</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <img
          src={mediaUrl}
          onError={(e) => {
            e.currentTarget.src = '/avatar-fallback.png';
          }}
          alt={workerName}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

           <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.60)_22%,rgba(0,0,0,0.06)_54%,rgba(0,0,0,0.34)_100%)]" />

      <div className="absolute right-[4px] bottom-[145px] z-30 flex w-[72px] flex-col items-center text-white">
        <button type="button" onClick={onOpen} className="relative mb-6 flex h-[76px] w-[76px] items-center justify-center active:scale-95">
          <img
            src={worker?.avatar_url || '/avatar-fallback.png'}
            onError={(e) => {
              e.currentTarget.src = '/avatar-fallback.png';
            }}
            alt={workerName}
            className="h-[66px] w-[66px] rounded-full border-[2.5px] border-white object-cover shadow-[0_12px_26px_rgba(0,0,0,0.55)]"
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
            className="absolute bottom-[2px] right-[1px] flex h-7 w-7 items-center justify-center rounded-full bg-[#62bfb9] text-white shadow-[0_8px_18px_rgba(98,191,185,0.45)]"
            aria-label="Agregar amigo"
          >
            <UserPlus size={14} strokeWidth={3.2} />
          </span>
        </button>

        <button type="button" onClick={onLike} className="mb-5 flex w-[68px] flex-col items-center active:scale-95">
          <Heart size={38} fill="white" strokeWidth={1.8} className="drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)]" />
          <span className="mt-1 text-[13px] font-black">{likes}</span>
        </button>

        <button type="button" onClick={onComments} className="mb-5 flex w-[68px] flex-col items-center active:scale-95">
          <MessageCircle size={38} fill="white" strokeWidth={1.8} className="drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)]" />
          <span className="mt-1 text-[13px] font-black">{reviews}</span>
        </button>

        <button type="button" onClick={shareWorker} className="mb-5 flex w-[68px] flex-col items-center active:scale-95">
          <Share2 size={36} className="drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)]" />
          <span className="mt-1 text-[11px] font-black">Compartir</span>
        </button>

        <button type="button" onClick={onNearbyMap} className="flex w-[68px] flex-col items-center active:scale-95">
          <MapPin size={38} fill="none" stroke="white" strokeWidth={2.8} className="drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)]" />
        </button>
      </div>

      <div className="absolute left-4 right-[84px] bottom-[72px] z-20 text-white">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1.5 text-[12px] font-black backdrop-blur-md">
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
            className="h-11 w-11 rounded-full border-2 border-white object-cover"
          />

          <button type="button" onClick={onOpen} className="min-w-0 text-left">
            <div className="truncate text-[20px] font-black leading-tight">
              @{worker?.username || workerName}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[13px] font-bold text-white/86">
              <span>{primaryService}</span>
              {worker?._distKm != null && <span>• {formatKm(worker._distKm)}</span>}
              <span>• ⭐ {Number(worker?.avg_rating || 4.8).toFixed(1)}</span>
            </div>
          </button>
        </div>

        <div className="mt-2 text-[14px] font-semibold leading-5 text-white/95">
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
      </div>
    </motion.div>
  );
}
function CreatePostSheet({
  open,
  previewUrl,
  file,
  caption,
  setCaption,
  textOverlay,
  setTextOverlay,
  serviceType,
  setServiceType,
  uploading,
uploadProgress,
uploadLabel,
onClose,
onPublish,
}) {
  if (!open) return null;

  const isVideo = file?.type?.startsWith('video/');

  return (
    <div className="fixed inset-0 z-[69000] bg-black/70 p-3 backdrop-blur-sm">
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.98 }}
        className="mx-auto flex h-full w-full max-w-xl flex-col overflow-hidden rounded-[34px] bg-[#07151d] text-white shadow-[0_30px_90px_rgba(0,0,0,0.45)]"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#9ee5df]">
              Nueva publicación
            </div>
            <div className="text-xl font-black">Mostrá tu trabajo</div>
            <p className="mt-1 text-[13px] font-semibold text-white/55">
              Subí una foto o video y escribí una descripción corta.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-28">
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black">
            <div className="flex min-h-[320px] max-h-[520px] items-center justify-center bg-black">
              {isVideo ? (
                <video
                  src={previewUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="max-h-[520px] w-full object-contain"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Vista previa"
                  className="max-h-[520px] w-full object-contain"
                />
              )}
            </div>
          </div>

          <div className="mt-4 rounded-[26px] border border-white/10 bg-white/8 p-4">
            <div className="text-[13px] font-black text-white">
              ¿Qué querés contar?
            </div>
            <textarea
              value={caption}
              onChange={(e) => {
                setCaption(e.target.value);
                setTextOverlay(e.target.value.slice(0, 42));
              }}
              placeholder="Ej: Instalé este aire, quedó funcionando perfecto."
              rows={4}
              className="mt-3 w-full resize-none rounded-[20px] border border-white/10 bg-black/20 p-4 text-[15px] font-semibold text-white placeholder:text-white/35 outline-none focus:border-[#62bfb9]/70"
            />
          </div>

          <div className="mt-4 rounded-[26px] border border-white/10 bg-white/8 p-4">
            <div className="text-[13px] font-black text-white">
              ¿Qué oficio muestra?
            </div>

            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="mt-3 w-full rounded-[20px] border border-white/10 bg-black/20 p-4 text-[15px] font-black text-white outline-none focus:border-[#62bfb9]/70"
            >
              <option value="" className="text-slate-900">Servicio general</option>
              {SERVICE_CATALOG.map((item) => (
                <option key={item.slug} value={item.slug} className="text-slate-900">
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-[#07151d]/95 p-4 backdrop-blur-xl">
  {uploading && (
  <div className="mb-4 rounded-[24px] border border-[#62bfb9]/30 bg-[#62bfb9]/10 p-4 shadow-[0_10px_30px_rgba(98,191,185,0.18)]">
    <div className="flex items-center justify-between">
      <span className="text-[13px] font-black text-[#9ee5df]">
        {uploadLabel || 'Subiendo material...'}
      </span>

      <span className="text-[24px] font-black text-white">
        {uploadProgress}%
      </span>
    </div>

    <div className="mt-3 h-4 overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full bg-[#62bfb9] transition-all duration-300"
        style={{ width: `${uploadProgress}%` }}
      />
    </div>
  </div>
)}

  <button
    type="button"
    disabled={uploading}
    onClick={onPublish}
    className="w-full rounded-full bg-[#62bfb9] px-5 py-4 text-[16px] font-black text-white shadow-[0_16px_34px_rgba(98,191,185,0.35)] disabled:opacity-60"
  >
    {uploading ? `Subiendo ${uploadProgress}%` : 'Publicar ahora'}
  </button>
</div>
      </motion.div>
    </div>
  );
}
function CommentsSheet({ open, worker, comments, commentText, setCommentText, onClose, onSend }) {
  if (!open || !worker) return null;
  return (
    <div className="fixed inset-0 z-[67000] flex items-end bg-black/55 backdrop-blur-sm">
      <motion.div initial={{ y: 420, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 420, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 28 }} className="mx-auto flex max-h-[76vh] w-full max-w-xl flex-col overflow-hidden rounded-t-[34px] bg-white shadow-[0_-24px_80px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#0c6b70]">Comentarios</div><div className="mt-1 truncate text-[20px] font-black text-slate-900">{worker?.full_name || 'Trabajador'}</div></div><button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 active:scale-95"><X size={18} /></button></div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!comments?.length ? <div className="flex min-h-[180px] items-center justify-center text-center"><div><MessageCircle className="mx-auto mb-3 text-slate-300" size={34} /><div className="text-[17px] font-black text-slate-900">Todavía no hay comentarios</div><div className="mt-1 text-sm font-semibold text-slate-500">Sé el primero en comentar este perfil.</div></div></div> : <div className="space-y-4">{comments.map((item) => <div key={item.id} className="flex gap-3"><img src={item.client_avatar || '/avatar-fallback.png'} onError={(e) => { e.currentTarget.src = '/avatar-fallback.png'; }} alt={item.client_name || 'Usuario'} className="h-10 w-10 rounded-full object-cover" /><div className="min-w-0 flex-1 rounded-[22px] bg-slate-50 px-4 py-3"><div className="truncate text-[14px] font-black text-slate-900">{item.client_name || 'Usuario'}</div><p className="mt-1 text-[14px] font-semibold leading-5 text-slate-600">{item.comment}</p></div></div>)}</div>}
        </div>
        <div className="border-t border-slate-100 bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3"><div className="flex items-center gap-2 rounded-[28px] border border-slate-200 bg-slate-50 px-3 py-2"><input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Escribí un comentario público..." className="h-11 min-w-0 flex-1 bg-transparent px-2 text-[14px] font-semibold text-slate-700 placeholder:text-slate-400 outline-none" /><button type="button" onClick={onSend} disabled={!commentText.trim()} className="flex h-11 w-11 items-center justify-center rounded-full bg-[#62bfb9] text-white shadow-[0_10px_22px_rgba(98,191,185,0.35)] disabled:opacity-45 active:scale-95"><SendHorizontal size={17} strokeWidth={2.8} /></button></div></div>
      </motion.div>
    </div>
  );
}

function WorkerProfileSheet({ worker, onClose }) {
  if (!worker) return null;
  const services = splitWorkerServices(worker);
  const online = isOnlineRecent(worker);
  return (
    <div className="absolute inset-0 z-[65000] bg-slate-950/58 p-3 backdrop-blur-sm sm:p-5">
      <motion.div initial={{ opacity: 0, y: 32, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.98 }} className="mx-auto flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-[34px] border border-white/18 bg-[linear-gradient(180deg,#eff6f7_0%,#ffffff_40%,#f8fbfc_100%)] shadow-[0_30px_90px_rgba(15,23,42,0.24)]">
        <div className="relative h-[270px] overflow-hidden bg-slate-900"><img src={worker?.cover_url || worker?.video_thumb_url || worker?.avatar_url || '/avatar-fallback.png'} onError={(e) => { e.currentTarget.src = '/avatar-fallback.png'; }} alt={worker?.full_name || 'Trabajador'} className="h-full w-full object-cover" /><div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(2,6,23,0.88),rgba(2,6,23,0.12))]" /><button type="button" onClick={onClose} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/16 text-white backdrop-blur-md"><X size={18} /></button><div className="absolute bottom-5 left-5 right-5"><div className="flex items-end gap-4"><img src={worker?.avatar_url || '/avatar-fallback.png'} onError={(e) => { e.currentTarget.src = '/avatar-fallback.png'; }} alt={worker?.full_name || 'Avatar'} className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-[0_14px_30px_rgba(15,23,42,0.24)]" /><div className="pb-2 text-white"><div className="text-[28px] font-black leading-none">{worker?.full_name || 'Trabajador'}</div><div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/85"><span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 backdrop-blur-md"><Sparkles size={14} />{serviceLabelForWorker(worker)}</span>{online && <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-black text-emerald-200">Activo ahora</span>}</div></div></div></div></div>
        <div className="flex-1 overflow-y-auto p-5 sm:p-6"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"><div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Rating</div><div className="mt-2 text-2xl font-black text-slate-900">{Number(worker?.avg_rating || 4.8).toFixed(1)}</div></div><div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"><div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Reseñas</div><div className="mt-2 text-2xl font-black text-slate-900">{Number(worker?.total_reviews || worker?.comments_count || 0)}</div></div><div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"><div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Radio</div><div className="mt-2 text-2xl font-black text-slate-900">{Number(worker?.radius_km || 5)} km</div></div></div><div className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"><div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Sobre este trabajador</div><p className="mt-3 text-[15px] leading-7 text-slate-600">{worker?.bio || 'Perfil listo para mostrar trabajos, fotos, videos y fortalecer comunidad profesional dentro de ManosYA.'}</p></div><div className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"><div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Servicios</div><div className="mt-4 flex flex-wrap gap-2">{(services.length ? services : ['Servicio general']).map((item, idx) => <span key={`${item}-${idx}`} className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-bold text-[#0c6b70]">{serviceMetaBySlug(item)?.name || item}</span>)}</div></div></div>
        <div className="border-t border-slate-200 bg-white p-4 sm:p-5"><button type="button" onClick={onClose} className="w-full rounded-[22px] bg-gradient-to-r from-[#0c6b70] via-[#62bfb9] to-[#9ee5df] px-5 py-4 text-sm font-black text-white shadow-[0_16px_34px_rgba(98,191,185,0.34)]">Volver al feed</button></div>
      </motion.div>
    </div>
  );
}

function NearbyMapSheet({ open, workers, center, hasMeCoords, me, selectedWorker, onSelectWorker, onClose, onOpenProfile }) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!open) return null;
  const validWorkers = (workers || []).filter((worker) => Number.isFinite(Number(worker?.lat)) && Number.isFinite(Number(worker?.lng)));
  const active = selectedWorker || validWorkers[activeIndex] || validWorkers[0] || null;
  const mapWorkers = validWorkers.slice(0, 14);
  function goPrevWorker() { if (!validWorkers.length) return; const next = activeIndex <= 0 ? validWorkers.length - 1 : activeIndex - 1; setActiveIndex(next); onSelectWorker(validWorkers[next]); }
  function goNextWorker() { if (!validWorkers.length) return; const next = activeIndex >= validWorkers.length - 1 ? 0 : activeIndex + 1; setActiveIndex(next); onSelectWorker(validWorkers[next]); }
  return (
    <div className="fixed inset-0 z-[66000] bg-slate-950/70 p-3 backdrop-blur-sm"><motion.div initial={{ opacity: 0, y: 28, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 22, scale: 0.98 }} className="mx-auto flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-[34px] border border-white/18 bg-[#eef8f7] shadow-[0_30px_90px_rgba(0,0,0,0.32)]"><div className="flex items-center justify-between border-b border-white/50 bg-white/70 px-4 py-3 backdrop-blur-xl"><div><div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#0c6b70]">Cerca tuyo</div><div className="text-[20px] font-black text-slate-900">Trabajadores cerca</div></div><button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/8 text-slate-700 active:scale-95"><X size={18} /></button></div><div className="relative flex-1 overflow-hidden bg-white"><MapContainer center={center} zoom={hasMeCoords ? 12 : 11} className="h-full w-full"><TileLayer attribution="&copy; CartoDB" url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />{hasMeCoords && <><Marker position={[Number(me.lat), Number(me.lon)]} icon={meLocationIcon() || undefined} /><Circle center={[Number(me.lat), Number(me.lon)]} radius={2500} pathOptions={{ color: '#62bfb9', fillColor: '#62bfb9', fillOpacity: 0.12 }} /></>}{mapWorkers.map((worker) => <Marker key={String(worker.user_id)} position={[Number(worker.lat), Number(worker.lng)]} icon={avatarIcon(worker.avatar_url, worker) || undefined} eventHandlers={{ click: () => { onSelectWorker(worker); const idx = validWorkers.findIndex((w) => String(w.user_id) === String(worker.user_id)); if (idx >= 0) setActiveIndex(idx); } }} />)}</MapContainer>{active && <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[999] bg-gradient-to-t from-white/82 via-white/20 to-transparent p-4"><div className="pointer-events-auto rounded-[30px] border border-white/80 bg-white/96 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl"><div className="flex items-center gap-2"><button type="button" onClick={goPrevWorker} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 active:scale-95">←</button><img src={active?.avatar_url || '/avatar-fallback.png'} onError={(e) => { e.currentTarget.src = '/avatar-fallback.png'; }} alt={active?.full_name || 'Trabajador'} className="h-14 w-14 rounded-2xl object-cover" /><div className="min-w-0 flex-1"><div className="truncate text-[15px] font-black text-slate-900">{active?.full_name || 'Trabajador'}</div><div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] font-bold text-slate-500"><span>{serviceLabelForWorker(active)}</span>{active?._distKm != null && <span>• {formatKm(active._distKm)}</span>}<span>• ⭐ {Number(active?.avg_rating || 4.8).toFixed(1)}</span></div><div className="mt-1 text-[10px] font-black text-[#0c6b70]">{isOnlineRecent(active) ? 'En línea ahora' : 'Disponible'}</div></div><button type="button" onClick={goNextWorker} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 active:scale-95">→</button></div><button type="button" onClick={() => onOpenProfile(active)} className="mt-3 w-full rounded-[18px] bg-[#62bfb9] px-4 py-3 text-[13px] font-black text-white shadow-[0_12px_28px_rgba(98,191,185,0.35)]">Ver perfil</button></div></div>}</div></motion.div></div>
  );
}


function MyPostsSheet({ open, posts, onClose, onOpenPost }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[68000] bg-black/60 p-3 backdrop-blur-sm">
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.98 }}
        className="mx-auto flex h-full w-full max-w-xl flex-col overflow-hidden rounded-[34px] bg-[#07151d] text-white shadow-[0_30px_90px_rgba(0,0,0,0.45)]"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#9ee5df]">
              Publicados
            </div>
            <div className="text-xl font-black">Tus trabajos subidos</div>
          </div>

          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {!posts?.length ? (
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <ImagePlus className="mx-auto mb-3 text-white/50" size={34} />
                <div className="text-lg font-black">Todavía no publicaste nada</div>
                <p className="mt-2 text-sm font-semibold text-white/55">
                  Tocá Crear para subir tu primer trabajo.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {posts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => onOpenPost(post)}
                  className="group relative aspect-[9/14] overflow-hidden rounded-[18px] bg-black active:scale-[0.98]"
                >
                  {post.media_type === 'video' ? (
                    <video src={post.media_url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  ) : (
                    <img src={post.media_url} alt={post.caption || 'Publicación'} className="h-full w-full object-cover" />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />

                  {post.media_type === 'video' && (
                    <div className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-1 text-[10px] font-black text-white backdrop-blur-md">
                      ▶
                    </div>
                  )}

                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="truncate text-left text-[10px] font-black uppercase tracking-[0.08em] text-[#9ee5df]">
                      {post.service_type || 'General'}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-left text-[11px] font-bold leading-4 text-white">
                      {post.caption || 'Sin descripción'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
function PostViewerSheet({ post, onClose }) {
  if (!post) return null;

  const isVideo = post.media_type === 'video';

  return (
    <div className="fixed inset-0 z-[70000] bg-black/85 p-3 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="mx-auto flex h-full w-full max-w-xl flex-col overflow-hidden rounded-[34px] bg-black text-white"
      >
        <div className="flex items-center justify-between px-4 py-4">
          <div className="text-sm font-black text-white/80">
            {post.service_type || 'Servicio general'}
          </div>

          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/12">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center bg-black">
          {isVideo ? (
            <video src={post.media_url} controls autoPlay playsInline className="max-h-full w-full object-contain" />
          ) : (
            <img src={post.media_url} alt={post.caption || 'Publicación'} className="max-h-full w-full object-contain" />
          )}
        </div>

        <div className="border-t border-white/10 p-4">
          <p className="text-[14px] font-semibold leading-5 text-white/85">
            {post.caption || 'Sin descripción'}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
function AllWorkersSheet({ open, workers, onClose, onSelect }) {
  if (!open) return null;
  return <div className="absolute inset-0 z-[64000] bg-slate-950/48 p-3 backdrop-blur-sm sm:p-5"><motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="mx-auto flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-[34px] border border-white/20 bg-[linear-gradient(180deg,#eff6f7_0%,#ffffff_40%,#f8fbfc_100%)] shadow-[0_30px_90px_rgba(15,23,42,0.22)]"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Explorar</div><div className="mt-1 text-2xl font-black text-slate-900">Todos los trabajadores</div></div><button type="button" onClick={onClose} className="rounded-full border border-slate-200 bg-white p-2 text-slate-700"><X size={18} /></button></div><div className="flex-1 overflow-y-auto p-4 sm:p-5"><div className="space-y-3">{(workers || []).map((worker) => <div key={String(worker.user_id)} className="flex items-center gap-3 rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm"><img src={worker?.avatar_url || '/avatar-fallback.png'} onError={(e) => { e.currentTarget.src = '/avatar-fallback.png'; }} alt={worker?.full_name || 'Avatar'} className="h-16 w-16 rounded-full object-cover" /><div className="min-w-0 flex-1"><button type="button" onClick={() => onSelect(worker)} className="text-left"><div className="truncate text-[17px] font-black text-slate-900">{worker?.full_name || 'Trabajador'}</div></button><div className="mt-1 flex flex-wrap gap-2 text-[12px] text-slate-500"><span>{serviceLabelForWorker(worker)}</span>{worker?._distKm != null && <span>• {formatKm(worker._distKm)}</span>}<span>• ⭐ {Number(worker?.avg_rating || 4.8).toFixed(1)}</span></div></div><button type="button" onClick={() => onSelect(worker)} className="rounded-full bg-[#62bfb9] p-2 text-white"><Sparkles size={16} /></button></div>)}</div></div></motion.div></div>;
}

export default function WorkerFeedPage() {
  const router = useRouter();
  const feedRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState({ id: null, lat: null, lon: null });
  const [viewerProfile, setViewerProfile] = useState(null);
const [workers, setWorkers] = useState([]);
const [workerPosts, setWorkerPosts] = useState([]);
const [profilePosts, setProfilePosts] = useState([]);
const [showMyPosts, setShowMyPosts] = useState(false);
const [selectedPost, setSelectedPost] = useState(null);
const [busy, setBusy] = useState(false);
  const [selectedService, setSelectedService] = useState('');
  const [serviceQuery, setServiceQuery] = useState('');
  const [feedMode, setFeedMode] = useState('all');
  const [feedSeed, setFeedSeed] = useState(Date.now());
  const [feedIndex, setFeedIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showAllWorkers, setShowAllWorkers] = useState(false);
  const [nearbyMapOpen, setNearbyMapOpen] = useState(false);
  const [nearbyMapWorker, setNearbyMapWorker] = useState(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsWorker, setCommentsWorker] = useState(null);
  const [workerComments, setWorkerComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
const [uploadProgress, setUploadProgress] = useState(0);
const [uploadLabel, setUploadLabel] = useState('');
const [createPostOpen, setCreatePostOpen] = useState(false);
const [draftFile, setDraftFile] = useState(null);
const [draftPreviewUrl, setDraftPreviewUrl] = useState('');
const [draftCaption, setDraftCaption] = useState('');
const [draftTextOverlay, setDraftTextOverlay] = useState('');
const [draftServiceType, setDraftServiceType] = useState('');
const [draftMusic, setDraftMusic] = useState(MUSIC_LIBRARY[0]);
const fileInputRef = useRef(null);
  const hasMeCoords = Number.isFinite(Number(me?.lat)) && Number.isFinite(Number(me?.lon));

  useEffect(() => { setMounted(true); if (typeof window === 'undefined') return; const setRealVH = () => { const h = window.visualViewport?.height ?? window.innerHeight; document.documentElement.style.setProperty('--real-vh', `${Math.round(h)}px`); }; setRealVH(); window.addEventListener('resize', setRealVH); window.visualViewport?.addEventListener('resize', setRealVH); return () => { window.removeEventListener('resize', setRealVH); window.visualViewport?.removeEventListener('resize', setRealVH); }; }, []);
  useEffect(() => { let alive = true; (async () => { try { const { data, error } = await supabase.auth.getUser(); const uid = data?.user?.id; if (error || !uid) { router.replace('/auth/login'); return; } try { localStorage.setItem(LS_APP_ROLE, 'worker'); } catch {} if (alive) setMe((prev) => ({ ...prev, id: uid })); const { data: profileData } = await supabase.from('profiles').select('id, full_name, email, role, avatar_url').eq('id', uid).maybeSingle(); if (alive) setViewerProfile(profileData || null); } catch (error) { console.warn('No se pudo validar la sesión del trabajador', error); router.replace('/auth/login'); } })(); return () => { alive = false; }; }, [router]);
  useEffect(() => { if (!navigator.geolocation) return; const cached = (() => { try { const raw = localStorage.getItem(LAST_GPS_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } })(); if (cached?.lat && cached?.lon) setMe((prev) => ({ ...prev, lat: Number(cached.lat), lon: Number(cached.lon) })); const watcher = navigator.geolocation.watchPosition((pos) => { const lat = pos.coords.latitude; const lon = pos.coords.longitude; setMe((prev) => ({ ...prev, lat, lon })); try { localStorage.setItem(LAST_GPS_KEY, JSON.stringify({ lat, lon, t: Date.now() })); } catch {} }, (err) => console.warn('GPS worker feed error', err), { enableHighAccuracy: true, maximumAge: 12000, timeout: 10000 }); return () => navigator.geolocation.clearWatch(watcher); }, []);
async function fetchWorkerPosts() {
  if (!me?.id) return;

  const { data, error } = await supabase
    .from('worker_posts')
    .select('*')
    .eq('worker_id', me.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('worker_posts error', error);
    toast.error('No pudimos cargar tus publicaciones');
    return;
  }

  setWorkerPosts(data || []);
}

async function fetchProfilePosts(workerId) {
  if (!workerId) return;

  const { data, error } = await supabase
    .from('worker_posts')
    .select('*')
    .eq('worker_id', workerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('profile worker posts error', error);
    setProfilePosts([]);
    return;
  }

  setProfilePosts(data || []);
}
async function fetchWorkers(serviceFilter = '') {
  setBusy(true);

  try {
    const normalizedFilter = normalizeSlug(serviceFilter);

    const { data: workersData, error: workersError } = await supabase
      .from('map_workers_view')
      .select('*');

    if (workersError) throw workersError;

    const { data: postsData, error: postsError } = await supabase
      .from('worker_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (postsError) throw postsError;

    const postWorkerIds = [
      ...new Set((postsData || []).map((p) => p.worker_id).filter(Boolean)),
    ];

    const { data: profilesData, error: profilesError } = postWorkerIds.length
      ? await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, role, is_verified')
          .in('id', postWorkerIds)
      : { data: [], error: null };

    if (profilesError) throw profilesError;

    const workersMap = {};
    (workersData || []).forEach((worker) => {
      workersMap[String(worker.user_id)] = worker;
    });

    const profilesMap = {};
    (profilesData || []).forEach((profile) => {
      profilesMap[String(profile.id)] = profile;
    });

    const postCards = (postsData || []).map((post) => {
      const owner = workersMap[String(post.worker_id)] || {};
      const profile = profilesMap[String(post.worker_id)] || {};

      const lat = Number(owner?.lat ?? post?.lat);
      const lng = Number(owner?.lng ?? post?.lng);

      const distKm =
        hasMeCoords && Number.isFinite(lat) && Number.isFinite(lng)
          ? haversineKm(Number(me.lat), Number(me.lon), lat, lng)
          : null;

      const realName =
        owner.full_name ||
        profile.full_name ||
        post.full_name ||
        'Trabajador ManosYA';

      const realAvatar =
        owner.avatar_url ||
        profile.avatar_url ||
        post.avatar_url ||
        '/avatar-fallback.png';

      return {
        ...owner,
        ...post,
        user_id: post.worker_id,
        worker_id: post.worker_id,
        full_name: realName,
        username: realName,
        avatar_url: realAvatar,
        bio: owner.bio || post.caption || 'Mostrando trabajos reales en ManosYA.',
        skills: owner.skills || post.service_type || 'Servicio general',
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
        _distKm: distKm,
        _serviceTokens: splitWorkerServices({
          ...owner,
          skills: owner.skills || post.service_type || 'Servicio general',
        }).map((item) => normalizeSlug(item)),
        cover_url: post.media_url || realAvatar,
        media_url: post.media_url || realAvatar,
        media_type: post.media_type || 'image',
        post_id: post.id,
        post_description: post.caption || owner.bio || '',
        created_at: post.created_at,
      };
    });

    const postedWorkerIds = new Set(
      postCards.map((post) => String(post.worker_id || post.user_id))
    );

    const fallbackProfileCards = (workersData || [])
      .filter((worker) => !postedWorkerIds.has(String(worker.user_id)))
      .filter((worker) => worker?.avatar_url || worker?.full_name)
      .map((worker) => {
        const lat = Number(worker?.lat);
        const lng = Number(worker?.lng);

        const distKm =
          hasMeCoords && Number.isFinite(lat) && Number.isFinite(lng)
            ? haversineKm(Number(me.lat), Number(me.lon), lat, lng)
            : null;

        const realName = worker.full_name || 'Trabajador ManosYA';

        return {
          ...worker,
          worker_id: worker.user_id,
          full_name: realName,
          username: realName,
          media_url: worker.avatar_url || '/avatar-fallback.png',
          media_type: 'image',
          cover_url: worker.avatar_url || '/avatar-fallback.png',
          post_id: `profile-${worker.user_id}`,
          post_description:
            worker.bio || 'Perfil profesional disponible en ManosYA.',
          _distKm: distKm,
          _serviceTokens: splitWorkerServices(worker).map((item) =>
            normalizeSlug(item)
          ),
          created_at: worker.updated_at || new Date().toISOString(),
        };
      });

    let merged = [...postCards, ...fallbackProfileCards];

    if (normalizedFilter) {
      merged = merged.filter((worker) => {
        const tokens = worker._serviceTokens || [];
        if (!tokens.length) return true;

        return tokens.some((token) => {
          if (token === normalizedFilter) return true;
          if (token.includes(normalizedFilter)) return true;
          if (normalizedFilter.includes(token)) return true;
          return false;
        });
      });
    }

    merged.sort((a, b) => {
      const aPost = !String(a.post_id || '').startsWith('profile-');
      const bPost = !String(b.post_id || '').startsWith('profile-');

      if (aPost !== bPost) return aPost ? -1 : 1;

      const aOnline = isOnlineRecent(a);
      const bOnline = isOnlineRecent(b);

      if (aOnline !== bOnline) return aOnline ? -1 : 1;

      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    setWorkers(merged);
    setFeedIndex(0);
  } catch (error) {
    console.error('fetchWorkers error:', error);
    toast.error('No pudimos cargar publicaciones');
    setWorkers([]);
  } finally {
    setBusy(false);
  }
}
 useEffect(() => {
  if (!mounted || !me?.id) return;

  fetchWorkerPosts();

  if (feedMode === 'all') {
    fetchWorkers('');
    return;
  }

  fetchWorkers(selectedService);
}, [mounted, me?.id, selectedService, hasMeCoords, feedMode]);
  const feedWorkers = useMemo(() => { const base = Array.isArray(workers) ? workers : []; const q = normalizeText(serviceQuery); if (q) return base.map((worker) => ({ ...worker, _searchScore: workerSearchScore(worker, q) })).filter((worker) => worker._searchScore > 0).sort((a, b) => b._searchScore - a._searchScore).slice(0, 60); if (feedMode === 'near') { const nearby = base.filter((worker) => Number.isFinite(Number(worker?._distKm))).filter((worker) => Number(worker._distKm) <= 15).sort((a, b) => Number(a._distKm) - Number(b._distKm)); return [...nearby.slice(0, 6), ...shuffleBySeed(nearby.slice(6), feedSeed)].slice(0, 24); } const online = base.filter((worker) => isOnlineRecent(worker)); const offline = base.filter((worker) => !isOnlineRecent(worker)); return [...shuffleBySeed(online, feedSeed), ...shuffleBySeed(offline, feedSeed + 77)].slice(0, 60); }, [workers, feedMode, feedSeed, serviceQuery]);
  const currentWorker = feedWorkers[feedIndex] || null;
  const nearbyWorkers = useMemo(() => (workers || []).filter((worker) => Number.isFinite(Number(worker?._distKm))).sort((a, b) => Number(a._distKm) - Number(b._distKm)), [workers]);
  useEffect(() => { if (currentWorker) setSelected(currentWorker); }, [currentWorker]);
  async function openProfile(worker) {
  setSelected(worker);
  await fetchProfilePosts(worker.user_id || worker.worker_id);
  setShowProfile(true);
}
  async function openComments(worker) { setCommentsWorker(worker); setCommentsOpen(true); const { data } = await supabase.from('worker_comments').select('*').eq('worker_id', worker.user_id).order('created_at', { ascending: false }); setWorkerComments(data || []); }
  async function sendPublicComment() { if (!commentsWorker || !commentText.trim() || !me?.id) return; const workerId = commentsWorker.user_id; const payload = { worker_id: workerId, client_id: me.id, client_name: viewerProfile?.full_name || 'Trabajador', client_avatar: viewerProfile?.avatar_url || '', comment: commentText.trim() }; const { error } = await supabase.from('worker_comments').insert([payload]); if (error) { console.error('comment insert error', error); toast.error(error.message || 'No se pudo comentar'); return; } setWorkers((prev) => prev.map((w) => String(w.user_id) === String(workerId) ? { ...w, comments_count: Number(w.comments_count || 0) + 1 } : w)); setCommentText(''); openComments(commentsWorker); }
  async function addFriend(worker) {
    const targetId = worker?.user_id || worker?.worker_id;
    if (!targetId || !me?.id) return;

    if (String(targetId) === String(me.id)) {
      toast.message('Ese es tu propio perfil');
      return;
    }

    const { data, error } = await supabase.rpc('request_friend', {
      addressee: targetId,
    });

    if (error) {
      console.error('friend request error:', error);
      toast.error(error.message || 'No pudimos agregar amigo');
      return;
    }

    if (data === 'accepted') toast.success('Ahora son amigos');
    else if (data === 'pending') toast.success('Solicitud de amistad enviada');
    else toast.message('La solicitud ya existe');
  }

  async function toggleWorkerLike(worker) { if (!worker?.user_id || !me?.id) return; const workerId = worker.user_id; const { data: existing } = await supabase.from('worker_likes').select('id').eq('worker_id', workerId).eq('client_id', me.id).maybeSingle(); if (existing?.id) { await supabase.from('worker_likes').delete().eq('id', existing.id); setWorkers((prev) => prev.map((w) => String(w.user_id) === String(workerId) ? { ...w, likes_count: Math.max(0, Number(w.likes_count || 0) - 1) } : w)); toast.success('Quitaste el me encanta'); return; } const { error } = await supabase.from('worker_likes').insert([{ worker_id: workerId, client_id: me.id }]); if (error) { toast.error(error.message || 'No se pudo guardar el me encanta'); return; } setWorkers((prev) => prev.map((w) => String(w.user_id) === String(workerId) ? { ...w, likes_count: Number(w.likes_count || 0) + 1 } : w)); toast.success('Te encantó este perfil'); }
async function uploadWorkerMedia(file) {
  if (!file || !me?.id) return;

  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');

   if (isImage && file.size > 10000000) {
    toast.error('La imagen es muy pesada. Elegí una menor a 10MB.');
    return;
  }

  if (isImage && file.size > 10000000) {
    toast.error('La imagen es muy pesada. Elegí una menor a 10MB.');
    return;
  }

  if (!isImage && !isVideo) {
    toast.error('Solo podés subir imágenes o videos');
    return;
  }

  setDraftFile(file);
  setDraftPreviewUrl(URL.createObjectURL(file));
  setDraftCaption('');
  setDraftTextOverlay('');
  setDraftServiceType('');
  setDraftMusic(MUSIC_LIBRARY[0]);
  setCreatePostOpen(true);
}
async function compressVideoIfNeeded(file) {
  if (!file.type.startsWith('video/')) return file;

  if (file.size <= 12000000) return file;

  toast.loading('Optimizando video sin perder calidad visible...', {
    id: 'compress',
  });

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);

    video.src = objectUrl;
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = async () => {
      try {
        const canvas = document.createElement('canvas');

        const maxWidth = 720;
        const ratio = video.videoWidth / video.videoHeight;

        canvas.width = Math.min(video.videoWidth, maxWidth);
        canvas.height = Math.round(canvas.width / ratio);

        const ctx = canvas.getContext('2d');
        const stream = canvas.captureStream(30);

        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm';

        const recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 1800000,
        });

        const chunks = [];

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        recorder.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          toast.error('No se pudo optimizar el video', { id: 'compress' });
          reject(new Error('No se pudo optimizar el video'));
        };

        recorder.onstop = () => {
          URL.revokeObjectURL(objectUrl);

          const compressedBlob = new Blob(chunks, { type: 'video/webm' });

          const compressedFile = new File(
            [compressedBlob],
            `video_optimizado_${Date.now()}.webm`,
            { type: 'video/webm' }
          );

          toast.success('Video optimizado correctamente', {
            id: 'compress',
          });

          resolve(compressedFile);
        };

        await video.play();

        function drawFrame() {
          if (video.paused || video.ended) return;

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          requestAnimationFrame(drawFrame);
        }

        drawFrame();
        recorder.start(1000);

        video.onended = () => {
          recorder.stop();
        };
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        toast.error('No se pudo optimizar el video', { id: 'compress' });
        reject(error);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      toast.error('No se pudo leer el video', { id: 'compress' });
      reject(new Error('No se pudo leer el video'));
    };
  });
}
async function uploadToWorkerMediaWithProgress(file, path, onProgress) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  if (!token) throw new Error('Sesión vencida. Volvé a iniciar sesión.');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan variables NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const url = `${supabaseUrl}/storage/v1/object/worker-media/${encodedPath}`;

  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', supabaseAnonKey);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('x-upsert', 'true');
    xhr.setRequestHeader('cache-control', '3600');

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.round((event.loaded / event.total) * 95);
      onProgress(percent);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(96);
        resolve();
      } else {
        reject(new Error(xhr.responseText || 'No se pudo subir el archivo'));
      }
    };

    xhr.onerror = () => reject(new Error('Error de conexión al subir el archivo'));

    xhr.send(file);
  });
}
async function publishWorkerPost() {
  if (!draftFile || !me?.id) return;

  const isImage = draftFile.type.startsWith('image/');
  const isVideo = draftFile.type.startsWith('video/');

  try {
    setUploadingMedia(true);
    setUploadProgress(1);
    setUploadLabel('Preparando tu publicación...');

    const optimizedFile = await compressVideoIfNeeded(draftFile);

const ext = optimizedFile.name.split('.').pop() || (isVideo ? 'webm' : 'jpg');
const path = `${me.id}/posts/${Date.now()}.${ext}`;

    setUploadLabel('Subiendo a ManosYA...');

    await uploadToWorkerMediaWithProgress(optimizedFile, path, (percent) => {
      setUploadProgress(percent);
      setUploadLabel(`Subiendo... ${percent}%`);
    });

    const { data } = supabase.storage
      .from('worker-media')
      .getPublicUrl(path);

    const publicUrl = data?.publicUrl;
    if (!publicUrl) throw new Error('No se pudo obtener la URL pública');

    setUploadProgress(97);
    setUploadLabel('Procesando y publicando...');

    const { error: postError } = await supabase.from('worker_posts').insert([
      {
        worker_id: me.id,
        media_url: publicUrl,
        media_type: isVideo ? 'video' : 'image',
        caption: draftCaption.trim(),
        service_type: draftServiceType || null,
        music_url: draftMusic?.url || null,
        music_title: draftMusic?.title || null,
        text_overlay: draftTextOverlay.trim() || null,
        thumbnail_url: isImage ? publicUrl : null,
      },
    ]);

    if (postError) throw postError;

    setUploadProgress(100);
    setUploadLabel('¡Publicado con éxito!');

    toast.success('Publicación creada');

    setTimeout(() => {
  setCreatePostOpen(false);
  setDraftFile(null);
  setDraftPreviewUrl('');
  setDraftCaption('');
  setDraftTextOverlay('');
  setDraftServiceType('');
  setDraftMusic(MUSIC_LIBRARY[0]);
  setUploadProgress(0);
  setUploadLabel('');
}, 2200);

        await fetchWorkerPosts();

    setFeedMode('all');
    setSelectedService('');
    setServiceQuery('');
    setFeedSeed(Date.now() + Math.random());
    setFeedIndex(0);

    await fetchWorkers('');
  } catch (error) {
    console.error(error);
    toast.error(error.message || 'No se pudo publicar');
  } finally {
    setUploadingMedia(false);
  }
}

const mapCenter = useMemo(() => hasMeCoords ? [Number(me.lat), Number(me.lon)] : HOME_VIEW.center, [hasMeCoords, me?.lat, me?.lon]);
  
  return (
    
    <div className="relative h-[var(--real-vh,100dvh)] overflow-hidden bg-black text-slate-900"><div className="pointer-events-none absolute inset-0 bg-black" /><div className="relative z-10 mx-auto h-[var(--real-vh,100dvh)] w-full max-w-6xl overflow-hidden px-0"><div className="relative h-full"><div className="relative z-10 h-full"><div className="pointer-events-auto absolute left-0 right-0 top-0 z-40 px-4 pt-[calc(env(safe-area-inset-top)+10px)] text-white"><div className="flex items-center gap-2"><button type="button" onClick={() => router.push('/worker')} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-xl active:scale-95" aria-label="Volver"><ArrowLeft size={18} /></button><button type="button" onClick={() => { setSelectedService(''); setServiceQuery(''); setFeedMode('all'); setFeedSeed(Date.now() + Math.random()); fetchWorkers(''); }} className="flex shrink-0 items-center text-[20px] font-black tracking-[-0.04em] text-white drop-shadow-[0_3px_8px_rgba(0,0,0,0.45)]">ManosYA</button><div className="relative min-w-0 flex-1 rounded-full border border-white/25 bg-black/18 shadow-[0_10px_24px_rgba(0,0,0,0.20)] backdrop-blur-xl"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/60" size={15} /><input value={serviceQuery} onChange={(e) => { const value = e.target.value; setServiceQuery(value); const normalizedValue = normalizeSlug(value); const matchedService = SERVICE_CATALOG.find((service) => { const slug = normalizeSlug(service.slug); const name = normalizeSlug(service.name); return slug.includes(normalizedValue) || name.includes(normalizedValue) || normalizedValue.includes(slug); }); setSelectedService(matchedService ? matchedService.slug : ''); }} placeholder="Buscar nombre, oficio o problema..." className="h-9 w-full rounded-full bg-transparent pl-8 pr-8 text-[12px] font-bold text-white placeholder:text-white/60 outline-none" />{serviceQuery && <button type="button" onClick={() => { setServiceQuery(''); setSelectedService(''); }} className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white/14 text-white/80 active:scale-95"><X size={14} /></button>}</div></div><div className="mt-3 flex justify-center"><div className="relative inline-flex items-center rounded-full bg-white/20 p-1 shadow-lg backdrop-blur-md"><motion.div layout transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="absolute bottom-1 top-1 w-1/2 rounded-full bg-white" style={{ left: feedMode === 'all' ? '4px' : 'calc(50% + 2px)' }} /><button type="button" onClick={() => { setFeedMode('all'); setSelectedService(''); setServiceQuery(''); setFeedSeed(Date.now() + Math.random()); setFeedIndex(0); setSelected(null); fetchWorkers(''); feedRef.current?.scrollTo({ top: 0, behavior: 'auto' }); }} className={`relative z-10 rounded-full px-8 py-2 text-[12px] font-black transition ${feedMode === 'all' ? 'text-black' : 'text-white'}`}>Todos</button><button type="button" onClick={() => { setFeedMode('near'); setFeedSeed(Date.now() + Math.random()); setFeedIndex(0); setSelected(null); feedRef.current?.scrollTo({ top: 0, behavior: 'auto' }); }} className={`relative z-10 rounded-full px-8 py-2 text-[12px] font-black transition ${feedMode === 'near' ? 'text-black' : 'text-white'}`}>Cerca tuyo</button></div></div></div>{busy ? <div className="flex h-full items-center justify-center bg-[#081924] text-white"><div className="text-center"><div className="text-xl font-black">Cargando trabajadores</div><div className="mt-2 text-sm text-white/70">Estamos ordenando lo mejor para vos.</div></div></div> : !feedWorkers.length ? <div className="flex h-full items-center justify-center bg-[#081924] px-8 text-center text-white"><div><Compass className="mx-auto mb-3 text-white/70" size={34} /><div className="text-xl font-black">No encontramos trabajadores</div><div className="mt-2 text-sm text-white/70">Probá cambiar el filtro o revisar tu zona.</div><button type="button" onClick={() => fetchWorkers('')} className="mt-6 rounded-full bg-[#62bfb9] px-6 py-3 text-sm font-black text-white shadow-[0_14px_28px_rgba(98,191,185,0.35)]">Actualizar</button></div></div> : <div key={`${feedMode}-${feedSeed}-${selectedService || 'todos'}`} ref={feedRef} onScroll={(e) => { const el = e.currentTarget; const cardHeight = Math.max(1, el.clientHeight - 74); const nextIndex = Math.round(el.scrollTop / cardHeight); if (nextIndex !== feedIndex && feedWorkers[nextIndex]) { setFeedIndex(nextIndex); setSelected(feedWorkers[nextIndex]); } }} className="h-full snap-y snap-mandatory overflow-y-auto scroll-smooth bg-black">
      {feedWorkers.map((worker, index) => (
  <WorkerFeedCard
    key={String(worker.post_id || worker.user_id)}
    worker={worker}
    isActive={index === feedIndex}
    onOpen={() => openProfile(worker)}
    onAddFriend={() => addFriend(worker)}
    onComments={() => openComments(worker)}
    onLike={() => toggleWorkerLike(worker)}
    onNearbyMap={() => {
      setNearbyMapWorker(worker);
      setNearbyMapOpen(true);
    }}
  />
))}</div>}<AnimatePresence>{showProfile && selected && <WorkerProfileSheet worker={selected} onClose={() => setShowProfile(false)} />}</AnimatePresence>
    <AnimatePresence>
  {showMyPosts && (
    <MyPostsSheet
  open={showMyPosts}
  posts={workerPosts}
  onClose={() => setShowMyPosts(false)}
  onOpenPost={(post) => setSelectedPost(post)}
/>
  )}
</AnimatePresence>
<AnimatePresence>
  {selectedPost && (
    <PostViewerSheet
      post={selectedPost}
      onClose={() => setSelectedPost(null)}
    />
  )}
</AnimatePresence>
    <AnimatePresence>{showAllWorkers && <AllWorkersSheet open={showAllWorkers} workers={feedWorkers} onClose={() => setShowAllWorkers(false)} onSelect={(worker) => { setSelected(worker); setShowAllWorkers(false); setShowProfile(true); }} />}</AnimatePresence><AnimatePresence>{nearbyMapOpen && <NearbyMapSheet open={nearbyMapOpen} workers={nearbyWorkers} center={mapCenter} hasMeCoords={hasMeCoords} me={me} selectedWorker={nearbyMapWorker} onSelectWorker={(worker) => { setNearbyMapWorker(worker); setSelected(worker); }} onClose={() => setNearbyMapOpen(false)} onOpenProfile={(worker) => { setSelected(worker); setNearbyMapOpen(false); setShowProfile(true); }} />}</AnimatePresence><AnimatePresence>{commentsOpen && <CommentsSheet open={commentsOpen} worker={commentsWorker} comments={workerComments} commentText={commentText} setCommentText={setCommentText} onClose={() => { setCommentsOpen(false); setCommentsWorker(null); setWorkerComments([]); setCommentText(''); }} onSend={sendPublicComment} />}</AnimatePresence>
  <div className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+26px)] z-50 flex items-center justify-center">
  <div className="pointer-events-auto flex w-[300px] items-center justify-between rounded-full border border-white/15 bg-black/28 px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur-[22px]">

    <button
      type="button"
      onClick={() => setShowMyPosts(true)}
      className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition active:scale-95"
      aria-label="Ver publicados"
    >
      <ImagePlus size={18} />
    </button>

    <label className="flex h-[68px] w-[68px] cursor-pointer items-center justify-center rounded-full bg-[#62bfb9] text-white shadow-[0_16px_34px_rgba(98,191,185,0.48)] transition active:scale-95">
      <Upload size={24} />

      <input
        type="file"
        accept="image/*,video/*"
        className="hidden"
        disabled={uploadingMedia}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadWorkerMedia(file);
          e.target.value = '';
        }}
      />
    </label>

    <button
      type="button"
      onClick={() => router.push('/worker')}
      className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-800 transition active:scale-95"
      aria-label="Ir al panel"
    >
      <ShieldCheck size={18} />
    </button>

  </div>
</div>
<AnimatePresence>
  {createPostOpen && (
    <CreatePostSheet
      open={createPostOpen}
      previewUrl={draftPreviewUrl}
      file={draftFile}
      caption={draftCaption}
      setCaption={setDraftCaption}
      textOverlay={draftTextOverlay}
      setTextOverlay={setDraftTextOverlay}
      serviceType={draftServiceType}
      setServiceType={setDraftServiceType}
      music={draftMusic}
      setMusic={setDraftMusic}
      uploading={uploadingMedia}
      uploadProgress={uploadProgress}
uploadLabel={uploadLabel}
      onClose={() => {
        setCreatePostOpen(false);
        setDraftFile(null);
        setDraftPreviewUrl('');
      }}
      onPublish={publishWorkerPost}
    />
  )}
</AnimatePresence>
  </div></div></div></div>
  );
}
