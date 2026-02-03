'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Loader2,
  ShieldCheck,
  RefreshCw,
  XCircle,
  Car,
  FileText,
  MapPin,
  UserRound,
} from 'lucide-react';

import '../../globals.css';

const supabase = getSupabase();

/** DocTypes taxi (deben coincidir con documents.doc_type) */
const TAXI_DOCS = [
  { key: 'TAXI_LICENSE_FRONT', label: 'Licencia (frente)' },
  { key: 'TAXI_LICENSE_BACK', label: 'Licencia (dorso)' },
  { key: 'TAXI_VEHICLE_REG', label: 'Cédula verde / Registro' },
  { key: 'TAXI_INSURANCE', label: 'Seguro (póliza)' },
  { key: 'TAXI_VEHICLE_PHOTO_FRONT', label: 'Foto vehículo (frente)' },
  { key: 'TAXI_VEHICLE_PHOTO_BACK', label: 'Foto vehículo (atrás)' },
  { key: 'TAXI_VEHICLE_PHOTO_SIDE', label: 'Foto vehículo (lateral)' },
  { key: 'POLICE', label: 'Antecedente policial' },
];

export default function AdminDriversPage() {
  const router = useRouter();

  const [rows, setRows] = useState([]);
  const [pending, setPending] = useState([]);
  const [verified, setVerified] = useState([]);

  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState(null);
  const [selected, setSelected] = useState(null);

  async function fetchAll() {
    setLoading(true);
    try {
      // ✅ Trae drivers + datos del perfil (si hay FK driver_profiles.user_id -> profiles.id)
      const { data, error } = await supabase
        .from('driver_profiles')
        .select(`
          user_id,
          is_active,
          status,
          city,
          radius_km,
          last_lat,
          last_lon,
          bio,
          years_experience,
          vehicle_plate,
          vehicle_brand,
          vehicle_model,
          vehicle_color,
          vehicle_year,
          driver_verified,
          created_at,
          updated_at,
          profiles:profiles (
            id,
            full_name,
            phone,
            avatar_url,
            email,
            role
          )
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const all = data || [];

      // (Opcional) si querés filtrar solo “taxi”, activá esto cuando tu profiles.role esté bien seteado:
      // const onlyTaxi = all.filter(r => r?.profiles?.role === 'taxi');
      // const final = onlyTaxi;

      const final = all;

      setRows(final);
      setPending(final.filter((d) => !d.driver_verified));
      setVerified(final.filter((d) => !!d.driver_verified));
    } catch (e) {
      console.error(e);
      toast.error('⚠️ Error cargando choferes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // (Opcional) proteger: si no hay sesión, afuera
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data?.session?.user) {
        router.replace('/auth/login');
        return;
      }
      await fetchAll();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleVerify(userId, approve) {
    setBusyUserId(userId);
    try {
      // ✅ Usar RPC (recomendado por RLS)
      const { error } = await supabase.rpc('admin_approve_driver', {
        target_user: userId,
        approve,
      });

      if (error) throw error;

      toast.success(approve ? '✅ Chofer aprobado' : '❌ Chofer rechazado');
      await fetchAll();
      setSelected(null);
    } catch (e) {
      console.error(e);
      toast.error('Error al actualizar chofer (ver RPC/RLS)');
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <main className="flex-1 px-6 py-8">
        <Header onRefresh={fetchAll} />

        {loading ? (
          <LoadingState />
        ) : (
          <>
            <Section
              title="🕓 Choferes Pendientes"
              color="amber"
              list={pending}
              onSelect={setSelected}
            />
            <Section
              title="✅ Choferes Verificados"
              color="emerald"
              list={verified}
              onSelect={setSelected}
            />
          </>
        )}
      </main>

      <footer className="text-center text-xs text-gray-500 py-4 border-t border-gray-200 bg-white">
        © {new Date().getFullYear()}{' '}
        <span className="text-emerald-600 font-semibold">ManosYA</span> · Admin Choferes
      </footer>

      {selected && (
        <DriverDetailModal
          driver={selected}
          onClose={() => setSelected(null)}
          onVerify={handleVerify}
          busyUserId={busyUserId}
        />
      )}
    </div>
  );
}

/* ===================== UI ===================== */

function Header({ onRefresh }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <Car className="w-6 h-6" />
        Panel Admin — Choferes (Taxi)
      </h1>
      <button
        onClick={onRefresh}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border hover:bg-gray-50 transition"
      >
        <RefreshCw size={16} /> Refrescar
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center gap-2 text-gray-600">
      <Loader2 className="animate-spin w-5 h-5" /> Cargando choferes...
    </div>
  );
}

function Section({ title, color, list, onSelect }) {
  const textColor =
    color === 'amber'
      ? 'text-amber-700'
      : color === 'emerald'
      ? 'text-emerald-700'
      : 'text-gray-700';

  return (
    <section className="mb-10">
      <h2 className={`text-xl font-bold mb-4 ${textColor}`}>
        {title} ({list.length})
      </h2>

      {list.length === 0 ? (
        <p className="text-gray-500 text-sm">No hay registros en esta categoría.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((d) => (
            <button
              key={d.user_id}
              onClick={() => onSelect(d)}
              className="w-full text-left bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={d?.profiles?.avatar_url || '/avatar-fallback.png'}
                  alt="avatar"
                  className="w-12 h-12 rounded-full border-2 border-emerald-400 object-cover"
                />
                <div className="min-w-0">
                  <h2 className="font-semibold truncate">
                    {d?.profiles?.full_name || 'Sin nombre'}
                  </h2>
                  <p className="text-xs text-gray-500">
                    ID: {String(d.user_id).slice(0, 8)}...
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-700 mb-2">
                {d.bio || 'Sin descripción'}
              </p>

              <div className="text-xs text-gray-500 space-y-1">
                <p>🏙️ Ciudad: {d.city || 'No seleccionado'}</p>
                <p>🚗 Chapa: {d.vehicle_plate || '—'}</p>
                <p>
                  📍{' '}
                  {d.last_lat && d.last_lon
                    ? `${Number(d.last_lat).toFixed(3)}, ${Number(d.last_lon).toFixed(3)}`
                    : 'Sin ubicación'}
                </p>
                <p>
                  Estado:{' '}
                  <span className="font-semibold">
                    {d.driver_verified ? '✅ Verificado' : '⏳ Pendiente'}
                  </span>
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

/* ===================== MODAL DETALLE ===================== */

function DriverDetailModal({ driver, onClose, onVerify, busyUserId }) {
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState([]);
  const [preview, setPreview] = useState(null);

  const docsByType = useMemo(() => {
    const map = new Map();
    (docs || []).forEach((r) => map.set(r.doc_type, r));
    return map;
  }, [docs]);

  const docsComplete = useMemo(() => {
    // Completo si están todos los TAXI_DOCS y tiene chapa
    const hasAllDocs = TAXI_DOCS.every((d) => {
      const r = docsByType.get(d.key);
      const url = r?.file_url || r?.front_url || r?.back_url;
      return !!url;
    });
    return hasAllDocs && !!driver.vehicle_plate;
  }, [docsByType, driver.vehicle_plate]);

  useEffect(() => {
    if (!driver?.user_id) return;

    (async () => {
      setLoading(true);
      try {
        const { data: drows, error } = await supabase
          .from('documents')
          .select('doc_type, doc_number, front_url, back_url, file_url, created_at')
          .eq('user_id', driver.user_id)
          .in('doc_type', TAXI_DOCS.map((d) => d.key));

        if (error) throw error;
        setDocs(drows || []);
      } catch (e) {
        console.error(e);
        toast.error('Error cargando documentos del chofer');
      } finally {
        setLoading(false);
      }
    })();
  }, [driver?.user_id]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000]">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl p-6 relative overflow-y-auto max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <XCircle size={24} />
        </button>

        {loading ? (
          <div className="text-center py-10 text-gray-500">
            <Loader2 className="animate-spin w-5 h-5 mx-auto mb-2" />
            Cargando información...
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-4 mb-4">
              <img
                src={driver?.profiles?.avatar_url || '/avatar-fallback.png'}
                className="w-20 h-20 rounded-full border-4 border-emerald-500 object-cover"
                alt="avatar"
              />
              <div className="min-w-0">
                <h2 className="font-bold text-lg text-gray-800 truncate">
                  {driver?.profiles?.full_name || 'Sin nombre'}
                </h2>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <UserRound className="w-4 h-4" />
                  {driver?.profiles?.email || 'Sin email'}
                </p>
                <p className="text-sm text-gray-600">
                  📱 {driver?.profiles?.phone || 'Sin número'}
                </p>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {driver.city || 'Sin ciudad'} ·{' '}
                  {driver.last_lat && driver.last_lon
                    ? `${Number(driver.last_lat).toFixed(4)}, ${Number(driver.last_lon).toFixed(4)}`
                    : 'Sin ubicación'}
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">
                    🚗 {driver.vehicle_plate || 'Sin chapa'}
                  </span>
                  <span
                    className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                      driver.driver_verified
                        ? 'bg-emerald-100 text-emerald-700'
                        : docsComplete
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {driver.driver_verified
                      ? '✅ Verificado'
                      : docsComplete
                      ? '⏳ Listo para verificar'
                      : '📌 Incompleto'}
                  </span>
                </div>
              </div>
            </div>

            {/* Vehículo */}
            <div className="bg-gray-50 border rounded-2xl p-4 mb-4">
              <p className="font-extrabold text-gray-800 mb-2 flex items-center gap-2">
                <Car className="w-4 h-4" /> Datos del vehículo
              </p>
              <div className="text-sm text-gray-700 grid grid-cols-2 gap-2">
                <p>Marca: <b>{driver.vehicle_brand || '—'}</b></p>
                <p>Modelo: <b>{driver.vehicle_model || '—'}</b></p>
                <p>Color: <b>{driver.vehicle_color || '—'}</b></p>
                <p>Año: <b>{driver.vehicle_year || '—'}</b></p>
              </div>
            </div>

            {/* Documentos */}
            <h3 className="font-semibold text-emerald-700 mb-3 flex items-center gap-2">
              <FileText size={18} /> Documentos cargados (Taxi)
            </h3>

            <div className="space-y-3">
              {TAXI_DOCS.map((d) => {
                const r = docsByType.get(d.key);
                const url = r?.file_url || r?.front_url || r?.back_url || null;
                const isPDF = url ? String(url).toLowerCase().includes('.pdf') : false;

                return (
                  <div
                    key={d.key}
                    className="flex items-center justify-between gap-3 bg-gray-50 border rounded-xl p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {d.label}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {url ? '✅ Subido' : '⏳ Pendiente'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {url ? (
                        <button
                          type="button"
                          onClick={() => setPreview(url)}
                          className="text-[11px] px-3 py-2 rounded-xl bg-white border hover:bg-gray-100"
                        >
                          Ver
                        </button>
                      ) : (
                        <span className="text-[11px] text-gray-400">—</span>
                      )}

                      {url && isPDF && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] px-3 py-2 rounded-xl bg-white border hover:bg-gray-100"
                        >
                          Abrir PDF
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Acciones */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  if (!docsComplete) {
                    toast.warning('⚠️ No apruebes sin docs completos + chapa.');
                    return;
                  }
                  onVerify(driver.user_id, true);
                }}
                disabled={busyUserId === driver.user_id}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl py-3 text-sm transition disabled:opacity-60"
              >
                {busyUserId === driver.user_id ? '...' : '✅ Aprobar'}
              </button>

              <button
                onClick={() => onVerify(driver.user_id, false)}
                disabled={busyUserId === driver.user_id}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl py-3 text-sm transition disabled:opacity-60"
              >
                Rechazar
              </button>
            </div>
          </>
        )}

        {/* Preview */}
        {preview && (
          <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-[20000]"
            onClick={() => setPreview(null)}
          >
            <div className="relative bg-white p-3 rounded-xl shadow-xl max-w-[90%] max-h-[90%]">
              {String(preview).toLowerCase().includes('.pdf') ? (
                <iframe
                  src={preview}
                  className="w-[80vw] h-[80vh] rounded-xl"
                  title="Documento PDF"
                />
              ) : (
                <img
                  src={preview}
                  alt="Documento"
                  className="max-w-[80vw] max-h-[80vh] rounded-xl object-contain"
                />
              )}
              <button
                onClick={() => setPreview(null)}
                className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-2 hover:bg-black transition"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
