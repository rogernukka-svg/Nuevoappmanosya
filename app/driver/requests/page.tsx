'use client';

import '../../globals.css';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Bell, Power, MapPin, CheckCircle2, XCircle, Car } from 'lucide-react';

const supabase = getSupabase();

type Job = {
  id: string;
  status: string;
  client_id: string;
  worker_id: string;
  client_lat?: number | null;
  client_lng?: number | null;
  service_type?: string | null;
  price?: number | null;
  created_at?: string;
};

export default function DriverRequestsPage() {
  const router = useRouter();
  const [loadingPage, setLoadingPage] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        router.replace('/auth/login');
        return;
      }
      setUser(data.user);
      setLoadingPage(false);
    })();
  }, [router]);

  if (loadingPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] text-gray-600">
        <Loader2 className="animate-spin w-6 h-6 mr-2" />
        Cargando...
      </div>
    );
  }

  return <DriverRequests user={user} />;
}

function DriverRequests({ user }: { user: any }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const [online, setOnline] = useState(false);
  const [taxiDocsComplete, setTaxiDocsComplete] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  const [jobs, setJobs] = useState<Job[]>([]);
  const notifyRef = useRef<HTMLAudioElement | null>(null);

  // ====== load driver profile ======
  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      try {
        const { data: dp, error } = await supabase
          .from('driver_profiles')
          .select('is_active, taxi_docs_complete, last_lat, last_lon')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        setOnline(!!dp?.is_active);
        setTaxiDocsComplete(!!dp?.taxi_docs_complete);

        if (dp?.last_lat && dp?.last_lon) {
          setCoords({ lat: dp.last_lat, lon: dp.last_lon });
        }
      } catch (e: any) {
        console.error(e);
        toast.error('No se pudo cargar driver_profiles');
      }
    })();

    if (typeof Audio !== 'undefined') notifyRef.current = new Audio('/notify.mp3');
  }, [user?.id]);

  // ====== GPS live ======
  useEffect(() => {
    if (!user?.id) return;
    if (!navigator.geolocation) return;

    const watcher = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        if (!Number(lat) || !Number(lon)) return;

        setCoords({ lat, lon });

        // guardar ubicación (si querés sólo cuando online, agregá: if(!online) return;)
        await supabase.from('driver_profiles').upsert(
          { user_id: user.id, last_lat: lat, last_lon: lon, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
      },
      (err) => console.warn('GPS error:', err),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watcher);
  }, [user?.id]);

  // ====== fetch jobs assigned to driver ======
  async function fetchJobs() {
    try {
      setBusy(true);

      const { data, error } = await supabase
        .from('jobs')
        .select('id,status,client_id,worker_id,client_lat,client_lng,service_type,price,created_at')
        .eq('worker_id', user.id)
        .in('status', ['open', 'assigned'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setJobs(data || []);
    } catch (e: any) {
      console.error(e);
      toast.error('Error cargando pedidos');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!user?.id) return;
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ====== realtime jobs ======
  useEffect(() => {
    if (!user?.id) return;

    const ch = supabase
      .channel('driver-requests-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs', filter: `worker_id=eq.${user.id}` },
        (payload) => {
          const j = payload.new as Job;
          if (!j?.id) return;

          if (j.status === 'open' || j.status === 'assigned') {
            notifyRef.current?.play?.().catch(() => {});
            toast.info('🚕 Nuevo pedido');
            setJobs((prev) => {
              const exists = prev.some((x) => x.id === j.id);
              if (exists) return prev.map((x) => (x.id === j.id ? j : x));
              return [j, ...prev];
            });
          } else {
            // si cambia a accepted/cancelled/etc => quitar de la lista
            setJobs((prev) => prev.filter((x) => x.id !== j.id));
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [user?.id]);

  // ====== online/offline ======
  async function toggleOnline() {
    if (!taxiDocsComplete) {
      toast.error('En verificación: completá documentos para activar Taxi.');
      router.push('/driver/onboard');
      return;
    }

    const next = !online;
    setOnline(next);
    await supabase.from('driver_profiles').upsert(
      { user_id: user.id, is_active: next },
      { onConflict: 'user_id' }
    );
    toast.success(next ? '✅ ONLINE' : '⏸️ OFFLINE');
  }

  // ====== accept/reject ======
  async function acceptJob(job: Job) {
    try {
      setBusy(true);
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', job.id);

      if (error) throw error;
      toast.success('🟢 Pedido aceptado');
      setJobs((prev) => prev.filter((x) => x.id !== job.id));

      // opcional: ir a home/chat
      router.push('/driver/home');
    } catch (e: any) {
      console.error(e);
      toast.error('No se pudo aceptar');
    } finally {
      setBusy(false);
    }
  }

  async function rejectJob(job: Job) {
    try {
      setBusy(true);
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'rejected', rejected_at: new Date().toISOString() })
        .eq('id', job.id);

      if (error) throw error;
      toast('Pedido rechazado');
      setJobs((prev) => prev.filter((x) => x.id !== job.id));
    } catch (e: any) {
      console.error(e);
      toast.error('No se pudo rechazar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-6 py-8">
      <div className="max-w-md mx-auto space-y-4">

        {/* HEADER */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-[0_18px_60px_rgba(0,0,0,0.08)] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car className="w-5 h-5" />
              <h1 className="text-lg font-extrabold text-gray-900">Pedidos Taxi</h1>
            </div>

            <button
              onClick={toggleOnline}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-2xl font-bold text-sm border transition
                ${online ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-800 border-gray-200'}`}
            >
              <Power className="w-4 h-4" />
              {online ? 'ONLINE' : 'OFFLINE'}
            </button>
          </div>

          <div className="mt-3 text-xs text-gray-600 space-y-1">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {coords ? (
                <span>GPS OK · {coords.lat.toFixed(4)}, {coords.lon.toFixed(4)}</span>
              ) : (
                <span>Esperando GPS...</span>
              )}
            </div>

            <div className="flex items-center justify-between">
              {taxiDocsComplete ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 size={14} /> Verificado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                  ⏳ En verificación
                </span>
              )}

              <button
                onClick={fetchJobs}
                disabled={busy}
                className="text-xs font-bold px-3 py-2 rounded-xl bg-white border hover:bg-gray-50 disabled:opacity-60"
              >
                {busy ? 'Actualizando…' : 'Actualizar'}
              </button>
            </div>

            {!taxiDocsComplete && (
              <button
                onClick={() => router.push('/driver/onboard')}
                className="mt-2 w-full py-3 rounded-2xl bg-gray-900 text-white font-extrabold hover:bg-black transition"
              >
                Completar verificación
              </button>
            )}
          </div>
        </div>

        {/* LISTA PEDIDOS */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-[0_18px_60px_rgba(0,0,0,0.08)] p-5">
          <p className="font-extrabold text-gray-900 flex items-center gap-2">
            <Bell className="w-4 h-4" /> Entrantes
          </p>

          <div className="mt-3 space-y-3">
            {jobs.length === 0 ? (
              <p className="text-sm text-gray-500">No hay pedidos ahora.</p>
            ) : (
              jobs.map((j) => (
                <div key={j.id} className="bg-gray-50 border rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <div className="font-bold text-gray-900">
                        {j.service_type || 'Taxi'} · ₲{Number(j.price || 0).toLocaleString('es-PY')}
                      </div>
                      <div className="text-xs text-gray-500">ID: {j.id.slice(0, 8)}...</div>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                      {j.status}
                    </span>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => rejectJob(j)}
                      disabled={busy}
                      className="flex-1 py-2.5 rounded-2xl bg-white border font-bold text-gray-800 hover:bg-gray-100 transition disabled:opacity-60 inline-flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" /> Rechazar
                    </button>
                    <button
                      onClick={() => acceptJob(j)}
                      disabled={busy}
                      className="flex-1 py-2.5 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition disabled:opacity-60 inline-flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Aceptar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <button
          onClick={() => router.push('/role-selector')}
          className="w-full py-3 rounded-2xl bg-white border font-extrabold text-gray-800 hover:bg-gray-50 transition"
        >
          Cambiar rol
        </button>
      </div>
    </div>
  );
}
