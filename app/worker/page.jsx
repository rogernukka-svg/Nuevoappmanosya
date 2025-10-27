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

  const inputRef = useRef(null);
  const chatChannelRef = useRef(null);
  const bottomRef = useRef(null);
  const soundRef = useRef(null);

  /* === Sesión === */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    (async () => {
      try {
        if (typeof Audio !== 'undefined') soundRef.current = new Audio('/notify.mp3');
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
            client:profiles!client_id(full_name, avatar_url)
          `)
          .eq('worker_id', workerId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setJobs(data || []);
      } catch (err) {
        console.error('Error cargando trabajos:', err);
        toast.error('Error al cargar trabajos');
      } finally {
        setLoading(false);
      }
    }

    loadJobs();

    // 🔄 Realtime: actualiza si cambia algo
    const channel = supabase
      .channel('jobs-worker-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs', filter: `worker_id=eq.${workerId}` },
        (payload) => {
          setJobs((prev) =>
            prev.map((j) => (j.id === payload.new.id ? { ...j, ...payload.new } : j))
          );
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user?.id]);

  /* === Cambiar disponibilidad === */
  async function toggleActive() {
    try {
      const newState = !isActive;
      setIsActive(newState);
      await supabase.from('worker_profiles').update({ is_active: newState }).eq('user_id', user.id);
      toast.success(newState ? '🟢 Ahora estás disponible' : '🔴 Estás pausado');
    } catch {
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

  /* === Chat === */
  async function openChat(job) {
    try {
      setSelectedJob(job);
      setIsChatOpen(true);
    } catch (err) {
      toast.error('No se pudo abrir el chat');
    }
  }

  /* === Enviar mensaje === */
  async function sendMessage(content) {
    const text = (content || '').trim();
    if (!text) return;
    try {
      setSending(true);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender_id: user.id,
          content: text,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
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
    >
      {/* ENCABEZADO */}
      <div className="flex items-center justify-between mb-4 pt-6">
        <h1 className="text-lg font-extrabold text-emerald-600">Panel del Trabajador</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleActive}
            className={`flex items-center gap-1 text-sm font-semibold ${
              isActive ? 'text-emerald-600 hover:text-emerald-800' : 'text-gray-400 hover:text-red-500'
            } transition`}
          >
            <Power size={16} /> {isActive ? 'Disponible' : 'Pausado'}
          </button>
          <button
            onClick={() => router.push('/role-selector')}
            className="flex items-center gap-1 text-sm font-semibold text-gray-400 hover:text-emerald-500 transition"
          >
            <ArrowLeftCircle size={16} /> Volver
          </button>
        </div>
      </div>

      {/* LISTA DE TRABAJOS */}
      {jobs.length === 0 ? (
        <p className="text-gray-500 mt-10 text-center">Aún no tenés solicitudes disponibles.</p>
      ) : (
        <section className="grid gap-3 mt-5">
          {jobs.map((job) => (
            <motion.div
              key={job.id}
              whileTap={{ scale: 0.98 }}
              className="border rounded-2xl p-4 transition shadow-sm bg-white hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-800">{job.title || 'Trabajo de servicio'}</h3>
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

              <p className="text-sm text-gray-600 mb-2">
                {job.description || 'Pedido generado desde el mapa'}
              </p>

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
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="flex items-center gap-1 text-gray-600 hover:text-red-500"
                >
                  <ChevronLeft size={18} /> Volver
                </button>
                <h2 className="font-semibold text-gray-800">Chat con cliente</h2>
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

              <div className="flex flex-col h-[70vh] bg-white">
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                  {messages.map((m) => {
                    const mine = m.sender_id === user?.id;
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm shadow-sm ${
                            mine ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {m.content}
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

                <form
                  className="p-3 border-t border-gray-100 flex gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const value = inputRef.current?.value || '';
                    await sendMessage(value);
                    if (inputRef.current) inputRef.current.value = '';
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
        <button className="flex flex-col items-center text-emerald-600">
          <Home size={18} /> <span>Trabajos</span>
        </button>
        <button
          onClick={() => setIsChatOpen(true)}
          className="flex flex-col items-center text-gray-500"
        >
          <MessageCircle size={18} /> <span>Chats</span>
        </button>
        <button
          onClick={() => router.push('/worker/onboard')}
          className="flex flex-col items-center text-gray-500"
        >
          <User2 size={18} /> <span>Perfil</span>
        </button>
      </div>
    </motion.div>
  );
}
