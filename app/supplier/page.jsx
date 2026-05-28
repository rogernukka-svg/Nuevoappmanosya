'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  Clapperboard,
  ImagePlus,
  Loader2,
  MessageSquareText,
  PackagePlus,
  Save,
  SendHorizontal,
  Sparkles,
  Store,
  Trash2,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { getSupabase } from '@/lib/supabase';
import { cacheMediaUrls, collectWorkerMediaUrls } from '@/lib/mediaCache';
import { requireRole } from '@/lib/roleRedirect';

const supabase = getSupabase();
const LAST_GPS_KEY = 'manosya_supplier_feed_gps';

const SERVICES = [
  { slug: 'plomeria', name: 'Plomeria', hint: 'canos, canillas, griferia' },
  { slug: 'electricidad', name: 'Electricidad', hint: 'cables, llaves, termicas' },
  { slug: 'limpieza', name: 'Limpieza', hint: 'quimicos, escobas, equipos' },
  { slug: 'albanileria', name: 'Albanileria', hint: 'cemento, mezcla, herramientas' },
  { slug: 'pintura', name: 'Pintura', hint: 'pinturas, rodillos, lijas' },
  { slug: 'jardineria', name: 'Jardineria', hint: 'mangueras, tijeras, sustratos' },
  { slug: 'servicio-general', name: 'Servicio general', hint: 'insumos rapidos' },
];

function normalizeSlug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function serviceName(slug) {
  const normalized = normalizeSlug(slug);
  return SERVICES.find((item) => item.slug === normalized)?.name || 'Servicio general';
}

function primaryServiceSlug(worker) {
  const raw = worker?.service_type || worker?.skills || worker?.skill_slug || worker?.category || 'servicio-general';
  const first = String(raw).split(',')[0].trim();
  const normalized = normalizeSlug(first);
  const matched = SERVICES.find((service) => normalized.includes(service.slug) || service.slug.includes(normalized));
  return matched?.slug || normalized || 'servicio-general';
}

function SupplierFeedCard({ worker, isActive, onPublishForService, onOpenWorker }) {
  const videoRef = useRef(null);
  const mediaUrl = worker?.media_url || worker?.thumbnail_url || worker?.avatar_url || '/avatar-fallback.png';
  const isVideo = String(worker?.media_type || '').toLowerCase() === 'video';
  const serviceSlug = primaryServiceSlug(worker);
  const serviceLabel = serviceName(serviceSlug);
  const name = worker?.full_name || worker?.username || 'Trabajador ManosYA';

  useEffect(() => {
    if (!isVideo || !videoRef.current) return;
    const video = videoRef.current;
    if (isActive) {
      video.muted = true;
      video.playsInline = true;
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isActive, isVideo, mediaUrl]);

  return (
    <article
      style={{ scrollSnapStop: 'always' }}
      className="relative h-[var(--real-vh,100dvh)] w-full snap-start snap-always overflow-hidden bg-black"
    >
      {isVideo ? (
        <video ref={videoRef} src={mediaUrl} muted loop playsInline preload="auto" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <img src={mediaUrl} onError={(e) => { e.currentTarget.src = '/avatar-fallback.png'; }} alt={name} className="absolute inset-0 h-full w-full object-cover" />
      )}

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.78)_0%,rgba(0,0,0,0.26)_24%,rgba(0,0,0,0.03)_62%,rgba(0,0,0,0.22)_100%)]" />

      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+68px)] left-3 right-3 z-20 text-white">
        <div className="mb-2 inline-flex max-w-full items-center gap-2 rounded-full bg-black/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-[#9ee5df] backdrop-blur-md">
          Demanda real para {serviceLabel}
        </div>

        <div className="flex items-center gap-2">
          <img src={worker?.avatar_url || '/avatar-fallback.png'} onError={(e) => { e.currentTarget.src = '/avatar-fallback.png'; }} alt={name} className="h-10 w-10 rounded-full border-2 border-white object-cover" />
          <button type="button" onClick={() => onOpenWorker(worker)} className="min-w-0 text-left">
            <div className="truncate text-[20px] font-black leading-tight">@{name}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] font-bold text-white/82">
              <span>{serviceLabel}</span>
              {worker?.is_verified && (
                <span className="inline-flex items-center gap-1 text-sky-200">
                  <BadgeCheck size={14} />
                  Verificado
                </span>
              )}
            </div>
          </button>
        </div>

        <p className="mt-2 line-clamp-2 text-[13px] font-semibold leading-5 text-white/94">
          {worker?.post_description || worker?.caption || worker?.bio || 'Trabajo activo dentro de ManosYA.'}
        </p>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPublishForService(serviceSlug)}
            className="min-w-0 flex-1 rounded-full bg-[#62bfb9] px-4 py-3 text-[13px] font-black text-white shadow-[0_14px_30px_rgba(98,191,185,0.30)] active:scale-[0.98]"
          >
            Publicar insumo
          </button>
          <button
            type="button"
            onClick={() => onOpenWorker(worker)}
            className="flex h-11 min-w-[64px] items-center justify-center rounded-full border border-white/20 bg-white/12 px-4 text-[13px] font-black text-white backdrop-blur-md active:scale-[0.98]"
          >
            Ver
          </button>
        </div>
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

export default function SupplierPage() {
  const router = useRouter();
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
  const [sheet, setSheet] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
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
    service_slug: 'plomeria',
    image_url: '',
    contact_url: '',
  });

  const activeProducts = useMemo(() => products.filter((item) => item.is_active !== false), [products]);
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

      setWorkers([...postCards, ...fallbackCards].slice(0, 80));
    } catch (error) {
      console.error(error);
      toast.error('No pudimos cargar el feed');
    } finally {
      setBusy(false);
    }
  }

  function openProductForService(serviceSlug) {
    setProductForm((prev) => ({ ...prev, service_slug: serviceSlug || 'servicio-general' }));
    setSheet('product');
  }

  async function saveSupplierProfile(event) {
    event.preventDefault();
    if (!me?.id || savingProfile) return;
    setSavingProfile(true);

    try {
      const payload = {
        user_id: me.id,
        store_name: profileForm.store_name.trim() || profile?.full_name || 'Proveedor ManosYA',
        bio: profileForm.bio.trim(),
        avatar_url: profileForm.avatar_url.trim(),
        cover_url: profileForm.cover_url.trim(),
        whatsapp_url: profileForm.whatsapp_url.trim(),
        address_text: profileForm.address_text.trim(),
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
      toast.error('Pone el nombre del producto');
      return;
    }

    setSaving(true);
    try {
      const supplierName = supplierProfile?.store_name || profileForm.store_name || profile?.full_name || profile?.email || 'Proveedor ManosYA';
      const payload = {
        supplier_id: me.id,
        supplier_name: supplierName,
        title: productForm.title.trim(),
        description: productForm.description.trim(),
        price_text: productForm.price_text.trim(),
        service_slug: productForm.service_slug,
        image_url: productForm.image_url.trim(),
        contact_url: productForm.contact_url.trim(),
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('supplier_products').insert([payload]);
      if (error) throw error;

      toast.success('Producto publicado');
      setProductForm((prev) => ({ ...prev, title: '', description: '', price_text: '', image_url: '' }));
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
          <button type="button" onClick={() => router.push('/role-selector')} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/34 text-white backdrop-blur-xl active:scale-95">
            <ArrowLeft size={18} />
          </button>
          <button type="button" onClick={() => setSheet('profile')} className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-white/12 bg-black/28 px-2.5 py-1.5 text-left backdrop-blur-xl active:scale-[0.99]">
            <img src={profileForm.avatar_url || profile?.avatar_url || '/avatar-fallback.png'} onError={(e) => { e.currentTarget.src = '/avatar-fallback.png'; }} alt="Proveedor" className="h-8 w-8 rounded-full object-cover" />
            <div className="min-w-0">
              <div className="truncate text-[13px] font-black">{profileForm.store_name || profile?.full_name || 'Proveedor ManosYA'}</div>
              <div className="truncate text-[10px] font-bold text-[#9ee5df]">{storeScore}% listo</div>
            </div>
          </button>
          <button type="button" onClick={() => setSheet('contacts')} className="flex h-9 min-w-9 items-center justify-center rounded-full border border-white/18 bg-[#62bfb9] px-3 text-[11px] font-black text-white shadow-[0_12px_24px_rgba(98,191,185,0.24)] active:scale-95" aria-label="Consultas">
            <MessageSquareText size={15} />
            <span className="ml-1">{unreadContacts || contacts.length}</span>
          </button>
          <button type="button" onClick={() => setSheet('catalog')} className="flex h-9 min-w-9 items-center justify-center rounded-full bg-white px-3 text-[11px] font-black text-slate-950 active:scale-95" aria-label="Catalogo">
            <Store size={15} />
            <span className="ml-1">{activeProducts.length}</span>
          </button>
        </div>
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
            <div className="text-xl font-black">Todavia no hay feed</div>
            <button type="button" onClick={loadWorkers} className="mt-5 rounded-full bg-[#62bfb9] px-5 py-3 text-sm font-black">Actualizar</button>
          </div>
        </div>
      ) : (
        <div
          ref={feedRef}
          onScroll={(event) => {
            const el = event.currentTarget;
            const cardHeight = Math.max(1, el.clientHeight);
            const next = Math.max(0, Math.min(workers.length - 1, Math.round(el.scrollTop / cardHeight)));
            if (next !== feedIndex) setFeedIndex(next);

            if (feedSnapTimerRef.current) clearTimeout(feedSnapTimerRef.current);
            feedSnapTimerRef.current = setTimeout(() => {
              const snapIndex = Math.max(0, Math.min(workers.length - 1, Math.round(el.scrollTop / cardHeight)));
              el.scrollTo({ top: snapIndex * cardHeight, behavior: 'smooth' });
            }, 120);
          }}
          style={{
            scrollSnapType: 'y mandatory',
            overscrollBehaviorY: 'contain',
            WebkitOverflowScrolling: 'touch',
          }}
          className="h-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain scroll-smooth"
        >
          {workers.map((worker, index) => (
            <SupplierFeedCard
              key={String(worker.post_id || worker.id || worker.user_id || index)}
              worker={worker}
              isActive={index === feedIndex}
              onPublishForService={openProductForService}
              onOpenWorker={(item) => router.push(`/worker/feed?worker=${item.user_id || item.worker_id || item.id}`)}
            />
          ))}
        </div>
      )}

      <div className="pointer-events-auto absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+10px)] z-50 flex justify-center px-3">
        <div className="grid w-[360px] max-w-full grid-cols-4 gap-1 rounded-full border border-white/12 bg-black/42 p-1.5 shadow-[0_18px_42px_rgba(0,0,0,0.42)] backdrop-blur-[22px]">
          <button type="button" onClick={() => setSheet('profile')} className="rounded-full px-2 py-2.5 text-[11px] font-black text-white active:scale-95">
            Perfil
          </button>
          <button type="button" onClick={() => setSheet('product')} className="rounded-full bg-[#62bfb9] px-2 py-2.5 text-[11px] font-black text-white active:scale-95">
            Producto
          </button>
          <button type="button" onClick={() => setSheet('contacts')} className="rounded-full px-2 py-2.5 text-[11px] font-black text-white active:scale-95">
            Consultas
          </button>
          <button type="button" onClick={() => setSheet('catalog')} className="rounded-full px-2 py-2.5 text-[11px] font-black text-white active:scale-95">
            Catalogo
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
            <input value={profileForm.store_name} onChange={(e) => setProfileForm((prev) => ({ ...prev, store_name: e.target.value }))} placeholder="Ferreteria San Jose" className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-900 outline-none focus:border-[#62bfb9]" />
          </Field>
          <Field label="Foto / logo URL">
            <input value={profileForm.avatar_url} onChange={(e) => setProfileForm((prev) => ({ ...prev, avatar_url: e.target.value }))} placeholder="https://..." className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-900 outline-none focus:border-[#62bfb9]" />
          </Field>
          <Field label="Portada URL">
            <input value={profileForm.cover_url} onChange={(e) => setProfileForm((prev) => ({ ...prev, cover_url: e.target.value }))} placeholder="https://..." className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-900 outline-none focus:border-[#62bfb9]" />
          </Field>
          <Field label="Respaldo externo opcional">
            <input value={profileForm.whatsapp_url} onChange={(e) => setProfileForm((prev) => ({ ...prev, whatsapp_url: e.target.value }))} placeholder="Link opcional, ej: https://wa.me/595..." className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-900 outline-none focus:border-[#62bfb9]" />
          </Field>
          <Field label="Direccion">
            <input value={profileForm.address_text} onChange={(e) => setProfileForm((prev) => ({ ...prev, address_text: e.target.value }))} placeholder="Ciudad, barrio, calle" className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-900 outline-none focus:border-[#62bfb9]" />
          </Field>
          <Field label="Descripcion">
            <textarea value={profileForm.bio} onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))} rows={3} placeholder="Vendemos insumos para profesionales, respondemos pedidos en ManosYA y hacemos entregas en la zona..." className="min-h-[92px] w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-[#62bfb9]" />
          </Field>
          <button type="submit" disabled={savingProfile} className="flex w-full items-center justify-center gap-2 rounded-[22px] bg-[#08233a] px-5 py-4 text-sm font-black text-white disabled:opacity-60">
            {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={17} />}
            Guardar perfil
          </button>
        </form>
      </SupplierSheet>

      <SupplierSheet title="Publicar producto" open={sheet === 'product'} onClose={() => setSheet(null)}>
        <form onSubmit={saveProduct} className="space-y-4">
          <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#62bfb9] text-white">
                <MessageSquareText size={20} />
              </div>
              <div>
                <div className="text-[15px] font-black text-slate-950">Publica para recibir pedidos dentro de ManosYA</div>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                  El cliente ve tu producto en la app y te consulta desde ManosYA. El link externo es opcional.
                </p>
              </div>
            </div>
          </div>
          <Field label="Producto">
            <input value={productForm.title} onChange={(e) => setProductForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Cano PVC 40mm, canilla monocomando..." className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-900 outline-none focus:border-[#62bfb9]" />
          </Field>
          <Field label="Oficio donde aparece">
            <select value={productForm.service_slug} onChange={(e) => setProductForm((prev) => ({ ...prev, service_slug: e.target.value }))} className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-900 outline-none focus:border-[#62bfb9]">
              {SERVICES.map((service) => <option key={service.slug} value={service.slug}>{service.name} - {service.hint}</option>)}
            </select>
          </Field>
          <Field label="Precio o promo">
            <input value={productForm.price_text} onChange={(e) => setProductForm((prev) => ({ ...prev, price_text: e.target.value }))} placeholder="Gs. 25.000 / desde Gs. 90.000" className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-900 outline-none focus:border-[#62bfb9]" />
          </Field>
          <Field label="Imagen URL">
            <input value={productForm.image_url} onChange={(e) => setProductForm((prev) => ({ ...prev, image_url: e.target.value }))} placeholder="https://..." className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-900 outline-none focus:border-[#62bfb9]" />
          </Field>
          <Field label="Link externo opcional">
            <input value={productForm.contact_url} onChange={(e) => setProductForm((prev) => ({ ...prev, contact_url: e.target.value }))} placeholder="Opcional. Si lo dejas vacio, se prioriza ManosYA." className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-900 outline-none focus:border-[#62bfb9]" />
          </Field>
          <Field label="Descripcion">
            <textarea value={productForm.description} onChange={(e) => setProductForm((prev) => ({ ...prev, description: e.target.value }))} rows={3} placeholder="Ideal para este tipo de trabajo..." className="min-h-[92px] w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-[#62bfb9]" />
          </Field>
          <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-[22px] bg-[#62bfb9] px-5 py-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(98,191,185,0.35)] disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal size={17} />}
            Publicar producto
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
            <h3 className="mt-4 text-3xl font-black leading-tight">Mostra tu cara, explica tu producto y gana confianza.</h3>
            <p className="mt-3 text-sm font-semibold leading-6 text-white/78">
              Los clientes compran mas cuando ven quien esta atras del negocio. Graba videos simples, verticales y reales.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Presentacion', 'Soy de Ferreteria San Jose, vendo cables, focos y herramientas. Entrego en la zona.'],
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
              Cierra el video diciendo: &quot;Pedime por ManosYA&quot;. Asi el cliente vuelve a la app, tu tienda sube de nivel y el negocio queda ordenado.
            </p>
            <button type="button" onClick={() => setSheet('product')} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#62bfb9] px-5 py-3 text-sm font-black text-white shadow-[0_12px_26px_rgba(98,191,185,0.32)] active:scale-95">
              <PackagePlus size={17} />
              Publicar producto despues del video
            </button>
          </div>
        </div>
      </SupplierSheet>

      <SupplierSheet title="Consultas recibidas" open={sheet === 'contacts'} onClose={() => setSheet(null)}>
        {!contacts.length ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
            <div>
              <MessageSquareText className="mx-auto mb-3 text-slate-300" size={36} />
              <div className="text-lg font-black text-slate-950">Todavia no llegaron consultas</div>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Cuando un cliente o trabajador toque tus productos, lo vas a ver aca.
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
                    {contact.contact_url ? (
                      <button
                        type="button"
                        onClick={() => window.open(contact.contact_url, '_blank', 'noopener,noreferrer')}
                        className="rounded-full bg-[#62bfb9] px-4 py-2 text-xs font-black text-white shadow-[0_10px_20px_rgba(98,191,185,0.24)] active:scale-95"
                      >
                        Abrir contacto
                      </button>
                    ) : null}
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

      <SupplierSheet title="Mi catalogo" open={sheet === 'catalog'} onClose={() => setSheet(null)}>
        {!activeProducts.length ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
            <div>
              <Store className="mx-auto mb-3 text-slate-300" size={36} />
              <div className="text-lg font-black text-slate-950">Todavia no publicaste productos</div>
              <p className="mt-2 text-sm font-semibold text-slate-500">Desde el feed toca Producto o publica segun el oficio del trabajador.</p>
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

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[12px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

