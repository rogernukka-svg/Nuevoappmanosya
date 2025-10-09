'use client';

import { useEffect, useRef, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { SendHorizontal, ChevronLeft } from 'lucide-react';

const supabase = getSupabase();

export default function ChatPage() {
  const { chatId } = useParams();
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);
  const realtimeRef = useRef(null);

  /* === Obtener usuario actual === */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user);
      else router.replace('/login');
    });
  }, [router]);

  /* === Cargar mensajes iniciales === */
  useEffect(() => {
    if (!chatId) return;
    const load = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
      setMessages(data || []);
    };
    load();
  }, [chatId]);

  /* === Escuchar mensajes en tiempo real === */
  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`chat-${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => setMessages((prev) => [...prev, payload.new])
      )
      .subscribe();

    realtimeRef.current = channel;
    return () => supabase.removeChannel(channel);
  }, [chatId]);

  /* === Enviar mensaje === */
  async function sendMessage(e) {
    e.preventDefault();
    if (!user?.id || !chatId) return;
    const text = inputRef.current?.value.trim();
    if (!text) return;

    setSending(true);
    await supabase.from('messages').insert([{ chat_id: chatId, sender_id: user.id, content: text }]);
    setSending(false);
    inputRef.current.value = '';
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col min-h-screen bg-white text-gray-900"
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
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
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
      </div>

      {/* INPUT */}
      <form
        onSubmit={sendMessage}
        className="p-3 border-t border-gray-100 flex gap-2 bg-white"
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
    </motion.div>
  );
}

