'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { CheckCircle, MapPin } from 'lucide-react';
import { canAttemptAction, inspectTextSafety } from '@/lib/security';

export default function DMPage() {
  const { id: otherId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [user, setUser] = useState(null);
  const [err, setErr] = useState(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [viewportHeight, setViewportHeight] = useState('100dvh');
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const messagesWrapRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user ?? null);
      if (data?.user) loadCompletedJobs(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const updateViewport = () => {
      const viewport = window.visualViewport;
      setViewportHeight(`${viewport.height}px`);
      setKeyboardOffset(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
    };

    updateViewport();
    window.visualViewport.addEventListener('resize', updateViewport);
    window.visualViewport.addEventListener('scroll', updateViewport);

    return () => {
      window.visualViewport.removeEventListener('resize', updateViewport);
      window.visualViewport.removeEventListener('scroll', updateViewport);
    };
  }, []);

  useEffect(() => {
    const wrap = messagesWrapRef.current;
    if (!wrap) return;

    wrap.scrollTo({
      top: wrap.scrollHeight,
      behavior: keyboardOffset > 40 ? 'auto' : 'smooth',
    });
  }, [messages.length, keyboardOffset]);

  async function loadMessages() {
    if (!user || !otherId) return;

    const { data, error } = await supabase
      .from('dm_messages')
      .select('*')
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true });

    if (error) {
      setErr(error.message);
      return;
    }

    setMessages(data || []);
  }

  async function loadCompletedJobs(workerId) {
    const { count } = await supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('worker_id', workerId)
      .eq('status', 'completed');

    setCompletedCount(count || 0);
  }

  useEffect(() => {
    if (!user || !otherId) return;
    loadMessages();

    const channel = supabase
      .channel(`dm_messages_${user.id}_${otherId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages' }, (payload) => {
        const msg = payload.new;
        if (
          (msg.sender_id === user.id && msg.receiver_id === otherId) ||
          (msg.sender_id === otherId && msg.receiver_id === user.id)
        ) {
          setMessages((prev) => {
            if (prev.some((item) => item.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, otherId]);

  async function sendMessage(content) {
    const safety = inspectTextSafety(content);
    if (!safety.ok || !user || !otherId) {
      if (safety.error) setErr(safety.error);
      return;
    }

    const attempt = canAttemptAction(`dm:${otherId}:${user.id}`, { limit: 8, windowMs: 60_000 });
    if (!attempt.allowed) {
      setErr('Estás enviando muy rápido. Esperá unos segundos.');
      return;
    }

    const { error } = await supabase.from('dm_messages').insert({
      sender_id: user.id,
      receiver_id: otherId,
      content: safety.text,
    });

    if (error) {
      setErr(error.message);
      return;
    }

    setNewMsg('');
  }

  async function sendLocation() {
    if (!navigator.geolocation) {
      alert('Tu dispositivo no soporta geolocalizacion');
      return;
    }

    if (!user || !otherId) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const { error } = await supabase.from('dm_messages').insert({
          sender_id: user.id,
          receiver_id: otherId,
          content: 'Ubicacion compartida',
          lat: latitude,
          lng: longitude,
        });

        if (error) setErr(error.message);
      },
      () => alert('No pudimos obtener tu ubicacion. Revisa permisos o GPS.'),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 30000 }
    );
  }

  async function sendArrived() {
    await sendMessage('El trabajador ha llegado al destino');
  }

  async function sendCompleted() {
    await sendMessage('Trabajo finalizado');
    if (user) loadCompletedJobs(user.id);
  }

  return (
    <div
      className="mx-auto flex max-w-lg flex-col overflow-hidden p-4"
      style={{ height: viewportHeight }}
    >
      <h1 className="mb-4 text-xl font-bold">Chat</h1>

      {err ? (
        <div className="mb-3 rounded-lg border border-red-300 bg-red-50 p-2 text-sm font-semibold text-red-700">
          {err}
        </div>
      ) : null}

      <div className="mb-3 rounded-lg border border-emerald-400/40 bg-emerald-600/20 p-2 text-center text-sm text-emerald-300">
        Trabajos completados: {completedCount}
      </div>

      <div
        ref={messagesWrapRef}
        className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-white/10 bg-black/40 p-3"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`my-2 w-fit max-w-[78%] rounded-lg p-2 ${
              message.sender_id === user?.id ? 'ml-auto bg-emerald-600' : 'mr-auto bg-zinc-700'
            }`}
          >
            {message.lat && message.lng ? (
              <a
                href={`https://www.google.com/maps?q=${message.lat},${message.lng}`}
                target="_blank"
                rel="noreferrer"
                className="underline text-blue-200"
              >
                Ver ubicacion en Google Maps
              </a>
            ) : (
              message.content
            )}
          </div>
        ))}
      </div>

      <form
        className="mt-3 flex items-center gap-2 pb-[env(safe-area-inset-bottom)]"
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage(newMsg);
        }}
      >
        <input
          type="text"
          value={newMsg}
          onChange={(event) => setNewMsg(event.target.value)}
          onFocus={() => {
            setTimeout(() => {
              const wrap = messagesWrapRef.current;
              wrap?.scrollTo({ top: wrap.scrollHeight, behavior: 'auto' });
            }, 120);
          }}
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-zinc-800 px-3 py-2"
          placeholder="Escribi un mensaje..."
        />

        <button type="submit" className="btn btn-primary">
          Enviar
        </button>

        <motion.button whileTap={{ scale: 0.85 }} type="button" onClick={sendLocation} className="rounded-full bg-pink-600 p-2 text-white">
          <MapPin size={20} />
        </motion.button>
        <motion.button whileTap={{ scale: 0.85 }} type="button" onClick={sendArrived} className="rounded-full bg-green-600 p-2 text-white">
          OK
        </motion.button>
        <motion.button whileTap={{ scale: 0.85 }} type="button" onClick={sendCompleted} className="rounded-full bg-blue-600 p-2 text-white">
          <CheckCircle size={20} />
        </motion.button>
      </form>
    </div>
  );
}
