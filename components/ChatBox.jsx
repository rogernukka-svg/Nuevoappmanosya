'use client';

import { useEffect, useRef, useState } from 'react';
import { SendHorizontal } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { canAttemptAction, inspectTextSafety } from '@/lib/security';

const supabase = getSupabase();

function messageText(message) {
  return message?.text || message?.content || message?.body || message?.message || '';
}

export default function ChatBox({ chatId, user }) {
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const endRef = useRef(null);
  const messagesWrapRef = useRef(null);

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
    if (typeof window === 'undefined') return;

    const syncViewport = () => {
      const visualViewport = window.visualViewport;
      const height = Math.round(visualViewport?.height || window.innerHeight);
      const offset = Math.max(
        0,
        Math.round(window.innerHeight - height - (visualViewport?.offsetTop || 0))
      );

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

  async function sendMessage(event) {
    event.preventDefault();

    const safety = inspectTextSafety(newMsg);
    if (!safety.ok || !user?.id || !chatId) {
      if (safety.error) alert(safety.error);
      return;
    }

    const attempt = canAttemptAction(`chat:${chatId}:${user.id}`, { limit: 8, windowMs: 60_000 });
    if (!attempt.allowed) {
      alert('Estás enviando muy rápido. Esperá unos segundos.');
      return;
    }

    const { error } = await supabase.from('messages').insert([
      {
        chat_id: chatId,
        sender_id: user.id,
        text: safety.text,
        content: safety.text,
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
      <div ref={messagesWrapRef} className="flex-1 space-y-3 overflow-y-auto p-4">
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
          onFocus={() => {
            setTimeout(() => {
              const wrap = messagesWrapRef.current;
              if (!wrap) return;
              wrap.scrollTo({ top: wrap.scrollHeight, behavior: 'auto' });
            }, 80);
          }}
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
