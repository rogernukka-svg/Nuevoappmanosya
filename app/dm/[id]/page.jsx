'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { MapPin, CheckCircle } from 'lucide-react';

export default function DMPage() {
  const { id: otherId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [user, setUser] = useState(null);
  const [err, setErr] = useState(null);

  // Estado trabajos completados
  const [completedCount, setCompletedCount] = useState(0);

  // Sesión
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user ?? null);
      if (data?.user) loadCompletedJobs(data.user.id);
    });
  }, []);

  // Cargar historial
  async function loadMessages() {
    if (!user || !otherId) return;
    const { data, error } = await supabase
      .from('dm_messages')
      .select('*')
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true });

    if (!error) setMessages(data || []);
  }

  // Cargar trabajos completados
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
      .channel('dm-messages-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages' }, (payload) => {
        const m = payload.new;
        if (
          (m.sender_id === user.id && m.receiver_id === otherId) ||
          (m.sender_id === otherId && m.receiver_id === user.id)
        ) {
          setMessages((prev) => [...prev, m]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, otherId]);

  // Enviar mensaje
  async function sendMessage(content) {
    if (!content.trim() || !user || !otherId) return;
    await supabase.from('dm_messages').insert({
      sender_id: user.id,
      receiver_id: otherId,
      content
    });
  }

  // 📍 Enviar ubicación
  async function sendLocation() {
    if (!navigator.geolocation) return alert('Tu dispositivo no soporta geolocalización');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      await supabase.from('dm_messages').insert({
        sender_id: user.id,
        receiver_id: otherId,
        content: '📍 Ubicación compartida',
        lat: latitude,
        lng: longitude
      });
    });
  }

  // 🚖 Llegué
  async function sendArrived() {
    await sendMessage('🚖 El trabajador ha llegado al destino');
  }

  // ✅ Trabajo terminado
  async function sendCompleted() {
    await sendMessage('✅ Trabajo finalizado');
    if (user) loadCompletedJobs(user.id);
  }

  return (
    <div className="container max-w-lg mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Chat</h1>

      {/* Badge futurista de trabajos */}
      <div className="mb-3 bg-emerald-600/20 border border-emerald-400/40 rounded-lg p-2 text-emerald-300 text-sm text-center">
        ✅ Trabajos completados: {completedCount}
      </div>

      <div className="border border-white/10 rounded-lg p-3 h-[60vh] overflow-y-auto bg-black/40">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`my-2 p-2 rounded-lg w-fit max-w-[70%] ${
              m.sender_id === user?.id ? 'bg-emerald-600 ml-auto' : 'bg-zinc-700 mr-auto'
            }`}
          >
            {m.lat && m.lng ? (
              <a
                href={`https://www.google.com/maps?q=${m.lat},${m.lng}`}
                target="_blank"
                rel="noreferrer"
                className="underline text-blue-200"
              >
                📍 Ver ubicación en Google Maps
              </a>
            ) : (
              m.content
            )}
          </div>
        ))}
      </div>

      {/* Composer + botones modernos */}
      <div className="flex items-center gap-2 mt-3">
        <input
          type="text"
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          className="flex-1 rounded-lg px-3 py-2 bg-zinc-800 border border-white/10"
          placeholder="Escribí un mensaje..."
        />
        <button onClick={() => sendMessage(newMsg)} className="btn btn-primary">
          Enviar
        </button>

        {/* Botones redondos */}
        <motion.button whileTap={{ scale: 0.85 }} onClick={sendLocation} className="p-2 rounded-full bg-pink-600 text-white">
          <MapPin size={20} />
        </motion.button>
        <motion.button whileTap={{ scale: 0.85 }} onClick={sendArrived} className="p-2 rounded-full bg-green-600 text-white">
          🚖
        </motion.button>
        <motion.button whileTap={{ scale: 0.85 }} onClick={sendCompleted} className="p-2 rounded-full bg-blue-600 text-white">
          <CheckCircle size={20} />
        </motion.button>
      </div>
    </div>
  );
}
