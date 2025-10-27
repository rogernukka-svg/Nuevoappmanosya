'use client';

import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';

const supabase = getSupabase();

export default function TestRealtimeMessagesAuto() {
  const [status, setStatus] = useState('🕐 Buscando chat activo...');
  const [messages, setMessages] = useState([]);
  const [chatId, setChatId] = useState('');

  useEffect(() => {
    async function init() {
      setStatus('🔍 Buscando último chat...');

      // 1️⃣ Obtener el chat más reciente
      const { data: chat, error } = await supabase
        .from('chats')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !chat) {
        console.error('❌ No se encontró ningún chat', error);
        setStatus('⚠️ No hay chats en la base todavía.');
        return;
      }

      const CHAT_ID = chat.id;
      setChatId(CHAT_ID);
      console.log('📡 Escuchando mensajes del chat:', CHAT_ID);

      // 2️⃣ Crear canal realtime
      const channel = supabase.channel(`chat-${CHAT_ID}`, {
        config: { broadcast: { self: true } },
      });

      // 3️⃣ Escuchar mensajes nuevos
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${CHAT_ID}`,
        },
        (payload) => {
          console.log('💬 Nuevo mensaje recibido:', payload.new);
          setMessages((prev) => [...prev, payload.new]);
          setStatus('🟢 Realtime activo y recibiendo mensajes');
        }
      );

      // 4️⃣ Suscribirse
      channel.subscribe((st) => {
        if (st === 'SUBSCRIBED') setStatus('✅ Conectado al chat Realtime');
      });

      // 5️⃣ Limpieza al salir
      return () => {
        supabase.removeChannel(channel);
        setStatus('❌ Desconectado');
      };
    }

    init();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-emerald-600 mb-4">
        💬 Prueba Realtime automática (tabla "messages")
      </h1>
      <p className="text-gray-700 mb-2">{status}</p>
      <p className="text-xs text-gray-400 mb-2">chat_id: {chatId}</p>

      <div className="bg-white border rounded-xl shadow-md p-4 w-full max-w-md mt-4 text-sm text-left">
        {messages.length === 0 ? (
          <p className="text-gray-400">Esperando mensajes nuevos...</p>
        ) : (
          messages.map((m, i) => (
            <div key={i} className="border-b py-2">
              <strong>{m.sender_id}</strong>: {m.content}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
