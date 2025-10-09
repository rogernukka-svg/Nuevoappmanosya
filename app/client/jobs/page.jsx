'use client';

import { useEffect, useState, useRef } from 'react';
import { getSupabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  SendHorizontal,
  ChevronLeft,
  MessageSquare,
  Star,
  CheckCircle2,
  RefreshCw,
  CalendarClock,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';

const supabase = getSupabase();

export default function ClientJobsPage() {
  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Chat
  const [messages, setMessages] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);
  const chatChannelRef = useRef(null);
  const bottomRef = useRef(null);

  // Review
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  // === CARGAR USUARIO ===
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user);
    });
    return () => {
      if (chatChannelRef.current) supabase.removeChannel(chatChannelRef.current);
    };
  }, []);

  // === CARGAR PEDIDOS ===
  async function loadJobs() {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        worker:profiles!worker_id(full_name, avatar_url),
        review:reviews!job_id(rating, comment, created_at)
      `)
      .eq('client_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error cargando pedidos:', error);
      toast.error('Error al cargar pedidos');
    } else setJobs(data || []);

    setLoading(false);
  }

  useEffect(() => {
    if (user?.id) loadJobs();
  }, [user]);

  // === CHAT ===
  async function openChat(job) {
    try {
      if (!job.worker_id) return toast('⚠️ Aún no tiene trabajador asignado');

      let { data: chatRow } = await supabase
        .from('chats')
        .select('id')
        .eq('job_id', job.id)
        .maybeSingle();

      if (!chatRow) {
        const { data: newChat } = await supabase
          .from('chats')
          .insert([{ job_id: job.id, client_id: user.id, worker_id: job.worker_id }])
          .select('id')
          .single();
        chatRow = newChat;
      }

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatRow.id)
        .order('created_at', { ascending: true });

      setMessages(msgs || []);
      setSelectedJob({ ...job, chat_id: chatRow.id });
      setIsChatOpen(true);

      if (chatChannelRef.current) supabase.removeChannel(chatChannelRef.current);
      const channel = supabase
        .channel(`chat-${chatRow.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatRow.id}` },
          (payload) => {
            setMessages((prev) => [...prev, payload.new]);
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
          }
        )
        .subscribe();
      chatChannelRef.current = channel;
    } catch (e) {
      console.error('❌ Error abriendo chat:', e);
      toast.error('No se pudo abrir el chat');
    }
  }

  async function sendMessage(content) {
    const text = (content || '').trim();
    if (!text || !user?.id || !selectedJob) return;
    try {
      setSending(true);
      const { error } = await supabase.from('messages').insert([
        { chat_id: selectedJob.chat_id, sender_id: user.id, content: text },
      ]);
      if (error) throw error;
    } catch (err) {
      toast.error('No se pudo enviar el mensaje');
    } finally {
      setSending(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
    }
  }

  function closeChat() {
    setIsChatOpen(false);
    if (chatChannelRef.current) {
      supabase.removeChannel(chatChannelRef.current);
      chatChannelRef.current = null;
    }
  }

  // === REVIEW ===
  async function submitReview(jobId, workerId) {
    if (!rating) return toast('Seleccioná una calificación');
    try {
      const { error } = await supabase.rpc('add_review_if_valid', {
        p_job_id: jobId,
        p_worker_id: workerId,
        p_client_id: user.id,
        p_rating: rating,
        p_comment: comment,
      });
      if (error) throw error;
      toast.success('✅ Calificación enviada');
      setShowReview(false);
      setRating(0);
      setComment('');
      await loadJobs();
    } catch (err) {
      console.error('❌ Error RPC:', err);
      toast.error('Error enviando review');
    }
  }

  // === REASIGNAR TRABAJADOR (AUTO) ===
  async function reassignWorker(jobId) {
    try {
      const { error } = await supabase.rpc('reassign_worker_if_needed', { p_job_id: jobId });
      if (error) throw error;
      toast.success('🔄 Trabajador reasignado correctamente');
      await loadJobs();
    } catch (err) {
      toast.error('No se pudo reasignar automáticamente');
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container max-w-screen-md mx-auto px-4 pb-32 bg-white text-gray-900 min-h-screen relative"
    >
      <h1 className="text-2xl font-extrabold text-emerald-600 pt-8 mb-4 flex items-center gap-2">
        <Building2 className="text-emerald-600" /> Panel de Pedidos
      </h1>
      <p className="text-gray-500 text-sm mb-4">
        Gestioná tus servicios activos, completados y planificados fácilmente ⚡
      </p>

      {loading ? (
        <div className="flex justify-center mt-10 text-gray-400 gap-2 items-center">
          <Loader2 className="animate-spin" /> Cargando tus pedidos...
        </div>
      ) : jobs.length === 0 ? (
        <p className="text-center text-gray-500 mt-10">
          No tenés pedidos aún. ¡Comenzá solicitando tu primer servicio! 💪
        </p>
      ) : (
        <section className="grid gap-4 mt-5">
          {jobs.map((job) => {
            const review = job.review?.[0];
            return (
              <motion.div
                key={job.id}
                whileHover={{ scale: 1.01 }}
                className="border rounded-2xl p-5 shadow-sm bg-white hover:shadow-md transition relative"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-gray-800">{job.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{job.description}</p>
                    <p className="text-xs text-emerald-600 font-medium mt-1">
                      <CalendarClock className="inline w-3 h-3 mr-1" />
                      {new Date(job.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-lg font-semibold ${
                      job.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : job.status === 'cancelled'
                        ? 'bg-red-100 text-red-600'
                        : job.status === 'assigned'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {job.status}
                  </span>
                </div>

                {job.worker && (
                  <p className="mt-1 text-sm text-gray-500">
                    👷 {job.worker.full_name || 'Asignado automáticamente'}
                  </p>
                )}

                {/* === BOTÓN DE REASIGNACIÓN === */}
                {job.status === 'assigned' && (
                  <button
                    onClick={() => reassignWorker(job.id)}
                    className="flex items-center gap-2 mt-2 text-sm text-emerald-600 font-medium hover:text-emerald-700 transition"
                  >
                    <RefreshCw size={14} /> Reasignar trabajador automáticamente
                  </button>
                )}

                {/* === REVIEW === */}
                {review ? (
                  <div className="mt-3 p-3 bg-emerald-50 rounded-xl text-sm border border-emerald-100">
                    <div className="flex items-center gap-1 mb-1">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      ))}
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-1" />
                    </div>
                    <p className="italic text-gray-600">"{review.comment}"</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Calificado el {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  job.status === 'completed' && (
                    <button
                      onClick={() => {
                        setSelectedJob(job);
                        setShowReview(true);
                      }}
                      className="mt-3 w-full py-2 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition"
                    >
                      🌟 Calificar servicio
                    </button>
                  )
                )}

                {job.worker_id && (
                  <button
                    onClick={() => openChat(job)}
                    className="flex items-center justify-center gap-2 w-full mt-3 bg-gray-100 text-gray-800 py-2 rounded-xl font-semibold hover:bg-gray-200 transition"
                  >
                    <MessageSquare size={18} /> Chat con trabajador
                  </button>
                )}
              </motion.div>
            );
          })}
        </section>
      )}

      {/* === CHAT MODAL === */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex justify-center items-end bg-black/70"
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              transition={{ type: 'spring', stiffness: 120 }}
              className="bg-white w-full max-w-md rounded-t-3xl shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                <button onClick={closeChat} className="flex items-center gap-1 text-gray-600 hover:text-red-500">
                  <ChevronLeft size={18} /> Volver
                </button>
                <h2 className="font-semibold text-gray-800">Chat en vivo 💬</h2>
                <div className="w-6" />
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-white">
                {messages.length === 0 ? (
                  <p className="text-center text-gray-400 mt-6">No hay mensajes aún 📭</p>
                ) : (
                  messages.map((m) => {
                    const mine = m.sender_id === user?.id;
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm shadow-sm ${
                            mine ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {m.content}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const value = inputRef.current?.value || '';
                  await sendMessage(value);
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

      {/* === REVIEW MODAL === */}
      <AnimatePresence>
        {showReview && selectedJob && (
          <motion.div
            className="fixed inset-0 bg-black/60 flex justify-center items-center z-[99999]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl p-6 w-[90%] max-w-md text-center"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
            >
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                🌟 ¿Cómo fue el servicio de {selectedJob.worker?.full_name}?
              </h2>

              <div className="flex justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    onClick={() => setRating(n)}
                    className={`w-8 h-8 cursor-pointer transition ${
                      n <= rating
                        ? 'text-yellow-400 fill-yellow-400 scale-110'
                        : 'text-gray-300 hover:text-yellow-300'
                    }`}
                  />
                ))}
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Dejá un comentario (opcional)"
                className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
              />

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setShowReview(false)}
                  className="flex-1 bg-gray-200 text-gray-700 rounded-xl py-2 font-semibold hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => submitReview(selectedJob.id, selectedJob.worker_id)}
                  className="flex-1 bg-emerald-500 text-white rounded-xl py-2 font-semibold hover:bg-emerald-600"
                >
                  Enviar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
