'use client';

import { useEffect, useState, useRef } from 'react';
import { getSupabase } from '@/lib/supabase';
import { SendHorizontal } from 'lucide-react';

const supabase = getSupabase();

export default function ChatBox({ chatId, user }) {
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const endRef = useRef();

  /* ===========================
     1️⃣  Cargar mensajes iniciales
  ============================ */
  useEffect(() => {
    if (!chatId) return;

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) console.error('❌ Error cargando mensajes:', error);
      else setMessages(data || []);
    };

    loadMessages();
  }, [chatId]);

  /* ===========================
     2️⃣  Escuchar mensajes nuevos (Realtime)
  ============================ */
  useEffect(() => {
    if (!chatId) return;

    console.log('🟢 Subscrito al canal realtime:', chatId);

    const channel = supabase
      .channel(`chat_messages:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          console.log('💬 Nuevo mensaje en realtime:', payload.new);
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      console.log('🔴 Canal cerrado');
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  /* ===========================
     3️⃣  Autoscroll
  ============================ */
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ===========================
     4️⃣  Enviar mensaje
  ============================ */
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMsg.trim()) return;

    const { error } = await supabase.from('chat_messages').insert([
      {
        chat_id: chatId,
        sender_id: user.id,
        message: newMsg.trim(),
      },
    ]);

    if (error) {
      console.error('❌ Error enviando mensaje:', error);
      alert('Error enviando mensaje: ' + error.message);
    } else {
      setNewMsg('');
    }
  };

  /* ===========================
     🧱  Render
  ============================ */
  return (
    <div className="flex flex-col h-[70vh] bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden">
      {/* === Mensajes === */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`w-fit max-w-[75%] px-4 py-2 text-sm rounded-2xl shadow ${
              m.sender_id === user.id
                ? 'bg-emerald-500 text-white ml-auto rounded-br-none'
                : 'bg-gray-100 text-gray-800 rounded-bl-none'
            }`}
          >
            {m.message}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* === Input === */}
      <form
        onSubmit={sendMessage}
        className="border-t border-gray-200 p-3 flex items-center gap-2 bg-gray-50"
      >
        <input
          type="text"
          placeholder="Escribe un mensaje..."
          className="flex-1 rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800"
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
        />
        <button
          type="submit"
          className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-xl transition"
        >
          <SendHorizontal size={20} />
        </button>
      </form>
    </div>
  );
}

