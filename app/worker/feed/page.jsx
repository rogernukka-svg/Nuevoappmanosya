'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Sparkles,
  MapPin,
  MessageCircle,
  SendHorizontal,
  Compass,
  Bell,
  BadgeCheck,
  Check,
  Heart,
  Share2,
  UserPlus,
   ArrowLeft,
    Upload,
  ImagePlus,
  Briefcase,
  User2,
  Power,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabase } from '@/lib/supabase';
import { cacheMediaUrls, collectWorkerMediaUrls } from '@/lib/mediaCache';
import ProfileOnlyFeedVisual, { isProfileOnlyMedia } from '@/components/ProfileOnlyFeedVisual';
import {
  FEED_VIDEO_ATTR,
  FEED_VIDEO_MANUAL_PAUSE_EVENT,
  FEED_VIDEO_PLAY_REQUEST_EVENT,
  pauseFeedVideo,
  pauseOtherFeedVideos,
  playFeedVideo,
} from '@/lib/feedVideoPlayback';
import { requireRole } from '@/lib/roleRedirect';
import { canAttemptAction, inspectTextSafety, validateMediaFile } from '@/lib/security';
import { userFriendlyError } from '@/lib/userFacingErrors';

const supabase = getSupabase();
const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then((m) => m.Circle), { ssr: false });

const LS_APP_ROLE = 'app_role';
const LAST_GPS_KEY = 'manosya_worker_feed_gps';
const FEED_SOUND_KEY = 'manosya_feed_sound_enabled';
const WORKER_NOTIFICATIONS_SEEN_KEY = 'manosya_worker_notifications_seen_at';
const WORKER_CHAT_SEEN_MAP_KEY = 'manosya_worker_chat_seen_map';
const VIDEO_REMINDER_KEY = 'manosya_video_upload_reminder_at';
const WORKER_MEDIA_ACCEPT =
  'image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,video/webm,video/x-m4v,video/3gpp,image/*,video/*';
const WORKER_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];
const WORKER_VIDEO_EXTENSIONS = ['mp4', 'mov', 'm4v', 'webm', '3gp', '3gpp'];
const HOME_VIEW = { center: [-25.5097, -54.6111], zoom: 12 };

function getFileExtension(file) {
  return String(file?.name || '').split('.').pop()?.toLowerCase() || '';
}

function isWorkerImageFile(file) {
  const type = String(file?.type || '').toLowerCase();
  return type.startsWith('image/') || WORKER_IMAGE_EXTENSIONS.includes(getFileExtension(file));
}

function isWorkerVideoFile(file) {
  const type = String(file?.type || '').toLowerCase();
  return type.startsWith('video/') || WORKER_VIDEO_EXTENSIONS.includes(getFileExtension(file));
}

function getWorkerMediaContentType(file) {
  const type = String(file?.type || '').toLowerCase();
  if (type.startsWith('image/') || type.startsWith('video/')) return type;

  const ext = getFileExtension(file);
  if (ext === 'mp4' || ext === 'm4v') return 'video/mp4';
  if (ext === 'mov') return 'video/quicktime';
  if (ext === 'webm') return 'video/webm';
  if (ext === '3gp' || ext === '3gpp') return 'video/3gpp';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic') return 'image/heic';
  if (ext === 'heif') return 'image/heif';
  return 'application/octet-stream';
}

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

function getWorkerNotificationsSeenAt() {
  if (typeof window === 'undefined') return 0;
  try {
    return Number(localStorage.getItem(WORKER_NOTIFICATIONS_SEEN_KEY) || 0);
  } catch {
    return 0;
  }
}

function getWorkerChatSeenMap() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(WORKER_CHAT_SEEN_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const SERVICE_CATALOG = [
  { slug: 'taxi', name: 'Taxi' },
  { slug: 'chofer', name: 'Chofer' },
  { slug: 'plomeria', name: 'PlomerÃ­a' },
  { slug: 'electricidad', name: 'Electricidad' },
  { slug: 'limpieza', name: 'Limpieza' },
  { slug: 'jardineria', name: 'JardinerÃ­a' },
  { slug: 'auxilio-vehicular', name: 'Auxilio vehicular' },
  { slug: 'fletes', name: 'Fletes y mudanzas' },
  { slug: 'contador', name: 'Contador' },
  { slug: 'abogado', name: 'Abogado' },
  { slug: 'peluqueria', name: 'PeluquerÃ­a' },
  { slug: 'parrillero', name: 'Parrillero' },
  { slug: 'refrigeracion', name: 'RefrigeraciÃ³n' },
  { slug: 'informatica', name: 'InformÃ¡tica' },
];
const MUSIC_LIBRARY = [
  { title: 'Sin mÃºsica', url: '' },
  { title: 'ManosYA suave', url: '/sounds/manosya-suave.mp3' },
  { title: 'Trabajo pro', url: '/sounds/trabajo-pro.mp3' },
  { title: 'Ambiente obras', url: '/sounds/ambiente-obras.mp3' },
];
const SEARCH_KEYWORDS = {
  plomeria: ['plomero', 'plomeria', 'caÃ±o', 'cano', 'caneria', 'agua', 'perdida', 'gotea', 'baÃ±o', 'inodoro', 'canilla'],
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
  if (!Number.isFinite(km)) return 'â€”';
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
  return rating == null ? 'Sin reseÃƒÂ±as' : `Ã¢Â­Â ${rating.toFixed(1)}`;
}
function formatWorkerRatingClean(worker) {
  const rating = workerRatingValue(worker);
  return rating == null ? 'Nuevo perfil' : `Rating ${rating.toFixed(1)}`;
}
function workerShareUrl(worker, path = '/worker/feed') {
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
function shuffleBySeed(list, seed = 1) {
  const seededRandom = (index) => {
    const x = Math.sin(index + seed * 9999) * 10000;
    return x - Math.floor(x);
  };

  return [...(list || [])]
    .map((item, index) => ({ item, sort: seededRandom(index) }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);
}

function workerHasVideo(worker) {
  if (String(worker?.media_type || '').toLowerCase() === 'video') return true;

  return Array.isArray(worker?.profile_media)
    ? worker.profile_media.some((item) => String(item?.media_type || '').toLowerCase() === 'video')
    : false;
}

function prioritizeVideoWorkers(list, seed = 1) {
  const videos = [];
  const rest = [];

  for (const worker of list || []) {
    if (workerHasVideo(worker)) videos.push(worker);
    else rest.push(worker);
  }

  return [
    ...shuffleBySeed(videos, seed + 17),
    ...shuffleBySeed(rest, seed + 91),
  ];
}

function prioritizeSearchResultsByVideo(list, seed = 1) {
  const buckets = new Map();

  for (const worker of list || []) {
    const score = Number(worker?._searchScore || 0);
    const key = String(score);
    const bucket = buckets.get(key) || [];
    bucket.push(worker);
    buckets.set(key, bucket);
  }

  return [...buckets.keys()]
    .map(Number)
    .sort((a, b) => b - a)
    .flatMap((score, index) => prioritizeVideoWorkers(buckets.get(String(score)), seed + index * 19));
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

function WorkerFeedCard({ worker, isActive, isFollowed, isLiked, onOpen, onAddFriend, onComments, onLike, onNearbyMap }) {
  const [bioOpen, setBioOpen] = useState(false);
  const videoRef = useRef(null);
  const playbackTokenRef = useRef(0);
   const [paused, setPaused] = useState(!isActive);
  const [muted, setMuted] = useState(() => !isFeedSoundEnabled());

  const primaryService = serviceLabelForWorker(worker);
  const mediaUrl =
    worker?.media_url ||
    worker?.cover_url ||
    worker?.video_thumb_url ||
    worker?.avatar_url ||
    '/avatar-fallback.png';

  const isVideo = worker?.media_type === 'video';
  const isProfileOnlyCard = isProfileOnlyMedia(worker);
  const likes = worker?.likes_count || worker?.like_count || 0;
  const reviews = worker?.comments_count || worker?.total_reviews || 0;
  const isOnline = isOnlineRecent(worker);

  const workerName = worker?.full_name || 'trabajador';
  const postText =
    worker?.post_description ||
    worker?.caption ||
    worker?.bio ||
    'MirÃ¡ trabajos reales, fotos, videos y presentaciÃ³n profesional dentro de ManosYA.';

  const isLongBio = postText.length > 95;
  const shortBio = isLongBio ? `${postText.slice(0, 95).trim()}...` : postText;

  useEffect(() => {
    if (!isVideo || !videoRef.current) return;

    const video = videoRef.current;
    const syncPaused = () => setPaused(true);
    const syncPlaying = () => setPaused(false);

    video.addEventListener(FEED_VIDEO_MANUAL_PAUSE_EVENT, syncPaused);
    video.addEventListener(FEED_VIDEO_PLAY_REQUEST_EVENT, syncPlaying);

    return () => {
      video.removeEventListener(FEED_VIDEO_MANUAL_PAUSE_EVENT, syncPaused);
      video.removeEventListener(FEED_VIDEO_PLAY_REQUEST_EVENT, syncPlaying);
    };
  }, [isVideo, mediaUrl]);

  useEffect(() => {
    if (!isVideo) return;
    setPaused(!isActive);
  }, [isActive, isVideo, mediaUrl]);

  useEffect(() => {
    const markSoundEnabled = () => unlockFeedSound();
    const syncSound = () => {
      setMuted(false);
      const video = videoRef.current;
      if (!video || !isActive) return;
      const token = ++playbackTokenRef.current;
      playFeedVideo(video, {
        withSound: true,
        protect: true,
        isCurrent: () => playbackTokenRef.current === token,
      }).then((played) => {
        if (!played || playbackTokenRef.current !== token) return;
        setPaused(false);
      });
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
    const token = ++playbackTokenRef.current;

    if (isActive) {
      const shouldPlayWithSound = isFeedSoundEnabled();
      setMuted(!shouldPlayWithSound);
      playFeedVideo(video, {
        withSound: shouldPlayWithSound,
        isCurrent: () => playbackTokenRef.current === token,
      }).then((played) => {
        if (playbackTokenRef.current !== token) return;
        if (played) {
          setPaused(false);
          setMuted(video.muted);
        } else {
          setPaused(true);
        }
      });
    } else {
      pauseFeedVideo(video, { manual: false });
      setPaused(true);
    }

    const stopIfHidden = () => {
      if (document.hidden) {
        playbackTokenRef.current += 1;
        pauseFeedVideo(video, { manual: false });
        setPaused(true);
      }
    };

    document.addEventListener('visibilitychange', stopIfHidden);
    window.addEventListener('pagehide', stopIfHidden);

    return () => {
      playbackTokenRef.current += 1;
      document.removeEventListener('visibilitychange', stopIfHidden);
      window.removeEventListener('pagehide', stopIfHidden);
      pauseFeedVideo(video, { manual: false });
      setMuted(true);
      setPaused(true);
    };
  }, [isActive, isVideo, mediaUrl]);

    function toggleVideoPlay() {
    const video = videoRef.current;
    if (!video) return;
    unlockFeedSound();

    if (video.paused || paused) {
      setMuted(false);
      setPaused(false);
      const token = ++playbackTokenRef.current;
      playFeedVideo(video, {
        withSound: true,
        isCurrent: () => playbackTokenRef.current === token,
      }).then((played) => {
        if (playbackTokenRef.current !== token) return;
        setPaused(!played);
        setMuted(video.muted);
      });
      return;
    }

    playbackTokenRef.current += 1;
    pauseFeedVideo(video);
    setPaused(true);
  }

  
  const shareWorker = async () => {
    const text = `MirÃ¡ este trabajo en ManosYA: ${workerName} Â· ${primaryService}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${workerName} en ManosYA`,
          text: `Mira este perfil en ManosYA: ${workerName} - ${primaryService}\n${workerShareUrl(worker, '/worker/feed')}`,
          url: workerShareUrl(worker, '/worker/feed'),
        });
        return;
      }

      await navigator.clipboard.writeText(`Mira este perfil en ManosYA: ${workerName} - ${primaryService}\n${workerShareUrl(worker, '/worker/feed')}`);
      toast.success('Link copiado para compartir');
    } catch (error) {
      if (error?.name !== 'AbortError') toast.error('No pudimos compartir ahora');
    }
  };

  return (
    <motion.div
      layout
      style={{ scrollSnapStop: 'always' }}
      className="relative h-[var(--real-vh,100dvh)] w-full snap-start snap-always overflow-hidden bg-black"
    >
      {isVideo ? (
        <div onClick={toggleVideoPlay} className="absolute inset-0 h-full w-full cursor-pointer">
          <video
            ref={videoRef}
            {...{ [FEED_VIDEO_ATTR]: 'true' }}
            src={mediaUrl}
            loop
            muted={muted}
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full bg-black object-cover"
            onPlay={() => setPaused(false)}
            onPause={() => setPaused(true)}
          />

         

          {paused && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/10">
              <div className="rounded-full bg-black/45 px-5 py-5 backdrop-blur-md">
                <span className="ml-1 block h-0 w-0 border-y-[15px] border-l-[22px] border-y-transparent border-l-white" />
              </div>
            </div>
          )}
        </div>
      ) : isProfileOnlyCard ? (
        <ProfileOnlyFeedVisual
          entity={worker}
          entityName={workerName}
          primaryService={primaryService}
          isOnline={isOnline}
          entityType="worker"
        />
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

           <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.36)_22%,rgba(0,0,0,0.02)_56%,rgba(0,0,0,0.18)_100%)]" />

      <div className="absolute right-2 bottom-[calc(env(safe-area-inset-bottom)+84px)] z-30 flex w-10 flex-col items-center text-white">
        <button type="button" onClick={onOpen} className="relative mb-2.5 flex h-11 w-11 items-center justify-center active:scale-95">
          <img
            src={worker?.avatar_url || '/avatar-fallback.png'}
            onError={(e) => {
              e.currentTarget.src = '/avatar-fallback.png';
            }}
            alt={workerName}
            className="h-10 w-10 rounded-full border-2 border-white object-cover shadow-[0_12px_26px_rgba(0,0,0,0.55)]"
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
            className={`absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full text-white shadow-[0_8px_18px_rgba(98,191,185,0.45)] ${isFollowed ? 'bg-sky-500' : 'bg-[#62bfb9]'}`}
            aria-label={isFollowed ? 'Siguiendo' : 'Agregar amigo'}
          >
            {isFollowed ? <Check size={12} strokeWidth={3.4} /> : <UserPlus size={12} strokeWidth={3.2} />}
          </span>
        </button>

        <button type="button" onClick={onLike} className="mb-2 flex w-10 flex-col items-center active:scale-95" aria-label={isLiked ? 'Quitar me encanta' : 'Dar me encanta'}>
          <Heart
            size={26}
            fill={isLiked ? '#ef4444' : 'white'}
            stroke={isLiked ? '#ef4444' : 'white'}
            strokeWidth={1.8}
            className="drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)]"
          />
          <span className="mt-0.5 text-[11px] font-black">{likes}</span>
        </button>

        <button type="button" onClick={onComments} className="mb-2 flex w-10 flex-col items-center active:scale-95">
          <MessageCircle size={26} fill="white" strokeWidth={1.8} className="drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)]" />
          <span className="mt-0.5 text-[11px] font-black">{reviews}</span>
        </button>

        <button type="button" onClick={shareWorker} className="mb-2 flex w-10 flex-col items-center active:scale-95" aria-label="Compartir">
          <Share2 size={25} className="drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)]" />
        </button>

        <button type="button" onClick={onNearbyMap} className="flex w-10 flex-col items-center active:scale-95" aria-label="Mapa cercano">
          <MapPin size={26} fill="none" stroke="white" strokeWidth={2.8} className="drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)]" />
        </button>
      </div>

      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+116px)] left-3 right-[58px] z-20 text-white">
        <div className="mb-1.5 inline-flex items-center gap-2 rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-black backdrop-blur-md">
          <span className={isOnline ? 'h-2 w-2 rounded-full bg-emerald-400' : 'h-2 w-2 rounded-full bg-white/55'} />
          {isOnline ? 'Activo ahora' : 'Disponible'}
        </div>

        <div className="flex items-center gap-3">
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
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] font-bold text-white/86">
              <span>{primaryService}</span>
              {worker?._distKm != null && <span>â€¢ {formatKm(worker._distKm)}</span>}
              <span>• {formatWorkerRatingClean(worker)}</span>
            </div>
          </button>
        </div>

        <div className="mt-1 text-[13px] font-semibold leading-5 text-white/95">
          <p className={bioOpen ? '' : 'truncate'}>
            {bioOpen ? postText : shortBio}
          </p>

          {isLongBio && (
            <button
              type="button"
              onClick={() => setBioOpen((prev) => !prev)}
              className="mt-0.5 text-[12px] font-black text-[#9ee5df]"
            >
              {bioOpen ? 'Ver menos' : 'Ver mÃ¡s'}
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

  const isVideo = isWorkerVideoFile(file);

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
              Nueva publicaciÃ³n
            </div>
            <div className="text-xl font-black">MostrÃ¡ tu trabajo</div>
            <p className="mt-1 text-[13px] font-semibold text-white/55">
              SubÃ­ una foto o video y escribÃ­ una descripciÃ³n corta.
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
              Â¿QuÃ© querÃ©s contar?
            </div>
            <textarea
              value={caption}
              onChange={(e) => {
                setCaption(e.target.value);
                setTextOverlay(e.target.value.slice(0, 42));
              }}
              placeholder="Ej: InstalÃ© este aire, quedÃ³ funcionando perfecto."
              rows={4}
              className="mt-3 w-full resize-none rounded-[20px] border border-white/10 bg-black/20 p-4 text-[15px] font-semibold text-white placeholder:text-white/35 outline-none focus:border-[#62bfb9]/70"
            />
          </div>

          <div className="mt-4 rounded-[26px] border border-white/10 bg-white/8 p-4">
            <div className="text-[13px] font-black text-white">
              Â¿QuÃ© oficio muestra?
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
          {!comments?.length ? <div className="flex min-h-[180px] items-center justify-center text-center"><div><MessageCircle className="mx-auto mb-3 text-slate-300" size={34} /><div className="text-[17px] font-black text-slate-900">TodavÃ­a no hay comentarios</div><div className="mt-1 text-sm font-semibold text-slate-500">SÃ© el primero en comentar este perfil.</div></div></div> : <div className="space-y-4">{comments.map((item) => <div key={item.id} className="flex gap-3"><img src={item.client_avatar || '/avatar-fallback.png'} onError={(e) => { e.currentTarget.src = '/avatar-fallback.png'; }} alt={item.client_name || 'Usuario'} className="h-10 w-10 rounded-full object-cover" /><div className="min-w-0 flex-1 rounded-[22px] bg-slate-50 px-4 py-3"><div className="truncate text-[14px] font-black text-slate-900">{item.client_name || 'Usuario'}</div><p className="mt-1 text-[14px] font-semibold leading-5 text-slate-600">{item.comment}</p></div></div>)}</div>}
        </div>
        <div className="border-t border-slate-100 bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3"><div className="flex items-center gap-2 rounded-[28px] border border-slate-200 bg-slate-50 px-3 py-2"><input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="EscribÃ­ un comentario pÃºblico..." className="h-11 min-w-0 flex-1 bg-transparent px-2 text-[14px] font-semibold text-slate-700 placeholder:text-slate-400 outline-none" /><button type="button" onClick={onSend} disabled={!commentText.trim()} className="flex h-11 w-11 items-center justify-center rounded-full bg-[#62bfb9] text-white shadow-[0_10px_22px_rgba(98,191,185,0.35)] disabled:opacity-45 active:scale-95"><SendHorizontal size={17} strokeWidth={2.8} /></button></div></div>
      </motion.div>
    </div>
  );
}

function ProductCommentsSheet({ open, worker, comments, commentText, setCommentText, onClose, onSend, onOpenDm }) {
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
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#0c6b70]">Comentarios</div>
            <div className="mt-1 truncate text-[20px] font-black text-slate-900">{worker?.full_name || 'Trabajador'}</div>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 active:scale-95">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!comments?.length ? (
            <div className="flex min-h-[180px] items-center justify-center text-center">
              <div>
                <MessageCircle className="mx-auto mb-3 text-slate-300" size={34} />
                <div className="text-[17px] font-black text-slate-900">Todavía no hay comentarios</div>
                <div className="mt-1 text-sm font-semibold text-slate-500">Sé el primero en comentar este perfil.</div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((item) => {
                const hasProduct = Boolean(item.product_title || item.product_image_url || item.product_price_text);
                const isSupplier = item.commenter_role === 'supplier' || hasProduct;

                return (
                  <div key={item.id} className="flex gap-3">
                    <img
                      src={item.client_avatar || '/avatar-fallback.png'}
                      onError={(event) => { event.currentTarget.src = '/avatar-fallback.png'; }}
                      alt={item.client_name || 'Usuario'}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <div className="min-w-0 flex-1 rounded-[22px] bg-slate-50 px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-[14px] font-black text-slate-900">{item.client_name || 'Usuario'}</div>
                          {isSupplier && <div className="mt-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-[#0c6b70]">Proveedor</div>}
                        </div>
                        {isSupplier && item.client_id && (
                          <button
                            type="button"
                            onClick={() => onOpenDm?.(item.client_id)}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#62bfb9] text-white shadow-[0_8px_18px_rgba(98,191,185,0.28)] active:scale-95"
                            aria-label="Mensaje privado"
                          >
                            <MessageCircle size={16} strokeWidth={3} />
                          </button>
                        )}
                      </div>

                      <p className="mt-1 text-[14px] font-semibold leading-5 text-slate-600">{item.comment}</p>

                      {hasProduct && (
                        <div className="mt-3 overflow-hidden rounded-[20px] border border-[#d6f4f1] bg-white shadow-sm">
                          <div className="flex gap-3 p-2.5">
                            <img
                              src={item.product_image_url || '/avatar-fallback.png'}
                              onError={(event) => { event.currentTarget.src = '/avatar-fallback.png'; }}
                              alt={item.product_title || 'Producto'}
                              className="h-20 w-20 shrink-0 rounded-2xl object-cover"
                            />
                            <div className="min-w-0 flex-1 py-1">
                              <div className="line-clamp-2 text-[14px] font-black text-slate-950">{item.product_title || 'Producto del proveedor'}</div>
                              {item.product_price_text && <div className="mt-1 text-[13px] font-black text-[#0c6b70]">{item.product_price_text}</div>}
                              <div className="mt-1 text-[11px] font-bold text-slate-400">Tocá mensaje para coordinar en privado</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3">
          <div className="flex items-center gap-2 rounded-[28px] border border-slate-200 bg-slate-50 px-3 py-2">
            <input
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="Escribí un comentario público..."
              className="h-11 min-w-0 flex-1 bg-transparent px-2 text-[14px] font-semibold text-slate-700 placeholder:text-slate-400 outline-none"
            />
            <button type="button" onClick={onSend} disabled={!commentText.trim()} className="flex h-11 w-11 items-center justify-center rounded-full bg-[#62bfb9] text-white shadow-[0_10px_22px_rgba(98,191,185,0.35)] disabled:opacity-45 active:scale-95">
              <SendHorizontal size={17} strokeWidth={2.8} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ProfileMediaViewer({ mediaList = [], activeIndex = 0, onClose }) {
  const scrollerRef = useRef(null);
  const itemRefs = useRef([]);
  const videoRefs = useRef({});
  const [currentIndex, setCurrentIndex] = useState(activeIndex);
  const safeMediaList = useMemo(
    () => (Array.isArray(mediaList) ? mediaList.filter((item) => item?.media_url || item?.thumbnail_url) : []),
    [mediaList]
  );
  const endIndex = safeMediaList.length;

  function pauseInactiveVideos(nextIndex = endIndex) {
    Object.entries(videoRefs.current).forEach(([key, video]) => {
      if (!video || Number(key) === nextIndex) return;
      video.pause();
    });
  }

  useEffect(() => {
    if (!safeMediaList.length) return undefined;

    document.querySelectorAll('video').forEach((video) => {
      if (Object.values(videoRefs.current).includes(video)) return;
      video.pause();
    });
  }, [safeMediaList.length]);

  useEffect(() => {
    if (!safeMediaList.length) return undefined;
    const safeIndex = Math.max(0, Math.min(activeIndex, safeMediaList.length - 1));
    setCurrentIndex(safeIndex);

    const timer = setTimeout(() => {
      itemRefs.current[safeIndex]?.scrollIntoView?.({ block: 'center', behavior: 'auto' });
    }, 70);

    return () => clearTimeout(timer);
  }, [activeIndex, safeMediaList.length]);

  useEffect(() => {
    pauseInactiveVideos(currentIndex);
    if (currentIndex >= endIndex) return;

    const video = videoRefs.current[currentIndex];
    const isVideo = String(safeMediaList[currentIndex]?.media_type || '').toLowerCase() === 'video';
    if (video && isVideo) {
      video.play().catch(() => {});
    }
  }, [currentIndex, safeMediaList, endIndex]);

  if (!safeMediaList.length) return null;

  function handleScroll() {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const scrollerRect = scroller.getBoundingClientRect();
    const centerY = scrollerRect.top + scrollerRect.height / 2;
    let nextIndex = currentIndex;
    let closestDistance = Number.POSITIVE_INFINITY;

    itemRefs.current.forEach((item, index) => {
      if (!item) return;
      const rect = item.getBoundingClientRect();
      const itemCenter = rect.top + rect.height / 2;
      const distance = Math.abs(itemCenter - centerY);
      if (distance < closestDistance) {
        closestDistance = distance;
        nextIndex = index;
      }
    });

    if (nextIndex !== currentIndex) {
      setCurrentIndex(nextIndex);
      pauseInactiveVideos(nextIndex);
    }
  }

  return (
    <div className="fixed inset-0 z-[70000] isolate bg-black">
      <button
        type="button"
        onClick={onClose}
        className="absolute left-4 top-[calc(env(safe-area-inset-top)+14px)] z-20 inline-flex h-11 items-center gap-2 rounded-full bg-white/16 px-4 text-[13px] font-black text-white shadow-[0_14px_34px_rgba(0,0,0,0.24)] backdrop-blur-xl active:scale-95"
        aria-label="Cerrar"
      >
        <ArrowLeft size={17} strokeWidth={3} />
        Perfil
      </button>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-[calc(env(safe-area-inset-top)+14px)] z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/12 text-white shadow-[0_14px_34px_rgba(0,0,0,0.24)] backdrop-blur-xl active:scale-95"
        aria-label="Cerrar"
      >
        <X size={19} />
      </button>

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="h-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain bg-black"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col">
          {safeMediaList.map((item, index) => {
            const mediaUrl = item.media_url || item.thumbnail_url;
            const isVideo = String(item.media_type || '').toLowerCase() === 'video';
            const isActive = index === currentIndex;

            return (
              <section
                key={`${item.id || mediaUrl}-${index}`}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                className="flex h-[var(--real-vh,100dvh)] snap-start snap-always items-center justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-[calc(env(safe-area-inset-top)+70px)]"
              >
                <div className="relative w-full overflow-hidden rounded-[28px] bg-black shadow-[0_24px_80px_rgba(0,0,0,0.45)] ring-1 ring-[#62bfb9]/30">
                  {isVideo ? (
                    <video
                      ref={(node) => {
                        if (node) videoRefs.current[index] = node;
                        else delete videoRefs.current[index];
                      }}
                      src={mediaUrl}
                      controls
                      autoPlay={isActive}
                      playsInline
                      preload="metadata"
                      className="max-h-[calc(var(--real-vh,100dvh)-120px)] w-full object-contain"
                      onPlay={() => {
                        setCurrentIndex(index);
                        pauseInactiveVideos(index);
                      }}
                    />
                  ) : (
                    <img
                      src={mediaUrl}
                      onError={(e) => {
                        e.currentTarget.src = '/avatar-fallback.png';
                      }}
                      alt={item.caption || 'Trabajo publicado'}
                      className="max-h-[calc(var(--real-vh,100dvh)-120px)] w-full object-contain"
                    />
                  )}

                  {item.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/76 to-transparent px-4 pb-4 pt-12">
                      <p className="line-clamp-3 text-[14px] font-bold leading-5 text-white">
                        {item.caption}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
          <section
            ref={(node) => {
              itemRefs.current[endIndex] = node;
            }}
            className="flex h-[var(--real-vh,100dvh)] snap-start snap-always items-center justify-center px-6 pb-[calc(env(safe-area-inset-bottom)+22px)] pt-[calc(env(safe-area-inset-top)+70px)] text-center"
          >
            <div className="w-full max-w-sm rounded-[30px] border border-white/14 bg-white/8 p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#62bfb9] text-white shadow-[0_14px_34px_rgba(98,191,185,0.32)]">
                <Check size={25} strokeWidth={3} />
              </div>
              <div className="mt-4 text-[22px] font-black">Fin del perfil</div>
              <p className="mt-2 text-[14px] font-semibold leading-5 text-white/70">
                Estos son todos los trabajos publicados por este trabajador.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 w-full rounded-full bg-white px-5 py-3 text-[14px] font-black text-slate-950 active:scale-[0.98]"
              >
                Volver al perfil
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function WorkerProfileSheet({ worker, onClose, onHire, viewerId, onCoverChange, onAvatarChange }) {
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(null);
  const coverInputRef = useRef(null);
  const avatarInputRef = useRef(null);

  if (!worker) return null;
  const services = splitWorkerServices(worker);
  const online = isOnlineRecent(worker);
  const canEditCover = String(viewerId || '') === String(worker?.user_id || worker?.worker_id || '');
  const profileMedia = Array.isArray(worker?.profile_media) && worker.profile_media.length ? worker.profile_media : [{ id: worker?.post_id || worker?.media_url || worker?.avatar_url, media_url: worker?.media_url || worker?.cover_url || worker?.avatar_url, thumbnail_url: worker?.thumbnail_url || worker?.cover_url || worker?.avatar_url, media_type: worker?.media_type || 'image', caption: worker?.post_description || worker?.caption || '' }].filter((item) => item.media_url);
  const followersCount = Number(worker?.followers_count || worker?.followers || worker?.total_followers || 0);
  const likesCount = Number(worker?.likes_count || worker?.like_count || 0);
  const reviewsCount = Number(worker?.total_reviews || worker?.rating_count || 0);
  const setSelectedMedia = (media) => {
    const exactIndex = profileMedia.indexOf(media);
    if (exactIndex >= 0) {
      setSelectedMediaIndex(exactIndex);
      return;
    }

    const nextIndex = profileMedia.findIndex((item) => (
      String(item?.id || item?.media_url || item?.thumbnail_url || '') ===
      String(media?.id || media?.media_url || media?.thumbnail_url || '')
    ));
    setSelectedMediaIndex(nextIndex >= 0 ? nextIndex : 0);
  };

  return (
    <div className="absolute inset-0 z-[65000] bg-slate-950/58 p-3 backdrop-blur-sm sm:p-5">
      {selectedMediaIndex != null && (
        <ProfileMediaViewer
          mediaList={profileMedia}
          activeIndex={selectedMediaIndex}
          onClose={() => setSelectedMediaIndex(null)}
        />
      )}
      <motion.div initial={{ opacity: 0, y: 32, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.98 }} className="mx-auto flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-[34px] border border-white/18 bg-[linear-gradient(180deg,#eff6f7_0%,#ffffff_40%,#f8fbfc_100%)] shadow-[0_30px_90px_rgba(15,23,42,0.24)]">
        <div className="relative h-[270px] overflow-hidden bg-slate-900"><img src={worker?.cover_url || worker?.video_thumb_url || worker?.avatar_url || '/avatar-fallback.png'} onError={(e) => { e.currentTarget.src = '/avatar-fallback.png'; }} alt={worker?.full_name || 'Trabajador'} className="h-full w-full object-cover" /><div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(2,6,23,0.88),rgba(2,6,23,0.12))]" /><button type="button" onClick={onClose} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/16 text-white backdrop-blur-md"><X size={18} /></button>{canEditCover && <><input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) onCoverChange?.(file, worker); event.target.value = ''; }} /><button type="button" onClick={() => coverInputRef.current?.click()} className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/18 px-3 py-2 text-[12px] font-black text-white backdrop-blur-md active:scale-95"><ImagePlus size={15} />Cambiar portada</button></>}<div className="absolute bottom-5 left-5 right-5"><div className="flex items-end gap-4"><div className="relative h-24 w-24 shrink-0"><img src={worker?.avatar_url || '/avatar-fallback.png'} onError={(e) => { e.currentTarget.src = '/avatar-fallback.png'; }} alt={worker?.full_name || 'Avatar'} className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-[0_14px_30px_rgba(15,23,42,0.24)]" />{canEditCover && <><input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) onAvatarChange?.(file, worker); event.target.value = ''; }} /><button type="button" onClick={() => avatarInputRef.current?.click()} className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#62bfb9] text-white shadow-lg active:scale-95" aria-label="Cambiar foto de perfil"><ImagePlus size={16} /></button></>}</div><div className="pb-2 text-white"><div className="text-[28px] font-black leading-none">{worker?.full_name || 'Trabajador'}</div><div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/85"><span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 backdrop-blur-md"><Sparkles size={14} />{serviceLabelForWorker(worker)}</span>{online && <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-black text-emerald-200">Activo ahora</span>}</div></div></div></div></div>
        <div className="flex-1 overflow-y-auto p-5 sm:p-6"><div className="mb-5 grid grid-cols-4 gap-2 rounded-[26px] border border-slate-200 bg-white p-3 text-center shadow-sm"><div><div className="text-[18px] font-black text-slate-950">{profileMedia.length}</div><div className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">Posts</div></div><div><div className="text-[18px] font-black text-slate-950">{followersCount}</div><div className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">Seguidores</div></div><div><div className="text-[18px] font-black text-slate-950">{likesCount}</div><div className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">Me encanta</div></div><div><div className="text-[18px] font-black text-slate-950">{workerRatingValue(worker) == null ? '-' : workerRatingValue(worker).toFixed(1)}</div><div className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">{reviewsCount ? 'Rating' : 'Nuevo'}</div></div></div><div className="mb-5"><div className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Trabajos publicados</div><div className="grid grid-cols-3 gap-1 overflow-hidden rounded-[18px] bg-slate-100">{profileMedia.slice(0, 9).map((item, idx) => <button type="button" onClick={() => setSelectedMedia(item)} key={`${item.id || item.media_url}-${idx}`} className="relative aspect-[3/4] overflow-hidden bg-slate-200 text-left active:scale-[0.99]">{item.media_type === 'video' ? <video src={item.media_url} muted playsInline preload="metadata" className="h-full w-full object-cover" /> : <img src={item.thumbnail_url || item.media_url} onError={(e) => { e.currentTarget.src = '/avatar-fallback.png'; }} alt={item.caption || 'Trabajo'} className="h-full w-full object-cover" />}{item.media_type === 'video' && <span className="absolute right-2 top-2 rounded-full bg-black/45 px-2 py-1 text-[10px] font-black text-white">VIDEO</span>}</button>)}</div></div><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"><div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Rating</div><div className="mt-2 text-2xl font-black text-slate-900">{workerRatingValue(worker) == null ? 'Nuevo' : workerRatingValue(worker).toFixed(1)}</div></div><div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"><div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">ReseÃ±as</div><div className="mt-2 text-2xl font-black text-slate-900">{Number(worker?.total_reviews || 0)}</div></div><div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"><div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Radio</div><div className="mt-2 text-2xl font-black text-slate-900">{Number(worker?.radius_km || 5)} km</div></div></div><div className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"><div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Sobre este trabajador</div><p className="mt-3 text-[15px] leading-7 text-slate-600">{worker?.bio || 'Perfil listo para mostrar trabajos, fotos, videos y fortalecer comunidad profesional dentro de ManosYA.'}</p></div><div className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"><div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Servicios</div><div className="mt-4 flex flex-wrap gap-2">{(services.length ? services : ['Servicio general']).map((item, idx) => <span key={`${item}-${idx}`} className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-bold text-[#0c6b70]">{serviceMetaBySlug(item)?.name || item}</span>)}</div></div></div>
        <div className="grid grid-cols-2 gap-3 border-t border-slate-200 bg-white p-4 sm:p-5"><button type="button" onClick={onClose} className="rounded-[22px] border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-800 shadow-sm">Volver</button><button type="button" onClick={onHire} className="rounded-[22px] bg-gradient-to-r from-[#0c6b70] via-[#62bfb9] to-[#9ee5df] px-5 py-4 text-sm font-black text-white shadow-[0_16px_34px_rgba(98,191,185,0.34)]">Contratar servicio</button></div>
      </motion.div>
    </div>
  );
}

function WorkerNearbyMapSheet({
  open,
  workers,
  center,
  hasMeCoords,
  me,
  selectedWorker,
  onSelectWorker,
  onClose,
  onOpenProfile,
  onHire,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeWorker, setActiveWorker] = useState(null);
  const validWorkers = (workers || []).filter((worker) => (
    Number.isFinite(Number(worker?.lat)) && Number.isFinite(Number(worker?.lng))
  ));
  const mapWorkers = validWorkers.slice(0, 14);

  useEffect(() => {
    if (!open) return;

    const selectedId = selectedWorker?.user_id || selectedWorker?.worker_id;
    const selectedOnMap = selectedId
      ? validWorkers.find((worker) => String(worker.user_id || worker.worker_id) === String(selectedId))
      : null;
    const nextWorker = selectedOnMap || mapWorkers[activeIndex] || mapWorkers[0] || validWorkers[0] || null;

    setActiveWorker(nextWorker);
    if (nextWorker) {
      const nextIndex = validWorkers.findIndex((worker) => (
        String(worker.user_id || worker.worker_id) === String(nextWorker.user_id || nextWorker.worker_id)
      ));
      if (nextIndex >= 0) setActiveIndex(nextIndex);
    }
  }, [open, selectedWorker?.user_id, selectedWorker?.worker_id]);

  if (!open) return null;

  const active = activeWorker || selectedWorker || mapWorkers[activeIndex] || mapWorkers[0] || validWorkers[0] || null;

  function selectMapWorker(worker) {
    if (!worker) return;

    setActiveWorker(worker);
    const nextIndex = validWorkers.findIndex((item) => (
      String(item.user_id || item.worker_id) === String(worker.user_id || worker.worker_id)
    ));
    if (nextIndex >= 0) setActiveIndex(nextIndex);
    onSelectWorker(worker);
  }

  function goPrevWorker() {
    if (!validWorkers.length) return;

    const activeId = active?.user_id || active?.worker_id;
    const currentIndex = validWorkers.findIndex((worker) => (
      String(worker.user_id || worker.worker_id) === String(activeId)
    ));
    const safeIndex = currentIndex >= 0 ? currentIndex : activeIndex;
    const nextIndex = safeIndex <= 0 ? validWorkers.length - 1 : safeIndex - 1;
    selectMapWorker(validWorkers[nextIndex]);
  }

  function goNextWorker() {
    if (!validWorkers.length) return;

    const activeId = active?.user_id || active?.worker_id;
    const currentIndex = validWorkers.findIndex((worker) => (
      String(worker.user_id || worker.worker_id) === String(activeId)
    ));
    const safeIndex = currentIndex >= 0 ? currentIndex : activeIndex;
    const nextIndex = safeIndex >= validWorkers.length - 1 ? 0 : safeIndex + 1;
    selectMapWorker(validWorkers[nextIndex]);
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
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#0c6b70]">Cerca tuyo</div>
            <div className="text-[20px] font-black text-slate-900">Trabajadores cerca</div>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/8 text-slate-700 active:scale-95">
            <X size={18} />
          </button>
        </div>

        <div className="relative flex-1 overflow-hidden bg-white">
          <MapContainer center={center} zoom={hasMeCoords ? 12 : 11} className="h-full w-full">
            <TileLayer attribution="&copy; CartoDB" url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
            {hasMeCoords && (
              <>
                <Marker position={[Number(me.lat), Number(me.lon)]} icon={meLocationIcon() || undefined} />
                <Circle
                  center={[Number(me.lat), Number(me.lon)]}
                  radius={2500}
                  pathOptions={{ color: '#62bfb9', fillColor: '#62bfb9', fillOpacity: 0.12 }}
                />
              </>
            )}
            {mapWorkers.map((worker) => (
              <Marker
                key={String(worker.user_id || worker.worker_id)}
                position={[Number(worker.lat), Number(worker.lng)]}
                icon={avatarIcon(worker.avatar_url, worker) || undefined}
                eventHandlers={{ click: () => selectMapWorker(worker) }}
              />
            ))}
          </MapContainer>

          {active && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[999] bg-gradient-to-t from-white/82 via-white/20 to-transparent p-4">
              <div className="pointer-events-auto rounded-[30px] border border-white/80 bg-white/96 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl">
<div className="mx-auto flex h-12 max-w-[520px] items-center gap-2 rounded-[28px] border border-white/18 bg-black/36 p-1.5 shadow-[0_18px_44px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
                  <button type="button" onClick={goPrevWorker} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 active:scale-95" aria-label="Anterior">
                    {'<'}
                  </button>
                  <img
                    src={active?.avatar_url || '/avatar-fallback.png'}
                    onError={(e) => { e.currentTarget.src = '/avatar-fallback.png'; }}
                    alt={active?.full_name || 'Trabajador'}
                    className="h-14 w-14 rounded-2xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-black text-slate-900">{active?.full_name || 'Trabajador'}</div>
                    <div className="mt-1 line-clamp-1 text-[11px] font-black text-[#0c6b70]">
                      {active?.full_name || 'Este trabajador'} esta aca, a {formatKm(active?._distKm)} de ti
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] font-bold text-slate-500">
                      <span>{serviceLabelForWorker(active)}</span>
                      <span>â€¢ {formatKm(active?._distKm)}</span>
                      <span>• {formatWorkerRatingClean(active)}</span>
                    </div>
                    <div className="mt-1 text-[10px] font-black text-[#0c6b70]">{isOnlineRecent(active) ? 'En linea ahora' : 'Disponible'}</div>
                  </div>
                  <button type="button" onClick={goNextWorker} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 active:scale-95" aria-label="Siguiente">
                    {'>'}
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => onOpenProfile(active)} className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-[13px] font-black text-slate-800 shadow-sm">
                    Ver perfil
                  </button>
                  <button type="button" onClick={() => onHire(active)} className="rounded-[18px] bg-[#62bfb9] px-4 py-3 text-[13px] font-black text-white shadow-[0_12px_28px_rgba(98,191,185,0.35)]">
                    Contratar servicio
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
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
                <div className="text-lg font-black">TodavÃ­a no publicaste nada</div>
                <p className="mt-2 text-sm font-semibold text-white/55">
                  TocÃ¡ Crear para subir tu primer trabajo.
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
                    <img src={post.media_url} alt={post.caption || 'PublicaciÃ³n'} className="h-full w-full object-cover" />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />

                  {post.media_type === 'video' && (
                    <div className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-1 text-[10px] font-black text-white backdrop-blur-md">
                      VIDEO
                    </div>
                  )}

                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="truncate text-left text-[10px] font-black uppercase tracking-[0.08em] text-[#9ee5df]">
                      {post.service_type || 'General'}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-left text-[11px] font-bold leading-4 text-white">
                      {post.caption || 'Sin descripciÃ³n'}
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

function NotificationsSheet({ open, followers, messages, onClose, onOpenChat }) {
  if (!open) return null;
  const hasNotifications = Boolean(followers.length || messages.length);

  return (
    <div className="fixed inset-0 z-[69000] bg-black/60 p-3 backdrop-blur-sm">
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.98 }}
        className="mx-auto flex h-full w-full max-w-xl flex-col overflow-hidden rounded-[34px] bg-white text-slate-900 shadow-[0_30px_90px_rgba(0,0,0,0.42)]"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#0c6b70]">Notificaciones</div>
            <div className="mt-1 text-[22px] font-black">Actividad reciente</div>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 active:scale-95">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {!hasNotifications ? (
            <div className="flex min-h-[240px] items-center justify-center text-center">
              <div>
                <Bell className="mx-auto mb-3 text-slate-300" size={38} />
                <div className="text-lg font-black">Todavia no hay novedades</div>
                <div className="mt-1 text-sm font-semibold text-slate-500">Mensajes, seguidores y actividad van a aparecer aca.</div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {messages.length > 0 && (
                <section>
                  <div className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Mensajes</div>
                  <div className="space-y-3">
                    {messages.map((message) => (
                      <button
                        key={message.id}
                        type="button"
                        onClick={() => onOpenChat(message.chat_id)}
                        className="flex w-full items-center gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-3 text-left active:scale-[0.99]"
                      >
                        <img
                          src={message.sender?.avatar_url || '/avatar-fallback.png'}
                          onError={(e) => {
                            e.currentTarget.src = '/avatar-fallback.png';
                          }}
                          alt={message.sender?.full_name || 'Cliente'}
                          className="h-14 w-14 rounded-full object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[15px] font-black">{message.sender?.full_name || message.sender?.email || 'Cliente ManosYA'}</div>
                          <div className="mt-1 line-clamp-2 text-[12px] font-bold text-slate-500">{message.text || 'Nuevo mensaje'}</div>
                        </div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#62bfb9] text-white shadow-[0_10px_24px_rgba(98,191,185,0.35)]">
                          <MessageCircle size={18} strokeWidth={3} />
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {followers.length > 0 && (
                <section>
                  <div className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Seguidores</div>
                  <div className="space-y-3">
                    {followers.map((request) => (
                      <div key={request.id} className="flex items-center gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-3">
                        <img
                          src={request.requester?.avatar_url || '/avatar-fallback.png'}
                          onError={(e) => {
                            e.currentTarget.src = '/avatar-fallback.png';
                          }}
                          alt={request.requester?.full_name || 'Usuario'}
                          className="h-14 w-14 rounded-full object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[15px] font-black">{request.requester?.full_name || request.requester?.email || 'Usuario ManosYA'}</div>
                          <div className="mt-1 text-[12px] font-bold text-slate-500">Te sigue en ManosYA</div>
                        </div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#62bfb9] text-white shadow-[0_10px_24px_rgba(98,191,185,0.35)]">
                          <Check size={18} strokeWidth={3} />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function playWorkerNotificationSound() {
  if (typeof window === 'undefined') return;
  try {
    const audio = new Audio('/notify.mp3');
    audio.volume = 0.9;
    audio.play().catch(() => {});
  } catch {}
}

async function requestBrowserNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'default') return Notification.requestPermission();
  return Notification.permission;
}

async function notifyWorkerDevice(title, body, options = {}) {
  playWorkerNotificationSound();
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const notificationOptions = {
    body,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: options.tag || 'manosya-worker-notification',
    renotify: true,
    requireInteraction: Boolean(options.requireInteraction),
    vibrate: options.vibrate || [180, 80, 180],
    data: {
      url: options.url || '/worker/feed',
    },
  };

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration?.showNotification) {
        await registration.showNotification(title, notificationOptions);
        return;
      }
    }

    new Notification(title, notificationOptions);
  } catch {}
}

function hasUploadedVideo(posts) {
  return (posts || []).some((post) => String(post?.media_type || '').toLowerCase() === 'video');
}

function shouldShowVideoReminder(posts) {
  if (typeof window === 'undefined') return false;
  if (hasUploadedVideo(posts)) return false;

  try {
    const lastShownAt = Number(localStorage.getItem(VIDEO_REMINDER_KEY) || 0);
    return Date.now() - lastShownAt > 1000 * 60 * 60 * 20;
  } catch {
    return true;
  }
}

function markVideoReminderShown() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VIDEO_REMINDER_KEY, String(Date.now()));
  } catch {}
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
            <img src={post.media_url} alt={post.caption || 'PublicaciÃ³n'} className="max-h-full w-full object-contain" />
          )}
        </div>

        <div className="border-t border-white/10 p-4">
          <p className="text-[14px] font-semibold leading-5 text-white/85">
            {post.caption || 'Sin descripciÃ³n'}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
function AllWorkersSheet({ open, workers, onClose, onSelect }) {
  if (!open) return null;
  return <div className="absolute inset-0 z-[64000] bg-slate-950/48 p-3 backdrop-blur-sm sm:p-5"><motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="mx-auto flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-[34px] border border-white/20 bg-[linear-gradient(180deg,#eff6f7_0%,#ffffff_40%,#f8fbfc_100%)] shadow-[0_30px_90px_rgba(15,23,42,0.22)]"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Explorar</div><div className="mt-1 text-2xl font-black text-slate-900">Todos los trabajadores</div></div><button type="button" onClick={onClose} className="rounded-full border border-slate-200 bg-white p-2 text-slate-700"><X size={18} /></button></div><div className="flex-1 overflow-y-auto p-4 sm:p-5"><div className="space-y-3">{(workers || []).map((worker) => <div key={String(worker.user_id)} className="flex items-center gap-3 rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm"><img src={worker?.avatar_url || '/avatar-fallback.png'} onError={(e) => { e.currentTarget.src = '/avatar-fallback.png'; }} alt={worker?.full_name || 'Avatar'} className="h-16 w-16 rounded-full object-cover" /><div className="min-w-0 flex-1"><button type="button" onClick={() => onSelect(worker)} className="text-left"><div className="truncate text-[17px] font-black text-slate-900">{worker?.full_name || 'Trabajador'}</div></button><div className="mt-1 flex flex-wrap gap-2 text-[12px] text-slate-500"><span>{serviceLabelForWorker(worker)}</span>{worker?._distKm != null && <span>â€¢ {formatKm(worker._distKm)}</span>}<span>• {formatWorkerRatingClean(worker)}</span></div></div><button type="button" onClick={() => onSelect(worker)} className="rounded-full bg-[#62bfb9] p-2 text-white"><Sparkles size={16} /></button></div>)}</div></div></motion.div></div>;
}

function WorkerFeedNavButton({ icon, active, badge = 0, label, compact = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-[22px] px-2 text-center transition duration-200 active:scale-95 ${
        compact ? 'h-11 w-11' : 'h-12 w-[62px]'
      } ${
        active
          ? 'bg-[#071827] text-white shadow-[0_10px_24px_rgba(7,24,39,0.18)]'
          : 'bg-slate-100 text-[#071827] hover:bg-slate-200'
      }`}
      aria-label={label}
      title={label}
    >
      {icon}
      {!compact && <span className="max-w-full truncate text-[9.5px] font-black leading-none tracking-[-0.01em]">{label}</span>}
      {badge > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

function WorkerHubSheet({
  open,
  tab,
  setTab,
  onClose,
  profile,
  status,
  stats,
  jobs,
  postsCount,
  loadingJobs,
  onToggleStatus,
  onRefreshJobs,
  onOpenJobChat,
  onOpenProfile,
  onOpenPosts,
}) {
  if (!open) return null;

  const isAvailable = status === 'available';
  const visibleJobs = (jobs || []).slice(0, 4);

  return (
    <div className="absolute inset-0 z-[65000] flex items-end bg-black/35 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-[2px]">
      <motion.div
        initial={{ y: 420, opacity: 0.9 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 420, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 34 }}
        className="mx-auto flex max-h-[82dvh] w-full max-w-md flex-col overflow-hidden rounded-[30px] border border-white/18 bg-white text-slate-950 shadow-[0_28px_90px_rgba(0,0,0,0.38)]"
      >
        <div className="flex items-center justify-between px-4 pb-3 pt-4">
          <div className="flex items-center gap-3">
            <img
              src={profile?.avatar_url || '/avatar-fallback.png'}
              onError={(e) => { e.currentTarget.src = '/avatar-fallback.png'; }}
              alt={profile?.full_name || 'Trabajador'}
              className="h-11 w-11 rounded-full object-cover"
            />
            <div className="min-w-0">
              <div className="truncate text-[18px] font-black">{profile?.full_name || 'Mi trabajo'}</div>
              <div className="text-[12px] font-bold text-slate-500">{isAvailable ? 'Visible para pedidos' : 'En pausa'}</div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700">
            <X size={18} />
          </button>
        </div>

        <div className="mx-4 grid grid-cols-2 rounded-full bg-slate-100 p-1">
          <button type="button" onClick={() => setTab('jobs')} className={`rounded-full py-2 text-[13px] font-black ${tab === 'jobs' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Pedidos</button>
          <button type="button" onClick={() => setTab('profile')} className={`rounded-full py-2 text-[13px] font-black ${tab === 'profile' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Perfil</button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4">
          {tab === 'jobs' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-[20px] bg-[#62bfb9]/10 p-3 text-center">
                  <div className="text-[20px] font-black">{stats.open}</div>
                  <div className="text-[10px] font-black uppercase text-slate-400">Nuevos</div>
                </div>
                <div className="rounded-[20px] bg-[#62bfb9]/10 p-3 text-center">
                  <div className="text-[20px] font-black">{stats.active}</div>
                  <div className="text-[10px] font-black uppercase text-slate-400">Activos</div>
                </div>
                <div className="rounded-[20px] bg-[#62bfb9]/10 p-3 text-center">
                  <div className="text-[20px] font-black">{stats.done}</div>
                  <div className="text-[10px] font-black uppercase text-slate-400">Hechos</div>
                </div>
              </div>

              <button
                type="button"
                onClick={onToggleStatus}
                className={`flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-[15px] font-black text-white active:scale-[0.98] ${
                  isAvailable ? 'bg-[#18b8aa]' : 'bg-slate-900'
                }`}
              >
                <Power size={17} />
                {isAvailable ? 'Estoy disponible' : 'Volver a estar disponible'}
              </button>

              <div className="flex items-center justify-between pt-1">
                <div className="text-[15px] font-black">Pedidos recientes</div>
                <button type="button" onClick={onRefreshJobs} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <RefreshCw size={15} className={loadingJobs ? 'animate-spin' : ''} />
                </button>
              </div>

              {loadingJobs ? (
                <div className="rounded-[22px] bg-slate-50 p-5 text-center text-[13px] font-bold text-slate-500">Cargando pedidos...</div>
              ) : visibleJobs.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-[#62bfb9]/35 bg-[#62bfb9]/8 p-5 text-center">
                  <Briefcase className="mx-auto text-[#18b8aa]" size={26} />
                  <div className="mt-2 text-[15px] font-black">Sin pedidos por ahora</div>
                  <div className="mt-1 text-[12px] font-semibold text-slate-500">Cuando entre algo compatible, aparece acá.</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {visibleJobs.map((job) => (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => onOpenJobChat?.(job)}
                      className="w-full rounded-[22px] border border-slate-100 bg-slate-50 p-3 text-left transition active:scale-[0.99]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-[14px] font-black">{job.title || job.service_type || 'Pedido'}</div>
                          <div className="mt-1 line-clamp-2 text-[12px] font-semibold leading-5 text-slate-500">
                            {job.last_message?.text || job.last_message?.content || job.last_message?.body || job.description || 'Solicitud de cliente'}
                          </div>
                          <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.04em] text-[#18b8aa]">
                            <MessageCircle size={13} />
                            Abrir chat
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase text-slate-500">{job.status}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <button
  type="button"
  onClick={onOpenProfile}
  className="flex w-full items-center justify-between rounded-[22px] bg-slate-50 p-4 text-left active:scale-[0.99]"
>
  <div>
    <div className="text-[15px] font-black">Editar perfil profesional</div>
    <div className="mt-1 text-[12px] font-semibold text-slate-500">
      Foto, rubro, radio, documentos, banco y verificación.
    </div>
  </div>
  <User2 size={19} className="text-slate-500" />
</button>
              <button type="button" onClick={onOpenPosts} className="flex w-full items-center justify-between rounded-[22px] bg-slate-50 p-4 text-left active:scale-[0.99]">
                <div>
                  <div className="text-[15px] font-black">Mis publicaciones</div>
                  <div className="mt-1 text-[12px] font-semibold text-slate-500">{postsCount} trabajos publicados.</div>
                </div>
                <ImagePlus size={19} className="text-slate-500" />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function WorkerIdentityEditor({
  open,
  profile,
  worker,
  saving,
  onClose,
  onNameSave,
  onAvatarChange,
  onCoverChange,
}) {
  const [name, setName] = useState(profile?.full_name || '');
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  useEffect(() => {
    if (open) setName(profile?.full_name || '');
  }, [open, profile?.full_name]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[66000] flex items-end bg-black/45 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-[3px]">
      <motion.div
        initial={{ y: 440, opacity: 0.9 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 440, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 34 }}
        className="mx-auto w-full max-w-md overflow-hidden rounded-[30px] bg-white text-slate-950 shadow-[0_28px_90px_rgba(0,0,0,0.40)]"
      >
        <div className="relative h-40 bg-slate-900">
          <img
            src={worker?.cover_url || profile?.cover_url || profile?.avatar_url || '/avatar-fallback.png'}
            onError={(e) => { e.currentTarget.src = '/avatar-fallback.png'; }}
            alt="Portada"
            className="h-full w-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10" />
          <button type="button" onClick={onClose} className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/18 text-white backdrop-blur-md">
            <X size={18} />
          </button>
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) onCoverChange(file); event.target.value = ''; }} />
          <button type="button" onClick={() => coverInputRef.current?.click()} className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/18 px-3 py-2 text-[12px] font-black text-white backdrop-blur-md active:scale-95">
            <ImagePlus size={15} />
            Portada
          </button>
          <div className="absolute -bottom-10 left-5">
            <div className="relative h-20 w-20">
              <img
                src={profile?.avatar_url || '/avatar-fallback.png'}
                onError={(e) => { e.currentTarget.src = '/avatar-fallback.png'; }}
                alt="Foto de perfil"
                className="h-20 w-20 rounded-full border-4 border-white object-cover shadow-lg"
              />
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) onAvatarChange(file); event.target.value = ''; }} />
              <button type="button" onClick={() => avatarInputRef.current?.click()} className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#62bfb9] text-white shadow-lg active:scale-95" aria-label="Cambiar foto">
                <ImagePlus size={15} />
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 pt-14">
          <label className="block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Nombre visible</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Tu nombre o marca profesional"
            className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[15px] font-black text-slate-950 outline-none focus:border-[#62bfb9] focus:bg-white"
          />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={onClose} className="rounded-2xl bg-slate-100 px-4 py-3 text-[13px] font-black text-slate-700">
              Volver
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => onNameSave(name)}
              className="rounded-2xl bg-[#18b8aa] px-4 py-3 text-[13px] font-black text-white disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function WorkerFeedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const feedRef = useRef(null);
  const feedSnapTimerRef = useRef(null);
  const sharedWorkerOpenedRef = useRef('');
  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState({ id: null, lat: null, lon: null });
  const [viewerProfile, setViewerProfile] = useState(null);
const [workers, setWorkers] = useState([]);
const [workerPosts, setWorkerPosts] = useState([]);
const [workerPostsLoaded, setWorkerPostsLoaded] = useState(false);
const [showMyPosts, setShowMyPosts] = useState(false);
const [workerHubOpen, setWorkerHubOpen] = useState(false);
const [workerHubTab, setWorkerHubTab] = useState('jobs');
const [workerStatus, setWorkerStatus] = useState('available');
const [workerJobs, setWorkerJobs] = useState([]);
const [workerJobsLoading, setWorkerJobsLoading] = useState(false);
const [workerProfileMeta, setWorkerProfileMeta] = useState(null);
const [identityEditorOpen, setIdentityEditorOpen] = useState(false);
const [identitySaving, setIdentitySaving] = useState(false);
const [showFriendRequests, setShowFriendRequests] = useState(false);
const [friendRequests, setFriendRequests] = useState([]);
const [messageNotifications, setMessageNotifications] = useState([]);
const [notificationsSeenAt, setNotificationsSeenAt] = useState(() => getWorkerNotificationsSeenAt());
const [chatSeenMapVersion, setChatSeenMapVersion] = useState(0);
const [followedUserIds, setFollowedUserIds] = useState([]);
const [likedWorkerIds, setLikedWorkerIds] = useState([]);
const [selectedPost, setSelectedPost] = useState(null);
const [busy, setBusy] = useState(false);
  const [selectedService, setSelectedService] = useState('');
  const [serviceQuery, setServiceQuery] = useState('');
  const [feedMode, setFeedMode] = useState('all');
  const [feedSeed, setFeedSeed] = useState(Date.now());
  const [feedIndex, setFeedIndex] = useState(0);
  const [feedSlotIndex, setFeedSlotIndex] = useState(0);
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
const draftPreviewUrlRef = useRef('');
  const hasMeCoords = Number.isFinite(Number(me?.lat)) && Number.isFinite(Number(me?.lon));

  useEffect(() => {
    return () => {
      if (feedSnapTimerRef.current) clearTimeout(feedSnapTimerRef.current);
      if (draftPreviewUrlRef.current) URL.revokeObjectURL(draftPreviewUrlRef.current);
    };
  }, []);

  useEffect(() => { setMounted(true); if (typeof window === 'undefined') return; const setRealVH = () => { const h = window.visualViewport?.height ?? window.innerHeight; document.documentElement.style.setProperty('--real-vh', `${Math.round(h)}px`); }; setRealVH(); window.addEventListener('resize', setRealVH); window.visualViewport?.addEventListener('resize', setRealVH); return () => { window.removeEventListener('resize', setRealVH); window.visualViewport?.removeEventListener('resize', setRealVH); }; }, []);
  useEffect(() => { let alive = true; (async () => { try { const { user, profile: profileData } = await requireRole({ supabase, router, allowedRoles: ['worker'], fallbackPath: '/role-selector' }); if (!user) return; if (alive) { setMe((prev) => ({ ...prev, id: user.id })); setViewerProfile(profileData || null); } } catch (error) { console.warn('No se pudo validar la sesiÃ³n del trabajador', error); router.replace('/auth/login'); } })(); return () => { alive = false; }; }, [router]);

  async function loadWorkerHub() {
    if (!me?.id) return;

    try {
      setWorkerJobsLoading(true);

      const { data: workerProfile } = await supabase
        .from('worker_profiles')
        .select('status, skills, cover_url, bio, radius_km')
        .eq('user_id', me.id)
        .maybeSingle();

      const nextSkills = Array.isArray(workerProfile?.skills) ? workerProfile.skills : [];
      setWorkerProfileMeta(workerProfile || null);
      if (workerProfile?.status) setWorkerStatus(workerProfile.status);

      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('id, title, description, status, client_id, worker_id, created_at, service_type')
        .or(`status.eq.open,worker_id.eq.${me.id}`)
        .order('created_at', { ascending: false })
        .limit(24);

      if (jobsError) throw jobsError;

      const filtered = (jobsData || []).filter((job) => {
        const assignedToMe = String(job.worker_id || '') === String(me.id);
        if (assignedToMe) return true;
        const jobService = normalizeSlug(job.service_type || job.title || job.description || '');
        if (!jobService) return false;
        return nextSkills.some((skill) => {
          const cleanSkill = normalizeSlug(skill);
          return cleanSkill && (cleanSkill.includes(jobService) || jobService.includes(cleanSkill));
        });
      });

      const jobIds = filtered.map((job) => job.id).filter(Boolean);
      const { data: chatsData } = jobIds.length
        ? await supabase
            .from('chats')
            .select('id, job_id, client_id, worker_id, created_at')
            .in('job_id', jobIds)
            .eq('worker_id', me.id)
        : { data: [] };

      const chatByJobId = {};
      for (const chat of chatsData || []) {
        if (chat?.job_id && !chatByJobId[String(chat.job_id)]) {
          chatByJobId[String(chat.job_id)] = chat;
        }
      }

      const chatIds = (chatsData || []).map((chat) => chat.id).filter(Boolean);
      const { data: messagesData } = chatIds.length
        ? await supabase
            .from('messages')
            .select('id, chat_id, text, content, body, created_at')
            .in('chat_id', chatIds)
            .order('created_at', { ascending: false })
            .limit(200)
        : { data: [] };

      const lastMessageByChatId = {};
      for (const message of messagesData || []) {
        const chatId = String(message.chat_id || '');
        if (chatId && !lastMessageByChatId[chatId]) {
          lastMessageByChatId[chatId] = message;
        }
      }

      const enrichedJobs = filtered
        .map((job) => {
          const chat = chatByJobId[String(job.id)] || null;
          const lastMessage = chat?.id ? lastMessageByChatId[String(chat.id)] || null : null;
          const lastActivityAt = lastMessage?.created_at || chat?.created_at || job.created_at || null;

          return {
            ...job,
            chat_id: chat?.id || null,
            last_message: lastMessage,
            last_activity_at: lastActivityAt,
          };
        })
        .sort(
          (a, b) =>
            new Date(b.last_activity_at || b.created_at || 0).getTime() -
            new Date(a.last_activity_at || a.created_at || 0).getTime()
        );

      setWorkerJobs(enrichedJobs);
    } catch (error) {
      console.error('worker hub load error', error);
      toast.error(userFriendlyError(error, 'Estamos ordenando tus pedidos. Proba actualizar en un momento.'));
    } finally {
      setWorkerJobsLoading(false);
    }
  }

  async function openWorkerJobChat(job) {
    if (!job?.id || !job?.client_id || !me?.id) {
      toast.error('Este pedido todavia no tiene datos completos para abrir chat');
      return;
    }

    try {
      let chatId = job.chat_id ? String(job.chat_id) : '';

      if (!chatId) {
        const { data: existingChat, error: existingChatError } = await supabase
          .from('chats')
          .select('id')
          .eq('job_id', job.id)
          .eq('client_id', job.client_id)
          .eq('worker_id', me.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingChatError) throw existingChatError;
        chatId = existingChat?.id ? String(existingChat.id) : '';
      }

      if (!chatId) {
        const { data: newChat, error: newChatError } = await supabase
          .from('chats')
          .insert([
            {
              job_id: job.id,
              client_id: job.client_id,
              worker_id: me.id,
            },
          ])
          .select('id')
          .single();

        if (newChatError) {
          if (newChatError.code === '23505') {
            const { data: racedChat, error: racedError } = await supabase
              .from('chats')
              .select('id')
              .eq('job_id', job.id)
              .maybeSingle();

            if (racedError) throw racedError;
            if (racedChat?.id) {
              chatId = String(racedChat.id);
            } else {
              throw newChatError;
            }
          } else {
            throw newChatError;
          }
        } else {
        chatId = newChat?.id ? String(newChat.id) : '';
        }
      }

      if (!chatId) throw new Error('No se pudo abrir el chat del pedido');

      markWorkerChatRead(chatId);
      setWorkerHubOpen(false);
      router.push(`/chat/${chatId}`);
    } catch (error) {
      console.error('open worker job chat error:', error);
      toast.error(userFriendlyError(error, 'No pudimos abrir el chat ahora. Proba de nuevo.'));
    }
  }

  useEffect(() => {
    if (!me?.id) return;
    loadWorkerHub();
  }, [me?.id]);

  useEffect(() => {
    if (!me?.id) return;
    if (searchParams?.get('edit') === 'profile') {
      setIdentityEditorOpen(true);
      setWorkerHubOpen(false);
    }
  }, [me?.id, searchParams]);

  async function toggleWorkerStatusFromFeed() {
    if (!me?.id) return;
    const nextStatus = workerStatus === 'available' ? 'paused' : 'available';

    setWorkerStatus(nextStatus);
    try {
      const { error } = await supabase
        .from('worker_profiles')
        .upsert(
          {
            user_id: me.id,
            status: nextStatus,
            is_active: nextStatus === 'available',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) throw error;
      toast.success(nextStatus === 'available' ? 'Estás disponible' : 'Pausaste tu disponibilidad');
    } catch (error) {
      console.error('worker status update error', error);
      setWorkerStatus(workerStatus);
      toast.error('No se pudo cambiar tu estado');
    }
  }
  useEffect(() => { if (!navigator.geolocation) return; const cached = (() => { try { const raw = localStorage.getItem(LAST_GPS_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } })(); if (cached?.lat && cached?.lon) setMe((prev) => ({ ...prev, lat: Number(cached.lat), lon: Number(cached.lon) })); const watcher = navigator.geolocation.watchPosition((pos) => { const lat = pos.coords.latitude; const lon = pos.coords.longitude; setMe((prev) => ({ ...prev, lat, lon })); try { localStorage.setItem(LAST_GPS_KEY, JSON.stringify({ lat, lon, t: Date.now() })); } catch {} }, (err) => console.warn('GPS worker feed error', err), { enableHighAccuracy: false, maximumAge: 15000, timeout: 12000 }); return () => navigator.geolocation.clearWatch(watcher); }, []);
async function fetchWorkerPosts() {
  if (!me?.id) return;

  setWorkerPostsLoaded(false);

  const { data, error } = await supabase
    .from('worker_posts')
    .select('*')
    .eq('worker_id', me.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('worker_posts error', error);
    toast.error('No pudimos cargar tus publicaciones');
    setWorkerPostsLoaded(true);
    return;
  }

  setWorkerPosts(data || []);
  setWorkerPostsLoaded(true);
}

async function loadFriendRequests() {
  if (!me?.id) return;

  const { data, error } = await supabase
    .from('user_friendships')
    .select('id, requester_id, addressee_id, status, created_at')
    .eq('addressee_id', me.id)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false });

  if (error) {
    if (error.code !== 'PGRST205' && error.code !== '42P01') {
      console.error('friend requests error:', error);
    }
    setFriendRequests([]);
    return;
  }

  const requesterIds = [...new Set((data || []).map((item) => item.requester_id).filter(Boolean))];
  const { data: profilesData } = requesterIds.length
    ? await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', requesterIds)
    : { data: [] };

  const profilesMap = {};
  (profilesData || []).forEach((profile) => {
    profilesMap[String(profile.id)] = profile;
  });

  setFriendRequests((data || []).map((item) => ({
    ...item,
    requester: profilesMap[String(item.requester_id)] || null,
  })));
}

async function loadFollowingIds() {
  if (!me?.id) return;

  const { data, error } = await supabase
    .from('user_friendships')
    .select('addressee_id')
    .eq('requester_id', me.id)
    .eq('status', 'accepted');

  if (error) {
    if (error.code !== 'PGRST205' && error.code !== '42P01') {
      console.error('following ids error:', error);
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
    console.error('worker feed liked workers error:', error);
    setLikedWorkerIds([]);
    return;
  }

  setLikedWorkerIds((data || []).map((item) => String(item.worker_id)));
}

async function loadMessageNotifications() {
  if (!me?.id) return;

  try {
    const { data: chats, error: chatsError } = await supabase
      .from('chats')
      .select('id, client_id, worker_id, job_id, created_at')
      .eq('worker_id', me.id)
      .order('created_at', { ascending: false })
      .limit(40);

    if (chatsError) throw chatsError;

    const chatIds = (chats || []).map((chat) => chat.id).filter(Boolean);
    if (!chatIds.length) {
      setMessageNotifications([]);
      return;
    }

    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('id, chat_id, sender_id, text, created_at')
      .in('chat_id', chatIds)
      .neq('sender_id', me.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (messagesError) throw messagesError;

    const senderIds = [...new Set((messagesData || []).map((item) => item.sender_id).filter(Boolean))];
    const { data: profilesData } = senderIds.length
      ? await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', senderIds)
      : { data: [] };

    const profilesMap = {};
    (profilesData || []).forEach((profile) => {
      profilesMap[String(profile.id)] = profile;
    });

    setMessageNotifications((messagesData || []).map((item) => ({
      ...item,
      sender: profilesMap[String(item.sender_id)] || null,
    })));
  } catch (error) {
    console.warn('worker message notifications error:', error);
    setMessageNotifications([]);
  }
}

useEffect(() => {
  if (!me?.id) return;

  loadFriendRequests();
  loadFollowingIds();
  loadLikedWorkerIds();
  loadMessageNotifications();

  const friendsChannel = supabase
    .channel(`friend-requests-${me.id}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_friendships',
        filter: `addressee_id=eq.${me.id}`,
      },
      () => {
        loadFriendRequests();
        notifyWorkerDevice('Nuevo seguidor', 'Alguien empezo a seguir tu perfil en ManosYA.');
      }
    )
    .subscribe();

  const messagesChannel = supabase
    .channel(`worker-feed-messages-${me.id}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      async (payload) => {
        const message = payload.new;
        if (!message?.chat_id || String(message.sender_id) === String(me.id)) return;

        const { data: chat } = await supabase
          .from('chats')
          .select('id, job_id, worker_id')
          .eq('id', message.chat_id)
          .maybeSingle();

        if (String(chat?.worker_id || '') !== String(me.id)) return;

        if (chat?.job_id) {
          setWorkerJobs((prev) =>
            [...prev]
              .map((job) =>
                String(job.id) === String(chat.job_id)
                  ? {
                      ...job,
                      chat_id: chat.id,
                      last_message: message,
                      last_activity_at: message.created_at || new Date().toISOString(),
                    }
                  : job
              )
              .sort(
                (a, b) =>
                  new Date(b.last_activity_at || b.created_at || 0).getTime() -
                  new Date(a.last_activity_at || a.created_at || 0).getTime()
              )
          );
        }

        loadMessageNotifications();
        notifyWorkerDevice('Nuevo mensaje en ManosYA', message.text || 'Un cliente te escribio.');
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(friendsChannel);
    supabase.removeChannel(messagesChannel);
  };
}, [me?.id]);

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
    const allWorkerIds = [
      ...new Set([
        ...postWorkerIds,
        ...(workersData || []).map((worker) => worker.user_id).filter(Boolean),
      ]),
    ];

    const { data: profilesData, error: profilesError } = postWorkerIds.length
      ? await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, role')
          .in('id', postWorkerIds)
      : { data: [], error: null };

    if (profilesError) throw profilesError;

    const { data: verifiedProfilesData, error: verifiedProfilesError } = allWorkerIds.length
      ? await supabase
          .from('worker_profiles')
          .select('user_id, is_verified, cover_url')
          .in('user_id', allWorkerIds)
      : { data: [], error: null };

    if (verifiedProfilesError) throw verifiedProfilesError;

    const verifiedMap = {};
    const workerProfileMap = {};
    (verifiedProfilesData || []).forEach((item) => {
      workerProfileMap[String(item.user_id)] = item;
      verifiedMap[String(item.user_id)] = Boolean(item.is_verified);
    });

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

    const workersMap = {};
    (workersData || []).forEach((worker) => {
      workersMap[String(worker.user_id)] = worker;
    });

    const profilesMap = {};
    (profilesData || []).forEach((profile) => {
      profilesMap[String(profile.id)] = profile;
    });

    const postsListByWorker = {};
    (postsData || []).forEach((post) => {
      const key = String(post.worker_id || '');
      if (!key) return;
      if (!postsListByWorker[key]) postsListByWorker[key] = [];
      postsListByWorker[key].push(post);
    });

    const postCards = (postsData || []).map((post) => {
      const owner = workersMap[String(post.worker_id)] || {};
      const profile = profilesMap[String(post.worker_id)] || {};
      const workerPosts = postsListByWorker[String(post.worker_id)] || [];

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
        is_verified: Boolean(verifiedMap[String(post.worker_id)]),
        avg_rating: reviewStats[String(post.worker_id)]?.avg_rating ?? null,
        rating_avg: reviewStats[String(post.worker_id)]?.avg_rating ?? null,
        total_reviews: reviewStats[String(post.worker_id)]?.total_reviews ?? 0,
        rating_count: reviewStats[String(post.worker_id)]?.total_reviews ?? 0,
        followers_count: Number(followerCounts[String(post.worker_id)] || 0),
        bio: owner.bio || post.caption || 'Mostrando trabajos reales en ManosYA.',
        skills: owner.skills || post.service_type || 'Servicio general',
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
        _distKm: distKm,
        _serviceTokens: splitWorkerServices({
          ...owner,
          skills: owner.skills || post.service_type || 'Servicio general',
        }).map((item) => normalizeSlug(item)),
        cover_url: workerProfileMap[String(post.worker_id)]?.cover_url || post.media_url || realAvatar,
        media_url: post.media_url || realAvatar,
        media_type: post.media_type || 'image',
        profile_media: workerPosts.map((item) => ({
          id: item.id || item.media_url,
          media_url: item.media_url,
          thumbnail_url: item.thumbnail_url || item.media_url,
          media_type: String(item.media_type || '').toLowerCase() === 'video' ? 'video' : 'image',
          caption: item.caption || item.text_overlay || '',
        })).filter((item) => item.media_url),
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
          is_verified: Boolean(verifiedMap[String(worker.user_id)]),
          avg_rating: reviewStats[String(worker.user_id)]?.avg_rating ?? null,
          rating_avg: reviewStats[String(worker.user_id)]?.avg_rating ?? null,
          total_reviews: reviewStats[String(worker.user_id)]?.total_reviews ?? 0,
          rating_count: reviewStats[String(worker.user_id)]?.total_reviews ?? 0,
          followers_count: Number(followerCounts[String(worker.user_id)] || 0),
          media_url: worker.avatar_url || '/avatar-fallback.png',
          media_type: 'image',
          cover_url: workerProfileMap[String(worker.user_id)]?.cover_url || worker.avatar_url || '/avatar-fallback.png',
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

    const mergedWorkerIds = [
      ...new Set(merged.map((worker) => String(worker.user_id || worker.worker_id || '')).filter(Boolean)),
    ];
    const likeCounts = {};

    if (mergedWorkerIds.length) {
      const { data: likesData, error: likesError } = await supabase
        .from('worker_likes')
        .select('worker_id')
        .in('worker_id', mergedWorkerIds);

      if (likesError) {
        console.warn('worker feed likes count error', likesError);
      } else {
        (likesData || []).forEach((like) => {
          const key = String(like.worker_id);
          likeCounts[key] = (likeCounts[key] || 0) + 1;
        });

        merged = merged.map((worker) => {
          const key = String(worker.user_id || worker.worker_id || '');
          return {
            ...worker,
            likes_count: Number(likeCounts[key] ?? worker.likes_count ?? worker.like_count ?? 0),
          };
        });
      }
    }

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
    setFeedSlotIndex(0);
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

  useEffect(() => {
    if (!mounted || !me?.id || !workerPostsLoaded) return;
    if (!shouldShowVideoReminder(workerPosts)) return;

    let cancelled = false;

    (async () => {
      const permission = await requestBrowserNotificationPermission();
      if (cancelled || permission !== 'granted') return;

      markVideoReminderShown();
      await notifyWorkerDevice(
        'Subí un video y aparecé primero',
        'Los perfiles con video tienen prioridad en ManosYA. Mostrá tu trabajo en movimiento.',
        {
          tag: 'manosya-video-upload-reminder',
          url: '/worker/feed',
        }
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, me?.id, workerPostsLoaded, workerPosts]);

  const feedWorkers = useMemo(() => {
    const base = Array.isArray(workers) ? workers : [];
    const q = normalizeText(serviceQuery);

    if (q) {
      const matches = base
        .map((worker) => ({
          ...worker,
          _searchScore: workerSearchScore(worker, q),
        }))
        .filter((worker) => worker._searchScore > 0)
        .sort((a, b) => b._searchScore - a._searchScore);

      return prioritizeSearchResultsByVideo(matches, feedSeed).slice(0, 60);
    }

    if (feedMode === 'near') {
      const nearby = base
        .filter((worker) => Number.isFinite(Number(worker?._distKm)))
        .filter((worker) => Number(worker._distKm) <= 15)
        .sort((a, b) => Number(a._distKm) - Number(b._distKm));

      return prioritizeVideoWorkers(nearby, feedSeed).slice(0, 24);
    }

    return prioritizeVideoWorkers(base, feedSeed).slice(0, 60);
  }, [workers, feedMode, feedSeed, serviceQuery]);
  const loopedFeedWorkers = useMemo(() => {
    if (feedWorkers.length <= 1) return feedWorkers;
    return Array.from({ length: 5 }, () => feedWorkers).flat();
  }, [feedWorkers]);
 const currentWorker = feedWorkers[feedIndex] || null;

useEffect(() => {
  if (!feedWorkers.length) return;

  const mediaUrls = collectWorkerMediaUrls(feedWorkers, {
    limit: 8,
    minVideos: 0,
    minImages: 6,
  }).filter((url) => {
    const cleanUrl = String(url || '').toLowerCase();

    return (
      cleanUrl &&
      !cleanUrl.includes('.mp4') &&
      !cleanUrl.includes('.mov') &&
      !cleanUrl.includes('.webm') &&
      !cleanUrl.includes('.m4v') &&
      !cleanUrl.includes('.3gp') &&
      !cleanUrl.includes('.3gpp')
    );
  });

  if (!mediaUrls.length) return;

  const scheduleCache =
    window.requestIdleCallback || ((callback) => setTimeout(callback, 900));

  const cancelSchedule =
    window.cancelIdleCallback || clearTimeout;

  const handle = scheduleCache(() => {
    cacheMediaUrls(mediaUrls, 'manosya-worker-feed-media-v1');
  });

  return () => cancelSchedule(handle);
}, [feedWorkers]);

useEffect(() => {
  if (!loopedFeedWorkers.length) return;

    const targetSlot = feedWorkers.length > 1 ? feedWorkers.length * 2 : 0;
    setFeedIndex(0);
    setFeedSlotIndex(targetSlot);

    const timer = setTimeout(() => {
      const el = feedRef.current;
      if (!el) return;
      el.scrollTo({ top: targetSlot * Math.max(1, el.clientHeight), behavior: 'auto' });
    }, 80);

    return () => clearTimeout(timer);
  }, [loopedFeedWorkers.length, feedWorkers.length, feedMode, feedSeed, selectedService]);
  useEffect(() => {
    const activeVideo =
      feedRef.current?.children?.[feedSlotIndex]?.querySelector?.('video[data-manosya-feed-video="true"]') || null;
    pauseOtherFeedVideos(activeVideo);
  }, [feedSlotIndex, loopedFeedWorkers.length]);

  const notificationCount = useMemo(() => {
    const seenAt = Number(notificationsSeenAt || 0);
    const chatSeenMap = getWorkerChatSeenMap();
    const isUnreadFollower = (item) => new Date(item?.created_at || 0).getTime() > seenAt;
    const isUnreadMessage = (item) => {
      const chatId = String(item?.chat_id || '');
      if (!chatId) return false;
      return new Date(item?.created_at || 0).getTime() > Number(chatSeenMap[chatId] || 0);
    };
    return friendRequests.filter(isUnreadFollower).length + messageNotifications.filter(isUnreadMessage).length;
  }, [friendRequests, messageNotifications, notificationsSeenAt, chatSeenMapVersion]);
  const workerHubStats = useMemo(() => {
    const open = workerJobs.filter((job) => String(job.status || '').toLowerCase() === 'open').length;
    const active = workerJobs.filter((job) => ['accepted', 'assigned', 'scheduled'].includes(String(job.status || '').toLowerCase())).length;
    const done = workerJobs.filter((job) => String(job.status || '').toLowerCase() === 'completed').length;
    return { open, active, done };
  }, [workerJobs]);
  const selfWorkerCard = useMemo(() => ({
    ...(workerProfileMeta || {}),
    ...(viewerProfile || {}),
    user_id: me?.id,
    worker_id: me?.id,
    full_name: viewerProfile?.full_name || 'Mi trabajo',
    avatar_url: viewerProfile?.avatar_url || '',
    cover_url: workerProfileMeta?.cover_url || viewerProfile?.cover_url || viewerProfile?.avatar_url || '',
    profile_media: workerPosts.map((post) => ({
      id: post.id,
      media_url: post.media_url,
      thumbnail_url: post.thumbnail_url || post.media_url,
      media_type: post.media_type || 'image',
      caption: post.caption || '',
    })),
  }), [me?.id, viewerProfile, workerProfileMeta, workerPosts]);
  const nearbyWorkers = useMemo(() => (workers || []).filter((worker) => Number.isFinite(Number(worker?._distKm))).sort((a, b) => Number(a._distKm) - Number(b._distKm)), [workers]);
  useEffect(() => { if (currentWorker) setSelected(currentWorker); }, [currentWorker]);
  useEffect(() => {
    const workerId = String(searchParams?.get('worker') || '');
    if (!workerId || sharedWorkerOpenedRef.current === workerId || !feedWorkers.length) return;

    const idx = feedWorkers.findIndex((worker) => (
      String(worker?.user_id || worker?.worker_id || worker?.id || '') === workerId
    ));
    if (idx < 0) return;

    sharedWorkerOpenedRef.current = workerId;
    const targetSlot = feedWorkers.length > 1 ? feedWorkers.length * 2 + idx : idx;
    setFeedIndex(idx);
    setFeedSlotIndex(targetSlot);
    setSelected(feedWorkers[idx]);
    setShowProfile(true);
    setTimeout(() => {
      const el = feedRef.current;
      if (!el) return;
      el.scrollTo({ top: targetSlot * Math.max(1, el.clientHeight), behavior: 'auto' });
    }, 120);
  }, [feedWorkers, searchParams]);
  function markNotificationsRead() {
    const now = Date.now();
    setNotificationsSeenAt(now);
    try {
      localStorage.setItem(WORKER_NOTIFICATIONS_SEEN_KEY, String(now));
    } catch {}
  }
  function markWorkerChatRead(chatId) {
    if (!chatId) return;
    try {
      const seenMap = getWorkerChatSeenMap();
      seenMap[String(chatId)] = Date.now();
      localStorage.setItem(WORKER_CHAT_SEEN_MAP_KEY, JSON.stringify(seenMap));
      setChatSeenMapVersion((version) => version + 1);
    } catch {}
  }
  async function openProfile(worker) {
  setSelected(worker);
  setShowProfile(true);
}
  function validPostId(value) {
    const raw = String(value || '');
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw)
      ? raw
      : '';
  }
  async function openComments(worker) {
    setCommentsWorker(worker);
    setCommentsOpen(true);

    const postId = validPostId(worker?.post_id);
    let query = supabase
      .from('worker_comments')
      .select('*')
      .eq('worker_id', worker.user_id);

    query = postId ? query.eq('post_id', postId) : query.is('post_id', null);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('comment load error', error);
      toast.error(error.message || 'No se pudieron cargar comentarios');
      setWorkerComments([]);
      return;
    }

    setWorkerComments(data || []);
  }
  async function sendPublicComment() {
    if (!commentsWorker || !commentText.trim() || !me?.id) return;

    const workerId = commentsWorker.user_id;
    const payload = {
      worker_id: workerId,
      client_id: me.id,
      client_name: viewerProfile?.full_name || 'Trabajador',
      client_avatar: viewerProfile?.avatar_url || '',
      comment: commentText.trim(),
    };
    const postId = validPostId(commentsWorker?.post_id);
    if (postId) payload.post_id = postId;

    const { error } = await supabase.from('worker_comments').insert([payload]);
    if (error) {
      console.error('comment insert error', error);
      toast.error(error.message || 'No se pudo comentar');
      return;
    }

    setWorkers((prev) => prev.map((w) => String(w.user_id) === String(workerId) ? { ...w, comments_count: Number(w.comments_count || 0) + 1 } : w));
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
      } else {
        result = data;
      }

      if (result === 'accepted') toast.success('Ahora seguÃ­s a este perfil');
      else toast.message('Ya seguÃ­s a este perfil');
      setFollowedUserIds((prev) => (
        prev.includes(String(targetId)) ? prev : [...prev, String(targetId)]
      ));
    } catch (error) {
      console.error('friend request error:', error);
      const missingSchema = error?.code === 'PGRST205' || error?.code === '42P01';
      toast.error(
        missingSchema
          ? 'Falta aplicar la migraciÃ³n social en Supabase'
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
      setWorkers((prev) => prev.map((w) => String(w.user_id) === String(workerId) ? { ...w, likes_count: Math.max(0, Number(w.likes_count || 0) - 1) } : w));
      toast.success('Quitaste el me encanta');
      return;
    }

    const { error } = await supabase.from('worker_likes').insert([{ worker_id: workerId, client_id: me.id }]);

    if (error) {
      toast.error(error.message || 'No se pudo guardar el me encanta');
      return;
    }

    setLikedWorkerIds((prev) => (
      prev.includes(String(workerId)) ? prev : [...prev, String(workerId)]
    ));
    setWorkers((prev) => prev.map((w) => String(w.user_id) === String(workerId) ? { ...w, likes_count: Number(w.likes_count || 0) + 1 } : w));
    toast.success('Te encantÃ³ este perfil');
  }
  async function hireWorker(worker) {
    const target = worker || selected || currentWorker;
    const workerId = target?.user_id || target?.worker_id;
    if (!target || !workerId || !me?.id) return;

    if (String(workerId) === String(me.id)) {
      toast.message('Ese es tu propio perfil');
      return;
    }

    try {
      const chosenService = normalizeSlug(splitWorkerServices(target)[0] || target?.service_type || '');
      const serviceLabel = serviceMetaBySlug(chosenService)?.name || serviceLabelForWorker(target);
      const messageText = `Hola ${target.full_name || ''}, necesito consultar por ${String(serviceLabel).toLowerCase()}.`;
      const messageSafety = inspectTextSafety(messageText, { maxLength: 500 });
      if (!messageSafety.ok) throw new Error(messageSafety.error);

      const attempt = canAttemptAction(`worker-feed-hire:${workerId}:${me.id}`, { limit: 6, windowMs: 60_000 });
      if (!attempt.allowed) {
        toast.warning('Estás intentando contactar muy rápido. Esperá un momento.');
        return;
      }

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

      let nextJobId = activeJob?.id || null;

      if (!nextJobId) {
        const { data: newJob, error: jobError } = await supabase
          .from('jobs')
          .insert([
            {
              client_id: me.id,
              worker_id: workerId,
              service_type: chosenService || null,
              status: 'open',
              description: `Servicio: ${serviceLabel} - Consulta desde feed trabajador`,
            },
          ])
          .select('id')
          .single();

        if (jobError) throw jobError;
        nextJobId = newJob.id;
      }

      const { data: chatByJob, error: chatByJobError } = await supabase
        .from('chats')
        .select('id, job_id')
        .eq('job_id', nextJobId)
        .eq('client_id', me.id)
        .eq('worker_id', workerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (chatByJobError) throw chatByJobError;

      const { data: existingChat, error: existingChatError } = chatByJob?.id
        ? { data: null, error: null }
        : await supabase
        .from('chats')
        .select('id, job_id')
        .eq('client_id', me.id)
        .eq('worker_id', workerId)
        .is('job_id', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingChatError) throw existingChatError;

      let nextChatId = chatByJob?.id || existingChat?.id || null;

      if (existingChat?.id) {
        const { error: chatUpdateError } = await supabase
          .from('chats')
          .update({ job_id: nextJobId })
          .eq('id', nextChatId);

        if (chatUpdateError) throw chatUpdateError;
      } else if (!nextChatId) {
        const { data: newChat, error: chatError } = await supabase
          .from('chats')
          .insert([
            {
              job_id: nextJobId,
              client_id: me.id,
              worker_id: workerId,
            },
          ])
          .select('id')
          .single();

        if (chatError) {
          if (chatError.code === '23505') {
            const { data: racedChat, error: racedError } = await supabase
              .from('chats')
              .select('id')
              .eq('job_id', nextJobId)
              .maybeSingle();

            if (racedError) throw racedError;
            if (racedChat?.id) {
              nextChatId = racedChat.id;
            } else {
              throw chatError;
            }
          } else {
            throw chatError;
          }
        } else {
          nextChatId = newChat?.id || null;
        }
      }

      if (!nextChatId) throw new Error('No pudimos abrir el chat creado');

      const { error: messageError } = await supabase.rpc('post_chat_message', {
        p_chat_id: nextChatId,
        p_text: messageSafety.text,
      });

      if (messageError) throw messageError;

      toast.success('Consulta enviada al trabajador');
      router.push(`/chat/${nextChatId}`);
    } catch (error) {
      console.error('hire worker from worker feed error:', error);
      toast.error(userFriendlyError(error, 'No pudimos abrir la conversacion ahora. Proba de nuevo.'));
    }
  }

async function uploadWorkerMedia(file) {
  if (!file || !me?.id) return;

  const fileSafety = validateMediaFile(file, {
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'],
    maxBytes: 250000000,
  });
  if (!fileSafety.ok) {
    toast.error(fileSafety.error);
    return;
  }

  const isImage = isWorkerImageFile(file);
  const isVideo = isWorkerVideoFile(file);

  if (isImage && file.size > 10000000) {
    toast.error('La imagen es muy pesada. ElegÃ­ una menor a 10MB.');
    return;
  }

  if (!isImage && !isVideo) {
    toast.error('Solo podÃ©s subir imÃ¡genes o videos');
    return;
  }

  if (isVideo && file.size > 250000000) {
    toast.error('El video es muy pesado. Proba con uno menor a 250MB.');
    return;
  }

  if (draftPreviewUrlRef.current) {
    URL.revokeObjectURL(draftPreviewUrlRef.current);
    draftPreviewUrlRef.current = '';
  }
  const previewUrl = URL.createObjectURL(file);
  draftPreviewUrlRef.current = previewUrl;

  setDraftFile(file);
  setDraftPreviewUrl(previewUrl);
  setDraftCaption('');
  setDraftTextOverlay('');
  setDraftServiceType('');
  setDraftMusic(MUSIC_LIBRARY[0]);
  setCreatePostOpen(true);
}
async function compressVideoIfNeeded(file) {
  if (!isWorkerVideoFile(file)) return file;

  if (file.size <= 12000000) return file;

  if (
    typeof window === 'undefined' ||
    typeof MediaRecorder === 'undefined' ||
    typeof HTMLCanvasElement === 'undefined' ||
    !HTMLCanvasElement.prototype.captureStream
  ) {
    toast.warning('Tu navegador no permite optimizar este video. Voy a subir el original.');
    return file;
  }

  toast.loading('Optimizando video sin perder calidad visible...', {
    id: 'compress',
  });

  return new Promise((resolve) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    let settled = false;

    const resolveWithOriginal = (message) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(objectUrl);
      toast.warning(message, { id: 'compress' });
      resolve(file);
    };

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
          resolveWithOriginal('No se pudo optimizar el video. Voy a subir el original.');
        };

        recorder.onstop = () => {
          if (settled) return;
          settled = true;
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
      } catch {
        resolveWithOriginal('No se pudo optimizar el video. Voy a subir el original.');
      }
    };

    video.onerror = () => {
      resolveWithOriginal('No se pudo leer el video para optimizarlo. Voy a subir el original.');
    };
  });
}
async function uploadToWorkerMediaWithProgress(file, path, onProgress) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  if (!token) throw new Error('SesiÃ³n vencida. VolvÃ© a iniciar sesiÃ³n.');

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
    xhr.timeout = 120000;
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', supabaseAnonKey);
    xhr.setRequestHeader('Content-Type', getWorkerMediaContentType(file));
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

    xhr.onerror = () => reject(new Error('Error de conexiÃ³n al subir el archivo'));

    xhr.ontimeout = () => reject(new Error('La subida tardo demasiado. Proba con mejor conexion o un video mas corto.'));

    xhr.send(file);
  });
}
async function publishWorkerPost() {
  if (!draftFile || !me?.id) return;

  const isImage = isWorkerImageFile(draftFile);
  const isVideo = isWorkerVideoFile(draftFile);

  try {
    setUploadingMedia(true);
    setUploadProgress(1);
    setUploadLabel('Preparando tu publicaciÃ³n...');

    const optimizedFile = await compressVideoIfNeeded(draftFile);

    const ext = getFileExtension(optimizedFile) || (isVideo ? 'webm' : 'jpg');
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
    if (!publicUrl) throw new Error('No se pudo obtener la URL pÃºblica');

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
    setUploadLabel('Â¡Publicado con Ã©xito!');

    toast.success('PublicaciÃ³n creada');
    notifyWorkerDevice(
      isVideo ? 'Tu video ya tiene prioridad' : 'Probá subir un video',
      isVideo
        ? 'Tu publicación con video puede aparecer primero en el feed de ManosYA.'
        : 'Los videos ayudan a que los clientes te vean antes y confíen más rápido.',
      {
        tag: isVideo ? 'manosya-video-published' : 'manosya-video-upload-reminder',
        url: '/worker/feed',
      }
    );

    setTimeout(() => {
  if (draftPreviewUrlRef.current) {
    URL.revokeObjectURL(draftPreviewUrlRef.current);
    draftPreviewUrlRef.current = '';
  }
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
    setFeedSlotIndex(0);

    await fetchWorkers('');
  } catch (error) {
    console.error(error);
    toast.error(error.message || 'No se pudo publicar');
  } finally {
    setUploadingMedia(false);
  }
}

async function changeWorkerCover(file, worker) {
  if (!file || !me?.id) return;

  try {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${me.id}/covers/${Date.now()}.${ext}`;
    const toastId = 'worker-cover';

    toast.loading('Subiendo portada...', { id: toastId });
    await uploadToWorkerMediaWithProgress(file, path, () => {});

    const { data } = supabase.storage
      .from('worker-media')
      .getPublicUrl(path);

    const publicUrl = data?.publicUrl;
    if (!publicUrl) throw new Error('No se pudo obtener la portada');

    const { error } = await supabase.from('worker_profiles').upsert(
      {
        user_id: me.id,
        cover_url: publicUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (error) throw error;

    const sameWorker = (item) =>
      String(item?.user_id || item?.worker_id || '') === String(worker?.user_id || worker?.worker_id || me.id);

    setWorkers((prev) =>
      prev.map((item) => (sameWorker(item) ? { ...item, cover_url: publicUrl } : item))
    );
    setSelected((prev) => (prev && sameWorker(prev) ? { ...prev, cover_url: publicUrl } : prev));
    setWorkerProfileMeta((prev) => ({ ...(prev || {}), cover_url: publicUrl }));
    toast.success('Portada actualizada', { id: toastId });
  } catch (error) {
    console.error('cover upload error', error);
    toast.error(error.message || 'No se pudo cambiar la portada', { id: 'worker-cover' });
  }
}

async function changeWorkerName(nextName) {
  if (!me?.id) return;
  const cleanName = String(nextName || '').trim();
  if (cleanName.length < 2) {
    toast.error('Escribí un nombre visible');
    return;
  }

  try {
    setIdentitySaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: cleanName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', me.id);

    if (error) throw error;

    const sameWorker = (item) =>
      String(item?.user_id || item?.worker_id || '') === String(me.id);

    setViewerProfile((prev) => ({ ...(prev || {}), full_name: cleanName }));
    setWorkers((prev) => prev.map((item) => (sameWorker(item) ? { ...item, full_name: cleanName } : item)));
    setSelected((prev) => (prev && sameWorker(prev) ? { ...prev, full_name: cleanName } : prev));
    toast.success('Nombre actualizado');
  } catch (error) {
    console.error('worker name update error', error);
    toast.error(error.message || 'No se pudo guardar el nombre');
  } finally {
    setIdentitySaving(false);
  }
}

async function changeWorkerAvatar(file, worker) {
  if (!file || !me?.id) return;

  try {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${me.id}/avatars/${Date.now()}.${ext}`;
    const toastId = 'worker-avatar';

    toast.loading('Subiendo foto...', { id: toastId });
    await uploadToWorkerMediaWithProgress(file, path, () => {});

    const { data } = supabase.storage
      .from('worker-media')
      .getPublicUrl(path);

    const publicUrl = data?.publicUrl;
    if (!publicUrl) throw new Error('No se pudo obtener la foto');

    const { error } = await supabase
      .from('profiles')
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', me.id);

    if (error) throw error;

    const sameWorker = (item) =>
      String(item?.user_id || item?.worker_id || '') === String(worker?.user_id || worker?.worker_id || me.id);

    setViewerProfile((prev) => (prev ? { ...prev, avatar_url: publicUrl } : prev));
    setWorkers((prev) =>
      prev.map((item) => (sameWorker(item) ? { ...item, avatar_url: publicUrl } : item))
    );
    setSelected((prev) => (prev && sameWorker(prev) ? { ...prev, avatar_url: publicUrl } : prev));
    toast.success('Foto de perfil actualizada', { id: toastId });
  } catch (error) {
    console.error('avatar upload error', error);
    toast.error(error.message || 'No se pudo cambiar la foto', { id: 'worker-avatar' });
  }
}

const mapCenter = useMemo(() => hasMeCoords ? [Number(me.lat), Number(me.lon)] : HOME_VIEW.center, [hasMeCoords, me?.lat, me?.lon]);
  
  return (
    
    <div className="relative h-[var(--real-vh,100dvh)] overflow-hidden bg-black text-slate-900"><div className="pointer-events-none absolute inset-0 bg-black" /><div className="relative z-10 mx-auto h-[var(--real-vh,100dvh)] w-full max-w-6xl overflow-hidden px-0"><div className="relative h-full"><div className="relative z-10 h-full"><div className="pointer-events-auto absolute left-0 right-0 top-0 z-40 px-3 pt-[calc(env(safe-area-inset-top)+8px)] text-white"><div className="flex items-center gap-2"><button type="button" onClick={() => router.back()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/14 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-xl active:scale-95" aria-label="Volver"><ArrowLeft size={18} strokeWidth={2.2} /></button><div className="relative h-9 min-w-0 flex-1 rounded-full border border-white/16 bg-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/60" size={15} /><input value={serviceQuery} onChange={(e) => { const value = e.target.value; setServiceQuery(value); const normalizedValue = normalizeSlug(value); const matchedService = SERVICE_CATALOG.find((service) => { const slug = normalizeSlug(service.slug); const name = normalizeSlug(service.name); return slug.includes(normalizedValue) || name.includes(normalizedValue) || normalizedValue.includes(slug); }); setSelectedService(matchedService ? matchedService.slug : ''); }} placeholder="Buscar..." className="h-full w-full rounded-full bg-transparent pl-8 pr-8 text-[12px] font-bold text-white placeholder:text-white/62 outline-none" />{serviceQuery && <button type="button" onClick={() => { setServiceQuery(''); setSelectedService(''); }} className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white/16 text-white/82 active:scale-95"><X size={14} /></button>}</div></div><div className="mt-2 flex justify-center"><div className="relative grid h-10 w-[214px] grid-cols-2 items-center rounded-full border border-white/16 bg-black/32 p-1 shadow-[0_14px_34px_rgba(0,0,0,0.24)] backdrop-blur-2xl"><motion.div layout transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-full bg-white shadow-[0_8px_20px_rgba(0,0,0,0.20)]" style={{ left: feedMode === 'all' ? '4px' : '50%' }} /><button type="button" onClick={() => { setFeedMode('all'); setSelectedService(''); setServiceQuery(''); setFeedSeed(Date.now() + Math.random()); setFeedIndex(0); setSelected(null); fetchWorkers(''); feedRef.current?.scrollTo({ top: 0, behavior: 'auto' }); }} className={`relative z-10 h-8 rounded-full text-[11px] font-black transition ${feedMode === 'all' ? 'text-black' : 'text-white'}`}>Todos</button><button type="button" onClick={() => { setFeedMode('near'); setFeedSeed(Date.now() + Math.random()); setFeedIndex(0); setSelected(null); feedRef.current?.scrollTo({ top: 0, behavior: 'auto' }); }} className={`relative z-10 h-8 rounded-full text-[11px] font-black transition ${feedMode === 'near' ? 'text-black' : 'text-white'}`}>Cerca tuyo</button></div></div></div>{busy ? <div className="flex h-full items-center justify-center bg-[#081924] text-white"><div className="text-center"><div className="text-xl font-black">Cargando trabajadores</div><div className="mt-2 text-sm text-white/70">Estamos ordenando lo mejor para vos.</div></div></div> : !feedWorkers.length ? <div className="flex h-full items-center justify-center bg-[#081924] px-8 text-center text-white"><div><Compass className="mx-auto mb-3 text-white/70" size={34} /><div className="text-xl font-black">No encontramos trabajadores</div><div className="mt-2 text-sm text-white/70">ProbÃ¡ cambiar el filtro o revisar tu zona.</div><button type="button" onClick={() => fetchWorkers('')} className="mt-6 rounded-full bg-[#62bfb9] px-6 py-3 text-sm font-black text-white shadow-[0_14px_28px_rgba(98,191,185,0.35)]">Actualizar</button></div></div> : <div key={`${feedMode}-${feedSeed}-${selectedService || 'todos'}`} ref={feedRef} onScroll={(e) => { const el = e.currentTarget; const cardHeight = Math.max(1, el.clientHeight); const rawIndex = Math.max(0, Math.min(loopedFeedWorkers.length - 1, Math.round(el.scrollTop / cardHeight))); const nextIndex = feedWorkers.length ? rawIndex % feedWorkers.length : 0; if (nextIndex !== feedIndex && feedWorkers[nextIndex]) { setFeedIndex(nextIndex); setSelected(feedWorkers[nextIndex]); } if (rawIndex !== feedSlotIndex) setFeedSlotIndex(rawIndex); if (feedSnapTimerRef.current) clearTimeout(feedSnapTimerRef.current); feedSnapTimerRef.current = setTimeout(() => { const snapIndex = Math.max(0, Math.min(loopedFeedWorkers.length - 1, Math.round(el.scrollTop / cardHeight))); const realIndex = feedWorkers.length ? snapIndex % feedWorkers.length : 0; const shouldRecenter = feedWorkers.length > 1 && (snapIndex < feedWorkers.length || snapIndex >= feedWorkers.length * 4); const targetIndex = shouldRecenter ? feedWorkers.length * 2 + realIndex : snapIndex; setFeedSlotIndex(targetIndex); setFeedIndex(realIndex); if (feedWorkers[realIndex]) setSelected(feedWorkers[realIndex]); el.scrollTo({ top: targetIndex * cardHeight, behavior: 'auto' }); }, 120); }} style={{ scrollSnapType: 'y mandatory', overscrollBehaviorY: 'contain', WebkitOverflowScrolling: 'touch' }} className="h-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain bg-black">
      {loopedFeedWorkers.map((worker, index) => (
  <WorkerFeedCard
    key={String(worker.post_id || worker.user_id || 'worker') + '-' + index}
    worker={worker}
    isActive={index === feedSlotIndex}
    isFollowed={followedUserIds.includes(String(worker.user_id || worker.worker_id))}
    isLiked={likedWorkerIds.includes(String(worker.user_id || worker.worker_id))}
    onOpen={() => openProfile(worker)}
    onAddFriend={() => addFriend(worker)}
    onComments={() => openComments(worker)}
    onLike={() => toggleWorkerLike(worker)}
    onNearbyMap={() => {
      setNearbyMapWorker(worker);
      setNearbyMapOpen(true);
    }}
  />
))}</div>}<AnimatePresence>{showProfile && selected && <WorkerProfileSheet worker={selected} viewerId={me?.id} onCoverChange={changeWorkerCover} onAvatarChange={changeWorkerAvatar} onClose={() => setShowProfile(false)} onHire={() => hireWorker(selected)} />}</AnimatePresence>
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
<AnimatePresence>
  {showFriendRequests && (
    <NotificationsSheet
      open={showFriendRequests}
      followers={friendRequests}
      messages={messageNotifications}
      onClose={() => setShowFriendRequests(false)}
      onOpenChat={(chatId) => {
        markWorkerChatRead(chatId);
        setShowFriendRequests(false);
        router.push(`/chat/${chatId}`);
      }}
    />
  )}
</AnimatePresence>
    <AnimatePresence>{showAllWorkers && <AllWorkersSheet open={showAllWorkers} workers={feedWorkers} onClose={() => setShowAllWorkers(false)} onSelect={(worker) => { setSelected(worker); setShowAllWorkers(false); setShowProfile(true); }} />}</AnimatePresence><AnimatePresence>{nearbyMapOpen && <WorkerNearbyMapSheet open={nearbyMapOpen} workers={nearbyWorkers} center={mapCenter} hasMeCoords={hasMeCoords} me={me} selectedWorker={nearbyMapWorker} onSelectWorker={(worker) => { setNearbyMapWorker(worker); setSelected(worker); }} onClose={() => setNearbyMapOpen(false)} onOpenProfile={(worker) => { setSelected(worker); setNearbyMapOpen(false); setShowProfile(true); }} onHire={(worker) => { setNearbyMapOpen(false); hireWorker(worker); }} />}</AnimatePresence><AnimatePresence>{commentsOpen && <ProductCommentsSheet open={commentsOpen} worker={commentsWorker} comments={workerComments} commentText={commentText} setCommentText={setCommentText} onClose={() => { setCommentsOpen(false); setCommentsWorker(null); setWorkerComments([]); setCommentText(''); }} onSend={sendPublicComment} onOpenDm={(userId) => router.push(`/dm/${userId}`)} />}</AnimatePresence>
  <AnimatePresence>
    {workerHubOpen && (
      <WorkerHubSheet
  open={workerHubOpen}
  tab={workerHubTab}
  setTab={setWorkerHubTab}
  onClose={() => setWorkerHubOpen(false)}
  profile={viewerProfile}
  status={workerStatus}
  stats={workerHubStats}
  jobs={workerJobs}
  postsCount={workerPosts.length}
  loadingJobs={workerJobsLoading}
  onToggleStatus={toggleWorkerStatusFromFeed}
  onRefreshJobs={loadWorkerHub}
  onOpenJobChat={openWorkerJobChat}
  onOpenProfile={() => {
    setWorkerHubOpen(false);
    router.push('/worker/onboard?mode=edit');
  }}
  onOpenPosts={() => {
    setWorkerHubOpen(false);
    setShowMyPosts(true);
  }}
/>
    )}
  </AnimatePresence>
  <AnimatePresence>
    {identityEditorOpen && (
      <WorkerIdentityEditor
        open={identityEditorOpen}
        profile={viewerProfile}
        worker={selfWorkerCard}
        saving={identitySaving}
        onClose={() => setIdentityEditorOpen(false)}
        onNameSave={changeWorkerName}
        onAvatarChange={(file) => changeWorkerAvatar(file, selfWorkerCard)}
        onCoverChange={(file) => changeWorkerCover(file, selfWorkerCard)}
      />
    )}
  </AnimatePresence>
  <div className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+10px)] z-50 flex items-center justify-center px-3">
  <div className="pointer-events-auto flex w-full max-w-[356px] items-center justify-between rounded-[30px] border border-white/75 bg-white/95 px-2 py-2 shadow-[0_22px_54px_rgba(7,24,39,0.22)] backdrop-blur-[22px]">

    <WorkerFeedNavButton
      icon={<Briefcase size={18} />}
      active={workerHubOpen && workerHubTab === 'jobs'}
      badge={workerHubStats.open}
      label="Pedidos"
      onClick={() => {
        setWorkerHubTab('jobs');
        setWorkerHubOpen(true);
        loadWorkerHub();
      }}
    />

    <label className="flex h-[58px] w-[82px] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-[25px] bg-[linear-gradient(135deg,#8af2e8_0%,#42c8bd_48%,#15998f_100%)] text-white shadow-[0_16px_34px_rgba(66,200,189,0.44)] ring-1 ring-white/28 transition duration-200 active:scale-95">
      <Upload size={20} />
      <span className="text-[10px] font-black leading-none tracking-[-0.01em]">Subí video</span>

      <input
        type="file"
        accept={WORKER_MEDIA_ACCEPT}
        className="hidden"
        disabled={uploadingMedia}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadWorkerMedia(file);
          e.target.value = '';
        }}
      />
    </label>

    <WorkerFeedNavButton
      icon={<Bell size={18} />}
      active={showFriendRequests}
      badge={notificationCount}
      label="Avisos"
      onClick={async () => {
        await requestBrowserNotificationPermission();
        loadFriendRequests();
        loadMessageNotifications();
        markNotificationsRead();
        setShowFriendRequests(true);
      }}
    />

    <WorkerFeedNavButton
      icon={<User2 size={18} />}
      active={workerHubOpen && workerHubTab === 'profile'}
      label="Perfil"
      onClick={() => {
        setWorkerHubTab('profile');
        setWorkerHubOpen(true);
      }}
    />

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
        if (draftPreviewUrlRef.current) {
          URL.revokeObjectURL(draftPreviewUrlRef.current);
          draftPreviewUrlRef.current = '';
        }
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
