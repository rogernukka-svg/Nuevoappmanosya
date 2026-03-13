'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Star,
  CheckCircle2,
  RefreshCw,
  CalendarClock,
  Building2,
  Clock3,
  MapPin,
  User2,
  Briefcase,
  Sparkles,
  ArrowLeft,
  BadgeCheck,
  CircleDollarSign,
  MessageCircleMore,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const supabase = getSupabase();

function statusMeta(status) {
  const s = String(status || '').toLowerCase();

  if (s === 'completed') {
    return {
      label: 'Finalizado',
      pill: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      dot: 'bg-emerald-500',
      cardGlow: 'shadow-[0_16px_36px_rgba(16,185,129,0.12)]',
    };
  }

  if (s === 'cancelled') {
    return {
      label: 'Cancelado',
      pill: 'bg-red-50 text-red-600 border border-red-200',
      dot: 'bg-red-500',
      cardGlow: 'shadow-[0_16px_36px_rgba(239,68,68,0.10)]',
    };
  }

  if (s === 'assigned') {
    return {
      label: 'Asignado',
      pill: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
      dot: 'bg-cyan-500',
      cardGlow: 'shadow-[0_16px_36px_rgba(34,211,238,0.12)]',
    };
  }

  if (s === 'accepted') {
    return {
      label: 'En camino',
      pill: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      dot: 'bg-emerald-500',
      cardGlow: 'shadow-[0_16px_36px_rgba(16,185,129,0.12)]',
    };
  }

  return {
    label: s || 'Abierto',
    pill: 'bg-slate-50 text-slate-700 border border-slate-200',
    dot: 'bg-slate-400',
    cardGlow: 'shadow-[0_16px_36px_rgba(15,23,42,0.06)]',
  };
}

function formatDate(date) {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleDateString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function formatDateTime(date) {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function prettyStatusText(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'open') return 'Esperando confirmación';
  if (s === 'assigned') return 'Profesional asignado';
  if (s === 'accepted') return 'Profesional en camino';
  if (s === 'completed') return 'Servicio completado';
  if (s === 'cancelled') return 'Servicio cancelado';
  return status || 'Sin estado';
}

export default function ClientJobsPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user);
    });
  }, []);

  async function loadJobs() {
    if (!user?.id) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        worker:profiles!worker_id(full_name, avatar_url),
        review:reviews!job_id(rating, comment, created_at)
      `)
      .eq('client_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error cargando pedidos:', error);
      toast.error('Error al cargar pedidos');
    } else {
      setJobs(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (user?.id) loadJobs();
  }, [user]);

  async function submitReview(jobId, workerId) {
    if (!rating) return toast('Seleccioná una calificación');

    try {
      const { error } = await supabase.rpc('add_review_if_valid', {
        p_job_id: jobId,
        p_worker_id: workerId,
        p_client_id: user.id,
        p_rating: rating,
        p_comment: comment,
      });

      if (error) throw error;

      toast.success('✅ Calificación enviada');
      setShowReview(false);
      setRating(0);
      setComment('');
      setSelectedJob(null);
      await loadJobs();
    } catch (err) {
      console.error('❌ Error RPC:', err);
      toast.error('Error enviando review');
    }
  }

  async function reassignWorker(jobId) {
    try {
      const { error } = await supabase.rpc('reassign_worker_if_needed', {
        p_job_id: jobId,
      });

      if (error) throw error;

      toast.success('🔄 Trabajador reasignado correctamente');
      await loadJobs();
    } catch (err) {
      console.error(err);
      toast.error('No se pudo reasignar automáticamente');
    }
  }

  const stats = useMemo(() => {
    const total = jobs.length;
    const active = jobs.filter((j) =>
      ['open', 'assigned', 'accepted'].includes(String(j.status || '').toLowerCase())
    ).length;
    const completed = jobs.filter((j) => String(j.status || '').toLowerCase() === 'completed').length;
    const cancelled = jobs.filter((j) => String(j.status || '').toLowerCase() === 'cancelled').length;

    return { total, active, completed, cancelled };
  }, [jobs]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[linear-gradient(180deg,#f8fffd_0%,#ffffff_30%,#f8fafc_100%)] text-gray-900"
    >
      <div className="max-w-screen-md mx-auto px-4 pb-32 pt-5">
        {/* HEADER */}
        <div className="relative overflow-hidden rounded-[30px] border border-emerald-100 bg-white shadow-[0_20px_60px_rgba(16,185,129,0.08)]">
          <div className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-emerald-300/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-cyan-300/20 blur-3xl" />

          <div className="relative z-10 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-emerald-200 hover:text-emerald-700"
              >
                <ArrowLeft size={16} />
                Volver
              </button>

              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-bold text-emerald-700">
                <Sparkles size={14} />
                Panel inteligente
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-400 text-white shadow-[0_14px_34px_rgba(16,185,129,0.25)]">
                  <Building2 size={28} />
                </div>

                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
                    Panel de Pedidos
                  </h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Visualizá tus servicios, seguí estados y calificá experiencias en un solo lugar.
                  </p>
                </div>
              </div>
            </div>

            {/* STATS */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-emerald-100 bg-white/90 p-4 shadow-sm">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Total
                </div>
                <div className="mt-1 text-2xl font-extrabold text-gray-900">{stats.total}</div>
              </div>

              <div className="rounded-2xl border border-cyan-100 bg-white/90 p-4 shadow-sm">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Activos
                </div>
                <div className="mt-1 text-2xl font-extrabold text-cyan-700">{stats.active}</div>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-white/90 p-4 shadow-sm">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Finalizados
                </div>
                <div className="mt-1 text-2xl font-extrabold text-emerald-700">{stats.completed}</div>
              </div>

              <div className="rounded-2xl border border-red-100 bg-white/90 p-4 shadow-sm">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Cancelados
                </div>
                <div className="mt-1 text-2xl font-extrabold text-red-600">{stats.cancelled}</div>
              </div>
            </div>
          </div>
        </div>

        {/* SUBINFO */}
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-emerald-700">ManosYA</span> está evolucionando para darte
            una experiencia más clara, rápida y profesional. Desde acá vas a poder controlar tus pedidos,
            ver quién te atendió y dejar valoraciones que ayuden a mejorar la plataforma.
          </p>
        </div>

        {/* LOADING / EMPTY / LIST */}
        {loading ? (
          <div className="flex justify-center mt-12">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white px-5 py-4 text-gray-500 shadow-sm">
              <Loader2 className="animate-spin text-emerald-500" size={18} />
              Cargando tus pedidos...
            </div>
          </div>
        ) : jobs.length === 0 ? (
          <div className="mt-10 rounded-[28px] border border-dashed border-emerald-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Briefcase size={28} />
            </div>

            <h3 className="mt-4 text-xl font-bold text-gray-800">Todavía no tenés pedidos</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
              Cuando solicites tu primer servicio, acá vas a poder ver el historial, el estado actual y las
              valoraciones de cada experiencia.
            </p>

            <button
              onClick={() => router.push('/client/map')}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(16,185,129,0.20)] transition hover:bg-emerald-600"
            >
              <Sparkles size={16} />
              Solicitar mi primer servicio
            </button>
          </div>
        ) : (
          <section className="grid gap-5 mt-6">
            {jobs.map((job, index) => {
              const review = job.review?.[0];
              const meta = statusMeta(job.status);

              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  whileHover={{ y: -2 }}
                  className={`relative overflow-hidden rounded-[28px] border border-gray-200 bg-white p-5 ${meta.cardGlow} transition`}
                >
                  <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-emerald-300/10 blur-3xl" />

                  <div className="relative z-10">
                    {/* TOP */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                          <span className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide">
                            {prettyStatusText(job.status)}
                          </span>
                        </div>

                        <h3 className="text-lg font-extrabold text-gray-800 leading-tight">
                          {job.title || 'Servicio solicitado'}
                        </h3>

                        <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                          {job.description || 'Sin descripción'}
                        </p>
                      </div>

                      <span className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold ${meta.pill}`}>
                        {meta.label}
                      </span>
                    </div>

                    {/* INFO GRID */}
                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-3">
                        <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-gray-400">
                          <CalendarClock size={14} />
                          Fecha
                        </div>
                        <div className="mt-1 text-sm font-semibold text-gray-700">
                          {formatDateTime(job.created_at)}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-3">
                        <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-gray-400">
                          <User2 size={14} />
                          Profesional
                        </div>
                        <div className="mt-1 text-sm font-semibold text-gray-700">
                          {job.worker?.full_name || 'Asignación pendiente'}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-3">
                        <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-gray-400">
                          <Briefcase size={14} />
                          Tipo de servicio
                        </div>
                        <div className="mt-1 text-sm font-semibold text-gray-700">
                          {job.service_type || 'Servicio general'}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-3">
                        <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-gray-400">
                          <CircleDollarSign size={14} />
                          Tarifas
                        </div>
                        <div className="mt-1 text-sm font-semibold text-gray-700">
                          En definición
                        </div>
                        <div className="text-[11px] text-gray-400 mt-1">
                          Próximamente verás precios claros antes de confirmar.
                        </div>
                      </div>
                    </div>

                    {/* WORKER MINI CARD */}
                    {job.worker && (
                      <div className="mt-4 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-cyan-50/50 p-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={job.worker.avatar_url || '/avatar-fallback.png'}
                            alt={job.worker.full_name || 'Profesional'}
                            onError={(e) => {
                              e.currentTarget.src = '/avatar-fallback.png';
                            }}
                            className="h-12 w-12 rounded-full border-2 border-emerald-400 object-cover"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-bold text-gray-800">
                                {job.worker.full_name || 'Profesional'}
                              </span>
                              <BadgeCheck size={16} className="text-emerald-500 shrink-0" />
                            </div>

                            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                              <MessageCircleMore size={14} />
                              Seguimiento del servicio y valoración desde esta pantalla
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ACTIONS */}
                    {job.status === 'assigned' && (
                      <button
                        onClick={() => reassignWorker(job.id)}
                        className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-sm font-bold text-cyan-700 transition hover:bg-cyan-100"
                      >
                        <RefreshCw size={15} />
                        Reasignar trabajador automáticamente
                      </button>
                    )}

                    {/* REVIEW */}
                    {review ? (
                      <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-emerald-700">Tu valoración</span>

                          <div className="flex items-center gap-1">
                            {[...Array(review.rating || 0)].map((_, i) => (
                              <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>

                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </div>

                        <p className="mt-2 text-sm italic text-gray-600">
                          “{review.comment || 'Sin comentario'}”
                        </p>

                        <p className="mt-2 text-[11px] text-gray-400">
                          Calificado el {formatDate(review.created_at)}
                        </p>
                      </div>
                    ) : (
                      String(job.status || '').toLowerCase() === 'completed' && (
                        <button
                          onClick={() => {
                            setSelectedJob(job);
                            setShowReview(true);
                          }}
                          className="mt-4 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-400 py-3 text-sm font-extrabold text-white shadow-[0_16px_34px_rgba(16,185,129,0.20)] transition hover:from-emerald-600 hover:to-cyan-500"
                        >
                          🌟 Calificar servicio
                        </button>
                      )
                    )}
                  </div>
                </motion.div>
              );
            })}
          </section>
        )}

              {/* MODAL REVIEW */}
        <AnimatePresence>
          {showReview && selectedJob && (
            <motion.div
              className="fixed inset-0 z-[99999] bg-black/65 backdrop-blur-sm flex justify-center items-center px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="relative w-full max-w-md overflow-hidden rounded-[30px] border border-emerald-100 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.35)]"
                initial={{ scale: 0.92, y: 22, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.92, y: 24, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 160, damping: 18 }}
              >
                <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-emerald-300/20 blur-3xl" />
                <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl" />

                <div className="relative z-10 p-6 text-center">
                  <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-[12px] font-bold text-emerald-700">
                    <Sparkles size={14} />
                    Experiencia ManosYA
                  </div>

                  {/* FOTO DEL PROFESIONAL */}
                  <div className="mb-4 flex justify-center">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-emerald-400/25 blur-xl scale-110" />
                      <img
                        src={selectedJob.worker?.avatar_url || '/avatar-fallback.png'}
                        alt={selectedJob.worker?.full_name || 'Profesional'}
                        onError={(e) => {
                          e.currentTarget.src = '/avatar-fallback.png';
                        }}
                        className="relative h-24 w-24 rounded-full object-cover border-4 border-emerald-400 shadow-[0_12px_30px_rgba(16,185,129,0.25)]"
                      />
                    </div>
                  </div>

                  <h2 className="text-xl font-extrabold text-gray-800 leading-tight">
                    ¿Cómo fue el servicio de {selectedJob.worker?.full_name || 'este profesional'}?
                  </h2>

                  <p className="mt-2 text-sm text-gray-500">
                    Tu opinión ayuda a mejorar la calidad de la plataforma y destacar a los mejores profesionales.
                  </p>

                  <div className="flex justify-center gap-2 mt-6 mb-5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRating(n)}
                        className={`h-12 w-12 rounded-2xl border flex items-center justify-center transition ${
                          n <= rating
                            ? 'bg-emerald-500 border-emerald-500 shadow-[0_10px_24px_rgba(16,185,129,0.25)]'
                            : 'bg-white border-gray-200 hover:bg-emerald-50 hover:border-emerald-300'
                        }`}
                      >
                        <Star
                          className={`h-6 w-6 ${
                            n <= rating ? 'fill-white text-white' : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  <div className="text-xs font-medium text-gray-500 mb-4">
                    {rating === 0 && 'Seleccioná una cantidad de estrellas'}
                    {rating === 1 && 'Muy mala experiencia'}
                    {rating === 2 && 'Podría mejorar'}
                    {rating === 3 && 'Experiencia aceptable'}
                    {rating === 4 && 'Muy buena atención'}
                    {rating === 5 && 'Excelente servicio'}
                  </div>

                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Contanos cómo fue la atención, puntualidad y calidad del servicio..."
                    className="w-full min-h-[120px] resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-inner outline-none transition placeholder:text-gray-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  />

                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={() => {
                        setShowReview(false);
                        setSelectedJob(null);
                        setRating(0);
                        setComment('');
                      }}
                      className="flex-1 rounded-2xl bg-gray-100 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-200"
                    >
                      Cancelar
                    </button>

                    <button
                      onClick={() => submitReview(selectedJob.id, selectedJob.worker_id)}
                      className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-400 py-3 text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(16,185,129,0.22)] transition hover:from-emerald-600 hover:to-cyan-500"
                    >
                      Enviar
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}