'use client';

import { useEffect, useRef, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { ChevronLeft, SendHorizontal } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const supabase = getSupabase();

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const chatId = params?.id;

  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user);
    });
  }, []);

  // Cargar mensajes
  useEffect(() => {
    if (!chatId || !user) return;

    const load = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
      if (error) console.error(error);
      else setMessages(data || []);
    };
    load();

    // Realtime
    const channel = supabase
      .channel(`chat-${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => setMessages((prev) => [...prev, payload.new])
      )
      .subscribe();

    channelRef.current = channel;
    return () => supabase.removeChannel(channel);
  }, [chatId, user]);

  async function sendMessage(e) {
    e.preventDefault();
    const text = inputRef.current?.value.trim();
    if (!text) return;

    try {
      setSending(true);
      await supabase.from('messages').insert([
        { chat_id: chatId, sender_id: user.id, content: text },
      ]);
      inputRef.current.value = '';
    } catch (err) {
      toast.error('Error enviando mensaje');
    } finally {
      setSending(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-screen bg-white"
    >
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <button onClick={() => router.back()} className="text-gray-600 flex items-center gap-1">
          <ChevronLeft size={18} /> Volver
        </button>
        <h1 className="font-semibold text-gray-800">Chat</h1>
        <div className="w-6" />
      </header>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
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
                <div className={`text-[10px] mt-1 opacity-70 ${mine ? 'text-white' : 'text-gray-500'}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-3 border-t border-gray-200 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          placeholder="Escribí un mensaje..."
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

