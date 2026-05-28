'use client';

import { useEffect, useRef, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { SendHorizontal, ChevronLeft } from 'lucide-react';
import { canAttemptAction, inspectTextSafety } from '@/lib/security';

const supabase = getSupabase();
const WORKER_CHAT_SEEN_MAP_KEY = 'manosya_worker_chat_seen_map';

function markWorkerChatRead(chatId) {
  if (typeof window === 'undefined' || !chatId) return;
  try {
    const raw = localStorage.getItem(WORKER_CHAT_SEEN_MAP_KEY);
    const seenMap = raw ? JSON.parse(raw) : {};
    seenMap[String(chatId)] = Date.now();
    localStorage.setItem(WORKER_CHAT_SEEN_MAP_KEY, JSON.stringify(seenMap));
  } catch {}
}

export default function ChatPage() {
  const { chatId } = useParams();
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [viewportHeight, setViewportHeight] = useState('100dvh');
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const inputRef = useRef(null);
  const messagesWrapRef = useRef(null);
  const realtimeRef = useRef(null);

  /* === Obtener usuario actual === */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user);
      else router.replace('/auth/login');
    });
  }, [router]);

  /* === Cargar mensajes iniciales === */
  useEffect(() => {
    if (!chatId || !user?.id) return;
    const load = async () => {
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .select('id, client_id, worker_id')
        .eq('id', chatId)
        .maybeSingle();

      if (chatError || !chat) {
        router.replace('/worker');
        return;
      }

      const isParticipant =
        String(chat.client_id) === String(user.id) ||
        String(chat.worker_id) === String(user.id);

      if (!isParticipant) {
        router.replace('/role-selector');
        return;
      }

      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
      setMessages(data || []);
      markWorkerChatRead(chatId);
    };
    load();
  }, [chatId, router, user?.id]);

  /* === Escuchar mensajes en tiempo real === */
  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`chat-${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((message) => message.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          markWorkerChatRead(chatId);
        }
      )
      .subscribe();

    realtimeRef.current = channel;
    return () => supabase.removeChannel(channel);
  }, [chatId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncViewport = () => {
      const visualViewport = window.visualViewport;
      const height = Math.round(visualViewport?.height || window.innerHeight);
      const offset = Math.max(
        0,
        Math.round(window.innerHeight - height - (visualViewport?.offsetTop || 0))
      );

      setViewportHeight(`${height}px`);
      setKeyboardOffset(offset);
    };

    syncViewport();
    window.addEventListener('resize', syncViewport);
    window.visualViewport?.addEventListener('resize', syncViewport);
    window.visualViewport?.addEventListener('scroll', syncViewport);

    return () => {
      window.removeEventListener('resize', syncViewport);
      window.visualViewport?.removeEventListener('resize', syncViewport);
      window.visualViewport?.removeEventListener('scroll', syncViewport);
    };
  }, []);

  useEffect(() => {
    const wrap = messagesWrapRef.current;
    if (!wrap) return;

    wrap.scrollTo({
      top: wrap.scrollHeight,
      behavior: keyboardOffset > 40 ? 'auto' : 'smooth',
    });
  }, [messages, keyboardOffset]);

  /* === Enviar mensaje === */
  async function sendMessage(e) {
    e.preventDefault();
    if (!user?.id || !chatId) return;
    const safety = inspectTextSafety(inputRef.current?.value || '');
    if (!safety.ok) {
      console.warn(safety.error);
      return;
    }

    const attempt = canAttemptAction(`worker-chat:${chatId}:${user.id}`, { limit: 8, windowMs: 60_000 });
    if (!attempt.allowed) {
      console.warn('Mensaje bloqueado por rate limit local');
      return;
    }

    try {
      setSending(true);
      const { error } = await supabase
        .from('messages')
        .insert([{ chat_id: chatId, sender_id: user.id, content: safety.text, text: safety.text }]);

      if (error) throw error;
      inputRef.current.value = '';
    } catch (error) {
      console.error('No se pudo enviar el mensaje:', error);
    } finally {
      setSending(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-[100dvh] flex-col overflow-hidden bg-white text-gray-900"
      style={{ height: viewportHeight }}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-gray-600 hover:text-emerald-600"
        >
          <ChevronLeft size={18} /> Volver
        </button>
        <h2 className="font-bold text-emerald-600">Chat con cliente</h2>
        <div className="w-6" />
      </div>

      {/* MENSAJES */}
      <div ref={messagesWrapRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm shadow-sm ${
                  mine
                    ? 'bg-emerald-500 text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-800 rounded-bl-md'
                }`}
              >
                {m.content || m.text}
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
      </div>

      {/* INPUT */}
      <form
        onSubmit={sendMessage}
        className="p-3 border-t border-gray-100 flex gap-2 bg-white"
      >
        <input
          ref={inputRef}
          type="text"
          onFocus={() => {
            setTimeout(() => {
              const wrap = messagesWrapRef.current;
              if (!wrap) return;
              wrap.scrollTo({ top: wrap.scrollHeight, behavior: 'auto' });
            }, 80);
          }}
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
    </motion.div>
  );
}
