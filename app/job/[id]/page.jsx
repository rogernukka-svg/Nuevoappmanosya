'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/lib/supabase';

const STATUS_LABEL = {
  open: 'Publicado',
  taken: 'Asignado',
  started: 'En curso',
  completed: 'Completado',
  canceled: 'Cancelado',
};

// Tipos de reporte
const INCIDENT_TYPES = [
  'No se presentó',
  'Demora excesiva',
  'Mal servicio',
  'Daño material',
  'Comportamiento inapropiado',
  'Seguridad',
  'Otro',
];

// Mapa dinámico
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer    = dynamic(() => import('react-leaflet').then(m => m.TileLayer),    { ssr: false });
const Marker       = dynamic(() => import('react-leaflet').then(m => m.Marker),       { ssr: false });

export default function JobDetailPage() {
  const { id } = useParams();
  const jobId = Array.isArray(id) ? id[0] : id;

  const [user, setUser] = useState(null);
  const [job, setJob] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // Reporte
  const [showReport, setShowReport] = useState(false);
  const [reportType, setReportType] = useState(INCIDENT_TYPES[0]);
  const [reportDetails, setReportDetails] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [reportMsg, setReportMsg] = useState(null);
  const [reportErr, setReportErr] = useState(null);

  // Flags de rol
  const isParticipant = useMemo(() => {
    if (!job || !user) return false;
    return job.client_id === user.id || job.worker_id === user.id;
  }, [job, user]);

  const isClient = useMemo(() => job && user && job.client_id === user.id, [job, user]);
  const isWorker = useMemo(() => job && user && job.worker_id === user.id, [job, user]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: u } = await supabase.auth.getUser();
        setUser(u?.user ?? null);
        await fetchJob();
        await fetchPhotos();
      } catch (e) {
        setErr(String(e.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId]);

  async function fetchJob() {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        id, title, description, skill_slug, status, price_offer,
        address_text, created_at, lat, lon,
        client_id,
        worker_id,
        client:profiles!jobs_client_id_fkey(id, full_name, avatar_url, verified),
        worker:profiles!jobs_worker_id_fkey(id, full_name, avatar_url, verified)
      `)
      .eq('id', jobId)
      .maybeSingle();
    if (error) throw error;
    setJob(data);
  }

  async function fetchPhotos() {
    const { data, error } = await supabase
      .from('job_photos')
      .select('id, path, created_at, created_by')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    setPhotos(data || []);
  }

  async function runAction(rpcName) {
    try {
      const { error } = await supabase.rpc(rpcName, { job_id: jobId });
      if (error) throw error;
      await fetchJob();
    } catch (e) {
      alert(String(e.message || e));
    }
  }

  // Acciones permitidas
  const canTake = useMemo(() => job?.status === 'open' && !isClient, [job, isClient]);
  const canStart = useMemo(() => job?.status === 'taken' && isWorker, [job, isWorker]);
  const canComplete = useMemo(() => job?.status === 'started' && (isWorker || isClient), [job, isWorker, isClient]);
  const canCancel = useMemo(() => ['open', 'taken', 'started'].includes(job?.status) && (isWorker || isClient), [job, isWorker, isClient]);

  // Reportes
  function openReport() {
    setReportType(INCIDENT_TYPES[0]);
    setReportDetails('');
    setReportMsg(null);
    setReportErr(null);
    setShowReport(true);
  }
  function closeReport() {
    setShowReport(false);
  }

  async function submitReport(e) {
    e.preventDefault?.();
    setReportBusy(true);
    setReportErr(null);
    setReportMsg(null);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) throw new Error('Sesión inválida');

      const target = isClient ? job?.worker_id : job?.client_id;

      const payload = {
        job_id: jobId,
        reporter_id: uid,
        target_user_id: target || null,
        type: reportType,
        details: reportDetails?.trim() || null,
      };

      const { error } = await supabase.from('incidents').insert(payload);
      if (error) throw error;

      setReportMsg('Reporte enviado. Gracias por avisarnos.');
      setTimeout(() => setShowReport(false), 1200);
    } catch (e) {
      setReportErr(String(e.message || e));
    } finally {
      setReportBusy(false);
    }
  }

  if (loading) return <div className="container"><div className="card p-5 mt-6">Cargando…</div></div>;
  if (err) return <div className="container"><div className="card p-5 mt-6 text-red-400">{err}</div></div>;
  if (!job) return <div className="container"><div className="card p-5 mt-6">Trabajo no encontrado.</div></div>;

  const hasCoords = typeof job.lat === 'number' && typeof job.lon === 'number';

  return (
    <div className="container">
      {/* Header */}
      <section className="card p-5 mt-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-[260px]">
            <h1 className="font-heading text-2xl font-extrabold tracking-tight">{job.title || 'Trabajo'}</h1>
            <div className="text-white/70 text-sm mt-1">
              {job.skill_slug?.toUpperCase()} · {STATUS_LABEL[job.status] || job.status}
            </div>
            {job.address_text && (
              <div className="text-white/60 text-sm mt-1">{job.address_text}</div>
            )}
            {job.price_offer != null && (
              <div className="font-heading font-extrabold text-xl mt-2">
                Gs. {Number(job.price_offer).toLocaleString()}
              </div>
            )}
          </div>

          {/* Participantes */}
          <div className="flex items-center gap-4">
            <PersonCard title="Cliente" p={job.client} />
            <PersonCard title="Profesional" p={job.worker} emptyText="Aún sin asignar" />
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap gap-3 mt-4">
          {canTake && <button onClick={() => runAction('take_job')} className="btn btn-primary">Tomar trabajo</button>}
          {canStart && <button onClick={() => runAction('start_job')} className="btn btn-primary">Iniciar</button>}
          {canComplete && <button onClick={() => runAction('complete_job')} className="btn btn-primary">Marcar como completado</button>}
          {canCancel && <button onClick={() => runAction('cancel_job')} className="btn btn-ghost">Cancelar</button>}
          <Link href="/worker/nearby" className="btn btn-ghost">Volver</Link>
          <Link href={`/chat/${job.id}`} className="btn btn-ghost">Abrir chat</Link>
          {isParticipant && <button className="btn btn-ghost" onClick={openReport}>Reportar problema</button>}
        </div>

        {job.description && <div className="text-white/80 text-sm mt-4 whitespace-pre-line">{job.description}</div>}
      </section>

      {/* Mapa */}
      {hasCoords && (
        <section className="card p-4 mt-4">
          <h3 className="font-heading font-extrabold text-lg mb-3">Ubicación aproximada</h3>
          <div className="w-full overflow-hidden rounded-2xl" style={{ height: 320 }}>
            <MapContainer center={[job.lat, job.lon]} zoom={14} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
              <Marker position={[job.lat, job.lon]} />
            </MapContainer>
          </div>
          <div className="text-xs text-white/60 mt-2">{job.lat.toFixed(4)}, {job.lon.toFixed(4)}</div>
        </section>
      )}

      {/* Fotos + Chat */}
      <section className="grid lg:grid-cols-2 gap-6 mt-6">
        <Gallery jobId={jobId} canUpload={isParticipant} photos={photos} refresh={fetchPhotos} />
        <ChatBox jobId={jobId} canChat={isParticipant} />
      </section>

      {/* Modal reporte */}
      {showReport && (
        <ReportModal
          onClose={closeReport}
          type={reportType}
          setType={setReportType}
          details={reportDetails}
          setDetails={setReportDetails}
          onSubmit={submitReport}
          busy={reportBusy}
          msg={reportMsg}
          error={reportErr}
          otherSideName={isClient ? (job.worker?.full_name || 'el profesional') : (job.client?.full_name || 'el cliente')}
        />
      )}
    </div>
  );
}

/** Componente tarjeta persona */
function PersonCard({ title, p, emptyText }) {
  return (
    <div className="card p-3 w-[240px]">
      <div className="text-white/60 text-xs">{title}</div>
      {p ? (
        <div className="flex items-center gap-3 mt-2">
          <img
            src={p.avatar_url || '/avatar-fallback.png'}
            alt=""
            style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)' }}
          />
          <div>
            <div className="font-heading font-extrabold">{p.full_name || 'Usuario'}</div>
            <div className="text-white/60 text-xs">{p.verified ? 'Verificado ✓' : 'No verificado'}</div>
          </div>
        </div>
      ) : (
        <div className="text-white/60 text-sm mt-2">{emptyText || '—'}</div>
      )}
    </div>
  );
}

/** Galería de fotos */
function Gallery({ jobId, canUpload, photos, refresh }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function onFiles(e) {
    const files = Array.from(e.target.files || []).slice(0, 3);
    if (!files.length) return;
    setBusy(true); setErr(null);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      for (const f of files) {
        const ext = f.name.split('.').pop();
        const path = `${jobId}/${crypto.randomUUID()}.${ext}`;
        const { error: e1 } = await supabase.storage.from('job-photos').upload(path, f, { upsert: false });
        if (e1) throw e1;
        await supabase.from('job_photos').insert({ job_id: jobId, path, created_by: uid });
      }
      await refresh();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-extrabold text-lg">Fotos</h3>
        {canUpload && (
          <label className="btn btn-ghost">
            {busy ? 'Subiendo…' : 'Subir'}
            <input type="file" accept="image/*" multiple onChange={onFiles} hidden />
          </label>
        )}
      </div>
      {err && <div className="text-red-400 text-sm mt-2">{err}</div>}

      {photos?.length ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
          {photos.map(ph => {
            const { data } = supabase.storage.from('job-photos').getPublicUrl(ph.path);
            const url = data.publicUrl;
            return (
              <a key={ph.id} href={url} target="_blank" rel="noreferrer" className="block">
                <img src={url} alt="" className="w-full h-36 object-cover rounded-2xl" />
              </a>
            );
          })}
        </div>
      ) : (
        <div className="text-white/50 text-sm mt-2">Aún no hay fotos.</div>
      )}
    </div>
  );
}

/** Chat resumido */
function ChatBox({ jobId, canChat }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [err, setErr] = useState(null);
  const boxRef = useRef(null);
  const [me, setMe] = useState(null);

  useEffect(() => {
    (async () => {
      setErr(null);
      const { data: u } = await supabase.auth.getUser();
      setMe(u?.user ?? null);

      try {
        const { data, error } = await supabase
          .from('messages')
          .select('id, job_id, sender_id, body, created_at, sender:profiles!messages_sender_id_fkey(full_name, avatar_url)')
          .eq('job_id', jobId)
          .order('created_at', { ascending: true });
        if (error) throw error;
        setMessages(data || []);
      } catch (e) {
        setErr(String(e.message || e));
      }
    })();

    const channel = supabase
      .channel(`msgs:${jobId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `job_id=eq.${jobId}` },
        payload => {
          setMessages(prev => [...prev, payload.new]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  function scrollToBottom() {
    const el = boxRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }

  async function sendMsg(e) {
    e.preventDefault();
    setErr(null);
    const body = draft.trim();
    if (!body) return;
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      const { error } = await supabase.from('messages').insert({
        job_id: jobId,
        sender_id: uid,
        body
      });
      if (error) throw error;
      setDraft('');
    } catch (e) {
      setErr(String(e.message || e));
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-extrabold text-lg">Chat</h3>
        <Link href={`/chat/${jobId}`} className="btn btn-ghost">Abrir chat completo</Link>
      </div>
      {err && <div className="text-red-400 text-sm mb-2">{err}</div>}

      <div ref={boxRef} className="h-[320px] overflow-y-auto rounded-2xl p-3" style={{ background: 'rgba(255,255,255,.03)' }}>
        {messages.length === 0 && (
          <div className="text-white/50 text-sm">Aún no hay mensajes.</div>
        )}
        {messages.map(m => (
          <Msg key={m.id} m={m} meId={me?.id} />
        ))}
      </div>

      <form onSubmit={sendMsg} className="mt-3 flex gap-2">
        <input
          className="input"
          placeholder={canChat ? 'Escribí un mensaje…' : 'Solo participantes pueden chatear'}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          disabled={!canChat}
        />
        <button className="btn btn-primary" disabled={!canChat || !draft.trim()}>Enviar</button>
      </form>
    </div>
  );
}

function Msg({ m, meId }) {
  const when = m.created_at ? new Date(m.created_at).toLocaleString() : '';
  const name = m.sender?.full_name || 'Usuario';
  const avatar = m.sender?.avatar_url || '/avatar-fallback.png';
  const mine = meId && m.sender_id === meId;

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'} py-1`}>
      <div
        className="px-3 py-2 rounded-2xl text-sm max-w-[78%] flex gap-2 items-start"
        style={{
          background: mine ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
          color: mine ? '#0B0D0F' : '#fff'
        }}
        title={when}
      >
        {!mine && (
          <img src={avatar} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
        )}
        <div>
          {!mine && <div className="text-white/70 text-[11px] leading-none mb-1">{name}</div>}
          <div className="whitespace-pre-line">{m.body}</div>
        </div>
      </div>
    </div>
  );
}

/** Modal Reporte */
function ReportModal({ onClose, type, setType, details, setDetails, onSubmit, busy, msg, error, otherSideName }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,.6)' }}
      role="dialog"
      aria-modal="true"
    >
      <div className="card p-5 w-[92vw] max-w-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-xl font-extrabold">Reportar problema</h3>
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
        </div>

        <div className="text-white/70 text-sm mt-2">
          Este reporte se enviará a soporte. Estás reportando a <b>{otherSideName}</b>.
        </div>

        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <div>
            <label className="label">Tipo</label>
            <select className="select" value={type} onChange={e=>setType(e.target.value)}>
              {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Detalles</label>
            <textarea
              className="input"
              rows={5}
              placeholder="Contanos qué pasó…"
              value={details}
              onChange={e=>setDetails(e.target.value)}
            />
          </div>

          {error && <div className="text-red-400 text-sm">{error}</div>}
          {msg && <div className="text-green-400 text-sm">{msg}</div>}

          <div className="flex gap-3">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Enviando…' : 'Enviar reporte'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}