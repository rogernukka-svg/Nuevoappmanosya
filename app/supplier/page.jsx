'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  Clapperboard,
  Heart,
  ImagePlus,
  Loader2,
  MessageCircle,
  MessageSquareText,
  PackagePlus,
  Save,
  SendHorizontal,
  Share2,
  Sparkles,
  Store,
  Trash2,
  UserPlus,
  UploadCloud,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { getSupabase } from '@/lib/supabase';
import { cacheMediaUrls, collectWorkerMediaUrls } from '@/lib/mediaCache';
import ProfileOnlyFeedVisual, { isProfileOnlyMedia } from '@/components/ProfileOnlyFeedVisual';
import {
  FEED_VIDEO_ATTR,
  pauseFeedVideo,
  pauseOtherFeedVideos,
  playFeedVideo,
} from '@/lib/feedVideoPlayback';
import { requireRole } from '@/lib/roleRedirect';
import { cleanSecurityText, safeExternalUrl } from '@/lib/security';
import {
  getServiceLabel,
  normalizeServiceSlug,
  productMatchesService,
  readServiceIntent,
  saveServiceIntent,
  serviceIntentFromSearchParams,
  workerIntentSummary,
  workerMatchesService,
  workerRelatedToService,
} from '@/lib/services';

const supabase = getSupabase();
const LAST_GPS_KEY = 'manosya_supplier_feed_gps';

const SERVICES = [
  { slug: 'plomeria', name: 'Plomería', hint: 'caños, canillas, grifería' },
  { slug: 'electricidad', name: 'Electricidad', hint: 'cables, llaves, termicas' },
  { slug: 'limpieza', name: 'Limpieza', hint: 'quimicos, escobas, equipos' },
  { slug: 'albanileria', name: 'Albañilería', hint: 'cemento, mezcla, herramientas' },
  { slug: 'pintura', name: 'Pintura', hint: 'pinturas, rodillos, lijas' },
  { slug: 'jardineria', name: 'Jardinería', hint: 'mangueras, tijeras, sustratos' },
  { slug: 'servicio-general', name: 'Servicio general', hint: 'insumos rapidos' },
];

function normalizeSlug(value) {
  return normalizeServiceSlug(value);
}

function serviceName(slug) {
  return getServiceLabel(slug);
}

function primaryServiceSlug(worker) {
  const raw = worker?.service_type || worker?.skills || worker?.skill_slug || worker?.category || 'servicio-general';
  const first = String(raw).split(',')[0].trim();
  const normalized = normalizeSlug(first);
  const matched = SERVICES.find((service) => normalized.includes(service.slug) || service.slug.includes(normalized));
  return matched?.slug || normalized || 'servicio-general';
}

function SupplierFeedCard({ worker, selectedService = '', isActive, onOpenWorker, onOfferProduct, onMessageWorker }) {
  const videoRef = useRef(null);
  const playbackTokenRef = useRef(0);
  const [followed, setFollowed] = useState(false);
  const [liked, setLiked] = useState(false);
  const mediaUrl = worker?.media_url || worker?.thumbnail_url || worker?.avatar_url || '/avatar-fallback.png';
  const isVideo = String(worker?.media_type || '').toLowerCase() === 'video';
  const isProfileOnlyCard = isProfileOnlyMedia(worker);
  const serviceSlug = normalizeSlug(selectedService) || primaryServiceSlug(worker);
  const serviceLabel = serviceName(serviceSlug);
  const serviceIntent = workerIntentSummary(worker, selectedService);
  const name = worker?.full_name || worker?.username || 'Trabajador ManosYA';
  const likes = Number(worker?.likes_count || worker?.like_count || 0) + (liked ? 1 : 0);
  const comments = Number(worker?.comments_count || worker?.total_reviews || 0);

  const shareWorker = async () => {
    const text = `Demanda real en ManosYA: ${name} - ${serviceLabel}`;
    const url = `${window.location.origin}/worker/feed?worker=${encodeURIComponent(worker?.user_id || worker?.worker_id || worker?.id || '')}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: text, text, url });
        return;
      }

      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast.success('Link copiado');
    } catch (error) {
      if (error?.name !== 'AbortError') toast.error('No pudimos compartir ahora');
    }
  };

  useEffect(() => {
    if (!isVideo || !videoRef.current) return;
    const video = videoRef.current;
    const token = ++playbackTokenRef.current;

    if (isActive) {
      playFeedVideo(video, {
        withSound: false,
        isCurrent: () => playbackTokenRef.current === token,
      });
    } else {
      pauseFeedVideo(video);
    }

    const stopIfHidden = () => {
      if (document.hidden) {
        playbackTokenRef.current += 1;
        pauseFeedVideo(video);
      }
    };

    document.addEventListener('visibilitychange', stopIfHidden);
    window.addEventListener('pagehide', stopIfHidden);

    return () => {
      playbackTokenRef.current += 1;
      document.removeEventListener('visibilitychange', stopIfHidden);
      window.removeEventListener('pagehide', stopIfHidden);
      pauseFeedVideo(video);
    };
  }, [isActive, isVideo, mediaUrl]);

  return (
    <article
      style={{ scrollSnapStop: 'always' }}
      className="relative h-[var(--real-vh,100dvh)] w-full snap-start snap-always overflow-hidden bg-black"
    >
      {isVideo ? (
        <video ref={videoRef} {...{ [FEED_VIDEO_ATTR]: 'true' }} src={mediaUrl} muted loop playsInline preload="auto" className="absolute inset-0 h-full w-full object-cover" />
      ) : isProfileOnlyCard ? (
        <ProfileOnlyFeedVisual
          entity={worker}
          entityName={name}
          primaryService={serviceLabel}
          isOnline={false}
          entityType="worker"
        />
      ) : (
        <img src={mediaUrl} onError={(e) => { e.currentTarget.src = '/avatar-fallback.png'; }} alt={name} className="absolute inset-0 h-full w-full object-cover" />
      )}

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.68)_0%,rgba(0,0,0,0.20)_20%,rgba(0,0,0,0.02)_62%,rgba(0,0,0,0.18)_100%)]" />

      <div className="absolute right-2 bottom-[calc(env(safe-area-inset-bottom)+92px)] z-30 flex w-10 flex-col items-center text-white">
        <button type="button" onClick={() => onOpenWorker(worker)} className="relative mb-2.5 flex h-11 w-11 items-center justify-center active:scale-95" aria-label="Ver perfil">
          <img
            src={worker?.avatar_url || '/avatar-fallback.png'}
            onError={(e) => { e.currentTarget.src = '/avatar-fallback.png'; }}
            alt={name}
            className="h-10 w-10 rounded-full border-2 border-white object-cover shadow-[0_12px_26px_rgba(0,0,0,0.55)]"
          />
          <span
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation();
              setFollowed((value) => !value);
              toast.success(followed ? 'Dejaste de seguir este perfil' : 'Ahora seguís este perfil');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                setFollowed((value) => !value);
              }
            }}
            className={`absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full text-white shadow-[0_8px_18px_rgba(98,191,185,0.45)] ${followed ? 'bg-sky-500' : 'bg-[#62bfb9]'}`}
            aria-label={followed ? 'Siguiendo' : 'Agregar amigo'}
          >
            {followed ? <Check size={12} strokeWidth={3.4} /> : <UserPlus size={12} strokeWidth={3.2} />}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setLiked((value) => !value);
          }}
          className="mb-2 flex w-10 flex-col items-center active:scale-95"
          aria-label={liked ? 'Quitar me encanta' : 'Dar me encanta'}
        >
          <Heart
            size={26}
            fill={liked ? '#ef4444' : 'white'}
            stroke={liked ? '#ef4444' : 'white'}
            strokeWidth={1.8}
            className="drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)]"
          />
          <span className="mt-0.5 text-[11px] font-black">{likes}</span>
        </button>

        <button
          type="button"
          onClick={() => onOfferProduct(worker)}
          className="mb-2 flex w-10 flex-col items-center active:scale-95"
          aria-label="Comentar con producto"
        >
          <MessageCircle size={26} fill="white" strokeWidth={1.8} className="drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)]" />
          <span className="mt-0.5 text-[11px] font-black">{comments}</span>
        </button>

        <button type="button" onClick={() => onMessageWorker(worker)} className="mb-2 flex w-10 flex-col items-center active:scale-95" aria-label="Mensaje privado">
          <MessageSquareText size={25} className="drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)]" />
        </button>

        <button type="button" onClick={shareWorker} className="flex w-10 flex-col items-center active:scale-95" aria-label="Compartir">
          <Share2 size={25} className="drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)]" />
        </button>
      </div>

      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+112px)] left-3 right-[58px] z-20 text-white">
        <div className="mb-1.5 inline-flex max-w-full items-center gap-2 rounded-full bg-black/24 px-2.5 py-0.5 text-[9.5px] font-black uppercase tracking-[0.08em] text-[#9ee5df] backdrop-blur-md">
          Demanda real para {serviceLabel}
        </div>

        <div className="flex items-center gap-2">
          <img src={worker?.avatar_url || '/avatar-fallback.png'} onError={(e) => { e.currentTarget.src = '/avatar-fallback.png'; }} alt={name} className="h-9 w-9 rounded-full border-2 border-white object-cover" />
          <button type="button" onClick={() => onOpenWorker(worker)} className="min-w-0 text-left">
            <div className="truncate text-[18px] font-black leading-tight">@{name}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] font-bold text-white/82">
              <span>{serviceIntent.detailText || serviceLabel}</span>
              {worker?.is_verified && (
                <span className="inline-flex items-center gap-1 text-sky-200">
                  <BadgeCheck size={14} />
                  Verificado
                </span>
              )}
            </div>
          </button>
        </div>

        <p className="mt-1 line-clamp-1 text-[12.5px] font-semibold leading-5 text-white/92">
          {worker?.post_description || worker?.caption || worker?.bio || 'Trabajo activo dentro de ManosYA.'}
        </p>
      </div>
    </article>
  );
}

function SupplierSheet({ title, open, onClose, children }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70000] flex items-end bg-black/55 backdrop-blur-sm">
          <motion.section
            initial={{ y: 520, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 520, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="mx-auto flex max-h-[86dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[34px] bg-white shadow-[0_-26px_80px_rgba(0,0,0,0.32)]"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#0c6b70]">Proveedor</div>
                <h2 className="text-2xl font-black text-slate-950">{title}</h2>
              </div>
              <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700 active:scale-95">
                <X size={19} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
}

function SupplierWorkerProfileSheet({ worker, onClose, onOfferProduct, onMessageWorker }) {
  if (!worker) return null;

  const name = worker?.full_name || worker?.username || 'Trabajador ManosYA';
  const serviceLabel = serviceName(primaryServiceSlug(worker));
  const coverUrl = worker?.cover_url || worker?.media_url || worker?.thumbnail_url || worker?.avatar_url || '/avatar-fallback.png';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70000] flex items-end bg-black/55 backdrop-blur-sm">
        <motion.section
          initial={{ y: 520, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 520, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          className="mx-auto flex max-h-[82dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[30px] bg-white text-slate-950 shadow-[0_-26px_80px_rgba(0,0,0,0.32)]"
        >
          <div className="relative h-48 bg-slate-950">
            <img
              src={coverUrl}
              onError={(event) => { event.currentTarget.src = '/avatar-fallback.png'; }}
              alt={name}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/78 to-black/10" />
            <button type="button" onClick={onClose} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/16 text-white backdrop-blur-md active:scale-95" aria-label="Cerrar perfil">
              <X size={18} />
            </button>
            <div className="absolute bottom-4 left-4 right-4 flex items-end gap-3 text-white">
              <img
                src={worker?.avatar_url || '/avatar-fallback.png'}
                onError={(event) => { event.currentTarget.src = '/avatar-fallback.png'; }}
                alt={name}
                className="h-16 w-16 rounded-full border-4 border-white object-cover shadow-lg"
              />
              <div className="min-w-0 pb-1">
                <div className="truncate text-2xl font-black leading-tight">{name}</div>
                <div className="mt-1 inline-flex max-w-full items-center gap-1 rounded-full bg-white/14 px-3 py-1 text-[12px] font-black backdrop-blur-md">
                  <BriefcaseBusiness size={14} />
                  <span className="truncate">{serviceLabel}</span>
                  {worker?.is_verified && <BadgeCheck size={14} className="text-sky-200" />}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Demanda visible</div>
              <p className="mt-2 text-[15px] font-semibold leading-6 text-slate-700">
                {worker?.post_description || worker?.caption || worker?.bio || 'Trabajo activo dentro de ManosYA.'}
              </p>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-[20px] bg-[#effffb] p-3">
                <div className="text-lg font-black">{Number(worker?.likes_count || worker?.like_count || 0)}</div>
                <div className="text-[10px] font-black uppercase text-slate-400">Me encanta</div>
              </div>
              <div className="rounded-[20px] bg-[#effffb] p-3">
                <div className="text-lg font-black">{Number(worker?.total_reviews || worker?.rating_count || 0)}</div>
                <div className="text-[10px] font-black uppercase text-slate-400">Reseñas</div>
              </div>
              <div className="rounded-[20px] bg-[#effffb] p-3">
                <div className="truncate text-lg font-black">{serviceLabel}</div>
                <div className="text-[10px] font-black uppercase text-slate-400">Rubro</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onOfferProduct(worker)}
                className="inline-flex items-center justify-center gap-2 rounded-[20px] bg-[#62bfb9] px-4 py-3 text-[13px] font-black text-white shadow-[0_12px_26px_rgba(98,191,185,0.28)] active:scale-[0.98]"
              >
                <PackagePlus size={17} />
                Ofrecer producto
              </button>
              <button
                type="button"
                onClick={() => onMessageWorker(worker)}
                className="inline-flex items-center justify-center gap-2 rounded-[20px] bg-slate-950 px-4 py-3 text-[13px] font-black text-white shadow-[0_12px_26px_rgba(15,23,42,0.22)] active:scale-[0.98]"
              >
                <MessageSquareText size={17} />
                Mensaje
              </button>
            </div>
          </div>
        </motion.section>
      </div>
    </AnimatePresence>
  );
}

export default function SupplierPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const feedRef = useRef(null);
  const feedSnapTimerRef = useRef(null);
  const [me, setMe] = useState(null);
  const [profile, setProfile] = useState(null);
  const [supplierProfile, setSupplierProfile] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [products, setProducts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedIndex, setFeedIndex] = useState(0);
  const [feedSlotIndex, setFeedSlotIndex] = useState(0);
  const [sheet, setSheet] = useState(null);
  const [selectedWorkerProfile, setSelectedWorkerProfile] = useState(null);
  const [offerWorker, setOfferWorker] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savingOffer, setSavingOffer] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const initialServiceIntent = serviceIntentFromSearchParams(searchParams) || readServiceIntent();
  const [selectedService, setSelectedService] = useState(() => normalizeSlug(initialServiceIntent?.serviceSlug || ''));
  const [profileForm, setProfileForm] = useState({
    store_name: '',
    bio: '',
    avatar_url: '',
    cover_url: '',
    whatsapp_url: '',
    address_text: '',
  });
    const [productForm, setProductForm] = useState({
    title: '',
    description: '',
    price_text: '',
    service_slug: normalizeSlug(initialServiceIntent?.serviceSlug || 'plomeria') || 'plomeria',
    image_url: '',
    media_type: 'image',
    need_keywords: '',
    contact_url: '',
  });
  const [offerForm, setOfferForm] = useState({
    comment: '',
    title: '',
    price_text: '',
    description: '',
    image_url: '',
    media_type: 'image',
    service_slug: normalizeSlug(initialServiceIntent?.serviceSlug || 'plomeria') || 'plomeria',
  });

  const activeProducts = useMemo(() => {
    const visibleProducts = products.filter((item) => item.is_active !== false);
    if (!selectedService) return visibleProducts;
    const exact = visibleProducts.filter((item) => productMatchesService(item, selectedService));
    return exact.length ? exact : visibleProducts;
  }, [products, selectedService]);
  const selectedServiceLabel = selectedService ? serviceName(selectedService) : '';
  const loopedWorkers = useMemo(() => {
    if (workers.length <= 1) return workers;
    return Array.from({ length: 5 }, () => workers).flat();
  }, [workers]);
  const unreadContacts = useMemo(
    () => contacts.filter((item) => item.status !== 'handled' && !item.read_at).length,
    [contacts]
  );
  const storeScore = useMemo(() => {
    let score = 25;
    if (profileForm.store_name.trim()) score += 15;
    if (profileForm.bio.trim().length >= 30) score += 15;
    if (profileForm.avatar_url.trim()) score += 10;
    if (profileForm.address_text.trim()) score += 10;
    if (activeProducts.length >= 1) score += 15;
    if (activeProducts.length >= 3) score += 10;
    return Math.min(score, 100);
  }, [activeProducts.length, profileForm.address_text, profileForm.avatar_url, profileForm.bio, profileForm.store_name]);

  useEffect(() => {
    return () => {
      if (feedSnapTimerRef.current) clearTimeout(feedSnapTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!loopedWorkers.length) return;

    const targetSlot = workers.length > 1 ? workers.length * 2 : 0;
    setFeedIndex(0);
    setFeedSlotIndex(targetSlot);

    const timer = setTimeout(() => {
      const el = feedRef.current;
      if (!el) return;
      el.scrollTo({ top: targetSlot * Math.max(1, el.clientHeight), behavior: 'auto' });
    }, 80);

    return () => clearTimeout(timer);
  }, [loopedWorkers.length, workers.length, selectedService]);

  useEffect(() => {
    const activeVideo =
      feedRef.current?.children?.[feedSlotIndex]?.querySelector?.('video[data-manosya-feed-video="true"]') || null;
    pauseOtherFeedVideos(activeVideo);
  }, [feedSlotIndex, loopedWorkers.length]);

  useEffect(() => {
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
    const intent = serviceIntentFromSearchParams(searchParams) || readServiceIntent();
    const nextService = normalizeSlug(intent?.serviceSlug || '');
    if (!nextService) return;

    setSelectedService(nextService);
    setProductForm((prev) => ({
      ...prev,
      service_slug: nextService,
    }));
    saveServiceIntent({
      ...intent,
      role: intent?.role || 'supplier',
      serviceSlug: nextService,
      serviceName: serviceName(nextService),
      source: intent?.source || 'supplier_context',
    });
  }, [searchParams]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { user, profile: profileData } = await requireRole({
          supabase,
          router,
          allowedRoles: ['supplier'],
          fallbackPath: '/role-selector',
        });

        if (!user) return;

        if (alive) {
          setMe(user);
          setProfile(profileData || null);
        }
      } catch (error) {
        console.error(error);
        toast.error('No pudimos abrir el feed de proveedores');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  useEffect(() => {
    if (!me?.id) return;
    loadSupplierProfile();
    loadProducts();
    loadContacts();
    loadWorkers();
  }, [me?.id]);

  useEffect(() => {
    if (!me?.id) return;
    loadWorkers();
  }, [me?.id, selectedService]);

  useEffect(() => {
    if (!me?.id) return;

    const channel = supabase
      .channel(`supplier-contacts-${me.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'supplier_contacts',
          filter: `supplier_id=eq.${me.id}`,
        },
        () => {
          loadContacts();
          toast.message('Nueva consulta para tu tienda');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [me?.id]);

  useEffect(() => {
    if (!workers.length) return;

    const mediaUrls = collectWorkerMediaUrls(workers, {
      limit: 12,
      minVideos: 3,
      minImages: 4,
    });
    const scheduleCache = window.requestIdleCallback || ((callback) => setTimeout(callback, 900));
    const cancelSchedule = window.cancelIdleCallback || clearTimeout;
    const handle = scheduleCache(() => {
      cacheMediaUrls(mediaUrls, 'manosya-supplier-feed-media-v1');
    });

    return () => cancelSchedule(handle);
  }, [workers]);

  async function loadSupplierProfile() {
    const { data, error } = await supabase
      .from('supplier_profiles')
      .select('*')
      .eq('user_id', me.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      if (error.code !== 'PGRST205' && error.code !== '42P01') console.warn('supplier profile error', error);
      return;
    }

    const next = data || {};
    setSupplierProfile(next);
    setProfileForm({
      store_name: next.store_name || profile?.full_name || '',
      bio: next.bio || '',
      avatar_url: next.avatar_url || profile?.avatar_url || '',
      cover_url: next.cover_url || '',
      whatsapp_url: next.whatsapp_url || '',
      address_text: next.address_text || '',
    });
  }

  async function loadProducts() {
    if (!me?.id) return;
    const { data, error } = await supabase
      .from('supplier_products')
      .select('*')
      .eq('supplier_id', me.id)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code !== 'PGRST205' && error.code !== '42P01') toast.error('No pudimos cargar tus productos');
      setProducts([]);
      return;
    }

    setProducts(data || []);
  }

  async function loadContacts() {
    if (!me?.id) return;

    const { data, error } = await supabase
      .from('supplier_contacts')
      .select(`
        id,
        supplier_id,
        requester_id,
        product_id,
        source_role,
        source_context,
        message,
        contact_url,
        status,
        read_at,
        created_at,
        product:supplier_products(title, price_text, service_slug, image_url),
        requester:profiles!supplier_contacts_requester_id_fkey(full_name, email, avatar_url, role)
      `)
      .eq('supplier_id', me.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      if (error.code !== 'PGRST205' && error.code !== '42P01') {
        console.warn('supplier contacts error', error);
      }
      setContacts([]);
      return;
    }

    setContacts(data || []);
  }

  async function markContactHandled(contact) {
    if (!contact?.id) return;

    const { error } = await supabase
      .from('supplier_contacts')
      .update({
        status: 'handled',
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', contact.id)
      .eq('supplier_id', me.id);

    if (error) {
      toast.error('No pudimos actualizar la consulta');
      return;
    }

    setContacts((prev) =>
      prev.map((item) =>
        item.id === contact.id
          ? { ...item, status: 'handled', read_at: new Date().toISOString() }
          : item
      )
    );
    toast.success('Consulta marcada como atendida');
  }

  async function loadWorkers() {
    setBusy(true);
    try {
      const [{ data: workersData, error: workersError }, { data: postsData }] = await Promise.all([
        supabase.from('map_workers_view').select('*'),
        supabase.from('worker_posts_public').select('*').order('created_at', { ascending: false }).limit(80),
      ]);

      if (workersError) throw workersError;

      const workersMap = {};
      (workersData || []).forEach((worker) => {
        const id = String(worker.user_id || worker.id || '');
        if (id) workersMap[id] = worker;
      });

      const postCards = (postsData || []).map((post) => {
        const owner = workersMap[String(post.worker_id)] || {};
        return {
          ...owner,
          ...post,
          user_id: post.worker_id,
          post_id: post.post_id || post.id || null,
          full_name: owner.full_name || post.full_name || 'Trabajador ManosYA',
          avatar_url: owner.avatar_url || post.avatar_url || '/avatar-fallback.png',
          skills: owner.skills || post.service_type || 'Servicio general',
          post_description: post.caption || post.text_overlay || owner.bio || '',
          media_url: post.media_url || owner.avatar_url || '/avatar-fallback.png',
          media_type: String(post.media_type || '').toLowerCase() === 'video' ? 'video' : 'image',
        };
      });

      const postedIds = new Set(postCards.map((item) => String(item.user_id)));
      const fallbackCards = (workersData || [])
        .filter((worker) => !postedIds.has(String(worker.user_id || worker.id)))
        .map((worker) => ({
          ...worker,
          user_id: worker.user_id || worker.id,
          media_url: worker.avatar_url || '/avatar-fallback.png',
          media_type: 'image',
          post_description: worker.bio || 'Profesional activo en ManosYA.',
        }));

      const allCards = [...postCards, ...fallbackCards].map((worker) => ({
        ...worker,
        _matchesSelectedService: selectedService ? workerMatchesService(worker, selectedService) : false,
        _relatedToSelectedService: selectedService ? workerRelatedToService(worker, selectedService) : false,
      }));

      const rankedCards = selectedService
        ? [...allCards].sort((a, b) => {
            if (a._matchesSelectedService !== b._matchesSelectedService) return a._matchesSelectedService ? -1 : 1;
            if (a._relatedToSelectedService !== b._relatedToSelectedService) return a._relatedToSelectedService ? -1 : 1;
            return 0;
          })
        : allCards;

      setWorkers(rankedCards.slice(0, 80));
    } catch (error) {
      console.error(error);
      toast.error('No pudimos cargar el feed');
    } finally {
      setBusy(false);
    }
  }
  function openProductForService(serviceSlug) {
    const nextService = normalizeSlug(serviceSlug || selectedService || 'servicio-general');
    setProductForm((prev) => ({
      ...prev,
      service_slug: nextService,
    }));
    saveServiceIntent({
      role: 'supplier',
      serviceSlug: nextService,
      serviceName: serviceName(nextService),
      source: 'supplier_publish_cta',
    });
    setSheet('product');
  }

  function openOfferForWorker(worker) {
    if (!worker) return;
    const serviceSlug = normalizeSlug(selectedService || primaryServiceSlug(worker) || 'servicio-general');
    setOfferWorker(worker);
    setOfferForm({
      comment: `Tengo una opción que puede servir para este trabajo de ${serviceName(serviceSlug)}.`,
      title: '',
      price_text: '',
      description: '',
      image_url: '',
      media_type: 'image',
      service_slug: serviceSlug,
    });
    setSheet('offer');
  }

  function messageWorker(worker) {
    const workerId = worker?.user_id || worker?.worker_id || worker?.id;
    if (!workerId) {
      toast.error('No encontramos el perfil del trabajador');
      return;
    }
    router.push(`/dm/${workerId}`);
  }
    async function uploadSupplierMedia(file, folder, onDone) {
    if (!file || !me?.id) return;

    try {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (!isVideo && !isImage) {
        toast.error('Subí una foto o video válido');
        return;
      }

      const maxSize = isVideo ? 80 * 1024 * 1024 : 8 * 1024 * 1024;

      if (file.size > maxSize) {
        toast.error(isVideo ? 'Video muy pesado. Máximo 80MB.' : 'Foto muy pesada. Máximo 8MB.');
        return;
      }

      const ext = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
      const path = `${folder}/${me.id}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('supplier-media')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('supplier-media').getPublicUrl(path);
      const publicUrl = data?.publicUrl || '';

      if (!publicUrl) throw new Error('No se pudo generar la URL pública');

      onDone(publicUrl, isVideo ? 'video' : 'image');
      toast.success(isVideo ? 'Video subido' : 'Foto subida');
    } catch (error) {
      console.error(error);
      toast.error('No pudimos subir el archivo');
    }
  }

  async function saveSupplierProfile(event) {
    event.preventDefault();
    if (!me?.id || savingProfile) return;
    setSavingProfile(true);

    try {
      const whatsappUrl = profileForm.whatsapp_url.trim()
        ? safeExternalUrl(profileForm.whatsapp_url.trim(), { allowedHosts: ['wa.me', 'whatsapp.com'] })
        : '';
      if (profileForm.whatsapp_url.trim() && !whatsappUrl) {
        toast.error('Usá un link seguro de WhatsApp: wa.me o whatsapp.com');
        return;
      }

      const payload = {
        user_id: me.id,
        store_name: cleanSecurityText(profileForm.store_name, 90) || profile?.full_name || 'Proveedor ManosYA',
        bio: cleanSecurityText(profileForm.bio, 700),
        avatar_url: safeExternalUrl(profileForm.avatar_url.trim(), { httpsOnly: true }) || '',
        cover_url: safeExternalUrl(profileForm.cover_url.trim(), { httpsOnly: true }) || '',
        whatsapp_url: whatsappUrl,
        address_text: cleanSecurityText(profileForm.address_text, 180),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('supplier_profiles').upsert(payload, { onConflict: 'user_id' });
      if (error) throw error;

      await supabase
        .from('profiles')
        .update({ full_name: payload.store_name, avatar_url: payload.avatar_url || profile?.avatar_url || null, updated_at: new Date().toISOString() })
        .eq('id', me.id);

      setSupplierProfile((prev) => ({ ...prev, ...payload }));
      setProfile((prev) => ({ ...prev, full_name: payload.store_name, avatar_url: payload.avatar_url || prev?.avatar_url }));
      toast.success('Perfil actualizado');
      setSheet(null);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo guardar el perfil');
    } finally {
      setSavingProfile(false);
    }
  }

   async function saveProduct(event) {
    event.preventDefault();
    if (!me?.id || saving) return;

    if (!productForm.title.trim()) {
      toast.error('Poné el nombre del producto');
      return;
    }

    if (!productForm.image_url.trim()) {
      toast.error('Subí una foto o video del producto');
      return;
    }

    setSaving(true);

    try {
      const supplierName =
        supplierProfile?.store_name ||
        profileForm.store_name ||
        profile?.full_name ||
        profile?.email ||
        'Proveedor ManosYA';

      const contactUrl = productForm.contact_url.trim()
        ? safeExternalUrl(productForm.contact_url.trim(), { httpsOnly: true })
        : '';

      if (productForm.contact_url.trim() && !contactUrl) {
        toast.error('El link externo debe empezar con https://');
        setSaving(false);
        return;
      }

      const smartDescription = [
        cleanSecurityText(productForm.description, 600),
        productForm.need_keywords.trim()
          ? `Necesidades relacionadas: ${cleanSecurityText(productForm.need_keywords, 220)}`
          : '',
        `Rubro ManosYA: ${serviceName(productForm.service_slug)}`,
      ]
        .filter(Boolean)
        .join('\n\n');

      const payload = {
        supplier_id: me.id,
        supplier_name: cleanSecurityText(supplierName, 90),
        title: cleanSecurityText(productForm.title, 90),
        description: smartDescription,
        price_text: cleanSecurityText(productForm.price_text, 60),
        service_slug: normalizeSlug(productForm.service_slug || selectedService || 'servicio-general'),
        image_url: productForm.image_url,
        contact_url: contactUrl,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('supplier_products').insert([payload]);
      if (error) throw error;

      toast.success('Producto publicado en la necesidad correcta');

      setProductForm({
        title: '',
        description: '',
        price_text: '',
        service_slug: selectedService || 'plomeria',
        image_url: '',
        media_type: 'image',
        need_keywords: '',
        contact_url: '',
      });

      await loadProducts();
      setSheet(null);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo publicar');
    } finally {
      setSaving(false);
    }
  }

  async function removeProduct(product) {
    const { error } = await supabase
      .from('supplier_products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', product.id)
      .eq('supplier_id', me.id);

    if (error) {
      toast.error('No se pudo ocultar');
      return;
    }

    setProducts((prev) => prev.map((item) => (item.id === product.id ? { ...item, is_active: false } : item)));
  }

  async function saveProductComment(event) {
    event.preventDefault();
    if (!me?.id || !offerWorker || savingOffer) return;

    const workerId = offerWorker.user_id || offerWorker.worker_id || offerWorker.id;
    if (!workerId) {
      toast.error('No encontramos el trabajador');
      return;
    }

    if (!offerForm.comment.trim()) {
      toast.error('Escribí el comentario para el trabajador');
      return;
    }

    if (!offerForm.title.trim()) {
      toast.error('Poné el nombre del producto');
      return;
    }

    if (!offerForm.image_url.trim()) {
      toast.error('Subí una foto del producto');
      return;
    }

    setSavingOffer(true);

    try {
      const supplierName =
        supplierProfile?.store_name ||
        profileForm.store_name ||
        profile?.full_name ||
        profile?.email ||
        'Proveedor ManosYA';
      const cleanServiceSlug = normalizeSlug(offerForm.service_slug || selectedService || primaryServiceSlug(offerWorker));
      const cleanTitle = cleanSecurityText(offerForm.title, 90);
      const cleanPrice = cleanSecurityText(offerForm.price_text, 60);
      const cleanComment = cleanSecurityText(offerForm.comment, 500);
      const cleanDescription = cleanSecurityText(offerForm.description, 600);

      const { data: product, error: productError } = await supabase
        .from('supplier_products')
        .insert([
          {
            supplier_id: me.id,
            supplier_name: cleanSecurityText(supplierName, 90),
            title: cleanTitle,
            description: cleanDescription,
            price_text: cleanPrice,
            service_slug: cleanServiceSlug,
            image_url: offerForm.image_url,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
        ])
        .select('id')
        .single();

      if (productError) throw productError;

      const { error: commentError } = await supabase.from('worker_comments').insert([
        {
          worker_id: workerId,
          client_id: me.id,
          client_name: supplierName,
          client_avatar: profileForm.avatar_url || profile?.avatar_url || '',
          comment: cleanComment,
          commenter_role: 'supplier',
          product_id: product?.id || null,
          product_title: cleanTitle,
          product_price_text: cleanPrice,
          product_image_url: offerForm.image_url,
          product_service_slug: cleanServiceSlug,
          post_id: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(offerWorker?.post_id || ''))
            ? offerWorker.post_id
            : null,
        },
      ]);

      if (commentError) throw commentError;

      toast.success('Comentario con producto enviado');
      await loadProducts();
      setOfferWorker(null);
      setSheet(null);
    } catch (error) {
      console.error('supplier product comment error', error);
      const missingColumns = error?.code === 'PGRST204' || String(error?.message || '').includes('commenter_role');
      toast.error(missingColumns ? 'Falta aplicar la migración 011 en Supabase' : error.message || 'No se pudo enviar el producto');
    } finally {
      setSavingOffer(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-black text-white">
        <div className="flex items-center gap-3 rounded-full bg-white/12 px-5 py-3 text-sm font-black backdrop-blur-xl">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando feed proveedor
        </div>
      </main>
    );
  }

  return (
    <main className="relative h-[var(--real-vh,100dvh)] overflow-hidden bg-black text-white">
     <div className="pointer-events-auto absolute left-0 right-0 top-0 z-40 px-3 pt-[calc(env(safe-area-inset-top)+8px)]">
  <div className="mx-auto flex max-w-4xl items-center gap-2">
    <button
      type="button"
      onClick={() => router.push('/role-selector')}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/18 bg-black/28 text-white shadow-[0_12px_24px_rgba(0,0,0,0.22)] backdrop-blur-xl active:scale-95"
      aria-label="Volver al selector de rol"
      title="Volver"
    >
      <ArrowLeft size={18} strokeWidth={3} />
    </button>

    <button
      type="button"
      onClick={() => setSheet('profile')}
      className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-white/12 bg-black/24 px-2 py-1 text-left backdrop-blur-xl active:scale-[0.99]"
      aria-label="Abrir perfil proveedor"
    >
      <img
        src={profileForm.avatar_url || profile?.avatar_url || '/avatar-fallback.png'}
        onError={(e) => {
          e.currentTarget.src = '/avatar-fallback.png';
        }}
        alt="Proveedor"
        className="h-7 w-7 rounded-full object-cover"
      />
      <div className="min-w-0">
        <div className="truncate text-[13px] font-black">
          {profileForm.store_name || profile?.full_name || 'Proveedor ManosYA'}
        </div>
        <div className="truncate text-[10px] font-bold text-[#9ee5df]">{storeScore}% listo</div>
      </div>
    </button>

    <button
      type="button"
      onClick={() => setSheet('contacts')}
      className="flex h-9 min-w-9 items-center justify-center rounded-full border border-white/18 bg-[#62bfb9] px-3 text-[11px] font-black text-white shadow-[0_12px_24px_rgba(98,191,185,0.24)] active:scale-95"
      aria-label="Consultas"
    >
      <MessageSquareText size={15} />
      <span className="ml-1">{unreadContacts || contacts.length}</span>
    </button>

    <button
      type="button"
      onClick={() => setSheet('catalog')}
      className="flex h-9 min-w-9 items-center justify-center rounded-full bg-white px-3 text-[11px] font-black text-slate-950 active:scale-95"
      aria-label="Catálogo"
    >
      <Store size={15} />
      <span className="ml-1">{activeProducts.length}</span>
    </button>
  </div>
        {selectedServiceLabel && (
          <div className="mx-auto mt-1.5 flex max-w-4xl justify-center">
            <div className="max-w-[88vw] truncate rounded-full border border-white/12 bg-black/24 px-2.5 py-1 text-[10px] font-black text-white/90 shadow-[0_10px_24px_rgba(0,0,0,0.16)] backdrop-blur-xl">
              Proveedores e insumos para {selectedServiceLabel}
            </div>
          </div>
        )}
      </div>

      {busy ? (
        <div className="flex h-full items-center justify-center text-center">
          <div>
            <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-[#62bfb9]" />
            <div className="text-lg font-black">Cargando demanda real</div>
          </div>
        </div>
      ) : !workers.length ? (
        <div className="flex h-full items-center justify-center px-8 text-center">
          <div>
            <BriefcaseBusiness className="mx-auto mb-3 text-white/60" size={34} />
            <div className="text-xl font-black">Todavía no hay feed</div>
            <button type="button" onClick={loadWorkers} className="mt-5 rounded-full bg-[#62bfb9] px-5 py-3 text-sm font-black">Actualizar</button>
          </div>
        </div>
      ) : (
        <div
          ref={feedRef}
          onScroll={(event) => {
            const el = event.currentTarget;
            const cardHeight = Math.max(1, el.clientHeight);
            const rawIndex = Math.max(0, Math.min(loopedWorkers.length - 1, Math.round(el.scrollTop / cardHeight)));
            const next = workers.length ? rawIndex % workers.length : 0;
            if (next !== feedIndex) setFeedIndex(next);
            if (rawIndex !== feedSlotIndex) setFeedSlotIndex(rawIndex);

            if (feedSnapTimerRef.current) clearTimeout(feedSnapTimerRef.current);
            feedSnapTimerRef.current = setTimeout(() => {
              const snapIndex = Math.max(0, Math.min(loopedWorkers.length - 1, Math.round(el.scrollTop / cardHeight)));
              const realIndex = workers.length ? snapIndex % workers.length : 0;
              const shouldRecenter = workers.length > 1 && (snapIndex < workers.length || snapIndex >= workers.length * 4);
              const targetIndex = shouldRecenter ? workers.length * 2 + realIndex : snapIndex;
              setFeedIndex(realIndex);
              setFeedSlotIndex(targetIndex);
              el.scrollTo({ top: targetIndex * cardHeight, behavior: 'auto' });
            }, 120);
          }}
          style={{
            scrollSnapType: 'y mandatory',
            overscrollBehaviorY: 'contain',
            WebkitOverflowScrolling: 'touch',
          }}
          className="h-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain"
        >
          {loopedWorkers.map((worker, index) => (
            <SupplierFeedCard
              key={`${String(worker.post_id || worker.id || worker.user_id || 'worker')}-${index}`}
              worker={worker}
              selectedService={selectedService}
              isActive={index === feedSlotIndex}
              onOpenWorker={(item) => setSelectedWorkerProfile(item)}
              onOfferProduct={openOfferForWorker}
              onMessageWorker={messageWorker}
            />
          ))}
        </div>
      )}

      <SupplierWorkerProfileSheet
        worker={selectedWorkerProfile}
        onClose={() => setSelectedWorkerProfile(null)}
        onOfferProduct={openOfferForWorker}
        onMessageWorker={messageWorker}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+10px)] z-50 flex justify-center px-3">
        <div className="pointer-events-auto flex w-full max-w-[356px] items-center justify-between rounded-[30px] border border-white/75 bg-white/95 px-2 py-2 text-[#071827] shadow-[0_22px_54px_rgba(7,24,39,0.22)] backdrop-blur-[22px]">
          <button type="button" onClick={() => setSheet('profile')} className="flex h-12 w-[62px] flex-col items-center justify-center gap-0.5 rounded-[22px] bg-slate-100 px-2 text-center transition active:scale-95">
            <Store size={18} />
            <span className="max-w-full truncate text-[9.5px] font-black leading-none">Perfil</span>
          </button>
          <button type="button" onClick={() => openProductForService(selectedService)} className="flex h-[58px] w-[92px] flex-col items-center justify-center gap-0.5 rounded-[25px] bg-[linear-gradient(135deg,#8af2e8_0%,#42c8bd_48%,#15998f_100%)] px-2 text-center text-white shadow-[0_16px_34px_rgba(66,200,189,0.44)] ring-1 ring-white/28 transition active:scale-95">
            <PackagePlus size={20} />
            <span className="max-w-full truncate text-[10px] font-black leading-none">Producto</span>
          </button>
          <button type="button" onClick={() => setSheet('contacts')} className="relative flex h-12 w-[62px] flex-col items-center justify-center gap-0.5 rounded-[22px] bg-slate-100 px-2 text-center transition active:scale-95">
            <MessageSquareText size={18} />
            <span className="max-w-full truncate text-[9.5px] font-black leading-none">Consultas</span>
            {unreadContacts > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                {unreadContacts}
              </span>
            )}
          </button>
          <button type="button" onClick={() => setSheet('catalog')} className="relative flex h-12 w-[62px] flex-col items-center justify-center gap-0.5 rounded-[22px] bg-slate-100 px-2 text-center transition active:scale-95">
            <BriefcaseBusiness size={18} />
            <span className="max-w-full truncate text-[9.5px] font-black leading-none">Catálogo</span>
            {activeProducts.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#62bfb9] px-1 text-[10px] font-black text-white">
                {activeProducts.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <SupplierSheet title="Perfil proveedor" open={sheet === 'profile'} onClose={() => setSheet(null)}>
        <form onSubmit={saveSupplierProfile} className="space-y-4">
          <div className="rounded-[26px] border border-[#d6f4f1] bg-[#effffb] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#0c6b70]">Tienda interna</div>
                <div className="mt-1 text-xl font-black text-slate-950">{storeScore}% listo</div>
              </div>
              <div className="h-3 w-32 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-[#62bfb9]" style={{ width: `${storeScore}%` }} />
              </div>
            </div>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
              Completa tu perfil para recibir consultas y pedidos dentro de ManosYA. WhatsApp queda como respaldo, no como el centro de venta.
            </p>
          </div>
          <Field label="Nombre comercial">
            <input value={profileForm.store_name} onChange={(e) => setProfileForm((prev) => ({ ...prev, store_name: e.target.value }))} placeholder="Ferretería San José" className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-900 outline-none focus:border-[#62bfb9]" />
          </Field>
                   <Field label="Logo o foto de la tienda">
           <MediaUploader
              value={profileForm.avatar_url}
              label="Subir logo"
              hint="Foto cuadrada, clara y profesional."
              onFile={(file) =>
                uploadSupplierMedia(file, 'logos', (url) =>
                  setProfileForm((prev) => ({ ...prev, avatar_url: url }))
                )
              }
            />
          </Field>

          <Field label="Portada de tienda">
  <MediaUploader
    value={profileForm.cover_url}
    label="Subir portada"
    hint="Mostrá tu local, productos o depósito."
    wide
    onFile={(file) =>
      uploadSupplierMedia(file, 'covers', (url) =>
        setProfileForm((prev) => ({ ...prev, cover_url: url }))
      )
    }
  />
</Field>
          <Field label="Respaldo externo opcional">
            <input value={profileForm.whatsapp_url} onChange={(e) => setProfileForm((prev) => ({ ...prev, whatsapp_url: e.target.value }))} placeholder="Link opcional, ej: https://wa.me/595..." className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-900 outline-none focus:border-[#62bfb9]" />
          </Field>
          <Field label="Dirección">
            <input value={profileForm.address_text} onChange={(e) => setProfileForm((prev) => ({ ...prev, address_text: e.target.value }))} placeholder="Ciudad, barrio, calle" className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-900 outline-none focus:border-[#62bfb9]" />
          </Field>
          <Field label="Descripción">
            <textarea value={profileForm.bio} onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))} rows={3} placeholder="Vendemos insumos para profesionales, respondemos pedidos en ManosYA y hacemos entregas en la zona..." className="min-h-[92px] w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-[#62bfb9]" />
          </Field>
          <button type="submit" disabled={savingProfile} className="flex w-full items-center justify-center gap-2 rounded-[22px] bg-[#08233a] px-5 py-4 text-sm font-black text-white disabled:opacity-60">
            {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={17} />}
            Guardar perfil
          </button>
        </form>
      </SupplierSheet>

                  <SupplierSheet title="Nuevo producto" open={sheet === 'product'} onClose={() => setSheet(null)}>
        <form onSubmit={saveProduct} className="space-y-4">
          <MediaUploader
            value={productForm.image_url}
            mediaType={productForm.media_type}
            label="Subir foto o video"
            wide
            onFile={(file) =>
              uploadSupplierMedia(file, 'products', (url, mediaType) =>
                setProductForm((prev) => ({
                  ...prev,
                  image_url: url,
                  media_type: mediaType,
                }))
              )
            }
          />

          <Field label="Nombre del producto">
            <input
              value={productForm.title}
              onChange={(e) => setProductForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Ej: Cable, canilla, cemento"
              className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-900 outline-none focus:border-[#62bfb9]"
            />
          </Field>

          <Field label="Rubro">
            <select
              value={productForm.service_slug}
              onChange={(e) => setProductForm((prev) => ({ ...prev, service_slug: e.target.value }))}
              className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-900 outline-none focus:border-[#62bfb9]"
            >
              {SERVICES.map((service) => (
                <option key={service.slug} value={service.slug}>
                  {service.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Precio">
            <input
              value={productForm.price_text}
              onChange={(e) => setProductForm((prev) => ({ ...prev, price_text: e.target.value }))}
              placeholder="Ej: Gs. 25.000"
              className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-900 outline-none focus:border-[#62bfb9]"
            />
          </Field>

          <Field label="Palabras clave">
            <input
              value={productForm.need_keywords}
              onChange={(e) => setProductForm((prev) => ({ ...prev, need_keywords: e.target.value }))}
              placeholder="Ej: aire, cable, foco, caño"
              className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-900 outline-none focus:border-[#62bfb9]"
            />
          </Field>

          <Field label="Descripción">
            <textarea
              value={productForm.description}
              onChange={(e) => setProductForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              placeholder="Detalle corto del producto"
              className="min-h-[92px] w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-[#62bfb9]"
            />
          </Field>

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-[22px] bg-[#62bfb9] px-5 py-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(98,191,185,0.35)] disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal size={17} />}
            Publicar
          </button>
        </form>
      </SupplierSheet>

      <SupplierSheet title="Responder con producto" open={sheet === 'offer'} onClose={() => setSheet(null)}>
        <form onSubmit={saveProductComment} className="space-y-4">
          {offerWorker && (
            <div className="overflow-hidden rounded-[26px] bg-slate-950 text-white shadow-[0_16px_38px_rgba(15,23,42,0.22)]">
              <div className="relative h-36">
                <img
                  src={offerWorker.media_url || offerWorker.cover_url || offerWorker.avatar_url || '/avatar-fallback.png'}
                  onError={(event) => { event.currentTarget.src = '/avatar-fallback.png'; }}
                  alt={offerWorker.full_name || 'Trabajador'}
                  className="h-full w-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/82 to-black/5" />
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[#9ee5df]">Respuesta inteligente</div>
                  <div className="mt-1 truncate text-xl font-black">{offerWorker.full_name || 'Trabajador ManosYA'}</div>
                  <p className="mt-1 line-clamp-1 text-[12px] font-semibold text-white/76">
                    {offerWorker.post_description || offerWorker.caption || offerWorker.bio || serviceName(primaryServiceSlug(offerWorker))}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-[26px] border border-[#d6f4f1] bg-[#effffb] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#62bfb9] text-white">
                <Sparkles size={20} />
              </div>
              <div>
                <div className="text-[15px] font-black text-slate-950">Comentario + producto en una sola respuesta</div>
                <p className="mt-1 text-[13px] font-semibold leading-5 text-slate-600">
                  Se publica en los comentarios del trabajador y el producto queda en tu catálogo para que puedan escribirte por privado.
                </p>
              </div>
            </div>
          </div>

          <MediaUploader
            value={offerForm.image_url}
            mediaType={offerForm.media_type}
            label="Subir foto del producto"
            accept="image/*"
            wide
            onFile={(file) =>
              uploadSupplierMedia(file, 'products', (url, mediaType) =>
                setOfferForm((prev) => ({
                  ...prev,
                  image_url: url,
                  media_type: mediaType,
                }))
              )
            }
          />

          <Field label="Comentario para el trabajador">
            <textarea
              value={offerForm.comment}
              onChange={(event) => setOfferForm((prev) => ({ ...prev, comment: event.target.value }))}
              rows={3}
              placeholder="Ej: Tengo este material listo para tu obra, puedo preparar entrega hoy."
              className="min-h-[92px] w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-[#62bfb9]"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Producto">
              <input
                value={offerForm.title}
                onChange={(event) => setOfferForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Ej: Malla para losa"
                className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-900 outline-none focus:border-[#62bfb9]"
              />
            </Field>
            <Field label="Precio">
              <input
                value={offerForm.price_text}
                onChange={(event) => setOfferForm((prev) => ({ ...prev, price_text: event.target.value }))}
                placeholder="Ej: Gs. 85.000"
                className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-900 outline-none focus:border-[#62bfb9]"
              />
            </Field>
          </div>

          <Field label="Rubro">
            <select
              value={offerForm.service_slug}
              onChange={(event) => setOfferForm((prev) => ({ ...prev, service_slug: event.target.value }))}
              className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-900 outline-none focus:border-[#62bfb9]"
            >
              {SERVICES.map((service) => (
                <option key={service.slug} value={service.slug}>
                  {service.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Detalle opcional">
            <textarea
              value={offerForm.description}
              onChange={(event) => setOfferForm((prev) => ({ ...prev, description: event.target.value }))}
              rows={3}
              placeholder="Medidas, disponibilidad, entrega, marca o condición."
              className="min-h-[92px] w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-[#62bfb9]"
            />
          </Field>

          <button
            type="submit"
            disabled={savingOffer}
            className="flex w-full items-center justify-center gap-2 rounded-[22px] bg-[#62bfb9] px-5 py-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(98,191,185,0.35)] disabled:opacity-60"
          >
            {savingOffer ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal size={17} />}
            Comentar con producto
          </button>
        </form>
      </SupplierSheet>

      <SupplierSheet title="Videos que venden" open={sheet === 'creator'} onClose={() => setSheet(null)}>
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[30px] bg-[#08233a] p-5 text-white">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#9ee5df]">
              <Clapperboard size={15} />
              Proveedor influencer
            </div>
            <h3 className="mt-4 text-3xl font-black leading-tight">Mostrá tu cara, explicá tu producto y ganá confianza.</h3>
            <p className="mt-3 text-sm font-semibold leading-6 text-white/78">
              Los clientes compran más cuando ven quién está detrás del negocio. Grabá videos simples, verticales y reales.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Presentación', 'Soy de Ferretería San José, vendo cables, focos y herramientas. Entrego en la zona.'],
              ['Consejo', 'Para instalar una canilla, estos son los tres insumos que no te pueden faltar.'],
              ['Oferta', 'Hoy tengo promo en cemento y arena. Pedime dentro de ManosYA y te preparo el pedido.'],
            ].map(([title, text]) => (
              <article key={title} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#effffb] text-[#0c6b70]">
                  <Sparkles size={19} />
                </div>
                <div className="mt-3 text-[15px] font-black text-slate-950">{title}</div>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{text}</p>
              </article>
            ))}
          </div>

          <div className="rounded-[26px] border border-[#d6f4f1] bg-[#effffb] p-5">
            <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#0c6b70]">Regla ManosYA</div>
            <p className="mt-2 text-[15px] font-bold leading-7 text-slate-700">
              Cerrá el video diciendo: &quot;Pedime por ManosYA&quot;. Así el cliente vuelve a la app, tu tienda sube de nivel y el negocio queda ordenado.
            </p>
            <button type="button" onClick={() => setSheet('catalog')} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#62bfb9] px-5 py-3 text-sm font-black text-white shadow-[0_12px_26px_rgba(98,191,185,0.32)] active:scale-95">
              <Store size={17} />
              Ir al catálogo
            </button>
          </div>
        </div>
      </SupplierSheet>

      <SupplierSheet title="Consultas recibidas" open={sheet === 'contacts'} onClose={() => setSheet(null)}>
        {!contacts.length ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
            <div>
              <MessageSquareText className="mx-auto mb-3 text-slate-300" size={36} />
              <div className="text-lg font-black text-slate-950">Todavía no llegaron consultas</div>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Cuando un trabajador o cliente elija tus productos, lo podrás ver acá.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => {
              const requester = contact.requester || {};
              const product = contact.product || {};
              const handled = contact.status === 'handled' || contact.read_at;

              return (
                <article key={contact.id} className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <img
                      src={requester.avatar_url || product.image_url || '/avatar-fallback.png'}
                      onError={(event) => {
                        event.currentTarget.src = '/avatar-fallback.png';
                      }}
                      alt={requester.full_name || product.title || 'Consulta'}
                      className="h-14 w-14 rounded-2xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#effffb] px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-[#0c6b70]">
                          {handled ? 'Atendida' : 'Nueva consulta'}
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                          {new Date(contact.created_at).toLocaleString('es-PY', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <h3 className="mt-2 text-[17px] font-black text-slate-950">
                        {requester.full_name || requester.email || 'Usuario ManosYA'}
                      </h3>
                      <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                        {contact.message || `Quiere consultar por ${product.title || 'un producto'}.`}
                      </p>
                      <div className="mt-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                        {product.title || 'Producto ManosYA'} {product.price_text ? `- ${product.price_text}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                                       <button
                      type="button"
                      onClick={() => {
                        const requesterId = contact.requester_id;
                        if (!requesterId) {
                          toast.error('No encontramos el usuario para responder');
                          return;
                        }

                        router.push(`/dm/${requesterId}?contact=${contact.id}`);
                      }}
                      className="rounded-full bg-[#62bfb9] px-4 py-2 text-xs font-black text-white shadow-[0_10px_20px_rgba(98,191,185,0.24)] active:scale-95"
                    >
                      Responder en chat
                    </button>
                    {!handled ? (
                      <button
                        type="button"
                        onClick={() => markContactHandled(contact)}
                        className="rounded-full bg-[#08233a] px-4 py-2 text-xs font-black text-white active:scale-95"
                      >
                        Marcar atendida
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </SupplierSheet>

      <SupplierSheet title="Mi catálogo" open={sheet === 'catalog'} onClose={() => setSheet(null)}>
        {!activeProducts.length ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
            <div>
              <Store className="mx-auto mb-3 text-slate-300" size={36} />
              <div className="text-lg font-black text-slate-950">Todavía no publicaste productos</div>
              <p className="mt-2 text-sm font-semibold text-slate-500">Desde el feed tocá Producto o publicá según el oficio del trabajador.</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {activeProducts.map((product) => (
              <article key={product.id} className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
                <div className="aspect-[4/3] bg-slate-200">
                  <img src={product.image_url || '/avatar-fallback.png'} onError={(e) => { e.currentTarget.src = '/avatar-fallback.png'; }} alt={product.title} className="h-full w-full object-cover" />
                </div>
                <div className="p-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[#0c6b70]">{serviceName(product.service_slug)}</div>
                  <div className="mt-1 line-clamp-2 text-[16px] font-black text-slate-950">{product.title}</div>
                  <div className="mt-1 text-sm font-bold text-slate-500">{product.price_text || 'Consultar precio'}</div>
                  <button type="button" onClick={() => removeProduct(product)} className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black text-red-500 shadow-sm active:scale-95">
                    <Trash2 size={14} />
                    Ocultar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </SupplierSheet>
    </main>
  );
}
function MediaUploader({ value, mediaType = 'image', label, wide = false, accept = 'image/*,video/*', onFile }) {
  const isVideo = mediaType === 'video';

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-3">
      {value ? (
        <div className={wide ? 'aspect-[16/9] overflow-hidden rounded-[22px] bg-black' : 'h-24 w-24 overflow-hidden rounded-[24px] bg-black'}>
          {isVideo ? (
            <video src={value} controls playsInline className="h-full w-full object-cover" />
          ) : (
            <img
              src={value}
              onError={(event) => {
                event.currentTarget.src = '/avatar-fallback.png';
              }}
              alt={label}
              className="h-full w-full object-cover"
            />
          )}
        </div>
      ) : null}

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#62bfb9] px-4 py-4 text-sm font-black text-white active:scale-[0.98]">
        <UploadCloud size={18} />
        {label}
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
            event.target.value = '';
          }}
        />
      </label>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[12px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
