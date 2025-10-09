'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Star } from 'lucide-react';

const supabase = getSupabase();

export default function ReviewPage() {
  const { job_id } = useParams();
  const router = useRouter();
  const [job, setJob] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    const loadJob = async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, worker_id, client_id, title')
        .eq('id', job_id)
        .maybeSingle();

      if (error || !data) {
        toast.error('Trabajo no encontrado');
        router.push('/client/jobs');
      } else {
        setJob(data);
      }
    };
    loadJob();
  }, [job_id, router]);

  async function submitReview() {
    if (!rating) {
      toast.error('Seleccioná una calificación.');
      return;
    }
    try {
      const { error } = await supabase.rpc('add_review_if_valid', {
        p_job_id: job.id,
        p_worker_id: job.worker_id,
        p_client_id: job.client_id,
        p_rating: rating,
        p_comment: comment,
      });

      if (error) throw error;

      toast.success('🌟 Calificación enviada correctamente');
      router.push('/client/jobs');
    } catch (err) {
      console.error(err);
      toast.error('Error al enviar calificación');
    }
  }

  if (!job)
    return (
      <div className="min-h-screen flex items-center justify-center text-emerald-600">
        Cargando trabajo...
      </div>
    );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
      <h1 className="text-xl font-bold text-gray-800 mb-2">
        Calificar servicio 🌟
      </h1>
      <p className="text-gray-600 mb-4">{job.title}</p>

      <div className="flex justify-center gap-2 mb-4">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            onClick={() => setRating(n)}
            className={`w-8 h-8 cursor-pointer ${
              n <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>

      <textarea
        placeholder="Dejá tu comentario (opcional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="w-full max-w-md border rounded-xl p-3 mb-4 text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
      />

      <button
        onClick={submitReview}
        className="bg-emerald-500 text-white px-6 py-2 rounded-xl hover:bg-emerald-600 font-semibold"
      >
        Enviar calificación
      </button>
    </div>
  );
}
