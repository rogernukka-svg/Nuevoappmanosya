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
  Clock3,
  User2,
  Briefcase,
  Sparkles,
  ArrowLeft,
  BadgeCheck,
  CircleDollarSign,
  MessageCircleMore,
  ClipboardList,
  X,
  SendHorizontal,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const supabase = getSupabase();
const LOGIN_BG = '#62bfb9';

function statusMeta(status) {
  const s = String(status || '').toLowerCase();

  if (s === 'completed') {
    return {
      label: 'Finalizado',
      text: 'Servicio completado',
      pill: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      dot: 'bg-emerald-500',
      ring: 'ring-emerald-100',
    };
  }

  if (s === 'cancelled') {
    return {
      label: 'Cancelado',
      text: 'Servicio cancelado',
      pill: 'bg-red-50 text-red-600 border border-red-200',
      dot: 'bg-red-500',
      ring: 'ring-red-100',
    };
  }

  if (s === 'assigned') {
    return {
      label: 'Asignado',
      text: 'Profesional asignado',
      pill: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
      dot: 'bg-cyan-500',
      ring: 'ring-cyan-100',
    };
  }

  if (s === 'accepted') {
    return {
      label: 'En camino',
      text: 'Profesional en camino',
      pill: 'bg-teal-50 text-teal-700 border border-teal-200',
      dot: 'bg-[#62bfb9]',
      ring: 'ring-teal-100',
    };
  }

  if (s === 'open') {
    return {
      label: 'Abierto',
      text: 'Esperando confirmación',
      pill: 'bg-slate-50 text-slate-700 border border-slate-200',
      dot: 'bg-slate-400',
      ring: 'ring-slate-100',
    };
  }

  return {
    label: s || 'Abierto',
    text: status || 'Sin estado',
    pill: 'bg-slate-50 text-slate-700 border border-slate-200',
    dot: 'bg-slate-400',
    ring: 'ring-slate-100',
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

export default function ClientJobsPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [clientProfile, setClientProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => {
    let alive = true;

    async function init() {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error || !data?.user) {
          router.replace('/login');
          return;
        }

        if (!alive) return;

        setUser(data.user);

        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url, role')
          .eq('id', data.user.id)
          .maybeSingle();

        if (alive) setClientProfile(profileData || null);
      } catch (error) {
        console.warn('No se pudo validar sesión:', error);
        router.replace('/login');
      }
    }

    init();

    return () => {
      alive = false;
    };
  }, [router]);

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
    if (!rating) {
      toast('Seleccioná una calificación');
      return;
    }

    try {
      const { error } = await supabase.rpc('add_review_if_valid', {
        p_job_id: jobId,
        p_worker_id: workerId,
        p_client_id: user.id,
        p_rating: rating,
        p_comment: comment,
      });

      if (error) throw error;

      toast.success('Calificación enviada');
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

      toast.success('Trabajador reasignado correctamente');
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

    const completed = jobs.filter(
      (j) => String(j.status || '').toLowerCase() === 'completed'
    ).length;

    const cancelled = jobs.filter(
      (j) => String(j.status || '').toLowerCase() === 'cancelled'
    ).length;

    return { total, active, completed, cancelled };
  }, [jobs]);

  const clientName =
    clientProfile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')?.[0] ||
    'cliente';

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[linear-gradient(180deg,#eff8f7_0%,#ffffff_42%,#f8fbfc_100%)] text-slate-900"
    >
      <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4 sm:px-5">
        {/* TOP BAR */}
        <div className="sticky top-0 z-40 -mx-4 border-b border-white/60 bg-[#eff8f7]/88 px-4 py-3 backdrop-blur-xl sm:-mx-5 sm:px-5">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.push('/client')}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/86 text-slate-700 shadow-sm active:scale-95"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="min-w-0 flex-1 text-center">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0c6b70]">
                ManosYA
              </div>
              <div className="truncate text-[18px] font-black text-slate-900">
                Mis pedidos
              </div>
            </div>

            <button
              type="button"
              onClick={loadJobs}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#62bfb9] text-white shadow-[0_12px_26px_rgba(98,191,185,0.38)] active:scale-95"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* HERO */}
        <section className="relative mt-5 overflow-hidden rounded-[34px] border border-white/70 bg-white/82 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6">
          <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#62bfb9]/28 blur-3xl" />
          <div className="absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-cyan-200/35 blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-[26px] bg-[#62bfb9]/25 blur-xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-[26px] bg-gradient-to-br from-[#0c6b70] via-[#62bfb9] to-[#9ee5df] text-white shadow-[0_18px_38px_rgba(98,191,185,0.38)]">
                  <ClipboardList size={30} />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#62bfb9]/25 bg-[#62bfb9]/10 px-3 py-1 text-[11px] font-black text-[#0c6b70]">
                  <Sparkles size={13} />
                  Panel inteligente
                </div>

                <h1 className="mt-3 text-[28px] font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
                  Hola {clientName}, acá están tus pedidos
                </h1>

                <p className="mt-2 text-[14px] font-semibold leading-6 text-slate-500">
                  Seguí tus servicios, revisá el profesional asignado y calificá la experiencia desde un solo lugar.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-[24px] border border-white/80 bg-white/86 p-4 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Total
                </div>
                <div className="mt-1 text-3xl font-black text-slate-950">{stats.total}</div>
              </div>

              <div className="rounded-[24px] border border-white/80 bg-white/86 p-4 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Activos
                </div>
                <div className="mt-1 text-3xl font-black text-[#0c6b70]">{stats.active}</div>
              </div>

              <div className="rounded-[24px] border border-white/80 bg-white/86 p-4 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Hechos
                </div>
                <div className="mt-1 text-3xl font-black text-emerald-600">{stats.completed}</div>
              </div>

              <div className="rounded-[24px] border border-white/80 bg-white/86 p-4 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Cancelados
                </div>
                <div className="mt-1 text-3xl font-black text-red-500">{stats.cancelled}</div>
              </div>
            </div>
          </div>
        </section>

        {/* SHORT INFO */}
        <section className="mt-4 rounded-[28px] border border-white/80 bg-white/86 p-4 shadow-sm backdrop-blur-xl">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#62bfb9]/12 text-[#0c6b70]">
              <ShieldCheck size={21} />
            </div>

            <div>
              <div className="text-[15px] font-black text-slate-900">
                Todo ordenado, simple y transparente
              </div>
              <p className="mt-1 text-[13px] font-semibold leading-5 text-slate-500">
                Cuando un pedido avance, vas a ver el estado actualizado. Cuando finalice, podés dejar tu valoración.
              </p>
            </div>
          </div>
        </section>

        {/* CONTENT */}
        {loading ? (
          <div className="mt-10 flex justify-center">
            <div className="inline-flex items-center gap-3 rounded-[24px] border border-white/80 bg-white/90 px-5 py-4 text-sm font-black text-slate-500 shadow-sm">
              <Loader2 className="animate-spin text-[#62bfb9]" size={19} />
              Cargando tus pedidos...
            </div>
          </div>
        ) : jobs.length === 0 ? (
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 overflow-hidden rounded-[34px] border border-dashed border-[#62bfb9]/45 bg-white/88 p-8 text-center shadow-sm backdrop-blur-xl"
          >
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[30px] bg-[#62bfb9]/12 text-[#0c6b70]">
              <Briefcase size={34} />
            </div>

            <h3 className="mt-5 text-2xl font-black text-slate-950">
              Todavía no tenés pedidos
            </h3>

            <p className="mx-auto mt-2 max-w-md text-[14px] font-semibold leading-6 text-slate-500">
              Cuando solicites tu primer servicio, acá vas a ver el historial, el estado y la valoración.
            </p>

            <button
              type="button"
              onClick={() => router.push('/client')}
              className="mt-6 inline-flex items-center gap-2 rounded-[22px] bg-[#62bfb9] px-6 py-4 text-sm font-black text-white shadow-[0_16px_34px_rgba(98,191,185,0.38)] active:scale-95"
            >
              <Sparkles size={17} />
              Solicitar mi primer servicio
            </button>
          </motion.section>
        ) : (
          <section className="mt-6 grid gap-4">
            {jobs.map((job, index) => {
              const review = Array.isArray(job.review) ? job.review[0] : job.review;
              const meta = statusMeta(job.status);
              const workerName = job.worker?.full_name || 'Asignación pendiente';
              const workerAvatar = job.worker?.avatar_url || '/avatar-fallback.png';
              const isCompleted = String(job.status || '').toLowerCase() === 'completed';
              const isAssigned = String(job.status || '').toLowerCase() === 'assigned';

              return (
                <motion.article
                  key={job.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.035 }}
                  className={`relative overflow-hidden rounded-[32px] border border-white/80 bg-white/90 p-4 shadow-[0_20px_55px_rgba(15,23,42,0.07)] backdrop-blur-xl ring-1 ${meta.ring}`}
                >
                  <div className="absolute -right-20 -top-20 h-44 w-44 rounded-full bg-[#62bfb9]/12 blur-3xl" />

                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                            {meta.text}
                          </span>
                        </div>

                        <h2 className="mt-2 text-xl font-black leading-tight text-slate-950">
                          {job.title || 'Servicio solicitado'}
                        </h2>

                        <p className="mt-2 line-clamp-3 text-[14px] font-semibold leading-6 text-slate-500">
                          {job.description || 'Sin descripción'}
                        </p>
                      </div>

                      <span className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black ${meta.pill}`}>
                        {meta.label}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <InfoBox
                        icon={<CalendarClock size={15} />}
                        label="Fecha"
                        value={formatDateTime(job.created_at)}
                      />

                      <InfoBox
                        icon={<User2 size={15} />}
                        label="Profesional"
                        value={workerName}
                      />

                      <InfoBox
                        icon={<Briefcase size={15} />}
                        label="Servicio"
                        value={job.service_type || 'Servicio general'}
                      />

                      <InfoBox
                        icon={<CircleDollarSign size={15} />}
                        label="Tarifa"
                        value="En definición"
                        helper="Próximamente precios claros antes de confirmar."
                      />
                    </div>

                    <div className="mt-4 rounded-[26px] border border-[#62bfb9]/18 bg-[linear-gradient(90deg,rgba(98,191,185,0.12),rgba(255,255,255,0.90))] p-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={workerAvatar}
                          alt={workerName}
                          onError={(e) => {
                            e.currentTarget.src = '/avatar-fallback.png';
                          }}
                          className="h-14 w-14 rounded-[22px] border-2 border-white object-cover shadow-sm"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-[15px] font-black text-slate-900">
                              {workerName}
                            </span>
                            {job.worker && (
                              <BadgeCheck size={17} className="shrink-0 text-[#62bfb9]" />
                            )}
                          </div>

                          <div className="mt-1 flex items-center gap-2 text-[12px] font-bold text-slate-500">
                            <MessageCircleMore size={14} />
                            Seguimiento y valoración del servicio
                          </div>
                        </div>
                      </div>
                    </div>

                    {isAssigned && (
                      <button
                        type="button"
                        onClick={() => reassignWorker(job.id)}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[22px] border border-[#62bfb9]/25 bg-[#62bfb9]/10 px-4 py-3 text-[13px] font-black text-[#0c6b70] active:scale-95"
                      >
                        <RefreshCw size={16} />
                        Reasignar trabajador automáticamente
                      </button>
                    )}

                    {review ? (
                      <div className="mt-4 rounded-[26px] border border-emerald-100 bg-emerald-50/80 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-black text-emerald-700">
                            Tu valoración
                          </span>

                          <div className="flex items-center gap-1">
                            {[...Array(Number(review.rating || 0))].map((_, i) => (
                              <Star
                                key={i}
                                className="h-4 w-4 fill-yellow-400 text-yellow-400"
                              />
                            ))}
                          </div>

                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </div>

                        <p className="mt-2 text-sm font-semibold italic text-slate-600">
                          “{review.comment || 'Sin comentario'}”
                        </p>

                        <p className="mt-2 text-[11px] font-bold text-slate-400">
                          Calificado el {formatDate(review.created_at)}
                        </p>
                      </div>
                    ) : (
                      isCompleted && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedJob(job);
                            setShowReview(true);
                          }}
                          className="mt-4 flex w-full items-center justify-center gap-2 rounded-[24px] bg-gradient-to-r from-[#0c6b70] via-[#62bfb9] to-[#9ee5df] px-5 py-4 text-sm font-black text-white shadow-[0_16px_34px_rgba(98,191,185,0.38)] active:scale-95"
                        >
                          <Star size={17} />
                          Calificar servicio
                        </button>
                      )
                    )}
                  </div>
                </motion.article>
              );
            })}
          </section>
        )}
      </div>

      {/* MODAL REVIEW */}
      <AnimatePresence>
        {showReview && selectedJob && (
          <motion.div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-md overflow-hidden rounded-[34px] border border-white/70 bg-white shadow-[0_30px_90px_rgba(0,0,0,0.35)]"
              initial={{ scale: 0.94, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.94, y: 24, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 170, damping: 18 }}
            >
              <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#62bfb9]/24 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-cyan-200/34 blur-3xl" />

              <button
                type="button"
                onClick={() => {
                  setShowReview(false);
                  setSelectedJob(null);
                  setRating(0);
                  setComment('');
                }}
                className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/8 text-slate-700 active:scale-95"
              >
                <X size={18} />
              </button>

              <div className="relative z-10 p-6 text-center">
                <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-[#62bfb9]/25 bg-[#62bfb9]/10 px-4 py-1.5 text-[12px] font-black text-[#0c6b70]">
                  <Sparkles size={14} />
                  Experiencia ManosYA
                </div>

                <div className="mx-auto mb-4 h-24 w-24 overflow-hidden rounded-[32px] border-4 border-white bg-slate-100 shadow-[0_18px_42px_rgba(15,23,42,0.14)]">
                  <img
                    src={selectedJob.worker?.avatar_url || '/avatar-fallback.png'}
                    alt={selectedJob.worker?.full_name || 'Profesional'}
                    onError={(e) => {
                      e.currentTarget.src = '/avatar-fallback.png';
                    }}
                    className="h-full w-full object-cover"
                  />
                </div>

                <h3 className="text-2xl font-black text-slate-950">
                  ¿Cómo fue el servicio?
                </h3>

                <p className="mx-auto mt-2 max-w-xs text-[14px] font-semibold leading-6 text-slate-500">
                  Tu calificación ayuda a que ManosYA tenga trabajadores cada vez más confiables.
                </p>

                <div className="mt-5 flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      className="active:scale-90"
                    >
                      <Star
                        size={34}
                        className={
                          value <= rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-slate-300'
                        }
                      />
                    </button>
                  ))}
                </div>

                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Escribí un comentario corto..."
                  className="mt-5 min-h-[110px] w-full resize-none rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#62bfb9] focus:ring-4 focus:ring-[#62bfb9]/15"
                />

                <button
                  type="button"
                  onClick={() => submitReview(selectedJob.id, selectedJob.worker_id)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-[24px] bg-[#62bfb9] px-5 py-4 text-sm font-black text-white shadow-[0_16px_34px_rgba(98,191,185,0.42)] active:scale-95"
                >
                  <SendHorizontal size={17} />
                  Enviar calificación
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
}

function InfoBox({ icon, label, value, helper }) {
  return (
    <div className="rounded-[22px] border border-slate-100 bg-slate-50/80 p-3">
      <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
        {icon}
        {label}
      </div>

      <div className="mt-1 truncate text-sm font-black text-slate-800">
        {value}
      </div>

      {helper && (
        <div className="mt-1 text-[11px] font-semibold leading-4 text-slate-400">
          {helper}
        </div>
      )}
    </div>
  );
}