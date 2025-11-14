'use client';

import '../../globals.css';
import { useEffect, useMemo, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
const supabase = getSupabase();

/* ====================== CONFIG ====================== */
const ALL_SKILLS = [
  { slug: 'limpieza', name: '🧹 Limpieza' },
  { slug: 'plomeria', name: '🔧 Plomería' },
  { slug: 'jardineria', name: '🌿 Jardinería / Césped' },
  { slug: 'electricidad', name: '⚡ Electricidad' },
  { slug: 'auxilio-vehicular', name: '🚗 Auxilio vehicular' },
  { slug: 'fletes', name: '🚚 Fletes y mudanzas' },
];

const RADII = [3, 5, 10, 15, 20];
const DOC_TYPES = [
  { value: 'CI', label: 'Cédula de Identidad (CI)' },
  { value: 'DNI', label: 'Documento Nacional de Identidad (DNI)' },
  { value: 'PASSPORT', label: 'Pasaporte' },
];

/* ====================== PAGE ====================== */
export default function WorkerOnboardPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user ?? null);
    });
  }, []);

  return (
    <div className="container py-6">
      <header className="mb-8 text-center">
        <h1 className="font-heading text-3xl font-extrabold bg-gradient-to-r from-emerald-500 to-cyan-500 text-transparent bg-clip-text">
          Activar Perfil Profesional
        </h1>
        <p className="text-gray-600 text-sm mt-2 max-w-xl mx-auto">
          Subí tu foto, elegí tus oficios, definí tu radio de trabajo, cargá tus documentos,
          completá tus datos bancarios y empezá a recibir pedidos con <b>ManosYA</b>.
        </p>
      </header>

      {/* ✅ Si el admin ya verificó al trabajador */}
      {user ? (
        <OnboardForm user={user} />
      ) : (
        <div className="text-center text-gray-500 py-10">
          Cargando tu perfil...
        </div>
      )}
    </div>
  );
}

/* ====================== FORM ====================== */
function OnboardForm({ user }) {
  const [loading, setLoading] = useState(true);

  // Perfil base
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [avgRating, setAvgRating] = useState(null);
  const [phone, setPhone] = useState('');
  const [openAvatar, setOpenAvatar] = useState(false);

  // Profesional
  const [active, setActive] = useState(true);
  const [skills, setSkills] = useState([]);
  const [radius, setRadius] = useState(5);
  const [coords, setCoords] = useState(null);
  const [bio, setBio] = useState('');
  const [yearsExp, setYearsExp] = useState('');

  // Documentación (KYC)
  const [docType, setDocType] = useState('CI');
  const [docNumber, setDocNumber] = useState('');
  const [frontUrl, setFrontUrl] = useState(null);
  const [backUrl, setBackUrl] = useState(null);
  const [policeUrl, setPoliceUrl] = useState(null);

  // Datos bancarios
  const [bankName, setBankName] = useState('');
  const [accountType, setAccountType] = useState('ahorro'); // ahorro | corriente
  const [accountNumber, setAccountNumber] = useState('');
  const [holderName, setHolderName] = useState('');
  const [holderDoc, setHolderDoc] = useState('');

  // Política de privacidad
const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  /* --------- CARGA INICIAL --------- */
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const { data: p } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, is_verified, phone')


          .eq('id', user.id)
          .maybeSingle();

        if (p) {
          setFullName(p.full_name || '');
          setAvatarUrl(p.avatar_url || null);
          setIsVerified(!!p.is_verified);
           setPhone(p.phone || ''); // 👈 AGREGADO
        }

        const { data: reviews } = await supabase
          .from('reviews')
          .select('rating')
          .eq('worker_id', user.id);

        if (reviews?.length) {
          const avg =
            reviews.reduce((acc, r) => acc + (r?.rating || 0), 0) / reviews.length;
          setAvgRating(avg.toFixed(1));
        }

        const { data: wp } = await supabase
          .from('worker_profiles')
          .select(
            'is_active, radius_km, bio, years_experience, last_lat, last_lon, skills'
          )
          .eq('user_id', user.id)
          .maybeSingle();

        if (wp) {
          setActive(wp.is_active ?? true);
          setRadius(wp.radius_km ?? 5);
          setBio(wp.bio ?? '');
          setYearsExp(wp.years_experience ?? '');
          if (wp.last_lat && wp.last_lon) setCoords({ lat: wp.last_lat, lon: wp.last_lon });
          if (wp.skills) setSkills(Array.isArray(wp.skills) ? wp.skills : wp.skills?.split?.(',') || []);
        }

        const { data: docs } = await supabase
          .from('documents')
          .select('doc_type, doc_number, front_url, back_url, file_url')
          .eq('user_id', user.id);

        if (docs?.length) {
          const idDoc = docs.find(d => ['CI', 'DNI', 'PASSPORT'].includes(d.doc_type));
          if (idDoc) {
            setDocType(idDoc.doc_type);
            setDocNumber(idDoc.doc_number || '');
            setFrontUrl(idDoc.front_url || null);
            setBackUrl(idDoc.back_url || null);
          }
          const police = docs.find(d => d.doc_type === 'POLICE');
          if (police) setPoliceUrl(police.file_url || null);
        }

        const { data: bank } = await supabase
          .from('bank_accounts')
          .select(
            'bank_name, account_type, account_number, holder_name, holder_document'
          )
          .eq('user_id', user.id)
          .maybeSingle();

        if (bank) {
          setBankName(bank.bank_name || '');
          setAccountType(bank.account_type || 'ahorro');
          setAccountNumber(bank.account_number || '');
          setHolderName(bank.holder_name || '');
          setHolderDoc(bank.holder_document || '');
        }
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  /* --------- HELPERS --------- */
  const canSave = useMemo(() => fullName && radius > 0, [fullName, radius]);

  async function handleAvatar(e) {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    try {
      const path = `${user.id}/avatar_${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, file, { cacheControl: '3600', upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = data.publicUrl;
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
      setAvatarUrl(url);
      setMsg('🖼️ Foto de perfil actualizada.');
    } catch (e) {
      setErr('No se pudo subir la foto: ' + e.message);
    }
  }

  async function saveLocation() {
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(
          (p) => res({ lat: p.coords.latitude, lon: p.coords.longitude }),
          rej,
          { enableHighAccuracy: true }
        )
      );
      setCoords(pos);
      await supabase
        .from('worker_profiles')
        .upsert(
          {
            user_id: user.id,
            last_lat: pos.lat,
            last_lon: pos.lon,
          },
          { onConflict: 'user_id' }
        );
      setMsg('📍 Ubicación guardada.');
    } catch (e) {
      setErr('No se pudo obtener ubicación: ' + e.message);
    }
  }

  async function uploadIdentity(side, file) {
    if (!file || !user?.id) return;
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${side}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('worker-docs').upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from('worker-docs').getPublicUrl(path);
      const url = data.publicUrl;

      const patch = side === 'front' ? { front_url: url } : { back_url: url };
      await supabase.from('documents').upsert(
        {
          user_id: user.id,
          doc_type: docType,
          doc_number: docNumber,
          ...patch,
        },
        { onConflict: 'user_id,doc_type' }
      );

      if (side === 'front') setFrontUrl(url);
      else setBackUrl(url);
      setMsg('📄 Documento subido.');
    } catch (e) {
      setErr('No se pudo subir el documento: ' + e.message);
    }
  }

  async function uploadPoliceRecord(file) {
    if (!file || !user?.id) return;
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/police_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('worker-docs').upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from('worker-docs').getPublicUrl(path);
      const url = data.publicUrl;
      await supabase.from('documents').upsert(
        { user_id: user.id, doc_type: 'POLICE', file_url: url },
        { onConflict: 'user_id,doc_type' }
      );
      setPoliceUrl(url);
      setMsg('🛡️ Antecedente policial subido.');
    } catch (e) {
      setErr('No se pudo subir el antecedente policial: ' + e.message);
    }
  }

  async function saveAll(e) {
    e?.preventDefault?.();
    if (!user?.id) return;

    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      await supabase
  .from('profiles')
  .update({
    full_name: fullName,
     phone: phone, // 👈 GUARDAR TELÉFONO
    accepted_privacy: acceptedPrivacy,
    privacy_accepted_at: acceptedPrivacy ? new Date().toISOString() : null,
  })
  .eq('id', user.id);


      await supabase.from('worker_profiles').upsert(
        {
          user_id: user.id,
          is_active: active,
          radius_km: radius,
          bio,
          years_experience: Number(yearsExp) || null,
          last_lat: coords?.lat ?? null,
          last_lon: coords?.lon ?? null,
          skills,
        },
        { onConflict: 'user_id' }
      );

      if (docNumber) {
        await supabase.from('documents').upsert(
          {
            user_id: user.id,
            doc_type: docType,
            doc_number: docNumber,
            front_url: frontUrl,
            back_url: backUrl,
          },
          { onConflict: 'user_id,doc_type' }
        );
      }

      await supabase.from('bank_accounts').upsert(
        {
          user_id: user.id,
          bank_name: bankName || null,
          account_type: accountType || null,
          account_number: accountNumber || null,
          holder_name: holderName || null,
          holder_document: holderDoc || null,
        },
        { onConflict: 'user_id' }
      );

      setMsg('✅ Perfil guardado y activado correctamente.');
    } catch (e) {
      setErr('❌ ' + (e.message || e));
    } finally {
      setBusy(false);
    }
  }

  /* --------- UI --------- */
  if (loading) {
    return (
      <div className="text-center py-10 text-gray-500">
        Cargando perfil profesional...
      </div>
    );
  }

  return (
    <form
      onSubmit={saveAll}
      className="space-y-8 max-w-2xl mx-auto bg-[#f9fafb] py-6 px-3 rounded-2xl"
    >
     {/* === PERFIL === */}
<section className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
  <h2 className="font-semibold text-gray-700 border-l-4 border-emerald-500 pl-3 mb-4">
    Tu perfil
  </h2>

  {/* 🧑‍🔧 Avatar con verificación azul */}
  <div className="flex flex-col items-center gap-3 relative">
    <div className="relative">
      <img
        src={avatarUrl || '/avatar-fallback.png'}
        alt="avatar"
        onClick={() => setOpenAvatar(true)}
        className="w-24 h-24 rounded-full border-4 border-emerald-500 object-cover cursor-pointer hover:opacity-80 transition"
      />

      {/* Modal para ver foto grande */}
      {openAvatar && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
          onClick={() => setOpenAvatar(false)}
        >
          <img
            src={avatarUrl || '/avatar-fallback.png'}
            className="w-72 h-72 rounded-2xl border-4 border-white object-cover shadow-xl"
          />
        </div>
      )}

      {/* Verificado */}
      {isVerified && (
        <span
          title="Verificado por ManosYA"
          className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-[5px] border-2 border-white shadow-md flex items-center justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="white"
            className="w-3.5 h-3.5"
          >
            <path
              fillRule="evenodd"
              d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10zm-5.707-3.707a1 1 0 00-1.414 0L10 13.172l-1.879-1.88a1 1 0 00-1.414 1.415l2.586 2.586a1 1 0 001.414 0l5.586-5.586a1 1 0 000-1.415z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      )}
    </div>

    <label className="text-sm text-emerald-600 cursor-pointer font-medium">
      Cambiar foto
      <input type="file" hidden accept="image/*" onChange={handleAvatar} />
    </label>
  </div>

  {/* 🧾 Nombre */}
  <div className="mt-4">
    <label className="text-sm font-semibold text-gray-700 mb-1 block">
      Nombre y apellido
    </label>
    <input
      className="w-full border rounded-lg p-2 bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none"
      value={fullName}
      onChange={(e) => setFullName(e.target.value)}
      placeholder="Ej: Juan Pérez"
    />
  </div>

  {/* 📱 Teléfono */}
  <div className="mt-4">
    <label className="text-sm font-semibold text-gray-700 mb-1 block">
      Número de teléfono
    </label>
    <input
      className="w-full border rounded-lg p-2 bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none"
      value={phone}
      onChange={(e) => setPhone(e.target.value)}
      placeholder="Ej: 0984 123 456"
    />
  </div>

  {/* 🏅 Badges */}
  <div className="flex flex-wrap gap-2 mt-3">
    {isVerified && (
      <span className="bg-blue-500/10 text-blue-600 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
        ✓ Verificado por ManosYA
      </span>
    )}
    {avgRating && (
      <span className="bg-yellow-400/15 text-yellow-700 px-3 py-1 rounded-full text-xs font-semibold">
        ⭐ {avgRating}/5
      </span>
    )}
  </div>
</section>


      {/* === OFICIOS === */}
      <section className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
        <h2 className="font-semibold text-gray-700 border-l-4 border-emerald-500 pl-3 mb-4">
          Tus oficios
        </h2>

        <div className="flex flex-wrap gap-2">
          {ALL_SKILLS.map((s) => {
            const on = skills.includes(s.slug);
            return (
              <button
                key={s.slug}
                type="button"
                onClick={() =>
                  setSkills(on ? skills.filter((x) => x !== s.slug) : [...skills, s.slug])
                }
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition ${
                  on
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {s.name}
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">
              Radio de trabajo
            </label>
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full border rounded-lg p-2 bg-gray-50 focus:ring-2 focus:ring-emerald-500"
            >
              {RADII.map((km) => (
                <option key={km} value={km}>
                  {km} km
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">
              Estado
            </label>
            <select
              value={active ? 'activo' : 'inactivo'}
              onChange={(e) => setActive(e.target.value === 'activo')}
              className="w-full border rounded-lg p-2 bg-gray-50 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="activo">✅ Disponible</option>
              <option value="inactivo">⏸️ Pausado</option>
            </select>
          </div>
        </div>
      </section>

      {/* === UBICACIÓN === */}
      <section className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
        <h2 className="font-semibold text-gray-700 border-l-4 border-emerald-500 pl-3 mb-4">
          Tu ubicación
        </h2>

        <button
          type="button"
          onClick={saveLocation}
          className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
        >
          Guardar ubicación actual
        </button>

        {coords && (
          <p className="text-xs text-gray-500 mt-2">
            📍 Lat: {coords.lat?.toFixed(4)} · Lon: {coords.lon?.toFixed(4)}
          </p>
        )}
      </section>

      {/* === SOBRE VOS === */}
      <section className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
        <h2 className="font-semibold text-gray-700 border-l-4 border-emerald-500 pl-3 mb-4">
          Sobre vos
        </h2>

        <textarea
          rows={3}
          className="w-full border rounded-lg p-2 bg-gray-50 focus:ring-2 focus:ring-emerald-500"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Contanos un poco sobre tu experiencia..."
        />

        <div className="mt-4">
          <label className="text-sm font-semibold text-gray-700 mb-1 block">
            Años de experiencia
          </label>
          <input
            type="number"
            min={0}
            className="w-full border rounded-lg p-2 bg-gray-50 focus:ring-2 focus:ring-emerald-500"
            value={yearsExp}
            onChange={(e) => setYearsExp(e.target.value)}
          />
        </div>
      </section>

      {/* === DOCUMENTACIÓN === */}
      <section className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
        <h2 className="font-semibold text-gray-700 border-l-4 border-emerald-500 pl-3 mb-4">
          Verificación de identidad
        </h2>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">
              Tipo de documento
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full border rounded-lg p-2 bg-gray-50 focus:ring-2 focus:ring-emerald-500"
            >
              {DOC_TYPES.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-gray-700 mb-1 block">
              Número
            </label>
            <input
              className="w-full border rounded-lg p-2 bg-gray-50 focus:ring-2 focus:ring-emerald-500"
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              placeholder="Ej: 12345678"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">
              Frente
            </label>
            <label className="text-sm text-emerald-600 cursor-pointer font-medium">
              Subir frente
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => uploadIdentity('front', e.target.files?.[0])}
              />
            </label>
            {frontUrl && (
              <a
                href={frontUrl}
                target="_blank"
                className="block text-emerald-600 text-xs underline mt-1"
              >
                Ver archivo
              </a>
            )}
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">
              Dorso
            </label>
            <label className="text-sm text-emerald-600 cursor-pointer font-medium">
              Subir dorso
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => uploadIdentity('back', e.target.files?.[0])}
              />
            </label>
            {backUrl && (
              <a
                href={backUrl}
                target="_blank"
                className="block text-emerald-600 text-xs underline mt-1"
              >
                Ver archivo
              </a>
            )}
          </div>
        </div>

        <div className="mt-6">
          <label className="text-sm font-semibold text-gray-700 mb-1 block">
            Antecedente policial (PDF/JPG/PNG)
          </label>
          <label className="text-sm text-emerald-600 cursor-pointer font-medium">
            Subir archivo
            <input
              type="file"
              hidden
              accept="application/pdf,image/*"
              onChange={(e) => uploadPoliceRecord(e.target.files?.[0])}
            />
          </label>
          {policeUrl && (
            <a
              href={policeUrl}
              target="_blank"
              className="block text-emerald-600 text-xs underline mt-1"
            >
              Ver archivo
            </a>
          )}
        </div>
      </section>

      {/* === DATOS BANCARIOS === */}
      <section className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
        <h2 className="font-semibold text-gray-700 border-l-4 border-emerald-500 pl-3 mb-4">
          Datos bancarios (para cobros)
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">
              Banco
            </label>
            <input
              className="w-full border rounded-lg p-2 bg-gray-50 focus:ring-2 focus:ring-emerald-500"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Ej: Itaú, Visión, BBVA..."
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">
              Tipo de cuenta
            </label>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              className="w-full border rounded-lg p-2 bg-gray-50 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ahorro">Caja de ahorro</option>
              <option value="corriente">Cuenta corriente</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">
              Número / Alias
            </label>
            <input
              className="w-full border rounded-lg p-2 bg-gray-50 focus:ring-2 focus:ring-emerald-500"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Número de cuenta o alias"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">
              Titular de la cuenta
            </label>
            <input
              className="w-full border rounded-lg p-2 bg-gray-50 focus:ring-2 focus:ring-emerald-500"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              placeholder="Nombre y apellido"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-gray-700 mb-1 block">
              Documento del titular
            </label>
            <input
              className="w-full border rounded-lg p-2 bg-gray-50 focus:ring-2 focus:ring-emerald-500"
              value={holderDoc}
              onChange={(e) => setHolderDoc(e.target.value)}
              placeholder="CI / DNI / Pasaporte del titular"
            />
          </div>
        </div>
      </section>

      {msg && <div className="text-emerald-600 text-sm">{msg}</div>}
      {err && <div className="text-red-500 text-sm">{err}</div>}
{/* === POLÍTICA DE PRIVACIDAD === */}
<div className="text-sm text-gray-600 flex items-start gap-2 mt-4">
  <input
    type="checkbox"
    required
    id="privacy"
    checked={acceptedPrivacy}
    onChange={(e) => setAcceptedPrivacy(e.target.checked)}
    className="mt-1 accent-emerald-600"
  />
  <label htmlFor="privacy" className="leading-snug">
    Declaro haber leído y aceptado la{' '}
    <a
      href="/privacy-policy"
      target="_blank"
      className="text-emerald-600 underline hover:text-emerald-700"
    >
      Política de Privacidad
    </a>.
  </label>
</div>


      <button
        type="submit"
        className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow transition"
        disabled={!canSave || busy}
      >
        {busy ? 'Guardando...' : '✅ Guardar y activar perfil'}
      </button>
    </form>
  );
}
 
