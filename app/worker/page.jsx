'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  SendHorizontal,
  ChevronLeft,
  Map,
  CheckSquare,
  Power,
  MessageCircle,
  Home,
  User2,
  ArrowLeftCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabase } from '@/lib/supabase';
import { startRealtimeCore, stopRealtimeCore } from '@/lib/realtimeCore';



const supabase = getSupabase();

/* === Crear perfil si no existe === */
async function ensureWorkerProfile(userId) {
  if (!userId) return;
  try {
    const { data: existing } = await supabase
      .from('worker_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existing) {
      await supabase
        .from('worker_profiles')
        .insert([{ user_id: userId, is_active: true, radius_km: 5, lat: null, lng: null }]);
    }
  } catch (err) {
    console.error('Error creando worker_profile:', err.message);
  }
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
  const [clientTyping, setClientTyping] = useState(false);



  const inputRef = useRef(null);
  const chatChannelRef = useRef(null);
  const bottomRef = useRef(null);
  const soundRef = useRef(null);
  const [status, setStatus] = useState('available'); // 🟢 Estado actual del trabajador

/* === Sesión === */
useEffect(() => {
  if (typeof window === 'undefined') return;

  (async () => {
    try {
      // 🔊 Precarga el sonido de notificación
      if (typeof Audio !== 'undefined') {
        soundRef.current = new Audio('/notify.mp3');
        soundRef.current.load(); // 👈 evita el retraso del primer sonido
      }

      // 🔐 Verificar sesión activa en Supabase
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
/* === 🔔 Notificación de nuevas solicitudes de trabajo === */
useEffect(() => {
  // Esperar a que el usuario esté cargado
  if (!user?.id) return;

  // 🎵 Precargar el sonido de notificación
  let sound;
  if (typeof Audio !== 'undefined') {
    sound = new Audio('/notify.mp3');
    sound.load(); // evita el delay del primer sonido
  }

  // 📡 Escuchar inserciones en la tabla 'jobs'
  const channel = supabase
    .channel('worker-new-job-sound')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'jobs',
      },
      (payload) => {
        const job = payload.new;
        if (!job) return;

        // 🔎 Solo notificar si es un trabajo abierto y el trabajador está disponible
        if (job.status === 'open' && status === 'available') {
          try {
            sound?.play?.();
          } catch (err) {
            console.warn('⚠️ Error reproduciendo sonido:', err);
          }

          toast('🆕 ¡Nueva solicitud de trabajo disponible!');
          console.log('🔔 Nuevo trabajo detectado:', job);
        }
      }
    )
    .subscribe();

  // 🧹 Limpieza al desmontar el componente
  return () => {
    supabase.removeChannel(channel);
  };
}, [user?.id, status]);


// 🛰️ Actualización continua de ubicación del trabajador
useEffect(() => {
  if (!user?.id || !navigator.geolocation) return;

  let lastSent = 0;
  let lastLat = null, lastLng = null;

  const distance = (a, b, c, d) => {
    const R = 6371000; // radio de la Tierra en metros
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

      const now = Date.now();
      const movedEnough =
        lastLat === null || distance(lastLat, lastLng, lat, lng) > 25; // >25 m
      const timeOk = now - lastSent > 30000; // >30 segundos

      if (!movedEnough && !timeOk) return;

      lastLat = lat;
      lastLng = lng;
      lastSent = now;

      try {
        const { error } = await supabase
          .from('worker_profiles')
          .upsert(
            {
              user_id: user.id,
              lat,
              lng,
              last_lat: lat, // opcional (compatibilidad)
              last_lon: lng,
              status, // ✅ mantenemos el estado actual
              is_active: status === 'available', // ✅ solo activo si está disponible
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );

        if (error) {
          console.error('❌ Error al actualizar ubicación:', error.message);
        } else {
          console.log('📍 Ubicación actualizada:', lat, lng);
        }
      } catch (err) {
        console.error('⚠️ Error inesperado al guardar ubicación:', err);
      }
    },
    (err) => console.warn('🚫 Error del GPS:', err),
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
  );

  return () => navigator.geolocation.clearWatch(watcher);
}, [user?.id, status]); // ✅ ahora escucha el estado actual

// 🟢 Al iniciar, cargar estado real desde Supabase
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

// 🌐 Estado de conexión a internet (offline/online)
const [isConnected, setIsConnected] = useState(true);

useEffect(() => {
  // Detecta si el navegador pierde o recupera conexión
  const updateStatus = () => {
    const online = navigator.onLine;
    setIsConnected(online);
    console.log(online ? '🟢 Conectado a internet' : '🔴 Sin conexión a internet');
  };

  // Verificar al montar
  updateStatus();

  // Escuchar eventos del navegador
  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);

  // Limpieza al desmontar
  return () => {
    window.removeEventListener('online', updateStatus);
    window.removeEventListener('offline', updateStatus);
  };
}, []);

 /* === Cargar trabajos y sincronización === */
useEffect(() => {
  if (!user?.id) return;
  const workerId = user.id;

  async function loadJobs() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id, title, description, status, client_id, worker_id,
          client_lat, client_lng, created_at,
          service_type, price
        `)
        .eq('worker_id', workerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);

      const activeJob = data?.find((j) => j.status === 'accepted');
      if (activeJob) {
        const busyUntil = new Date(Date.now() + 60 * 60000);
        setStatus('busy');
        await supabase
          .from('worker_profiles')
          .update({
            status: 'busy',
            is_active: true,
            busy_until: busyUntil.toISOString(),
          })
          .eq('user_id', workerId);
      } else if (status !== 'paused') {
        setStatus('available');
        await supabase
          .from('worker_profiles')
          .update({
            status: 'available',
            is_active: true,
            busy_until: null,
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

  loadJobs();
}, [user?.id, status]);



  
/* 🌐 RealtimeCore global: sincroniza pedidos, chat y perfil del trabajador */
useEffect(() => {
  if (!user?.id) return;

  const stop = startRealtimeCore((type, data) => {
    try {
      switch (type) {
        case 'job': {
          if (data.__source === 'insert' && data.status === 'open') {
            if (status === 'available') {
              setJobs((prev) => {
                const exists = prev.some((j) => j.id === data.id);
                return exists ? prev : [data, ...prev];
              });
              toast('🆕 Nuevo pedido disponible cerca tuyo');
            }
            return;
          }

          if (data.worker_id === user.id) {
  setJobs((prev) =>
    prev.some((j) => j.id === data.id)
      ? prev.map((j) => (j.id === data.id ? { ...j, ...data } : j))
      : [data, ...prev]
  );

  // 🧩 Si el trabajo mostrado en chat cambia de estado → actualizar selectedJob
  if (selectedJob?.id === data.id) {
    setSelectedJob((prev) => (prev ? { ...prev, status: data.status } : prev));
  }

  if (data.status === 'cancelled') {
    toast.warning('🚫 El cliente canceló el trabajo.');
    setStatus('available');
  } else if (data.status === 'completed') {
    toast.success('🎉 Trabajo finalizado por el cliente.');
    setStatus('available');
    // 🚫 Cerrar chat si estaba abierto
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
  // Si el mensaje pertenece al chat abierto actualmente
  if (selectedJob?.chat_id === data.chat_id && isChatOpen) {
    setMessages((prev) => {
      if (prev.some((m) => m.id === data.id)) return prev;
      return [...prev, data];
    });
    if (data.sender_id !== user.id) soundRef.current?.play?.();
  } else if (data.sender_id !== user.id) {
    // 🆕 Mensaje nuevo fuera del chat abierto → mostrar notificación roja
    setHasUnread(true);
    soundRef.current?.play?.();
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

  // 🧹 Limpieza al desmontar
  return () => stopRealtimeCore();
}, [user?.id, selectedJob?.chat_id, status]);

// 🔔 Listener global: detecta mensajes nuevos aunque el chat esté cerrado
useEffect(() => {
  if (!user?.id) return;

  const globalMessagesChannel = supabase
    .channel('global-message-listener')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      (payload) => {
        const msg = payload.new;

        // 🚫 Ignorar tus propios mensajes
        if (msg.sender_id === user.id) return;

        // 💬 Si el chat no está abierto o es distinto al actual → notificar
        if (!isChatOpen || msg.chat_id !== selectedJob?.chat_id) {
          setHasUnread(true);
          soundRef.current?.play?.();
          console.log('🔔 Nuevo mensaje detectado fuera del chat');
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(globalMessagesChannel);
  };
}, [user?.id, isChatOpen, selectedJob?.chat_id]);
// 🧹 Limpieza de notificación cuando se abre el chat
useEffect(() => {
  if (isChatOpen) setHasUnread(false);
}, [isChatOpen]);


  /* === Cambiar estado del trabajador === */
async function toggleStatus() {
  try {
    let newStatus, newIsActive;

    if (status === 'available') {
      newStatus = 'paused';
      newIsActive = false; // 🔴 al pausar → no visible
    } else if (status === 'paused') {
      newStatus = 'available';
      newIsActive = true; // 🟢 al activar → visible
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
        updated_at: new Date().toISOString(), // opcional, para refrescar cambios
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



  /* === Aceptar trabajo === */
  async function acceptJob(job) {
    try {
      if (job.status !== 'open') return toast.warning('Este trabajo ya fue tomado');
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'accepted' })
        .eq('id', job.id);
      if (error) throw error;

      toast.success('✅ Trabajo aceptado correctamente');
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: 'accepted' } : j))
      );
    } catch (err) {
      toast.error('No se pudo aceptar el trabajo');
      console.error(err);
    }
  }

  /* === Rechazar trabajo === */
  async function rejectJob(job) {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'rejected' })
        .eq('id', job.id);
      if (error) throw error;
      toast('🚫 Trabajo rechazado correctamente');
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
    } catch (err) {
      toast.error('Error al rechazar trabajo');
      console.error(err);
    }
  }

  /* === Finalizar trabajo === */
  async function completeJob(job) {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'completed' })
        .eq('id', job.id);
      if (error) throw error;
      toast.success('🎉 Trabajo finalizado correctamente');
      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: 'completed' } : j)));
      setSelectedJob(null);
      setIsChatOpen(false);
    } catch (err) {
      toast.error('Error al finalizar el trabajo');
      console.error(err);
    }
  }

 /* === Chat sincronizado === */
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
            // ✅ Evitar mensajes duplicados
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          if (payload.new.sender_id !== user.id) soundRef.current?.play?.();
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
        }
      )
      .on(
  'broadcast',
  { event: 'typing' },
  (payload) => {
    if (payload?.sender_id !== user.id) {
      setClientTyping(true);

      // desaparecer después de 2 segundos sin escribir
      setTimeout(() => setClientTyping(false), 2000);
    }
  }
)

      .subscribe();

    chatChannelRef.current = ch;
  } catch (err) {
    console.error('❌ Error abriendo chat:', err);
    toast.error('No se pudo abrir el chat');
  }
}

/* === Enviar mensaje (bloquea si el trabajo está finalizado) === */
async function sendMessage() {
  const text = inputRef.current?.value?.trim();
  if (!text) return;

  // 🧠 Verificar si hay un chat activo
  if (!selectedJob?.chat_id) {
    toast.error('No hay chat activo');
    return;
  }

  // 🚫 Verificar si el trabajo ya fue finalizado
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
      // ✅ Evitar duplicado local del mismo mensaje
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


  /* === UI === */
  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-screen text-emerald-600">
        <Loader2 className="animate-spin w-6 h-6 mb-2" />
        <p>Cargando trabajos...</p>
      </div>
    );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container max-w-screen-md mx-auto px-4 pb-28 bg-white text-gray-900 min-h-screen"
    >{/* === BANNER DE ESTADO DEL TRABAJADOR (MINIMALISTA) === */}
<motion.div
  initial={{ opacity: 0, y: -10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.25 }}
  className="mb-6 px-2"
>
  <div
    className={`w-full rounded-xl p-4 shadow-sm border bg-white transition-all duration-300
    flex flex-col items-center text-center gap-3
    ${
      status === 'available'
        ? 'border-emerald-300 text-emerald-700'
        : status === 'paused'
        ? 'border-red-300 text-red-700'
        : 'border-blue-300 text-blue-700'
    }`}
  >
    {/* Estado general */}
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-2">
        {status === 'available' && <Power className="text-emerald-500" size={20} />}
        {status === 'paused' && <Power className="text-red-400" size={20} />}
        {status === 'busy' && <Loader2 className="text-blue-500 animate-spin" size={20} />}

        <span className="font-bold text-lg">
          {status === 'available'
            ? 'Estás disponible'
            : status === 'paused'
            ? 'Estás en pausa'
            : 'Estás ocupado'}
        </span>
      </div>

      {/* Descripción */}
      <p className="text-sm opacity-70 leading-snug max-w-xs">
        {status === 'available'
          ? 'Podés recibir pedidos nuevos en tiempo real.'
          : status === 'paused'
          ? 'No vas a recibir pedidos hasta reactivarte.'
          : 'Finalizá tu trabajo actual para recibir nuevos.'}
      </p>
    </div>

    {/* Botones */}
    <div className="flex gap-2 mt-1">
      <button
        onClick={toggleStatus}
        className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition shadow-sm"
      >
        Cambiar estado
      </button>

      <button
        onClick={() => router.push('/role-selector')}
        className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition shadow-sm"
      >
        Volver
      </button>
    </div>

    {/* Indicador de conexión */}
    <span
      className={`mt-1 text-xs font-medium px-3 py-1 rounded-full ${
        isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
      }`}
    >
      {isConnected ? '🟢 Conectado' : '🔴 Sin conexión'}
    </span>
  </div>
</motion.div>


      {/* LISTA DE TRABAJOS */}
{jobs.length === 0 ? (
  <p className="text-gray-500 mt-10 text-center">
    Aún no tenés solicitudes disponibles.
  </p>
) : (
  <section className="grid gap-3 mt-5">
    {jobs.map((job) => (
      <motion.div
        key={job.id}
        whileTap={{ scale: 0.98 }}
        className="border rounded-2xl p-4 transition shadow-sm bg-white hover:shadow-md"
      >
        {/* 🔹 Encabezado del trabajo */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-gray-800">
            {job.title || 'Trabajo de servicio'}
          </h3>
          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold ${
              job.status === 'open'
                ? 'bg-yellow-100 text-yellow-700'
                : job.status === 'accepted'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-green-100 text-green-700'
            }`}
          >
            {job.status === 'open'
              ? 'Disponible'
              : job.status === 'accepted'
              ? 'En curso'
              : 'Completado'}
          </span>
        </div>

        {/* 🔸 Descripción */}
        <p className="text-sm text-gray-600 mb-2">
          {job.description || 'Pedido generado desde el mapa'}
        </p>

        {/* 💰 Tipo de servicio y precio por hora */}
        {(job.service_type || job.price) && (
          <p className="text-sm font-semibold text-emerald-700 mb-1">
            {job.service_type
              ? `Servicio: ${
                  job.service_type.charAt(0).toUpperCase() +
                  job.service_type.slice(1)
                }`
              : ''}
            {job.price
              ? ` – ₲${Number(job.price).toLocaleString('es-PY')} / hora`
              : ''}
          </p>
        )}

        {/* 👤 Información del cliente */}
        {job.client && (
          <div className="flex items-center gap-2 mt-1">
            <img
              src={job.client?.avatar_url || '/avatar-fallback.png'}
              alt={job.client?.full_name || 'Cliente'}
              className="w-6 h-6 rounded-full border border-gray-200"
            />
            <p className="text-sm text-gray-700 font-medium">
              {job.client?.full_name || 'Cliente sin nombre'}
            </p>
          </div>
        )}

              {/* BOTONES SEGÚN ESTADO */}
              {job.status === 'open' && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => acceptJob(job)}
                    className="flex-1 bg-emerald-500 text-white py-2 rounded-xl hover:bg-emerald-600 font-semibold"
                  >
                    Aceptar
                  </button>
                  <button
                    onClick={() => rejectJob(job)}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-xl hover:bg-gray-300 font-semibold"
                  >
                    Rechazar
                  </button>
                </div>
              )}

              {job.status === 'accepted' && (
                <div className="flex flex-col gap-2 mt-3">
                  <button
                    onClick={() =>
                      window.open(
                        `https://www.google.com/maps/dir/?api=1&destination=${job.client_lat},${job.client_lng}`,
                        '_blank'
                      )
                    }
                    className="w-full bg-emerald-100 text-emerald-700 py-2 rounded-xl font-semibold hover:bg-emerald-200 transition flex items-center justify-center gap-1"
                  >
                    <Map size={16} /> Ver ubicación
                  </button>

                  <button
                    onClick={() => openChat(job)}
                    className="w-full bg-gray-100 text-gray-800 py-2 rounded-xl font-semibold hover:bg-gray-200 transition"
                  >
                    💬 Chat con cliente
                  </button>

                  <button
                    onClick={() => completeJob(job)}
                    className="w-full bg-emerald-600 text-white py-2 rounded-xl font-semibold hover:bg-emerald-700 transition flex items-center justify-center gap-1"
                  >
                    <CheckSquare size={16} /> Finalizar trabajo
                  </button>
                </div>
              )}

              {job.status === 'completed' && (
                <div className="mt-3 text-center text-emerald-600 font-medium">
                  ✅ Trabajo finalizado
                </div>
              )}
            </motion.div>
          ))}
        </section>
      )}

      {/* CHAT MODAL */}
<AnimatePresence>
  {isChatOpen && selectedJob && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex justify-center items-end z-[80]"
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 18 }}
        className="bg-white rounded-t-3xl w-full max-w-md shadow-xl"
      >
       {/* 🔹 Encabezado del chat (actualizado) */}
<div className="flex flex-col border-b border-gray-100 bg-gray-50">
  
  {/* Parte superior */}
  <div className="flex items-center justify-between px-4 py-3">
    
    {/* Botón volver */}
    <button
      onClick={() => setIsChatOpen(false)}
      className="flex items-center gap-1 text-gray-600 hover:text-red-500"
    >
      <ChevronLeft size={18} /> Volver
    </button>

    {/* Nombre del cliente */}
    <h2 className="font-semibold text-gray-800 text-center">
      {selectedJob?.client_name || "Cliente"}
    </h2>

    {/* Botón mapa */}
    <button
      onClick={() =>
        window.open(
          `https://www.google.com/maps/dir/?api=1&destination=${selectedJob.client_lat},${selectedJob.client_lng}`,
          '_blank'
        )
      }
      className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800 text-sm font-semibold"
    >
      <Map size={16} /> Mapa
    </button>

  </div>

  {/* 🔵 Indicador “Cliente está escribiendo…” */}
  {clientTyping && (
    <div className="px-4 pb-2 text-xs text-gray-500 italic animate-pulse">
      {selectedJob?.client_name || "El cliente"} está escribiendo…
    </div>
  )}

</div>

        {/* 💰 Info del servicio y precio por hora */}
        {(selectedJob?.service_type || selectedJob?.price) && (
          <div className="px-4 py-3 border-b border-gray-100 bg-emerald-50 text-emerald-700 text-sm font-semibold flex items-center justify-between">
            <span>
              {selectedJob?.service_type
                ? `Servicio: ${
                    selectedJob.service_type.charAt(0).toUpperCase() +
                    selectedJob.service_type.slice(1)
                  }`
                : ''}
            </span>
            {selectedJob?.price && (
              <span>
                ₲{Number(selectedJob.price).toLocaleString('es-PY')} / hora
              </span>
            )}
          </div>
        )}

        {/* 💬 Chat de mensajes */}
        <div className="flex flex-col h-[70vh] bg-white">
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {messages.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div
                  key={m.id}
                  className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm shadow-sm ${
                      mine
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {m.text}
                    <div
                      className={`text-[10px] mt-1 opacity-70 ${
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

          {/* ✉️ Input para enviar mensajes */}
          <form
            className="p-3 border-t border-gray-100 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              await sendMessage();
            }}
          >
            <input
              ref={inputRef}
              type="text"
              placeholder="Escribí un mensaje…"
              className="flex-1 bg-gray-100 rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-emerald-400 border border-gray-200"
            />
            <button
              disabled={sending}
              className="px-4 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition disabled:opacity-60"
            >
              <SendHorizontal size={18} />
            </button>
          </form>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

{/* NAVBAR INFERIOR */}
<div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-sm flex justify-around py-2 text-sm font-semibold z-50">
  {/* 🏠 Trabajos */}
  <button className="flex flex-col items-center text-emerald-600">
    <Home size={18} /> <span>Trabajos</span>
  </button>

  {/* 💬 Chats con indicador de mensajes no leídos */}
  <button
    onClick={async () => {
      setHasUnread(false);

      // 🧠 Si no hay chat seleccionado, buscar el trabajo aceptado o más reciente
      if (!selectedJob) {
        const activeJob = jobs.find((j) => j.status === 'accepted') || jobs[0];
        if (activeJob) {
          await openChat(activeJob); // 🔥 abre el modal del chat correcto
        } else {
          toast.info('No tenés chats activos actualmente');
        }
      } else {
        setIsChatOpen(true);
      }
    }}
    className="relative flex flex-col items-center text-gray-500"
  >
    <MessageCircle size={18} />
    {hasUnread && (
      <span className="absolute top-0 right-3 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
    )}
    <span>Chats</span>
  </button>
  

  {/* 👤 Perfil */}
  <button
    onClick={() => router.push('/worker/onboard')}
    className="flex flex-col items-center text-gray-500"
  >
    <User2 size={18} /> <span>Perfil</span>
  </button>
</div>
{/* 🐾 Rodolfo Supervisor */}
<RodolfoBot
  stats={{
    totalWorkers: jobs.length,
    jobsCompleted: jobs.filter((j) => j.status === 'completed').length,
    efficiency:
      jobs.length > 0
        ? jobs.filter((j) => j.status === 'completed').length / jobs.length
        : 0,
  }}
  workerStatus={status}
/>

{/* 👇 cierres del contenedor principal */}
</motion.div>
);
}
/* === 🐾 RODOLFOBOT v11 — Coach Paraguayo de ManosYA === */
function RodolfoBot({ stats = {}, workerStatus = 'available' }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [mode, setMode] = useState('motivador');
  const [showParty, setShowParty] = useState(false);

  // 🧠 Memoria simple pero fiel
  const memoryRef = useRef({
    greeted: false,
    lastTopic: null,
    motivationCount: 0,
    lastSummary: null,
  });

  /* 🎨 Colores según modo */
  const COLORS = {
    motivador: 'from-emerald-500 to-emerald-600',
    analitico: 'from-sky-500 to-blue-600',
    zen: 'from-lime-400 to-emerald-500',
    humoristico: 'from-pink-400 to-rose-600',
  };

  /* 📚 Biblioteca de frases paraguayizadas */
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
      '🌱 No corras, che amigo, lo importante es avanzar constante. El que apura, tropieza.',
      '💬 Escuchá bien al cliente, y tratale como te gustaría que te traten.',
      '🚀 Mantenete visible, respondé rápido, y los pedidos van a venir solitos.',
      '💡 Recordá: el descanso también es parte del trabajo. Ñembohasa un rato y después volvemos con todo.',
    ],
  };

  /* 🕹️ Modo emocional según hora y estado */
  useEffect(() => {
    let newMode = 'motivador';
    const hour = new Date().getHours();
    if (workerStatus === 'busy') newMode = 'analitico';
    else if (workerStatus === 'paused') newMode = 'zen';
    else if (hour >= 19) newMode = 'zen';
    else if (stats?.jobsCompleted > 10) newMode = 'analitico';
    else if (stats?.jobsCompleted > 20) newMode = 'humoristico';
    setMode(newMode);
  }, [workerStatus, stats]);

  /* 🎉 Fiesta automática cada meta */
  useEffect(() => {
    if (stats?.jobsCompleted && stats.jobsCompleted % 10 === 0 && stats.jobsCompleted > 0) {
      setShowParty(true);
      simulateBotTyping(`🎉 ¡Epa che! Ya hiciste ${stats.jobsCompleted} trabajos. Rodolfo está bailando polka en tu honor 💃🐾`);
      const timer = setTimeout(() => setShowParty(false), 7000);
      return () => clearTimeout(timer);
    }
  }, [stats.jobsCompleted]);

  /* ✍️ Simular escritura */
  function simulateBotTyping(text, delay = 1000) {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((m) => [...m, { from: 'bot', text }]);
    }, delay);
  }

/* 👋 Saludo inicial según estado y hora — versión corta, motivadora y con reconocimiento */
const hasWelcomedRef = useRef(false);
useEffect(() => {
  if (hasWelcomedRef.current) return;
  hasWelcomedRef.current = true;

  const hour = new Date().getHours();
  let saludo = '';
  let cierre = '';
  let extra = '';

  // Frases según hora
  if (hour < 12) {
    saludo = '☀️ Buen día, compa. A empezar con el mate y buena energía ☕';
    cierre = 'Hoy es un buen día para avanzar 💪';
  } else if (hour < 18) {
    saludo = '🧉 Buenas tardes, che. Con tereré en mano seguimos firmes.';
    cierre = 'Cada trabajo te acerca más a tus metas 💚';
  } else {
    saludo = '🌙 Buenas noches, trabajador/a del alma.';
    cierre = 'Descansá bien, mañana seguimos con todo 🌿';
  }

  // Personalización por estado
  if (workerStatus === 'available')
    saludo += ' Estás disponible, listo/a para ayudar y ganar 💚';
  else if (workerStatus === 'busy')
    saludo += ' Estás ocupado, pero Rodolfo te acompaña en cada paso 🔧';
  else if (workerStatus === 'paused')
    saludo += ' Estás en pausa, tomá un respiro y recargá energía 🧉';

  // Reconocimiento según cantidad de trabajos
  const jobs = stats?.jobsCompleted || 0;
  if (jobs === 0) {
    extra = '🌱 Todavía no arrancaste, pero cada conexión ya es un paso adelante.';
  } else if (jobs < 5) {
    extra = `💪 Ya completaste ${jobs} trabajo${jobs > 1 ? 's' : ''}. Buen comienzo, seguí así.`;
  } else if (jobs < 15) {
    extra = `🔥 Llevás ${jobs} trabajos hechos, se nota el compromiso.`;
  } else if (jobs < 30) {
    extra = `🚀 ${jobs} trabajos completados. Estás dejando huella, che.`;
  } else {
    extra = `🏆 ${jobs} trabajos… ¡una máquina total! Rodolfo te aplaude con las patitas 👏🐾`;
  }

  // Enviar en secuencia natural
  simulateBotTyping(saludo, 600);
  setTimeout(() => simulateBotTyping(extra, 1400), 1000);
  setTimeout(() => simulateBotTyping(cierre, 2000), 1600);

  // Guía inicial breve y clara
  setTimeout(() => {
    simulateBotTyping(`📋 Podés decirme:
• "¿Cuántos trabajos hice?"
• "¿Cómo voy?"
• "Mi último trabajo"
• "Cuánto gané"
• "Necesito motivación"
• "Dame un consejo"`);
  }, 3200);
}, [workerStatus]);


  /* 💬 Procesamiento principal */
  function handleInput() {
    if (!input.trim()) return;
    const q = input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    setMessages((m) => [...m, { from: 'user', text: input }]);
    setInput('');
    memoryRef.current.lastTopic = q;

    // === SALUDOS ===
    if (q.includes('hola') || q.includes('buenas') || q.includes('rodolfo')) {
      simulateBotTyping('😸 ¡Hola che! Rodolfo al servicio. Listo para darte empuje y ánimo 💪.');
      return;
    }

    // === PROGRESO DE TRABAJOS ===
    if (q.includes('trabajo') && (q.includes('cuanto') || q.includes('hice') || q.includes('complet'))) {
      const total = stats?.jobsCompleted || 0;
      const msg =
        total === 0
          ? '😺 Todavía sin trabajos completados, pero tranquilo, que el primer pedido siempre llega.'
          : `📋 Llevás ${total} trabajo${total !== 1 ? 's' : ''} completado${total !== 1 ? 's' : ''}. Rodolfo está feliz por vos 🐾.`;
      simulateBotTyping(msg);
      return;
    }

    // === ANÁLISIS DE RENDIMIENTO ===
    if (q.includes('como voy') || q.includes('rendimiento') || q.includes('eficiencia')) {
      const eff = ((stats?.efficiency || 0) * 100).toFixed(1);
      let msg = `📊 Tu eficiencia actual es del ${eff}%. `;
      if (eff > 85) msg += '🔥 Sos ejemplo de compromiso, los clientes te van a recomendar fijo.';
      else if (eff > 50) msg += '💪 Buen ritmo, che. Seguí así y pronto vas a ser top worker.';
      else msg += '🌱 No pasa nada, campeón. Lo importante es mantener la cabeza en alto.';
      simulateBotTyping(msg);
      return;
    }

    // === ÚLTIMO TRABAJO ===
    if (q.includes('ultimo') || q.includes('último') || q.includes('cliente')) {
      const last = stats?.lastJob;
      if (!last) {
        simulateBotTyping('📋 Aún no registré tu último trabajo, pero pronto vas a tener tus datos completos.');
      } else {
        simulateBotTyping(`🧾 Último trabajo:
• Cliente: ${last.client_name}
• Servicio: ${last.service_name}
• Pago: ₲${last.amount.toLocaleString('es-PY')}
• Fecha: ${new Date(last.date).toLocaleDateString('es-PY')}
🐾 Orgulloso de vos, che ra’a.`);
      }
      return;
    }

    // === GANANCIAS ===
    if (q.includes('gane') || q.includes('ganancia') || q.includes('plata') || q.includes('dinero')) {
      const earn = stats?.earnings || 0;
      simulateBotTyping(`💰 Hasta ahora juntaste ₲${earn.toLocaleString('es-PY')}.  
🔥 ¡El bolsillo se llena, pero lo que más vale es tu experiencia!`);
      return;
    }

    // === MOTIVACIÓN ===
    if (q.includes('motivacion') || q.includes('frase') || q.includes('animo')) {
      const frases = [...MESSAGES.motivador, ...MESSAGES.humoristico];
      const frase = frases[Math.floor(Math.random() * frases.length)];
      simulateBotTyping(frase);
      memoryRef.current.motivationCount++;
      return;
    }

    // === CONSEJO ===
    if (q.includes('consejo') || q.includes('mejorar')) {
      const consejo = MESSAGES.consejos[Math.floor(Math.random() * MESSAGES.consejos.length)];
      simulateBotTyping(consejo);
      return;
    }

    // === PROGRESO SEMANAL ===
    if (q.includes('progreso') || q.includes('semana')) {
      const total = stats?.jobsCompleted || 0;
      const eff = ((stats?.efficiency || 0) * 100).toFixed(1);
      const earn = stats?.earnings || 0;
      simulateBotTyping(
        `📆 Esta semana hiciste ${total} trabajo${total !== 1 ? 's' : ''}, con una eficiencia del ${eff}%.  
💰 Ganancia total: ₲${earn.toLocaleString('es-PY')}.
👏 ¡Seguimos creciendo, paso a paso!`
      );
      return;
    }

    // === DESCANSO ===
    if (q.includes('descanso') || q.includes('pausa') || q.includes('cansado')) {
      simulateBotTyping('😺 Está bien tomarte un descanso. Tomá aire, estirá los brazos y volvé con pilas nuevas. 🌿');
      return;
    }

    // === RESPUESTA DESCONOCIDA ===
    const fallback = [
      '🐾 No entendí del todo, pero sé que sos un luchador nato.',
      '💚 A veces no hay que hablar mucho, solo seguir metiéndole ganas.',
      '😸 Si querés ver tu resumen o progreso, escribí "mi rendimiento" o "progreso".',
    ];
    simulateBotTyping(fallback[Math.floor(Math.random() * fallback.length)]);
  }

  /* 🎨 Interfaz visual */
  return (
    <div className="fixed bottom-24 right-5 z-[60]">
      {showParty && (
        <div className="fixed inset-0 bg-emerald-100/70 backdrop-blur-sm flex flex-col items-center justify-center z-[70] animate-fade-in">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ duration: 0.6 }} className="text-center">
            <div className="text-5xl mb-2">🎊</div>
            <div className="text-2xl font-bold text-emerald-700">¡Rodolfo está orgulloso!</div>
            <p className="text-emerald-600 font-medium mt-1">Tu esfuerzo deja huella, trabajador del alma 💚</p>
          </motion.div>
        </div>
      )}

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-full p-4 shadow-lg hover:scale-105 transition flex items-center gap-2"
        >
          <motion.span animate={{ rotate: [0, 10, 0, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
            🐱
          </motion.span>
          <span className="font-semibold">RodolfoBot</span>
        </button>
      )}

      {open && (
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-80 h-[470px] flex flex-col overflow-hidden">
          <div className={`p-3 bg-gradient-to-r ${COLORS[mode]} text-white font-semibold rounded-t-2xl flex justify-between items-center`}>
            <div className="flex items-center gap-2">
              <motion.span animate={{ rotate: [0, 10, 0, -10, 0] }} transition={{ repeat: Infinity, duration: 3 }}>
                🐾
              </motion.span>
              <span>RodolfoBot</span>
            </div>
            <button onClick={() => setOpen(false)} className="hover:opacity-80">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 bg-gradient-to-b from-gray-50 to-white space-y-2 text-sm">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`px-3 py-2 rounded-xl max-w-[85%] ${
                  m.from === 'bot'
                    ? 'bg-emerald-50 text-gray-800'
                    : 'bg-emerald-500 text-white self-end ml-auto'
                }`}
              >
                {m.text}
              </div>
            ))}
            {typing && <div className="italic text-gray-400 text-xs animate-pulse">Rodolfo está escribiendo...</div>}
          </div>

          <div className="flex items-center border-t bg-gray-50 p-2">
            <input
              className="flex-1 text-sm border rounded-lg px-2 py-2 outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="Decile algo a Rodolfo..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInput()}
            />
            <button onClick={handleInput} className="ml-2 bg-emerald-500 text-white rounded-lg p-2 hover:bg-emerald-600">
              <SendHorizontal size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
  /* 📊 Mini analizador de rendimiento (seguro y sin romper) */
useEffect(() => {
  try {
    if (!open) return; // solo si el chat está abierto
    if (!stats || typeof stats !== 'object') return; // validación defensiva
    if (!memoryRef.current) return; // si la memoria aún no se inicializó

    const alreadyShown = memoryRef.current.lastSummary;
    if (stats.jobsCompleted > 0 && !alreadyShown) {
      const eff = ((stats.efficiency || 0) * 100).toFixed(1);
      const earn = stats.earnings || 0;

      simulateBotTyping(
        `📊 Resumen rápido de tu rendimiento:
• Trabajos completados: ${stats.jobsCompleted}
• Eficiencia: ${eff}%
• Ganancias: ₲${earn.toLocaleString('es-PY')}
🐾 Rodolfo dice: “Seguimos metiendo garra, compa 💪”`
      );

      updateMemory({ lastSummary: new Date().toISOString() });
    }
  } catch (err) {
    console.warn('Error en mini analizador:', err);
  }
}, [open, stats]);

}
