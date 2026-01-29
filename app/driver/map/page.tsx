'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { toast } from 'sonner';
import { Navigation, PhoneCall, MessageCircle, ArrowLeft, MapPin } from 'lucide-react';

// ✅ Tipado "seguro" para Next + TS (evita errores de props de react-leaflet)
const MapContainer: any = dynamic(
  () => import('react-leaflet').then((m) => m.MapContainer as any),
  { ssr: false }
);
const TileLayer: any = dynamic(
  () => import('react-leaflet').then((m) => m.TileLayer as any),
  { ssr: false }
);
const Marker: any = dynamic(
  () => import('react-leaflet').then((m) => m.Marker as any),
  { ssr: false }
);
const Polyline: any = dynamic(
  () => import('react-leaflet').then((m) => m.Polyline as any),
  { ssr: false }
);

type JobRow = {
  id: string;
  status: string | null;
  worker_id: string | null;
  client_id: string | null;
  client_lat: number | null;
  client_lng: number | null;
  service_type: string | null;
  price: number | null;
};

function num(n: any) {
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
}

export default function DriverMapPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const jobId = sp.get('jobId');

  const mapRef = useRef<any>(null);

  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<JobRow | null>(null);

  const [driverPos, setDriverPos] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });

  const clientPos = useMemo(() => {
    const lat = num(job?.client_lat);
    const lng = num(job?.client_lng);
    if (lat == null || lng == null) return null;
    return { lat, lng };
  }, [job?.client_lat, job?.client_lng]);

  // ✅ Fix iconos Leaflet
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const L = require('leaflet');

    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }, []);

  // 🔐 Sesión
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id || null;
      if (!uid) {
        router.replace('/auth/login');
        return;
      }
      setMeId(uid);
    })();
  }, [router]);

  // 📦 Traer job
  useEffect(() => {
    if (!jobId) {
      toast.error('Falta jobId en la URL');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('jobs')
          .select('id,status,worker_id,client_id,client_lat,client_lng,service_type,price')
          .eq('id', jobId)
          .single();

        if (error) throw error;
        setJob(data as JobRow);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || 'No se pudo cargar el pedido');
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId]);

  // 📡 Realtime update del job
  useEffect(() => {
    if (!jobId) return;

    const ch = supabase
      .channel(`job-driver-${jobId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'jobs', filter: `id=eq.${jobId}` },
        (payload) => {
          const next = payload.new as JobRow;
          setJob(next);

          if (next?.status === 'cancelled') {
            toast.error('El cliente canceló el pedido');
            router.replace('/driver/home');
          }
          if (next?.status === 'completed') {
            toast.success('Pedido finalizado');
            router.replace('/driver/home');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [jobId, router]);

  // 📍 GPS chofer
  useEffect(() => {
    if (!navigator.geolocation) {
      toast.error('Tu dispositivo no soporta GPS');
      return;
    }

    const watcher = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = num(pos.coords.latitude);
        const lng = num(pos.coords.longitude);
        if (lat == null || lng == null) return;

        setDriverPos({ lat, lng });

        // (opcional) persistir ubicación si tu tabla existe
        if (meId) {
          try {
            await supabase
              .from('driver_profiles')
              .update({ lat, lng, updated_at: new Date().toISOString() })
              .eq('user_id', meId);
          } catch {}
        }

        // centrar suave si el mapa ya existe
        if (mapRef.current) {
          mapRef.current.setView([lat, lng], 15, { animate: true });
        }
      },
      (err) => console.warn('GPS error:', err),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 8000 }
    );

    return () => navigator.geolocation.clearWatch(watcher);
  }, [meId]);

  // ✅ center SIEMPRE como tupla
  const center = useMemo((): [number, number] => {
    if (driverPos.lat != null && driverPos.lng != null) return [driverPos.lat, driverPos.lng];
    if (clientPos?.lat != null && clientPos?.lng != null) return [clientPos.lat, clientPos.lng];
    return [-25.5, -54.6];
  }, [driverPos.lat, driverPos.lng, clientPos?.lat, clientPos?.lng]);

  const routeLine = useMemo((): [number, number][] => {
    if (!clientPos) return [];
    if (driverPos.lat == null || driverPos.lng == null) return [];
    return [
      [driverPos.lat, driverPos.lng],
      [clientPos.lat, clientPos.lng],
    ];
  }, [clientPos, driverPos.lat, driverPos.lng]);

  function openGoogleMapsNav() {
    if (!clientPos) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${clientPos.lat},${clientPos.lng}&travelmode=driving`;
    window.open(url, '_blank');
  }

  async function markArrived() {
    if (!jobId) return;
    try {
      const { error } = await supabase.from('jobs').update({ status: 'arrived' }).eq('id', jobId);
      if (error) throw error;
      toast.success('📍 Marcado como “Llegué”');
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo marcar “Llegué”');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">Cargando mapa…</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-white p-6">
        <button
          onClick={() => router.push('/driver/home')}
          className="inline-flex items-center gap-2 text-gray-700 font-semibold"
        >
          <ArrowLeft size={18} /> Volver
        </button>
        <p className="mt-4 text-gray-600">No se encontró el pedido.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white border-b px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => router.push('/driver/home')}
          className="inline-flex items-center gap-2 text-gray-700 font-semibold"
        >
          <ArrowLeft size={18} /> Pedidos
        </button>

        <div className="text-center">
          <p className="text-sm font-extrabold text-gray-900">Navegación al cliente</p>
          <p className="text-[12px] text-gray-500">
            {job.service_type || 'Servicio'}{' '}
            {job.price ? `• ₲${Number(job.price).toLocaleString('es-PY')}` : ''}
          </p>
        </div>

        <div className="w-[70px]" />
      </div>

      {/* Map */}
      <div className="h-[calc(100vh-170px)]">
        <MapContainer
          center={center}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          whenReady={(e: any) => {
            mapRef.current = e?.target;
          }}
        >
          <TileLayer
            url="https://tile.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />

          {driverPos.lat != null && driverPos.lng != null && (
            <Marker position={[driverPos.lat, driverPos.lng]} />
          )}

          {clientPos && <Marker position={[clientPos.lat, clientPos.lng]} />}

          {routeLine.length > 0 && <Polyline positions={routeLine} pathOptions={{ weight: 5 }} />}
        </MapContainer>
      </div>

      {/* Bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-20">
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => toast('📞 Llamada (conectar luego)')}
            className="py-3 rounded-2xl border font-bold flex items-center justify-center gap-2"
          >
            <PhoneCall size={18} /> Llamar
          </button>

          <button
            onClick={() => toast('💬 Chat (lo conectamos luego)')}
            className="py-3 rounded-2xl border font-bold flex items-center justify-center gap-2"
          >
            <MessageCircle size={18} /> Chat
          </button>

          <button
            onClick={openGoogleMapsNav}
            className="py-3 rounded-2xl bg-emerald-500 text-white font-extrabold flex items-center justify-center gap-2"
          >
            <Navigation size={18} /> Guiarme
          </button>
        </div>

        <button
          onClick={markArrived}
          className="mt-3 w-full py-3 rounded-2xl bg-gray-900 text-white font-extrabold flex items-center justify-center gap-2"
        >
          <MapPin size={18} /> Llegué
        </button>
      </div>
    </div>
  );
}
