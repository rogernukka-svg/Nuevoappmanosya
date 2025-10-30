'use client';

import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Star,
  CheckCircle2,
  RefreshCw,
  CalendarClock,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';

const supabase = getSupabase();

export default function ClientJobsPage() {
  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Review
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);

  /* === SESIÓN === */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user);
    });
  }, []);

  /* === CARGAR PEDIDOS === */
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
    } else setJobs(data || []);
    setLoading(false);
  }

  useEffect(() => {
    if (user?.id) loadJobs();
  }, [user]);

  /* === REVIEW === */
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
      await loadJobs();
    } catch (err) {
      console.error('❌ Error RPC:', err);
      toast.error('Error enviando review');
    }
  }

  /* === REASIGNAR TRABAJADOR (AUTO) === */
  async function reassignWorker(jobId) {
    try {
      const { error } = await supabase.rpc('reassign_worker_if_needed', { p_job_id: jobId });
      if (error) throw error;
      toast.success('🔄 Trabajador reasignado correctamente');
      await loadJobs();
    } catch (err) {
      toast.error('No se pudo reasignar automáticamente');
    }
  }

  /* === UI === */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container max-w-screen-md mx-auto px-4 pb-32 bg-white text-gray-900 min-h-screen relative"
    >
      <h1 className="text-2xl font-extrabold text-emerald-600 pt-8 mb-4 flex items-center gap-2">
        <Building2 className="text-emerald-600" /> Panel de Pedidos
      </h1>
      <p className="text-gray-500 text-sm mb-4">
        Gestioná tus servicios activos, completados y planificados fácilmente ⚡
      </p>

      {loading ? (
        <div className="flex justify-center mt-10 text-gray-400 gap-2 items-center">
          <Loader2 className="animate-spin" /> Cargando tus pedidos...
        </div>
      ) : jobs.length === 0 ? (
        <p className="text-center text-gray-500 mt-10">
          No tenés pedidos aún. ¡Comenzá solicitando tu primer servicio! 💪
        </p>
      ) : (
        <section className="grid gap-4 mt-5">
          {jobs.map((job) => {
            const review = job.review?.[0];
            return (
              <motion.div
                key={job.id}
                whileHover={{ scale: 1.01 }}
                className="border rounded-2xl p-5 shadow-sm bg-white hover:shadow-md transition relative"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-gray-800">{job.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{job.description}</p>
                    <p className="text-xs text-emerald-600 font-medium mt-1">
                      <CalendarClock className="inline w-3 h-3 mr-1" />
                      {new Date(job.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-lg font-semibold ${
                      job.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : job.status === 'cancelled'
                        ? 'bg-red-100 text-red-600'
                        : job.status === 'assigned'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {job.status}
                  </span>
                </div>

                {job.worker && (
                  <p className="mt-1 text-sm text-gray-500">
                    👷 {job.worker.full_name || 'Asignado automáticamente'}
                  </p>
                )}

                {/* === BOTÓN DE REASIGNACIÓN === */}
                {job.status === 'assigned' && (
                  <button
                    onClick={() => reassignWorker(job.id)}
                    className="flex items-center gap-2 mt-2 text-sm text-emerald-600 font-medium hover:text-emerald-700 transition"
                  >
                    <RefreshCw size={14} /> Reasignar trabajador automáticamente
                  </button>
                )}

                {/* === REVIEW === */}
                {review ? (
                  <div className="mt-3 p-3 bg-emerald-50 rounded-xl text-sm border border-emerald-100">
                    <div className="flex items-center gap-1 mb-1">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      ))}
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-1" />
                    </div>
                    <p className="italic text-gray-600">"{review.comment}"</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Calificado el {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  job.status === 'completed' && (
                    <button
                      onClick={() => {
                        setSelectedJob(job);
                        setShowReview(true);
                      }}
                      className="mt-3 w-full py-2 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition"
                    >
                      🌟 Calificar servicio
                    </button>
                  )
                )}
              </motion.div>
            );
          })}
        </section>
      )}

      {/* === REVIEW MODAL === */}
      <AnimatePresence>
        {showReview && selectedJob && (
          <motion.div
            className="fixed inset-0 bg-black/60 flex justify-center items-center z-[99999]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl p-6 w-[90%] max-w-md text-center"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
            >
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                🌟 ¿Cómo fue el servicio de {selectedJob.worker?.full_name}?
              </h2>

              <div className="flex justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    onClick={() => setRating(n)}
                    className={`w-8 h-8 cursor-pointer transition ${
                      n <= rating
                        ? 'text-yellow-400 fill-yellow-400 scale-110'
                        : 'text-gray-300 hover:text-yellow-300'
                    }`}
                  />
                ))}
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Dejá un comentario (opcional)"
                className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
              />

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setShowReview(false)}
                  className="flex-1 bg-gray-200 text-gray-700 rounded-xl py-2 font-semibold hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => submitReview(selectedJob.id, selectedJob.worker_id)}
                  className="flex-1 bg-emerald-500 text-white rounded-xl py-2 font-semibold hover:bg-emerald-600"
                >
                  Enviar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
