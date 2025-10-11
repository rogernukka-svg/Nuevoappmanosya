'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { getSupabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Rocket } from 'lucide-react';

const supabase = getSupabase();

// === 🔹 Carga dinámica de componentes de mapa ===
const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then((m) => m.Tooltip), { ssr: false });

/* === 🧩 Mini ChatBox embebido === */
function ChatBox({ chatId, userId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!chatId) return;

    supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages(data || []));

    const channel = supabase
      .channel(`chat-${chatId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `chat_id=eq.${chatId}` }, (payload) =>
        setMessages((prev) => [...prev, payload.new])
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [chatId]);

  async function sendMessage(e) {
    e.preventDefault();
    if (!text.trim()) return;
    await supabase.from('chat_messages').insert([{ chat_id: chatId, sender_id: userId, message: text.trim() }]);
    setText('');
  }

  return (
    <div className="flex flex-col h-72 bg-zinc-900 rounded-xl border border-white/10">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender_id === userId ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`px-3 py-2 rounded-2xl max-w-[75%] ${
                m.sender_id === userId ? 'bg-emerald-500 text-black rounded-br-none' : 'bg-zinc-800 text-white rounded-bl-none'
              }`}
            >
              {m.message}
              <div className="text-[10px] text-white/60 mt-1 text-right">
                {new Date(m.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} className="p-2 border-t border-white/10 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribir mensaje..."
          className="flex-1 bg-zinc-800 text-white rounded-full px-3 py-2 text-sm focus:outline-none"
        />
        <button className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold rounded-full px-4 transition-all active:scale-95">
          📨
        </button>
      </form>
    </div>
  );
}

/* === 🔹 Mapa Cliente / Trabajador === */
function JobMap({ clientLat, clientLng }) {
  const [position, setPosition] = useState(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((p) => {
        setPosition([p.coords.latitude, p.coords.longitude]);
      });
    }
  }, []);

  if (!position) return <div className="text-white/70 text-center py-5">📡 Obteniendo ubicación…</div>;

  return (
    <div className="h-72 w-full rounded-xl overflow-hidden border border-white/10">
      <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        <Marker position={position}>
          <Tooltip direction="top" offset={[0, -10]} opacity={1}>
            <span>Vos</span>
          </Tooltip>
        </Marker>
        {clientLat && clientLng && (
          <Marker position={[clientLat, clientLng]}>
            <Tooltip direction="top" offset={[0, -10]} opacity={1}>
              <span>Cliente</span>
            </Tooltip>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

/* === 📋 Página principal === */
export default function WorkerJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [activeJob, setActiveJob] = useState(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data?.user?.id;
      if (uid) setUserId(uid);
    });
  }, []);

  function playAlert(soundFile) {
    try {
      new Audio(soundFile).play().catch(() => {});
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    } catch {}
  }

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('fn_my_jobs');
        if (error) throw error;
        setJobs(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('jobs-worker-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'jobs' }, (payload) => {
        const job = payload.new;
        if (job.worker_id === userId) {
          setJobs((prev) => [job, ...prev]);
          playAlert('/notify.mp3');
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'jobs' }, (payload) => {
        const updated = payload.new;
        if (updated.worker_id === userId) {
          setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
          if (updated.status === 'assigned') {
            playAlert('/accepted.mp3');
            setActiveJob(updated);
          }
          if (updated.status === 'completed') playAlert('/completed.mp3');
          if (updated.status === 'cancelled') playAlert('/cancelled.mp3');
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);

  async function handleAccept(jobId) {
    try {
      const { error } = await supabase.rpc('accept_job', { p_job_id: jobId });
      if (error) throw error;
      playAlert('/accepted.mp3');
      setActiveJob(jobs.find((j) => j.id === jobId));
    } catch (err) {
      alert('Error al aceptar: ' + err.message);
    }
  }

  async function handleReject(jobId) {
    try {
      const { error } = await supabase.from('jobs').update({ status: 'cancelled' }).eq('id', jobId);
      if (error) throw error;
      playAlert('/cancelled.mp3');
    } catch (err) {
      alert('Error al rechazar: ' + err.message);
    }
  }

  function JobAcceptedModal({ job, onClose }) {
    const [tab, setTab] = useState('info');
    if (!job) return null;

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end justify-center z-50">
        <div className="bg-zinc-900 rounded-t-2xl w-full max-w-md p-6 border-t border-white/10">
          <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-bold mb-2 text-center">🚗 Trabajo asignado</h2>
          <p className="text-sm text-white/70 text-center mb-4">{job.title}</p>

          <div className="flex justify-around mb-4">
            {['info', 'chat', 'map'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1 rounded-full text-sm ${
                  tab === t ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-white/70'
                }`}
              >
                {t === 'info' ? '📋 Info' : t === 'chat' ? '💬 Chat' : '📍 Mapa'}
              </button>
            ))}
          </div>

          {tab === 'info' && (
            <div className="grid grid-cols-3 gap-3">
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (job.client_lat && job.client_lng)
                    window.open(
                      `https://www.google.com/maps/dir/?api=1&destination=${job.client_lat},${job.client_lng}`,
                      '_blank'
                    );
                  else alert('📍 No hay coordenadas del cliente');
                }}
              >
                Ver ruta
              </button>
              <button
                className="btn btn-secondary"
                onClick={() =>
                  job.client_phone ? window.open(`tel:${job.client_phone}`) : alert('📞 Sin teléfono')
                }
              >
                Llamar
              </button>
              <button className="btn btn-accent" onClick={() => setTab('chat')}>
                Chat
              </button>
            </div>
          )}

          {tab === 'chat' && <ChatBox chatId={job.chat_room_id} userId={userId} />}
          {tab === 'map' && <JobMap clientLat={job.client_lat} clientLng={job.client_lng} />}

          <button className="btn btn-ghost mt-4 w-full" onClick={() => onClose()}>
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="p-5 text-center text-white/70">Cargando trabajos…</div>;

  return (
    <div className="container">
      <header className="mt-6 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">📋 Mis trabajos activos</h1>

        {/* 🚀 Botón Activar Perfil */}
        <button
          onClick={() => router.push('/worker/onboard')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-semibold hover:from-emerald-600 hover:to-cyan-600 transition-all active:scale-95 shadow-md"
        >
          <Rocket className="w-4 h-4" />
          Activar perfil
        </button>
      </header>

      {error && <div className="text-red-400 mb-3">{error}</div>}

      {jobs.length === 0 ? (
        <p className="text-sm opacity-70">No tenés trabajos activos.</p>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <article
              key={job.id}
              className="card p-4 flex justify-between items-center border border-white/10 rounded-lg"
            >
              <div>
                <h3 className="font-bold">{job.title}</h3>
                <p className="text-sm opacity-70">
                  Estado: <b>{job.status}</b>
                </p>
              </div>

              {job.status === 'open' ? (
                <div className="flex gap-2">
                  <button className="btn btn-primary" onClick={() => handleAccept(job.id)}>
                    ✅ Aceptar
                  </button>
                  <button className="btn btn-ghost" onClick={() => handleReject(job.id)}>
                    ❌ Rechazar
                  </button>
                </div>
              ) : (
                <a href={`/worker/job/${job.id}`} className="btn btn-primary">
                  Abrir
                </a>
              )}
            </article>
          ))}
        </div>
      )}

      {activeJob && <JobAcceptedModal job={activeJob} onClose={() => setActiveJob(null)} />}
    </div>
  );
}
