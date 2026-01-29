'use client';

import '../../globals.css';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Loader2,
  MapPin,
  UploadCloud,
  Car,
  ShieldCheck,
  FileText,
  ExternalLink,
} from 'lucide-react';

const supabase = getSupabase();

/* DocTypes Taxi (deben coincidir con tu SQL) */
const TAXI_DOCS = [
  { key: 'TAXI_LICENSE_FRONT', label: 'Licencia (frente)', accept: 'image/*,application/pdf' },
  { key: 'TAXI_LICENSE_BACK', label: 'Licencia (dorso)', accept: 'image/*,application/pdf' },
  { key: 'TAXI_VEHICLE_REG', label: 'Cédula verde / Registro', accept: 'image/*,application/pdf' },
  { key: 'TAXI_INSURANCE', label: 'Seguro (póliza)', accept: 'image/*,application/pdf' },
  { key: 'TAXI_VEHICLE_PHOTO_FRONT', label: 'Foto vehículo (frente)', accept: 'image/*' },
  { key: 'TAXI_VEHICLE_PHOTO_BACK', label: 'Foto vehículo (atrás)', accept: 'image/*' },
  { key: 'TAXI_VEHICLE_PHOTO_SIDE', label: 'Foto vehículo (lateral)', accept: 'image/*' },
  { key: 'POLICE', label: 'Antecedente policial', accept: 'image/*,application/pdf' },
];

const CITIES = [
  { value: '', label: 'Seleccioná una ciudad' },
  { value: 'cde', label: 'Ciudad del Este' },
  { value: 'minga', label: 'Minga Guazú' },
  { value: 'hernandarias', label: 'Hernandarias' },
  { value: 'pfranco', label: 'Presidente Franco' },
  { value: 'asuncion', label: 'Asunción' },
];

export default function DriverOnboardPage() {
  const router = useRouter();
  const [loadingPage, setLoadingPage] = useState(true);
  const [user, setUser] = useState(null);

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

  return <DriverForm user={user} />;
}

function DriverForm({ user }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Perfil base
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Driver profile
  const [active, setActive] = useState(true);
  const [city, setCity] = useState('');
  const [coords, setCoords] = useState(null);

  // Vehículo
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');

  // Docs URLs por tipo
  const [docs, setDocs] = useState(() => Object.fromEntries(TAXI_DOCS.map((d) => [d.key, null])));

  // ✅ Aceptación legal
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  // ✅ Estado verificación (admin)
  const [taxiVerified, setTaxiVerified] = useState(false);

  // ✅ Si completó (subió docs + chapa)
  const docsComplete = useMemo(() => {
    return TAXI_DOCS.every((d) => !!docs[d.key]) && !!vehiclePlate;
  }, [docs, vehiclePlate]);

  // Carga inicial
  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      setLoading(true);
      try {
        // profiles
        const { data: p } = await supabase
          .from('profiles')
          .select('full_name, phone, avatar_url')
          .eq('id', user.id)
          .maybeSingle();

        if (p) {
          setFullName(p.full_name || '');
          setPhone(p.phone || '');
          setAvatarUrl(p.avatar_url || '');
        }

        // driver_profiles (+ taxi_verified + taxi_docs_complete si existen)
        const { data: dp } = await supabase
          .from('driver_profiles')
          .select(
            'is_active, city, last_lat, last_lon, vehicle_plate, vehicle_brand, vehicle_model, vehicle_color, vehicle_year, taxi_verified, taxi_docs_complete'
          )
          .eq('user_id', user.id)
          .maybeSingle();

        if (dp) {
          setActive(dp.is_active ?? true);
          setCity(dp.city || '');
          if (dp.last_lat && dp.last_lon) setCoords({ lat: dp.last_lat, lon: dp.last_lon });

          setVehiclePlate(dp.vehicle_plate || '');
          setVehicleBrand(dp.vehicle_brand || '');
          setVehicleModel(dp.vehicle_model || '');
          setVehicleColor(dp.vehicle_color || '');
          setVehicleYear(dp.vehicle_year ? String(dp.vehicle_year) : '');

          setTaxiVerified(!!dp.taxi_verified);

          // ✅ Si ya estaba verificado, mandalo directo a pedidos/notificaciones
          // (evita que vuelva al onboard)
          if (dp.taxi_verified) {
            router.replace('/driver/requests'); // 👈 tu pantalla de notificaciones/pedidos
            return;
          }
        }

        // documents taxi
        const { data: drows } = await supabase
          .from('documents')
          .select('doc_type, file_url, front_url, back_url')
          .eq('user_id', user.id)
          .in('doc_type', TAXI_DOCS.map((d) => d.key));

        if (drows?.length) {
          const next = { ...docs };
          for (const r of drows) {
            next[r.doc_type] = r.file_url || r.front_url || r.back_url || null;
          }
          setDocs(next);
        }
      } catch (e) {
        console.error(e);
        toast.error('No se pudo cargar tu perfil de taxista');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function handleAvatarUpload(file) {
    if (!file || !user?.id) return;
    try {
      const path = `${user.id}/avatar_${Date.now()}.jpg`;
      const { error } = await supabase.storage.from('avatars').upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = data.publicUrl;

      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
      setAvatarUrl(url);
      toast.success('🖼️ Foto actualizada');
    } catch (e) {
      toast.error('No se pudo subir la foto: ' + e.message);
    }
  }

  async function saveLocation() {
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(
          (p) => res({ lat: p.coords.latitude, lon: p.coords.longitude }),
          rej,
          { enableHighAccuracy: true, timeout: 8000 }
        )
      );
      setCoords(pos);

      await supabase.from('driver_profiles').upsert(
        {
          user_id: user.id,
          last_lat: pos.lat,
          last_lon: pos.lon,
        },
        { onConflict: 'user_id' }
      );

      toast.success('📍 Ubicación guardada');
    } catch (e) {
      toast.error('No se pudo obtener ubicación: ' + e.message);
    }
  }

  async function uploadTaxiDoc(docType, file) {
    if (!file || !user?.id) return;
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${docType}_${Date.now()}.${ext}`;

      const { error } = await supabase.storage.from('worker-docs').upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });
      if (error) throw error;

      const { data } = supabase.storage.from('worker-docs').getPublicUrl(path);
      const url = data.publicUrl;

      await supabase.from('documents').upsert(
        { user_id: user.id, doc_type: docType, file_url: url },
        { onConflict: 'user_id,doc_type' }
      );

      setDocs((prev) => ({ ...prev, [docType]: url }));
      toast.success('🚕 Documento subido');
    } catch (e) {
      toast.error('No se pudo subir: ' + e.message);
    }
  }

  async function saveAll(e) {
    e?.preventDefault?.();
    if (!user?.id) return;

    // ✅ Validación legal antes de guardar
    if (!acceptTerms || !acceptPrivacy) {
      toast.error('Debés aceptar los Términos y la Política de Privacidad para continuar.');
      return;
    }

    // ✅ Si quiere “activar” pero no completó docs, avisar
    if (!docsComplete) {
      toast.error('Completá todos los documentos y la chapa para enviar a verificación.');
      return;
    }

    setBusy(true);
    try {
      // profiles
      await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone,
          role: 'taxi',
        })
        .eq('id', user.id);

      // driver_profiles
      await supabase.from('driver_profiles').upsert(
        {
          user_id: user.id,
          is_active: active,
          city: city || null,
          last_lat: coords?.lat ?? null,
          last_lon: coords?.lon ?? null,

          vehicle_plate: vehiclePlate || null,
          vehicle_brand: vehicleBrand || null,
          vehicle_model: vehicleModel || null,
          vehicle_color: vehicleColor || null,
          vehicle_year: vehicleYear ? Number(vehicleYear) : null,

          // ✅ Marcar “completo” (admin aún debe verificar)
          taxi_docs_complete: true,
        },
        { onConflict: 'user_id' }
      );

      toast.success('✅ Perfil enviado. Estado: En verificación');

      // ✅ Redirección:
      // - si está verificado → pedidos/notificaciones
      // - si NO está verificado → pantalla “en verificación”
      const { data: dp2 } = await supabase
        .from('driver_profiles')
        .select('taxi_verified, taxi_docs_complete')
        .eq('user_id', user.id)
        .maybeSingle();

      if (dp2?.taxi_verified) {
        router.push('/driver/requests'); // 👈 pedidos/notificaciones
      } else {
        router.push('/driver/pending'); // 👈 “En verificación”
      }
    } catch (e2) {
      console.error(e2);
      toast.error('❌ No se pudo guardar: ' + (e2.message || e2));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] text-gray-600">
        <Loader2 className="animate-spin w-6 h-6 mr-2" />
        Cargando perfil de taxista...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-6 py-8">
      <div className="max-w-md mx-auto bg-white rounded-3xl border border-gray-200 shadow-[0_18px_60px_rgba(0,0,0,0.08)] p-6">
        <div className="text-center mb-5">
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center justify-center gap-2">
            <Car className="w-6 h-6 text-gray-900" />
            Activar perfil de Chofer
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Gestión 360: documentación + reputación para cobrar mejor y acceder a beneficios.
          </p>

          {/* ✅ Badge de estado */}
          <div className="mt-3">
            {taxiVerified ? (
              <span className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700">
                ✅ Verificado
              </span>
            ) : docsComplete ? (
              <span className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-amber-100 text-amber-700">
                ⏳ En verificación
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-gray-100 text-gray-600">
                📌 Completar perfil
              </span>
            )}
          </div>
        </div>

        <form onSubmit={saveAll} className="space-y-5">
          {/* Avatar */}
          <div className="bg-gray-50 rounded-2xl p-4 border">
            <div className="flex items-center gap-3">
              <img
                src={avatarUrl || '/avatar-fallback.png'}
                className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500"
                alt="avatar"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">Foto de perfil</p>
                <p className="text-[11px] text-gray-500">Esta foto aparece en el mapa.</p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-white border cursor-pointer hover:bg-gray-100">
                <UploadCloud className="w-4 h-4" /> Subir
                <input hidden type="file" accept="image/*" onChange={(e) => handleAvatarUpload(e.target.files?.[0])} />
              </label>
            </div>
          </div>

          {/* Datos base */}
          <div className="grid gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700">Nombre y apellido</label>
              <input
                className="w-full mt-1 border rounded-xl p-2.5 bg-gray-50 focus:ring-2 focus:ring-emerald-400 outline-none"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej: Juan Pérez"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700">Teléfono</label>
              <input
                className="w-full mt-1 border rounded-xl p-2.5 bg-gray-50 focus:ring-2 focus:ring-emerald-400 outline-none"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej: 0984 123 456"
              />
            </div>
          </div>

          {/* Ciudad + Estado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700">Ciudad</label>
              <select
                className="w-full mt-1 border rounded-xl p-2.5 bg-gray-50 focus:ring-2 focus:ring-emerald-400 outline-none"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                {CITIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700">Estado</label>
              <select
                className="w-full mt-1 border rounded-xl p-2.5 bg-gray-50 focus:ring-2 focus:ring-emerald-400 outline-none"
                value={active ? 'activo' : 'pausado'}
                onChange={(e) => setActive(e.target.value === 'activo')}
              >
                <option value="activo">✅ Disponible</option>
                <option value="pausado">⏸️ Pausado</option>
              </select>
            </div>
          </div>

          {/* Ubicación */}
          <div className="bg-white rounded-2xl p-4 border">
            <button
              type="button"
              onClick={saveLocation}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition"
            >
              <MapPin className="w-4 h-4" />
              Guardar ubicación actual
            </button>
            {coords && (
              <p className="text-[11px] text-gray-500 mt-2 text-center">
                📍 Lat {coords.lat?.toFixed(4)} · Lon {coords.lon?.toFixed(4)}
              </p>
            )}
          </div>

          {/* Vehículo */}
          <div className="bg-gray-50 rounded-2xl p-4 border">
            <p className="text-sm font-extrabold text-gray-800 mb-3 flex items-center gap-2">
              <Car className="w-4 h-4" /> Datos del vehículo
            </p>
            <div className="grid gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700">Chapa (obligatorio)</label>
                <input
                  className="w-full mt-1 border rounded-xl p-2.5 bg-white focus:ring-2 focus:ring-emerald-400 outline-none"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                  placeholder="ABC 123"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Marca</label>
                  <input
                    className="w-full mt-1 border rounded-xl p-2.5 bg-white"
                    value={vehicleBrand}
                    onChange={(e) => setVehicleBrand(e.target.value)}
                    placeholder="Toyota"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Modelo</label>
                  <input
                    className="w-full mt-1 border rounded-xl p-2.5 bg-white"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder="Vitz"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Color</label>
                  <input
                    className="w-full mt-1 border rounded-xl p-2.5 bg-white"
                    value={vehicleColor}
                    onChange={(e) => setVehicleColor(e.target.value)}
                    placeholder="Blanco"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Año</label>
                  <input
                    type="number"
                    min={1980}
                    max={2099}
                    className="w-full mt-1 border rounded-xl p-2.5 bg-white"
                    value={vehicleYear}
                    onChange={(e) => setVehicleYear(e.target.value)}
                    placeholder="2016"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Documentos */}
          <div className="bg-white rounded-2xl p-4 border">
            <p className="text-sm font-extrabold text-gray-800 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Verificación Taxi (Gestión 360)
            </p>
            <p className="text-[11px] text-gray-500 mb-3">
              Subí los documentos. El modo Taxi se activa cuando esté completo (y aprobado).
            </p>

            <div className="space-y-3">
              {TAXI_DOCS.map((d) => (
                <div key={d.key} className="flex items-center justify-between gap-3 bg-gray-50 border rounded-xl p-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{d.label}</p>
                    <p className="text-[11px] text-gray-500 truncate">{docs[d.key] ? '✅ Subido' : '⏳ Pendiente'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {docs[d.key] && (
                      <a
                        href={docs[d.key]}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] px-2 py-1 rounded-lg bg-white border hover:bg-gray-100"
                      >
                        Ver
                      </a>
                    )}
                    <label className="text-[11px] px-3 py-2 rounded-xl bg-white border cursor-pointer hover:bg-gray-100">
                      Subir
                      <input hidden type="file" accept={d.accept} onChange={(e) => uploadTaxiDoc(d.key, e.target.files?.[0])} />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 text-center text-[11px]">
              {taxiVerified ? (
                <span className="text-emerald-700 font-semibold">✅ Aprobado (Taxi activado)</span>
              ) : docsComplete ? (
                <span className="text-amber-700 font-semibold">⏳ Documentación completa — En verificación</span>
              ) : (
                <span className="text-gray-500">Completá todo para enviar a verificación</span>
              )}
            </div>
          </div>

          {/* ✅ Términos y Condiciones + Privacidad (AL FINAL) */}
          <div className="bg-gray-50 rounded-2xl p-4 border">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <FileText className="w-5 h-5 text-gray-900" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-extrabold text-gray-900">Términos, condiciones y privacidad</p>
                <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                  Para activar tu perfil, necesitás aceptar los términos de uso y la política de privacidad. Esto protege a clientes y
                  choferes (Gestión 360: identidad, documentación y reputación).
                </p>

                <div className="mt-3 space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="mt-1 accent-emerald-600"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                    />
                    <span className="text-[12px] text-gray-800">
                      Acepto los{' '}
                      <a
                        href="/legal/terms"
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-700 font-semibold underline inline-flex items-center gap-1"
                      >
                        Términos y Condiciones <ExternalLink className="w-3 h-3" />
                      </a>
                    </span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="mt-1 accent-emerald-600"
                      checked={acceptPrivacy}
                      onChange={(e) => setAcceptPrivacy(e.target.checked)}
                    />
                    <span className="text-[12px] text-gray-800">
                      Acepto la{' '}
                      <a
                        href="/legal/privacy"
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-700 font-semibold underline inline-flex items-center gap-1"
                      >
                        Política de Privacidad <ExternalLink className="w-3 h-3" />
                      </a>
                    </span>
                  </label>
                </div>

                <div className="mt-3 text-[11px] text-gray-500">
                  Al continuar, declarás que la información y documentos subidos son reales y autorizás su verificación para fines de
                  seguridad, prevención de fraudes y mejora del servicio.
                </div>
              </div>
            </div>
          </div>

          {/* Guardar */}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-2xl bg-gray-900 text-white font-extrabold hover:bg-black transition disabled:opacity-60"
          >
            {busy ? 'Guardando...' : docsComplete ? '✅ Enviar a verificación' : '✅ Guardar perfil de taxista'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/role-selector')}
            className="w-full py-2.5 rounded-2xl bg-white border font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            Volver
          </button>

          {/* Acceso rápido (opcional) */}
          <button
            type="button"
            onClick={() => router.push('/driver/requests')}
            className="w-full py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 font-semibold text-emerald-700 hover:bg-emerald-100 transition"
          >
            Ir a notificaciones / pedidos
          </button>
        </form>
      </div>
    </div>
  );
}
