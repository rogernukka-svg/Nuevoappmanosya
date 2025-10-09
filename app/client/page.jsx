'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  Search,
  ClipboardList,
  SendHorizontal,
  ChevronLeft,
  Star,
  RefreshCcw,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { toast } from 'sonner';

const supabase = getSupabase();

export default function ClientHomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [activeJob, setActiveJob] = useState(null);
  const [reviews, setReviews] = useState([]);

  const [messages, setMessages] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);
  const chatChannelRef = useRef(null);
  const jobsChannelRef = useRef(null);

  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  /* === INIT === */
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const role = localStorage.getItem('app_role');
    if (!role) router.replace('/role-selector');
  }, [mounted, router]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user);
      else router.replace('/login');
    });
  }, [router]);

  /* === JOBS === */
  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      const { data } = await supabase
        .from('jobs')
        .select('*, worker:profiles!worker_id(full_name, avatar_url)')
        .eq('client_id', user.id)
        .in('status', [
          'taken',
          'accepted',
          'on_route',
          'arrived',
          'started',
          'completed',
        ])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setActiveJob(data || null);
    };
    load();
  }, [user]);

  /* === REVIEWS === */
  useEffect(() => {
    if (!user?.id) return;
    const loadReviews = async () => {
      const { data } = await supabase
        .from('reviews')
        .select(
          'rating, comment, created_at, worker:profiles!worker_id(full_name)'
        )
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);
      setReviews(data || []);
    };
    loadReviews();
  }, [user]);

  /* === REALTIME JOBS === */
  useEffect(() => {
    if (!user?.id) return;
    if (jobsChannelRef.current)
      supabase.removeChannel(jobsChannelRef.current);
    const channel = supabase
      .channel('realtime-jobs')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `client_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new;
          if (updated.id === activeJob?.id) {
            setActiveJob(updated);
            toast(`🔄 Estado actualizado: ${updated.status}`);
            if (updated.status === 'completed') setShowReview(true);
          }
        }
      )
      .subscribe();
    jobsChannelRef.current = channel;
    return () => supabase.removeChannel(channel);
  }, [user, activeJob]);

  /* === CHAT === */
  async function openChat() {
    try {
      if (!activeJob?.id || !user?.id || !activeJob.worker_id) return;
      const { data: chatRow } = await supabase
        .from('chats')
        .select('id')
        .eq('job_id', activeJob.id)
        .maybeSingle();
      if (!chatRow?.id) throw new Error('Chat no encontrado.');

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatRow.id)
        .order('created_at', { ascending: true });

      setMessages(msgs || []);
      setIsChatOpen(true);

      if (chatChannelRef.current)
        supabase.removeChannel(chatChannelRef.current);
      const channel = supabase
        .channel(`chat-${chatRow.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chatRow.id}`,
          },
          (payload) => {
            const msg = payload.new;
            setMessages((prev) => [...prev, msg]);
            if (msg.sender_id !== user.id)
              toast(`💬 Nuevo mensaje: ${msg.content}`);
          }
        )
        .subscribe();
      chatChannelRef.current = channel;
    } catch (e) {
      toast.error('No se pudo abrir el chat: ' + e.message);
    }
  }

  async function sendMessage(content) {
    const text = (content || '').trim();
    if (!text || !user?.id || !activeJob?.id) return;
    try {
      setSending(true);
      const { data: chat } = await supabase
        .from('chats')
        .select('id')
        .eq('job_id', activeJob.id)
        .maybeSingle();
      if (!chat?.id) throw new Error('No hay chat activo');
      await supabase
        .from('messages')
        .insert([{ chat_id: chat.id, sender_id: user.id, content: text }]);
    } finally {
      setSending(false);
    }
  }

  async function submitReview() {
    if (!rating || !activeJob?.worker_id || !user?.id) {
      toast.error('Seleccioná una calificación.');
      return;
    }
    try {
      await supabase.from('reviews').insert([
        {
          job_id: activeJob.id,
          worker_id: activeJob.worker_id,
          client_id: user.id,
          rating,
          comment,
        },
      ]);
      toast.success('🌟 Calificación enviada');
      setShowReview(false);
      setActiveJob(null);
    } catch {
      toast.error('Error al enviar la calificación');
    }
  }

  useEffect(() => {
    return () => {
      if (chatChannelRef.current)
        supabase.removeChannel(chatChannelRef.current);
      if (jobsChannelRef.current)
        supabase.removeChannel(jobsChannelRef.current);
    };
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-emerald-600 font-semibold">
        Cargando Modo Cliente…
      </div>
    );
  }

  /* === UI === */
  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-10 text-center bg-gradient-to-b from-white via-gray-50 to-gray-100">
      {/* HEADER SIN LOGO */}
      <header className="w-full max-w-4xl flex justify-between items-center mb-8">
        <span className="text-gray-600 text-sm hidden sm:inline">
          Modo Cliente 🏠
        </span>
        <button
          onClick={() => router.push('/role-selector')}
          className="flex items-center gap-2 text-emerald-600 font-semibold hover:text-emerald-700 transition"
        >
          <RefreshCcw size={16} /> Cambiar rol
        </button>
      </header>

      {/* HERO */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <h1 className="text-3xl md:text-4xl font-extrabold text-emerald-600 mb-2">
          Hola 👋 {user?.user_metadata?.full_name?.split(' ')[0] || ''}
        </h1>
        <p className="text-gray-600 max-w-md text-sm md:text-base leading-relaxed">
          ¿Qué necesitás hoy? Elegí una opción para comenzar.
        </p>
      </motion.div>

      {/* ACTIONS */}
      <div className="flex flex-col w-full max-w-xs gap-4">
        <Link href="/map">
          <motion.button
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.05 }}
            className="w-full flex flex-col items-center justify-center gap-1 border border-emerald-400 text-emerald-600 py-3 rounded-xl bg-white hover:bg-emerald-50 shadow-sm font-semibold transition"
          >
            <Search className="w-5 h-5" />
            <span>🕒 Urgente — Ver mapa de profesionales</span>
            <p className="text-xs text-gray-500 font-normal">
              Ideal para servicios inmediatos
            </p>
          </motion.button>
        </Link>

        <Link href="/client/new">
          <motion.button
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.05 }}
            className="w-full flex flex-col items-center justify-center gap-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-xl shadow-md hover:shadow-lg transition"
          >
            <Briefcase className="w-5 h-5" />
            <span>📅 Programá tu pedido</span>
            <p className="text-xs text-white/80 font-normal">
              Perfecto para tareas planificadas
            </p>
          </motion.button>
        </Link>

        <Link href="/client/jobs">
          <motion.button
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.05 }}
            className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 py-3 rounded-xl bg-white hover:bg-gray-50 shadow-sm font-semibold transition"
          >
            <ClipboardList className="w-5 h-5" /> Ver mis pedidos
          </motion.button>
        </Link>

        {activeJob?.worker && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.05 }}
            onClick={openChat}
            className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-800 py-3 rounded-xl hover:bg-gray-200 font-semibold transition"
          >
            💬 Chat con {activeJob.worker?.full_name || 'trabajador'}
          </motion.button>
        )}
      </div>

      {/* REVIEWS */}
      {reviews.length > 0 && (
        <div className="mt-10 w-full max-w-md text-left">
          <h3 className="font-semibold text-gray-700 mb-2">
            Tus últimas calificaciones 🌟
          </h3>
          <div className="space-y-2">
            {reviews.map((r, i) => (
              <div key={i} className="p-3 bg-white rounded-xl border shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-emerald-600">
                    {r.worker.full_name}
                  </span>
                  <div className="flex gap-1">
                    {[...Array(r.rating)].map((_, idx) => (
                      <Star
                        key={idx}
                        className="w-4 h-4 text-yellow-400 fill-yellow-400"
                      />
                    ))}
                  </div>
                </div>
                {r.comment && (
                  <p className="text-sm text-gray-600 mt-1">{r.comment}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
