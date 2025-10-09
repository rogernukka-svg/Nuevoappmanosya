'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function JobStatusPanel({ jobId, onClose }) {
  const [job, setJob] = useState(null);

  // Suscribirse en tiempo real al estado del job
  useEffect(() => {
    if (!jobId) return;

    // Fetch inicial
    supabase.from('jobs').select('*').eq('id', jobId).single()
      .then(({ data }) => setJob(data));

    // Canal en tiempo real
    const channel = supabase
      .channel(`job-${jobId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs', filter: `id=eq.${jobId}` },
        payload => {
          setJob(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  if (!job) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 text-white p-5 border-t border-white/10 rounded-t-2xl z-50 shadow-lg">
      <div className="w-12 h-1.5 bg-white/30 rounded-full mx-auto mb-4" />

      {job.status === 'pending' && (
        <div className="text-center">
          <p className="mb-4">⏳ Esperando que el trabajador acepte…</p>
          <button
            className="btn btn-ghost w-full"
            onClick={async () => {
              await supabase.from('jobs').delete().eq('id', job.id);
              onClose?.();
            }}
          >
            Cancelar pedido
          </button>
        </div>
      )}

      {job.status === 'accepted' && (
        <div className="text-center">
          <p className="mb-4">✅ El trabajador aceptó tu pedido</p>
          <div className="grid grid-cols-3 gap-3">
            <button className="btn btn-primary">💬 Chat</button>
            <button className="btn btn-secondary">📞 Llamar</button>
            <button className="btn btn-accent">📍 Ver ubicación</button>
          </div>
        </div>
      )}

      {job.status === 'started' && (
        <div className="text-center">
          <p className="mb-4">🚗 El trabajador está en camino</p>
          <p className="text-sm opacity-70">Podrás ver su ubicación en el mapa</p>
        </div>
      )}

      {job.status === 'completed' && (
        <div className="text-center">
          <p className="mb-4">✅ Trabajo completado</p>
          <button
            className="btn btn-primary w-full"
            onClick={() => alert('Abrir calificación ⭐⭐⭐⭐⭐')}
          >
            Calificar trabajador
          </button>
        </div>
      )}
    </div>
  );
}
