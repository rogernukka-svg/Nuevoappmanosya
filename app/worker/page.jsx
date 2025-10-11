'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Loader2,
  SendHorizontal,
  ChevronLeft,
  Map,
  CheckSquare,
  RefreshCcw,
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
        .insert([{ user_id: userId, is_active: true, radius_km: 5 }]);
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
  const inputRef = useRef(null);
  const chatChannelRef = useRef(null);
  const bottomRef = useRef(null);
  const soundRef = useRef(null);

  /* === Sesión === */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    (async () => {
      try {
        if (typeof Audio !== 'undefined') {
          soundRef.current = new Audio('/notify.mp3');
        }
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

  /* === Cargar trabajos === */
  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('jobs')
          .select(`
            id, title, description, status, client_id, worker_id,
            client_lat, client_lng, created_at,
            client:profiles!client_id(full_name, avatar_url)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setJobs(data || []);
      } catch (err) {
        console.error('Error cargando trabajos:', err);
        toast.error('Error al cargar trabajos');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  /* === Aceptar trabajo === */
  async function acceptJob(job) {
    try {
      const { data, error } = await supabase.rpc('accept_job_flow', {
        p_job_id: job.id,
        p_worker_id: user.id,
      });

      if (error || !data?.ok)
        throw error || new Error(data?.message || 'No se pudo aceptar el trabajo');

      toast.success('✅ Trabajo aceptado correctamente');

      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id ? { ...j, status: data.status || 'accepted' } : j
        )
      );

      // abrir chat automáticamente
      await openChat(job);

      // abrir Google Maps automáticamente
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${job.client_lat},${job.client_lng}`,
        '_blank'
      );
    } catch (err) {
      console.error('Error al aceptar trabajo:', err);
      toast.error(err.message || 'No se pudo aceptar el trabajo');
    }
  }

  /* === Rechazar trabajo === */
  async function rejectJob(job) {
    try {
      const { data, error } = await supabase.rpc('reject_job_flow', {
        p_job_id: job.id,
        p_worker_id: user.id,
      });

      if (error) throw error;
      if (!data?.ok) {
        toast.warning(data?.message || 'No se pudo rechazar');
        return;
      }

      toast.success('🚫 Trabajo rechazado correctamente');
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
    } catch (err) {
      console.error('Error al rechazar trabajo:', err);
      toast.error(err.message || 'No se pudo rechazar el trabajo');
    }
  }

  /* === Finalizar trabajo === */
  async function completeJob(job) {
    try {
      const { data, error } = await supabase.rpc('complete_job_flow', {
        p_job_id: job.id,
        p_worker_id: user.id,
      });

      if (error) throw error;
      if (!data?.ok) {
        toast.warning(data?.message || 'No se pudo finalizar');
        return;
      }

      toast.success('🎉 Trabajo finalizado correctamente');
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: 'completed' } : j))
      );
      setSelectedJob(null);
      setIsChatOpen(false);
    } catch (err) {
      console.error('Error al finalizar trabajo:', err);
      toast.error(err.message || 'No se pudo finalizar el trabajo');
    }
  }

  /* === Chat sincronizado === */
  async function openChat(job) {
    try {
      const { data: chatIdData, error: chatErr } = await supabase.rpc(
        'ensure_chat_for_job',
        { p_job_id: job.id }
      );
      if (chatErr) throw chatErr;
      const chatId = chatIdData;

      // Cargar mensajes previos
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      setMessages(msgs || []);
      setIsChatOpen(true);
      setSelectedJob({ ...job, chat_id: chatId });

      // 🟢 Realtime sincronizado
      if (chatChannelRef.current) supabase.removeChannel(chatChannelRef.current);

      const channel = supabase
        .channel(`chat-${chatId}`, {
          config: {
            broadcast: { self: true },
            presence: { key: user.id },
          },
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chatId}`,
          },
          (payload) => {
            setMessages((prev) => [...prev, payload.new]);
            if (payload.new.sender_id !== user.id) {
              soundRef.current?.play?.();
            }
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
          }
        )
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`✅ Realtime conectado al chat ${chatId}`);
          }
        });

      chatChannelRef.current = channel;
    } catch (e) {
      console.error('Error en openChat:', e);
      toast.error('No se pudo abrir el chat');
    }
  }

  async function sendMessage(content) {
    const text = (content || '').trim();
    if (!text || !selectedJob) return;
    try {
      setSending(true);
      await supabase
        .from('messages')
        .insert([{ chat_id: selectedJob.chat_id, sender_id: user.id, content: text }]);
    } finally {
      setSending(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
    }
  }

  /* === Render === */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container max-w-screen-md mx-auto px-4 pb-28 bg-white text-gray-900 min-h-screen"
    >
      <div className="flex items-center justify-between mb-4 pt-6">
        <h1 className="text-lg font-extrabold text-emerald-600">
          Panel del Trabajador
        </h1>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/role-selector')}
            className="flex items-center gap-1 text-sm font-semibold text-cyan-600 hover:text-cyan-800 transition"
          >
            <RefreshCcw size={16} /> Cambiar rol
          </button>

          <button
            onClick={() => router.push('/worker/onboard')}
            className="text-sm font-semibold text-gray-400 hover:text-emerald-500 transition"
          >
            ⚙️ Configurar perfil
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center mt-10 text-gray-400">
          <Loader2 className="animate-spin" /> Cargando trabajos...
        </div>
      ) : jobs.length === 0 ? (
        <p className="text-gray-500 mt-10 text-center">
          Aún no tenés solicitudes disponibles.
        </p>
      ) : (
        <section className="grid gap-3 mt-5">
          {jobs.map((job) => (
            <motion.div
              key={job.id}
              whileTap={{ scale: 0.97 }}
              className="border rounded-2xl p-4 transition shadow-sm bg-white hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-800">
                  {job.title || 'Trabajo de Servicio'}
                </h3>
                <CheckCircle2 size={20} className="text-emerald-500 opacity-80" />
              </div>

              <p className="text-sm text-gray-600">
                {job.description || 'Pedido generado desde el mapa'}
              </p>

              {job.client && (
                <div className="flex items-center gap-2 mt-2">
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

              <p className="text-xs text-emerald-600 mt-2 font-medium">
                Estado: {job.status}
              </p>

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

      {/* === CHAT MODAL === */}
      <AnimatePresence>
        {isChatOpen && selectedJob && (
          <motion.div className="fixed inset-0 bg-black/40 flex justify-center items-end z-[80]">
            <motion.div className="bg-white rounded-t-3xl w-full max-w-md shadow-xl">
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
    </motion.div>
  );
}
