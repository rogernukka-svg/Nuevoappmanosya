'use client';

import { useEffect, useRef, useState } from 'react';
import { SendHorizontal } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';

const supabase = getSupabase();

function messageText(message) {
  return message?.text || message?.content || message?.body || message?.message || '';
}

export default function ChatBox({ chatId, user }) {
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    if (!chatId) return;

    let alive = true;

    async function loadMessages() {
      const { data, error } = await supabase
        .from('messages')
        .select('id, chat_id, sender_id, text, content, body, created_at')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error cargando mensajes:', error);
        return;
      }

      if (alive) setMessages(data || []);
    }

    loadMessages();

    return () => {
      alive = false;
    };
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`messages:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((item) => item.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(event) {
    event.preventDefault();

    const text = newMsg.trim();
    if (!text || !user?.id || !chatId) return;

    const { error } = await supabase.from('messages').insert([
      {
        chat_id: chatId,
        sender_id: user.id,
        text,
        content: text,
      },
    ]);

    if (error) {
      console.error('Error enviando mensaje:', error);
      alert('Error enviando mensaje: ' + error.message);
      return;
    }

    setNewMsg('');
  }

  return (
    <div className="flex h-[70vh] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message) => {
          const mine = message.sender_id === user?.id;

          return (
            <div
              key={message.id}
              className={`w-fit max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow ${
                mine
                  ? 'ml-auto rounded-br-none bg-emerald-500 text-white'
                  : 'rounded-bl-none bg-gray-100 text-gray-800'
              }`}
            >
              {messageText(message)}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={sendMessage}
        className="flex items-center gap-2 border-t border-gray-200 bg-gray-50 p-3"
      >
        <input
          type="text"
          placeholder="Escribi un mensaje..."
          className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          value={newMsg}
          onChange={(event) => setNewMsg(event.target.value)}
        />
        <button
          type="submit"
          className="rounded-xl bg-emerald-500 p-2 text-white transition hover:bg-emerald-600"
        >
          <SendHorizontal size={20} />
        </button>
      </form>
    </div>
  );
}
