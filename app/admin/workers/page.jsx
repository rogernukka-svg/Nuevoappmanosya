'use client';

import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Loader2,
  FileText,
  ShieldCheck,
  RefreshCw,
  XCircle,
  Building,
} from 'lucide-react';
import '../../globals.css';

const supabase = getSupabase();

export default function AdminWorkersPage() {
  const [pending, setPending] = useState([]);
  const [verified, setVerified] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [selected, setSelected] = useState(null);

  // 📡 Cargar todos los trabajadores (pendientes y verificados)
async function fetchAll() {
  setLoading(true);
  try {
    const { data, error } = await supabase
      .from('admin_workers_view') // 👈 cambiamos la vista
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    // 🟥 Pendientes: no aprobados o inactivos
    setPending(
      data.filter(
        (w) => !w.worker_verified || !w.profile_verified || !w.is_active
      )
    );

    // 🟩 Activos: aprobados y activos
    setVerified(
      data.filter(
        (w) => w.worker_verified && w.profile_verified && w.is_active
      )
    );
  } catch (err) {
    console.error(err);
    toast.error('⚠️ Error cargando trabajadores');
  } finally {
    setLoading(false);
  }
}

useEffect(() => {
  fetchAll();
}, []);

  // ✅ Aprobar / rechazar trabajador
  async function handleVerify(userId, approve) {
    setBusy(userId);
    try {
      const { error: wpError } = await supabase
        .from('worker_profiles')
        .update({
          is_verified: approve,
          is_active: approve,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
      if (wpError) throw wpError;

      const { error: profError } = await supabase
        .from('profiles')
        .update({ is_verified: approve })
        .eq('id', userId);
      if (profError) throw profError;

      toast.success(
        approve
          ? '✅ Trabajador aprobado y publicado en el mapa'
          : '❌ Trabajador rechazado y ocultado'
      );

      await fetchAll();
      setSelected(null);
    } catch (err) {
      console.error(err);
      toast.error('Error al actualizar trabajador');
    } finally {
      setBusy(null);
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
              title="🕓 Trabajadores Pendientes"
              color="red"
              list={pending}
              onSelect={setSelected}
            />
            <Section
              title="✅ Trabajadores Activos"
              color="emerald"
              list={verified}
              onSelect={setSelected}
            />
          </>
        )}
      </main>

      <footer className="text-center text-xs text-gray-500 py-4 border-t border-gray-200 bg-white">
        © {new Date().getFullYear()}{' '}
        <span className="text-emerald-600 font-semibold">ManosYA</span> · Alto Paraná PY
      </footer>

      {selected && (
        <WorkerDetailModal
          worker={selected}
          onClose={() => setSelected(null)}
          onVerify={handleVerify}
          busy={busy}
        />
      )}
    </div>
  );
}

/* ============================================================ */
/* 🧩 COMPONENTES SECUNDARIOS */

function Header({ onRefresh }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold text-emerald-700 flex items-center gap-2">
        <ShieldCheck className="w-6 h-6" />
        Panel de Verificación de Trabajadores
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
      <Loader2 className="animate-spin w-5 h-5" /> Cargando información...
    </div>
  );
}

function Section({ title, color, list, onSelect }) {
  return (
    <section className="mb-10">
      <h2
        className={`text-xl font-bold mb-4 ${
          color === 'red' ? 'text-red-600' : 'text-emerald-600'
        }`}
      >
        {title} ({list.length})
      </h2>

      {list.length === 0 ? (
        <p className="text-gray-500 text-sm">No hay registros en esta categoría.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((w) => (
            <button
              key={w.user_id}
              onClick={() => onSelect(w)}
              className="w-full text-left bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={w.avatar_url || '/avatar-fallback.png'}
                  alt="avatar"
                  className="w-12 h-12 rounded-full border-2 border-emerald-400 object-cover"
                />
                <div>
                  <h2 className="font-semibold">{w.full_name || 'Sin nombre'}</h2>
                  <p className="text-xs text-gray-500">
                    ID: {w.user_id.slice(0, 8)}...
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-2">
                {w.bio || 'Sin descripción'}
              </p>
              <p className="text-xs text-gray-500 mb-2">
                Experiencia: {w.years_experience || 0} años
              </p>
              <p className="text-xs text-gray-500">
                📍{' '}
                {w.lat && w.lng
                  ? `${w.lat.toFixed(3)}, ${w.lng.toFixed(3)}`
                  : 'Sin ubicación'}
              </p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
/* ============================================================ */
/* 🧩 MODAL DETALLE */

function WorkerDetailModal({ worker, onClose, onVerify, busy }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!worker) return;
    (async () => {
      setLoading(true);
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name, created_at')
          .eq('id', worker.user_id)
          .maybeSingle();

        const { data: docs } = await supabase
          .from('documents')
          .select('doc_type, doc_number, front_url, back_url, file_url')
          .eq('user_id', worker.user_id);

        const { data: bank } = await supabase
          .from('bank_accounts')
          .select(
            'bank_name, account_type, account_number, holder_name, holder_document'
          )
          .eq('user_id', worker.user_id)
          .maybeSingle();

        setDetails({ profile, docs, bank });
      } catch (err) {
        toast.error('Error cargando detalles');
      } finally {
        setLoading(false);
      }
    })();
  }, [worker]);

  const getDocLabel = (type) => {
    switch (type) {
      case 'POLICE':
        return 'Antecedente Policial';
      case 'CI':
        return 'Cédula de Identidad';
      case 'DNI':
        return 'Documento Nacional de Identidad';
      case 'PASSPORT':
        return 'Pasaporte';
      default:
        return type;
    }
  };

  const parseSkills = (skills) => {
    if (!skills) return [];
    if (Array.isArray(skills)) return skills;
    if (typeof skills === 'string') return skills.split(',').map((s) => s.trim());
    return [];
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000]">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-6 relative overflow-y-auto max-h-[90vh]">
        {/* ❌ BOTÓN CERRAR */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <XCircle size={24} />
        </button>

        {/* 🔄 ESTADO DE CARGA */}
        {loading ? (
          <div className="text-center py-10 text-gray-500">
            <Loader2 className="animate-spin w-5 h-5 mx-auto mb-2" />
            Cargando información completa...
          </div>
        ) : (
          <>
            {/* 👤 ENCABEZADO */}
            <div className="flex items-center gap-4 mb-4">
              <img
                src={worker.avatar_url || '/avatar-fallback.png'}
                className="w-20 h-20 rounded-full border-4 border-emerald-500 object-cover"
                alt="avatar"
              />
              <div>
                <h2 className="font-bold text-lg text-gray-800">
                  {worker.full_name || 'Sin nombre'}
                </h2>
                <p className="text-sm text-gray-600">
                  {details?.profile?.email || 'Sin email'}
                </p>
                <p className="text-xs text-gray-400">
                  Registrado:{' '}
                  {details?.profile?.created_at
                    ? new Date(details.profile.created_at).toLocaleString('es-AR')
                    : 'Sin fecha'}
                </p>
              </div>
            </div>

            {/* 🧠 BIO + OFICIOS */}
            <div className="mb-4">
              <p className="italic text-gray-700 text-sm mb-2">
                “{worker.bio || 'Sin descripción'}”
              </p>
              <div>
                <span className="text-sm font-semibold text-gray-600">
                  Oficios:
                </span>
                {parseSkills(worker.skills).length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {parseSkills(worker.skills).map((skill, idx) => (
                      <span
                        key={idx}
                        className="bg-emerald-100 text-emerald-700 text-xs font-medium px-2.5 py-1 rounded-full border border-emerald-300"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm mt-1">
                    Sin oficios registrados
                  </p>
                )}
              </div>
            </div>

            <hr className="my-4" />

            {/* 📄 DOCUMENTOS */}
            <h3 className="font-semibold text-emerald-700 mb-3 flex items-center gap-2">
              <FileText size={18} /> Documentos cargados
            </h3>

            {details?.docs?.length ? (
              details.docs.map((d, i) => (
                <div key={i} className="text-sm text-gray-700 mb-5">
                  <div className="font-semibold text-gray-800 mb-2">
                    {getDocLabel(d.doc_type)} — {d.doc_number || 'Sin número'}
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    {['front_url', 'back_url', 'file_url'].map((key) => {
                      const url = d[key];
                      if (!url) return null;
                      const isPDF = url.endsWith('.pdf');
                      return (
                        <div key={key} className="relative group">
                          {isPDF ? (
                            <iframe
                              src={url}
                              className="w-32 h-40 border rounded-lg shadow-sm"
                              title={key}
                            />
                          ) : (
                            <img
                              src={url}
                              alt={key}
                              className="w-32 h-32 object-cover rounded-lg shadow cursor-pointer hover:scale-[1.05] transition"
                              onClick={() => setPreview(url)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">Sin documentos cargados</p>
            )}

            <hr className="my-4" />

            {/* 🏦 DATOS BANCARIOS */}
            <h3 className="font-semibold text-emerald-700 mb-2 flex items-center gap-2">
              <Building size={18} /> Datos bancarios
            </h3>

            {details?.bank ? (
              <div className="text-sm text-gray-700 space-y-1 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                <p>
                  🏦 Banco:{' '}
                  <span className="font-medium">
                    {details.bank.bank_name || 'No informado'}
                  </span>
                </p>
                <p>
                  💳 Nro. de cuenta:{' '}
                  <span className="font-medium">
                    {details.bank.account_number}
                  </span>
                </p>
                <p>
                  Titular:{' '}
                  <span className="font-medium">
                    {details.bank.holder_name}
                  </span>
                </p>
                <p>
                  Documento:{' '}
                  <span className="font-medium">
                    {details.bank.holder_document}
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Sin cuenta bancaria cargada
              </p>
            )}

            {/* ✅ BOTONES DE ACCIÓN */}
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  if (!details?.docs || details.docs.length === 0) {
                    toast.warning(
                      '⚠️ No se puede aprobar un trabajador sin documentos cargados.'
                    );
                    return;
                  }
                  onVerify(worker.user_id, true);
                }}
                disabled={busy === worker.user_id}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg py-2 text-sm transition"
              >
                {busy === worker.user_id ? '...' : '✅ Aprobar'}
              </button>

              <button
                onClick={() => onVerify(worker.user_id, false)}
                disabled={busy === worker.user_id}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg py-2 text-sm transition"
              >
                Rechazar
              </button>
            </div>
          </>
        )}

        {/* 🔍 PREVIEW DOCUMENTO */}
        {preview && (
          <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-[20000]"
            onClick={() => setPreview(null)}
          >
            <div className="relative bg-white p-3 rounded-xl shadow-xl max-w-[90%] max-h-[90%]">
              {preview.endsWith('.pdf') ? (
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