'use client';

import { useEffect, useState, useRef } from 'react';
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

const supabase = getSupabase();
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(m => m.Tooltip), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false });
const MarkerClusterGroup = dynamic(() => import('react-leaflet-cluster').then(m => m.default), { ssr: false });
import { useMap } from 'react-leaflet';

function ChangeView({ center }) {
  const map = useMap();
  const hasCenteredRef = useRef(false);

  useEffect(() => {
    if (map && center && !hasCenteredRef.current) {
      map.setView(center, 14); // solo centra una vez al cargar
      hasCenteredRef.current = true; // evita que se recoloque después
    }
  }, [center, map]);

  return null;
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

  const html = `
    <div style="width:${size}px;height:${size}px;border-radius:50%;
      position:relative;background:#fff;overflow:hidden;
      box-shadow:0 6px 16px rgba(0,0,0,.12);">
      ${pulse}
      <div style="position:absolute;inset:-4px;border-radius:50%;
        border:3px solid ${color};
        filter:drop-shadow(0 0 8px ${color}40);"></div>
      <img src="${url || '/avatar-fallback.png'}"
           style="position:absolute;inset:0;width:100%;height:100%;
           object-fit:cover;border-radius:50%;" />
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
  `;
  if (!document.head.querySelector('style[data-manosya-pulse-green]')) {
    style2.setAttribute('data-manosya-pulse-green', '1');
    document.head.appendChild(style2);
  }
}


function getMinutesAgo(dateString) {
  if (!dateString) return null;
  const diffMs = Date.now() - new Date(dateString).getTime();
  return Math.floor(diffMs / 60000);
}

export default function MapPage() {
  const router = useRouter();
  const mapRef = useRef(null);
  const markersRef = useRef({}); // 🧭 guarda refs de marcadores por user_id


  const [center, setCenter] = useState([-25.516, -54.616]);
  const [me, setMe] = useState({ id: null, lat: null, lon: null });
  const [workers, setWorkers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showPrice, setShowPrice] = useState(false);
  const [route, setRoute] = useState(null);
  const [selectedService, setSelectedService] = useState(null);

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
  const soundRef = useRef(null);

  const services = [
    { id: 'plomería', label: 'Plomería', icon: <Droplets size={18} /> },
    { id: 'electricidad', label: 'Electricidad', icon: <Wrench size={18} /> },
    { id: 'limpieza', label: 'Limpieza', icon: <Sparkles size={18} /> },
    { id: 'construcción', label: 'Construcción', icon: <Hammer size={18} /> },
    { id: 'jardinería', label: 'Jardinería', icon: <Leaf size={18} /> },
    { id: 'mascotas', label: 'Mascotas', icon: <PawPrint size={18} /> },
    { id: 'emergencia', label: 'Emergencia', icon: <Flame size={18} /> },
  ];
/* 🧠 Restaurar estado completo (pedido + chat) desde localStorage */
useEffect(() => {
  const saved = localStorage.getItem('activeJobChat');
  if (!saved) return;

  const { jid, jstatus, cid, selectedWorker } = JSON.parse(saved);

  // restaurar primero el pedido
  if (jid) setJobId(jid);
  if (jstatus) setJobStatus(jstatus);
  if (selectedWorker) setSelected(selectedWorker);

  // esperar 300ms para asegurar que jobId esté seteado antes de abrir el chat
  setTimeout(() => {
    if (cid && jid && jstatus !== 'completed' && jstatus !== 'cancelled') {
      setChatId(cid);
      setIsChatOpen(true);
      openChat(cid); // reconecta el canal del chat
    }
  }, 300);

  // restaurar la línea del mapa
  if (selectedWorker?.lat && selectedWorker?.lng && me?.lat) {
    setRoute([[me.lat, me.lon], [selectedWorker.lat, selectedWorker.lng]]);
  }
}, []);

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


// 🧩 Recuperar pedido activo desde Supabase si no hay nada en localStorage
useEffect(() => {
  if (jobId || !me?.id) return;

  (async () => {
    try {
      const { data: job } = await supabase
        .from('jobs')
        .select('id, status, worker_id, worker_lat, worker_lng')
        .eq('client_id', me.id)
        .in('status', ['open', 'accepted', 'assigned'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (job) {
        setJobId(job.id);
        setJobStatus(job.status);

        // cargar también el trabajador
        const { data: worker } = await supabase
          .from('map_workers_view')
          .select('*')
          .eq('user_id', job.worker_id)
          .single();

        if (worker) {
          setSelected(worker);
          setRoute([[me.lat, me.lon], [worker.lat, worker.lng]]);
          toast.success(`Pedido restaurado (${job.status})`);
        }
      }
    } catch (err) {
      console.warn('Sin pedido activo para restaurar:', err.message);
    }
  })();
}, [me?.id]);

  /* === Usuario === */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (!uid) router.replace('/login');
      else setMe(prev => ({ ...prev, id: uid }));
      if (typeof Audio !== 'undefined') soundRef.current = new Audio('/notify.mp3');
    })();
  }, [router]);

  /* === Geoloc === */
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watcher = navigator.geolocation.watchPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setCenter([lat, lon]);
        setMe(prev => ({ ...prev, lat, lon }));
      },
      () => {},
      { enableHighAccuracy: true }
    );
    return () => watcher && navigator.geolocation.clearWatch(watcher);
  }, []);

  /* === Cargar trabajadores === */
async function fetchWorkers(serviceFilter = null) {
  setBusy(true);
  try {
    let query = supabase
      .from('map_workers_view')
      .select('*')
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .eq('is_active', true); // ✅ Solo muestra trabajadores activos

    if (serviceFilter) query = query.ilike('skills', `%${serviceFilter}%`);

    const { data, error } = await query;
    if (error) throw error;

    setWorkers(data || []);
  } catch {
    toast.error('Error cargando trabajadores');
  } finally {
    setBusy(false);
  }
} // ✅ cierre correcto de fetchWorkers

// Ejecutar automáticamente al cargar la página
useEffect(() => {
  fetchWorkers();
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
        if (!updated?.user_id) return;

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
  // Canal 1: actualizaciones de ubicación con animación
  const channelLocation = supabase
    .channel('realtime-worker-locations')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'worker_profiles' },
      (payload) => {
        const updated = payload.new;
        if (!updated?.lat || !updated?.lng) return;

        setWorkers((prev) => {
          const exists = prev.find((w) => w.user_id === updated.user_id);
          if (exists) {
            // 🧭 ANIMACIÓN SUAVE ENTRE POSICIONES
            const marker = markersRef.current?.[updated.user_id];
            if (marker && exists.lat && exists.lng) {
              animateMarkerMove(marker, exists.lat, exists.lng, updated.lat, updated.lng);
            }

            // 🔄 Actualiza solo la posición
            return prev.map((w) =>
              w.user_id === updated.user_id
                ? {
                    ...w,
                    lat: updated.lat,
                    lng: updated.lng,
                    updated_at: updated.updated_at,
                    _justUpdated: true,
                  }
                : w
            );
          } else {
            // ➕ Nuevo trabajador agregado dinámicamente
            return [
              ...prev,
              {
                user_id: updated.user_id,
                lat: updated.lat,
                lng: updated.lng,
                updated_at: updated.updated_at,
                full_name: updated.full_name || 'Nuevo trabajador',
                avatar_url: updated.avatar_url || '/avatar-fallback.png',
                _justUpdated: true,
              },
            ];
          }
        });

        // 🕒 Eliminar flag visual después de 2 segundos
        setTimeout(() => {
          setWorkers((prev) =>
            prev.map((w) =>
              w.user_id === updated.user_id ? { ...w, _justUpdated: false } : w
            )
          );
        }, 2000);
      }
    )
    .subscribe();

  console.log('📡 Canal realtime de ubicaciones conectado');

    // Canal 2a: cambios generales del perfil profesional (no-ubicación)
  const channelGeneralWorker = supabase
    .channel('realtime-workers-general-worker')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'worker_profiles' },
      (payload) => {
        console.log('🟢 Cambio detectado en worker_profiles:', payload);
        fetchWorkers();
      }
    )
    .subscribe();

  // Canal 2b: cambios del perfil base (nombre, foto)
  const channelGeneralProfile = supabase
    .channel('realtime-workers-general-profile')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'profiles' },
      (payload) => {
        console.log('🟣 Cambio detectado en profiles:', payload);
        fetchWorkers();
      }
    )
    .subscribe();

  // Limpieza al desmontar
  return () => {
    supabase.removeChannel(channelLocation);
    supabase.removeChannel(channelGeneralWorker);
    supabase.removeChannel(channelGeneralProfile);
  };
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
        // 📦 Actualiza pedidos del cliente en tiempo real
        if (data.client_id === me.id) {
          setJobStatus(data.status);

          if (data.status === 'cancelled') {
            toast.warning('🚫 El trabajador canceló el pedido');
            resetJobState();
          } else if (data.status === 'completed') {
            toast.success('✅ Trabajo finalizado');
            resetJobState();
          } else {
            toast.info(`📦 Pedido actualizado: ${data.status}`);
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
    soundRef.current?.play?.();
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

  // ✨ Efecto visual al hacer clic en marcador
  if (mapRef.current && worker?.lat && worker?.lng) {
    mapRef.current.flyTo([worker.lat, worker.lng], 15, {
      duration: 1.2,
    });
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

    // 1) Usuario logueado
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Sesión no encontrada');

    // 2) Trabajador seleccionado válido
    if (!selected || !selected.user_id) {
      throw new Error('No se seleccionó un trabajador válido');
    }

    // 3) 🔒 FIX FK: asegurar que exista el perfil del cliente (para jobs.client_id)
    //    Si tu FK jobs.client_id -> profiles.user_id, esto evita el error "jobs_client_id_fkey".
    const upsertProfile = await supabase
      .from('profiles')
      .upsert({ user_id: user.id }, { onConflict: 'user_id', ignoreDuplicates: false });

    if (upsertProfile.error) {
      console.warn('No se pudo asegurar el perfil del cliente:', upsertProfile.error);
      // No frenamos si el perfil ya existe; solo frenamos si es un error real distinto a conflicto
      // (Supabase ya maneja el onConflict)
    }
// 🔒 Asegurar fila en profiles para el cliente (FK jobs.client_id -> profiles.id)
await supabase
  .from('profiles')
  .upsert(
    { id: user.id, email: user.email ?? null },
    { onConflict: 'id', ignoreDuplicates: true }
  );

    // 4) Insertar el pedido
    const { data: inserted, error: insertError } = await supabase
      .from('jobs')
      .insert([{
        title: `Trabajo con ${selected.full_name || 'Trabajador'}`,
        description: 'Pedido generado desde el mapa',
        status: 'open',
        client_id: user.id,              // ← FK a profiles.user_id (asegurado arriba)
        worker_id: selected.user_id,
        client_lat: me.lat,
        client_lng: me.lon,
        worker_lat: selected.lat,
        worker_lng: selected.lng,
        created_at: new Date().toISOString(),
      }])
      .select('id, status')
      .single();

    if (insertError) throw insertError;

    // 5) Estado local y UI
    setJobId(inserted.id);
    setJobStatus(inserted.status);

    toast.success(`✅ Pedido enviado a ${selected.full_name}`, { id: 'pedido' });
    setWorkers([selected]);
    setRoute([[me.lat, me.lon], [selected.lat, selected.lng]]);
    if (mapRef.current && me.lat && selected?.lat) {
      mapRef.current.fitBounds([[me.lat, me.lon], [selected.lat, selected.lng]], { padding: [80, 80] });
    }
  } catch (err) {
    console.error('Error al confirmar solicitud:', err?.message || err);
    toast.error(err?.message || 'No se pudo enviar el pedido', { id: 'pedido' });
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





// ✉️ Enviar mensaje
async function sendMessage() {
  const text = inputRef.current?.value?.trim();
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
      .select();

    if (error) {
      console.error('❌ Error enviando mensaje:', error);
      toast.error('No se pudo enviar el mensaje');
    } else {
      console.log('✅ Mensaje insertado:', data);
      setMessages((prev) => {
        // ✅ Evita duplicar el mismo mensaje localmente
        if (prev.some((m) => m.id === data[0]?.id)) return prev;
        return [...prev, data[0]];
      });
      inputRef.current.value = '';
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
    }
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

    // (opcional) enviar mensaje automático al chat
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




  // ✅ CANCELAR — borra línea y recarga todos los trabajadores
  function cancelarPedido() {
    setRoute(null);
    setSelected(null);
    setJobId(null);
    setJobStatus(null);
    setChatId(null);
    fetchWorkers(selectedService || null);
  }

  function toggleService(id) {
    const next = selectedService === id ? null : id;
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

  return (
    <div className="relative min-h-screen bg-white">
      {/* Header */}
      <div className="absolute top-4 left-4 z-[1000]">
        <button
          onClick={() => router.push('/role-selector')}
          className="bg-white border text-emerald-600 font-medium px-3 py-1.5 rounded-xl shadow-sm hover:bg-gray-50 transition"
        >
          Cambiar rol
        </button>
      </div>

      {/* MAPA */}
<div className="absolute inset-0 z-0">
  <MapContainer
    center={center}
    zoom={13}
    style={{ height: '100%', width: '100%' }}
    whenCreated={(map) => (mapRef.current = map)}
  >
    <ChangeView center={center} />
    <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
    {route && <Polyline positions={route} color="#10b981" weight={5} />}

   {/* ✅ Bloque final actualizado — oculta 'paused' y muestra estados dinámicos */}
<MarkerClusterGroup
  chunkedLoading
  maxClusterRadius={48}
  iconCreateFunction={clusterIconCreateFunction}
>
  {workers
    ?.filter(
      w =>
        w?.lat !== null &&
        w?.lng !== null &&
        w?.status !== 'paused' // ⬅️ oculta los pausados
    )
    .map(w => {
      const minutesAgo = getMinutesAgo(w.updated_at);

      // 🕒 Calcular texto y color de estado
      let estadoTexto = 'Disponible ahora';
      let estadoColor = '#10b981'; // 🟢 verde por defecto

      if (w.status === 'busy') {
        const busyUntil = w.busy_until ? new Date(w.busy_until) : null;
        if (busyUntil) {
          const diffMin = Math.max(
            0,
            Math.round((busyUntil.getTime() - Date.now()) / 60000)
          );
          estadoTexto =
            diffMin > 0
              ? `Ocupado • libre en ${diffMin} min`
              : 'Ocupado (finalizando)';
        } else {
          estadoTexto = 'Ocupado';
        }
        estadoColor = '#f97316'; // 🟠 naranja
      }

      return (
        <Marker
          key={w.user_id}
          position={[w.lat, w.lng]}
          icon={avatarIcon(w.avatar_url, w)}
          eventHandlers={{ click: () => handleMarkerClick(w) }}
        >
          <Tooltip direction="top">
            <div className="text-xs leading-tight">
              <strong className="block text-sm font-semibold">
                {w.full_name}
              </strong>
              <p>Servicio: {w.main_skill || 'No especificado'}</p>
              <p>💰 Desde ₲45.000</p>

              {/* 🟡 Estado dinámico */}
              <p
                className="mt-1 font-semibold"
                style={{ color: estadoColor }}
              >
                {estadoTexto}
              </p>

              {/* ⏱ tiempo desde última actualización */}
              {minutesAgo !== null && (
                <p className="text-[10px] text-gray-500 mt-1">
                  ⏱ hace {minutesAgo} min
                </p>
              )}
            </div>
          </Tooltip>
        </Marker>
      );
    })}
</MarkerClusterGroup>
</MapContainer>
</div>




      {/* PANEL INFERIOR */}
      <div
        className="fixed left-0 right-0 bottom-0 z-[9999] bg-white rounded-t-3xl border-t border-gray-200 overflow-y-auto"
        style={{ maxHeight: '45vh' }}
      >
        <div className="flex justify-center items-center py-3">
          <div className="h-1.5 w-12 rounded-full bg-emerald-500"></div>
        </div>
        <div className="px-5 pb-8">
          <h2 className="text-center text-lg font-bold text-emerald-600 mb-3">ManosYA</h2>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <button onClick={() => fetchWorkers(selectedService)} className="bg-emerald-500 text-white font-semibold py-3 rounded-xl">
              🚀 Buscar Pros
            </button>
            <button onClick={() => router.push('/client/jobs')} className="bg-white border font-semibold py-3 rounded-xl">
              📦 Mis pedidos
            </button>
            <button onClick={() => router.push('/client/new')} className="bg-white border font-semibold py-3 rounded-xl">
              🏢 Empresarial
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm mb-4">
            {services.map(s => (
              <button
                key={s.id}
                onClick={() => toggleService(s.id)}
                className={`flex items-center justify-center gap-1 px-2 py-2 rounded-lg border ${
                  selectedService === s.id
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                {s.icon}
                <span className="capitalize">{s.label}</span>
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-500 italic text-center">
            {busy ? 'Buscando trabajadores cerca…' : `${workers.length} trabajadores activos cerca`}
          </p>
        </div>
      </div>

      {/* PERFIL DEL TRABAJADOR */}
<AnimatePresence>
  {selected && !showPrice && (
    <motion.div
      key="perfil"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-xl p-6 z-[10000]"
    >
      <div className="text-center">
        {/* 🧑 Avatar */}
        <img
          src={selected.avatar_url || '/avatar-fallback.png'}
          className="w-20 h-20 mx-auto rounded-full border-4 border-emerald-500 mb-2"
          alt="avatar"
        />

        {/* 🧾 Nombre y descripción */}
        <h2 className="font-bold text-lg">{selected.full_name}</h2>
        <p className="text-sm italic text-gray-500 mb-2">
          “{selected.bio || 'Sin descripción'}”
        </p>

        {/* ⭐ Calificación */}
        <div className="flex justify-center items-center gap-1 mb-2">
          <Star size={14} className="text-yellow-400 fill-yellow-400" />
          <Star size={14} className="text-yellow-400 fill-yellow-400" />
          <Star size={14} className="text-yellow-400 fill-yellow-400" />
          <Star size={14} className="text-yellow-400 fill-yellow-400" />
          <Star size={14} className="text-gray-300" />
          <span className="text-xs text-gray-500 ml-1">(2)</span>
        </div>

        {/* 🧠 Experiencia dinámica (sincronizada con Supabase) */}
        <p className="text-sm text-gray-600">
          <Clock3 size={14} className="inline mr-1" />
          {selected?.years_experience
            ? `${selected.years_experience} ${selected.years_experience === 1 ? 'año' : 'años'} de experiencia`
            : 'Sin experiencia registrada'}
        </p>

        {/* ⏰ Última actividad */}
        <p className="text-xs text-gray-500 mt-1">
          {(() => {
            const mins = getMinutesAgo(selected?.updated_at);
            if (mins == null) return 'Sin actividad reciente';
            if (mins < 60) return `Activo hace ${mins} min`;
            if (mins < 1440) return `Activo hace ${Math.floor(mins / 60)} h`;
            return `Activo hace ${Math.floor(mins / 1440)} d`;
          })()}
        </p>

        {/* 🧰 Especialidades (mejor visual) */}
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
          // 🔹 No hay ruta → "Cerrar" y "Solicitar"
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
          // 🔹 Hay ruta → depende del estado del pedido
          <div className="flex flex-col items-center gap-3 mt-5">
            {/* 💬 Botón de chat */}
            <button
              onClick={openChat}
              className="px-5 py-3 rounded-xl border flex items-center gap-1"
            >
              <MessageCircle size={16} /> Chatear
            </button>

            {/* 🔄 Finalizar o Cancelar */}
            {(jobStatus === 'accepted' || jobStatus === 'assigned') ? (
              <button
                onClick={finalizarPedido}
                className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold flex items-center gap-1"
              >
                <CheckCircle2 size={16} /> Finalizar pedido
              </button>
            ) : (
              <button
                onClick={cancelarPedido}
                className="px-6 py-3 rounded-xl bg-red-500 text-white font-semibold flex items-center gap-1"
              >
                <XCircle size={16} /> Cancelar pedido
              </button>
            )}

            {/* 🔁 Botón de sincronización */}
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2 rounded-xl border border-emerald-300 text-emerald-700 bg-emerald-50 font-semibold flex items-center gap-1 hover:bg-emerald-100 transition"
            >
              🔄 Sincronizar estado
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )}
</AnimatePresence>




      {/* MODAL PRECIO */}
      <AnimatePresence>
        {showPrice && (
          <motion.div
            key="precio"
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10010]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-3xl w-[85%] max-w-md p-6 shadow-lg text-center"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <h3 className="text-lg font-bold text-emerald-600 mb-2">Precio estimado</h3>
              <p className="text-2xl font-extrabold text-emerald-700 mb-2">₲55.000</p>
              <div className="text-sm text-gray-600 space-y-1 mb-4">
                <p>🚗 Incluye traslado promedio (hasta 3 km)</p>
                <p>🌙 Urgencias nocturnas o feriados +20%</p>
                <p>💰 Tarifa mínima de visita ₲10.000</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <button
                  onClick={() => setShowPrice(false)}
                  className="py-3 border rounded-xl hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarSolicitud}
                  className="py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 💬 CHAT MODAL FLOTANTE */}
<AnimatePresence>
  {isChatOpen && selected && (
    <motion.div
      className="fixed inset-0 z-[10020] bg-black/70 flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl flex flex-col"
        initial={{ y: 300 }}
        animate={{ y: 0 }}
        exit={{ y: 300 }}
        transition={{ type: 'spring', stiffness: 120 }}
      >
        {/* Header del chat con foto + nombre */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => {
              setIsChatOpen(false);
              setMessages([]);
              // opcionalmente limpiar el canal:
              if (chatChannelRef.current) {
                supabase.removeChannel(chatChannelRef.current);
                chatChannelRef.current = null;
              }
            }}
            className="flex items-center gap-1 text-gray-600 hover:text-red-500"
          >
            <ChevronLeft size={18} /> Volver
          </button>

          <div className="flex items-center gap-2">
            <img
              src={selected.avatar_url || '/avatar-fallback.png'}
              alt="avatar"
              className="w-8 h-8 rounded-full border"
            />
            <div className="text-sm">
              <p className="font-semibold text-gray-800 leading-4">
                {selected.full_name || 'Trabajador'}
              </p>
              <p className="text-xs text-gray-500 leading-4">
                {jobStatus === 'accepted' ? '🟢 En camino' : '💬 Conectado'}
              </p>
            </div>
          </div>
          <div className="w-6" />
        </div>

        {/* 💬 Mensajes */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-white">
          {messages.length === 0 ? (
            <p className="text-center text-gray-400 mt-6">No hay mensajes aún 📭</p>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === me?.id;
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm shadow-sm ${
                      mine ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
        {/* ✉️ Input para enviar mensajes */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const value = inputRef.current?.value?.trim() || '';
            if (value) sendMessage(value);
            if (inputRef.current) inputRef.current.value = '';
          }}
          className="flex gap-2 p-3 border-t border-gray-100 bg-gray-50"
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Escribí un mensaje…"
            className="flex-1 bg-gray-100 rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-emerald-400 border border-gray-200"
          />
          <button
            type="submit"
            disabled={sending}
            className="px-4 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition disabled:opacity-60"
          >
            <SendHorizontal size={18} />
          </button>
        </form>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
</div>
);
}

