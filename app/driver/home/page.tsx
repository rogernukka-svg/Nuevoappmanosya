'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { toast } from 'sonner';
import {
  Power,
  Bell,
  MessageCircle,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

type Job = {
  id: string;
  service_type?: string | null;
  price?: number | null;
  client_lat?: number | null;
  client_lng?: number | null;
  created_at?: string | null;
  status?: string | null;
};

function minsAgo(ts?: string | null) {
  if (!ts) return null;
  const diff = Date.now() - new Date(ts).getTime();
  return Math.max(0, Math.floor(diff / 60000));
}

export default function DriverHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  const [online, setOnline] = useState(false);
  const [busy, setBusy] = useState(false);

  const [pendingJobs, setPendingJobs] = useState<Job[]>([]);
  const [hasUnread, setHasUnread] = useState(false);

  const [lastPingAt, setLastPingAt] = useState<string | null>(null);

  const pendingCount = pendingJobs.length;

  const headline = useMemo(() => {
    if (!online) return 'Activá tu modo chofer y empezá a recibir pedidos.';
    if (pendingCount === 0) return 'Estás online. Te avisamos al instante cuando entre un pedido.';
    return `Tenés ${pendingCount} pedido${pendingCount > 1 ? 's' : ''} esperando.`;
  }, [online, pendingCount]);

  // 🔐 sesión
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        router.replace('/auth/login');
        return;
      }
      setUser(data.user);

      // ✅ cargar estado actual (si existe)
      const { data: prof } = await supabase
        .from('driver_profiles')
        .select('is_active, updated_at')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (prof?.is_active !== null && prof?.is_active !== undefined) setOnline(!!prof.is_active);
      if (prof?.updated_at) setLastPingAt(prof.updated_at);

      // ✅ cargar pedidos abiertos recientes del chofer
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, service_type, price, client_lat, client_lng, created_at, status')
        .eq('worker_id', data.user.id)
        .in('status', ['open', 'assigned', 'accepted'])
        .order('created_at', { ascending: false })
        .limit(10);

      setPendingJobs((jobs as Job[]) || []);
    })();
  }, [router]);

  // 🚕 realtime: nuevos pedidos para este chofer
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`driver-jobs-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'jobs',
          filter: `worker_id=eq.${user.id}`,
        },
        (payload) => {
          const job = payload.new as Job;

          toast.success('🚨 Nuevo pedido recibido', {
            description: job?.service_type ? `Servicio: ${job.service_type}` : undefined,
            duration: 3500,
          });

          setPendingJobs((prev) => [job, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `worker_id=eq.${user.id}`,
        },
        (payload) => {
          const job = payload.new as Job;
          // mantener lista “limpia”: solo estados activos
          const active = new Set(['open', 'assigned', 'accepted']);
          setPendingJobs((prev) => {
            const next = prev.filter((j) => j.id !== job.id);
            if (active.has(String(job.status))) return [job, ...next];
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  async function toggleOnline() {
    if (!user?.id) return;

    const next = !online;
    setBusy(true);

    try {
      // ✅ upsert para que nunca falle si no existe fila
      const { error } = await supabase
        .from('driver_profiles')
        .upsert(
          {
            user_id: user.id,
            is_active: next,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) throw error;

      setOnline(next);
      setLastPingAt(new Date().toISOString());

      toast(next ? '🟢 Estás online' : '⏸️ Estás offline');
    } catch (e: any) {
      console.error(e);
      toast.error('No se pudo cambiar tu estado');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[100svh] bg-white">
      {/* Header marketing + status */}
      <div className="px-6 pt-6 pb-4 border-b bg-gradient-to-b from-emerald-50 to-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
              🚕 ManosYA Chofer
            </h1>
            <p className="text-sm text-gray-600 mt-1 max-w-[36ch]">
              {headline}
            </p>

            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Pedidos con trazabilidad</span>
              <span className="opacity-40">•</span>
              <Sparkles size={14} className="text-emerald-600" />
              <span>Respuesta rápida = más ingresos</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                online
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-gray-50 text-gray-600 border-gray-200'
              }`}
            >
              {online ? 'ONLINE' : 'OFFLINE'}
            </span>

            <button
              onClick={() => router.push('/role-selector')}
              className="text-xs font-semibold text-gray-500 hover:text-emerald-700 transition"
            >
              Cambiar rol →
            </button>
          </div>
        </div>

        {/* CTA principal */}
        <button
          onClick={toggleOnline}
          disabled={busy}
          className={`mt-5 w-full py-3.5 rounded-2xl font-extrabold text-white shadow-sm active:scale-[0.99] transition
          ${online ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-900 hover:bg-black'}
          ${busy ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <Power className="inline -mt-0.5 mr-2" size={18} />
          {busy ? 'Actualizando…' : online ? 'Desactivar modo chofer' : 'Activar modo chofer'}
        </button>

        {/* Micro-métrica (marketing) */}
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>
            Última sincronización:{' '}
            <span className="font-semibold text-gray-700">
              {lastPingAt ? `${minsAgo(lastPingAt)} min` : '—'}
            </span>
          </span>

          <span className="font-semibold text-emerald-700">
            {pendingCount > 0 ? `${pendingCount} pedido(s) activo(s)` : 'Sin pedidos pendientes'}
          </span>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="px-6 py-4 grid grid-cols-3 gap-3">
        <button
          onClick={() => {
            setHasUnread(false);
            router.push('/driver/chat');
          }}
          className="relative border rounded-2xl p-3 text-left hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-2">
            <MessageCircle size={18} className="text-emerald-600" />
            <p className="text-sm font-bold text-gray-900">Chat</p>
          </div>
          <p className="text-xs text-gray-500 mt-1">Mensajes y coordinación</p>
          {hasUnread && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-red-500" />
          )}
        </button>

        <button
          onClick={() => router.push('/driver/map')}
          className="border rounded-2xl p-3 text-left hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-emerald-600" />
            <p className="text-sm font-bold text-gray-900">Mapa</p>
          </div>
          <p className="text-xs text-gray-500 mt-1">Ubicación en vivo</p>
        </button>

        <button
          onClick={() => router.push('/driver/requests')}
          className="border rounded-2xl p-3 text-left hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-emerald-600" />
            <p className="text-sm font-bold text-gray-900">Pedidos</p>
          </div>
          <p className="text-xs text-gray-500 mt-1">Aceptar / Rechazar</p>
        </button>
      </div>

      {/* Lista de pedidos entrantes */}
      <div className="px-6 pb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-extrabold text-gray-900">
            Pedidos entrantes
          </h2>

          <button
            onClick={() => router.push('/driver/requests')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition"
          >
            Ver todo
          </button>
        </div>

        {pendingJobs.length === 0 ? (
          <div className="border rounded-3xl p-6 bg-gray-50">
            <p className="text-sm font-semibold text-gray-800">
              Todavía no hay pedidos.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Tip: mantenete online y con ubicación activa para aparecer primero.
            </p>

            <div className="mt-4 flex items-center gap-2 text-xs text-gray-600">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span>Mejor tiempo de respuesta</span>
              <span className="opacity-40">•</span>
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span>Más pedidos asignados</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingJobs.map((job) => (
              <button
                key={job.id}
                onClick={() => router.push(`/driver/requests?id=${job.id}`)}
                className="w-full text-left border rounded-3xl p-4 hover:bg-gray-50 transition flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-extrabold text-gray-900">
                    {job.service_type || 'Servicio'}
                  </p>

                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold">
                      {job.status || 'open'}
                    </span>
                    <span className="opacity-40">•</span>
                    <span>
                      {job.created_at ? `hace ${minsAgo(job.created_at)} min` : 'recién'}
                    </span>
                    {typeof job.price === 'number' && (
                      <>
                        <span className="opacity-40">•</span>
                        <span className="font-semibold text-gray-700">
                          ₲{job.price.toLocaleString('es-PY')}
                        </span>
                      </>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 mt-2">
                    Recomendación: aceptá rápido para mejorar tu prioridad en el sistema.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-emerald-700">
                    Ver
                  </span>
                  <ChevronRight className="text-emerald-700" size={18} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
