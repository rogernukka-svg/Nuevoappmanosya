'use client';

import '../../globals.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
const supabase = getSupabase();

/* ====================== CONFIG ====================== */
const ALL_SKILLS = [
  { slug: 'taxi', name: 'Taxi' },
  { slug: 'chofer', name: 'Chofer' },
  { slug: 'limpieza', name: 'Limpieza' },
  { slug: 'limpieza-piscinas', name: 'Limpieza de piscinas' },
  { slug: 'plomeria', name: 'Plomería' },
  { slug: 'electricidad', name: 'Electricidad' },
  { slug: 'jardineria', name: 'Jardinería / Césped' },
  { slug: 'podador', name: 'Podador' },

  { slug: 'pintor', name: 'Pintor' },
  { slug: 'carpinteria', name: 'Carpintería' },
  { slug: 'albanileria', name: 'Albañilería' },
  { slug: 'metalurgica', name: 'Metalúrgica' },

  { slug: 'auxilio-vehicular', name: 'Auxilio vehicular' },
  { slug: 'fletes', name: 'Fletes y mudanzas' },
  { slug: 'delivery', name: 'Delivery' },
  { slug: 'mecanica', name: 'Taller mecánico' },
  { slug: 'refrigeracion', name: 'Técnico en refrigeración' },
  { slug: 'instalacion-aires', name: 'Instalación de aires acondicionados' },
  { slug: 'electronica', name: 'Técnico en electrónica' },
  { slug: 'informatica', name: 'Informática' },
  { slug: 'mantenimientos-electronicos', name: 'Mantenimientos electrónicos' },
  { slug: 'fumigacion', name: 'Fumigación' },
  { slug: 'cerrajeria', name: 'Cerrajería / Copia de llave' },

  { slug: 'contador', name: 'Contador' },
  { slug: 'abogado', name: 'Abogado' },
  { slug: 'gestiones-documentos', name: 'Gestiones de documentos' },
  { slug: 'diseno-grafico', name: 'Diseñador gráfico' },
  { slug: 'profesor-particular', name: 'Profesor particular' },
  { slug: 'profesor-tenis', name: 'Profesor de tenis' },
  { slug: 'consejero-matrimonial', name: 'Consejero matrimonial' },

  { slug: 'peluqueria', name: 'Peluquería masculino / femenino' },
  { slug: 'peluquero', name: 'Peluquero' },
  { slug: 'manicurista', name: 'Manicurista' },
  { slug: 'extension-pestanas', name: 'Extensión de pestañas' },
  { slug: 'masaje-estetico', name: 'Masaje estético' },
  { slug: 'modista', name: 'Modista' },

  { slug: 'fisioterapeuta', name: 'Fisioterapeuta' },
  { slug: 'enfermeria', name: 'Enfermería' },
  { slug: 'entrenador', name: 'Entrenador' },

  { slug: 'mozo', name: 'Mozo' },
  { slug: 'parrillero', name: 'Parrillero' },
  { slug: 'pizzero', name: 'Pizzero' },
  { slug: 'servicio-tragos', name: 'Servicio de tragos' },
  { slug: 'barman', name: 'Barman' },

  { slug: 'fotografo', name: 'Fotógrafo' },
  { slug: 'musico', name: 'Músico / artista en general' },
  { slug: 'payaso', name: 'Payaso' },

  { slug: 'escolta', name: 'Escolta' },
  { slug: 'escolta-privado', name: 'Escolta privado' },
  { slug: 'personal-shopper', name: 'Personal shopper' },
];

const RADII = [3, 5, 10, 15, 20];

const DOC_TYPES = [
  { value: 'CI', label: 'Cédula de Identidad (CI)' },
  { value: 'DNI', label: 'Documento Nacional de Identidad (DNI)' },
  { value: 'PASSPORT', label: 'Pasaporte' },
];

const POLICE_REQUIRE_AFTER = new Date('2026-05-17T00:00:00-03:00');
const showPolice = new Date() >= POLICE_REQUIRE_AFTER;

/* ====================== PAGE ====================== */
export default function WorkerOnboardPage() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user ?? null);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7fffc_0%,#ffffff_45%,#f8fafc_100%)] px-4 py-6">
      <div className="max-w-3xl mx-auto">
        
<div className="flex items-center mb-5">
  <button
    type="button"
    onClick={() => router.push('/worker')}
    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-[15px] font-semibold text-slate-700 shadow-[0_10px_28px_rgba(15,23,42,0.10)] transition-all duration-200 hover:-translate-y-[1px] hover:border-emerald-200 hover:text-emerald-700 hover:shadow-[0_16px_34px_rgba(16,185,129,0.14)] active:scale-[0.98]"
  >
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full">
      ←
    </span>
    <span>Volver</span>
  </button>
</div>
        <header className="text-center mb-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-4 py-2 text-emerald-700 text-sm font-bold mb-4">
            ManosYA Profesional
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-500 to-cyan-500 text-transparent bg-clip-text">
            Activá tu perfil profesional
          </h1>

          <p className="text-gray-600 text-sm md:text-base mt-3 max-w-2xl mx-auto leading-relaxed">
            Completá tus datos, subí tu documento y dejá listo tu perfil para empezar a recibir
            pedidos con más confianza.
          </p>
        </header>

        {user ? (
          <OnboardForm user={user} />
        ) : (
          <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-10 text-center text-gray-500">
            Cargando tu perfil...
          </div>
        )}
      </div>
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
const [skillQuery, setSkillQuery] = useState('');
const [showAllSkills, setShowAllSkills] = useState(false);

  // Ciudad
  const [city, setCity] = useState('');

  // Documentación
  const [docType, setDocType] = useState('CI');
  const [docNumber, setDocNumber] = useState('');
  const [frontUrl, setFrontUrl] = useState(null);
  const [backUrl, setBackUrl] = useState(null);
  const [policeUrl, setPoliceUrl] = useState(null);

  // Datos bancarios
  const [bankName, setBankName] = useState('');
  const [accountType, setAccountType] = useState('ahorro');
  const [accountNumber, setAccountNumber] = useState('');
  const [holderName, setHolderName] = useState('');
  const [holderDoc, setHolderDoc] = useState('');

  // Privacidad
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState(null); // 'avatar' | 'front' | 'back' | 'police'
  const [capturedPreview, setCapturedPreview] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [isCheckingPhoto, setIsCheckingPhoto] = useState(false);
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
          setPhone(p.phone || '');
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
          .select('is_active, radius_km, bio, years_experience, last_lat, last_lon, skills, city')
          .eq('user_id', user.id)
          .maybeSingle();

        if (wp) {
          setActive(wp.is_active ?? true);
          setRadius(wp.radius_km ?? 5);
          setBio(wp.bio ?? '');
          setYearsExp(wp.years_experience ?? '');
          if (wp.last_lat && wp.last_lon) {
            setCoords({ lat: wp.last_lat, lon: wp.last_lon });
          }
          if (wp.skills) {
            setSkills(Array.isArray(wp.skills) ? wp.skills : wp.skills?.split?.(',') || []);
          }
          if (wp.city) setCity(wp.city);
        }

        const { data: docs } = await supabase
          .from('documents')
          .select('doc_type, doc_number, front_url, back_url, file_url')
          .eq('user_id', user.id);

        if (docs?.length) {
          const idDoc = docs.find((d) => ['CI', 'DNI', 'PASSPORT'].includes(d.doc_type));
          if (idDoc) {
            setDocType(idDoc.doc_type);
            setDocNumber(idDoc.doc_number || '');
            setFrontUrl(idDoc.front_url || null);
            setBackUrl(idDoc.back_url || null);
          }

          const police = docs.find((d) => d.doc_type === 'POLICE');
          if (police) setPoliceUrl(police.file_url || null);
        }

        const { data: bank } = await supabase
          .from('bank_accounts')
          .select('bank_name, account_type, account_number, holder_name, holder_document')
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

  /* --------- PROGRESO --------- */
  const completedCount = useMemo(() => {
    let count = 0;

    if (fullName?.trim()) count++;
    if (phone?.trim()) count++;
    if (avatarUrl) count++;
    if (skills?.length > 0) count++;
    if (city?.trim()) count++;
    if (coords?.lat && coords?.lon) count++;
    if (bio?.trim()) count++;
    if (yearsExp !== '' && yearsExp !== null) count++;
    if (docNumber?.trim()) count++;
    if (frontUrl) count++;
    if (backUrl) count++;
    if (acceptedPrivacy) count++;

    return count;
  }, [
    fullName,
    phone,
    avatarUrl,
    skills,
    city,
    coords,
    bio,
    yearsExp,
    docNumber,
    frontUrl,
    backUrl,
    acceptedPrivacy,
  ]);

  const totalSteps = 12;
  const progress = Math.round((completedCount / totalSteps) * 100);

   const canSave = useMemo(() => {
    return fullName?.trim() && phone?.trim() && skills.length > 0 && city && radius > 0;
  }, [fullName, phone, skills, city, radius]);

  const normalizedSkillQuery = skillQuery.trim().toLowerCase();

  const selectedSkillItems = useMemo(() => {
    return ALL_SKILLS.filter((s) => skills.includes(s.slug));
  }, [skills]);

 const filteredAvailableSkillItems = useMemo(() => {
  return ALL_SKILLS.filter((s) => {
    const isSelected = skills.includes(s.slug);
    const matchesSearch =
      !normalizedSkillQuery ||
      s.name.toLowerCase().includes(normalizedSkillQuery);

    return !isSelected && matchesSearch;
  });
}, [skills, normalizedSkillQuery]);

const visibleAvailableSkillItems = useMemo(() => {
  if (showAllSkills || normalizedSkillQuery) return filteredAvailableSkillItems;
  return filteredAvailableSkillItems.slice(0, 12);
}, [filteredAvailableSkillItems, showAllSkills, normalizedSkillQuery]);

  /* --------- HELPERS --------- */
  async function handleAvatar(fileOrEvent) {
    const file =
      fileOrEvent?.target?.files?.[0] ||
      fileOrEvent;

    if (!file || !user?.id) return;

    try {
      setErr(null);
      setMsg(null);

      const path = `${user.id}/avatar_${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, file, { cacheControl: '3600', upsert: true });

      if (error) throw error;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = data.publicUrl;

      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);

      setAvatarUrl(url);
      setMsg('Foto actualizada correctamente.');
    } catch (e) {
      setErr('No se pudo subir la foto: ' + e.message);
    }
  }
function getCurrentTrackFacingMode() {
  try {
    const track = streamRef.current?.getVideoTracks?.()?.[0];
    const settings = track?.getSettings?.();
    return settings?.facingMode || null;
  } catch {
    return null;
  }
}
  async function openCamera(mode) {
  try {
    setErr(null);
    setCameraError(null);
    setCapturedPreview(null);
    setCapturedBlob(null);
    setCameraMode(mode);

    // ✅ cerrar stream anterior si existía
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setCameraOpen(true);

    const isAvatar = mode === 'avatar';
    let stream = null;

    // ✅ intento principal: cámara correcta según el modo
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: isAvatar ? 'user' : 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch (firstErr) {
      console.warn('Primer intento de cámara falló:', firstErr);

      // ✅ segundo intento: forzar exacto
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: isAvatar ? 'user' : 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (secondErr) {
        console.warn('Segundo intento de cámara falló:', secondErr);

        // ✅ último fallback: cualquier cámara disponible
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }
    }

    streamRef.current = stream;

    setTimeout(async () => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('No se pudo reproducir el video:', playErr);
        }
      }
    }, 120);
  } catch (e) {
    console.error(e);
    setCameraOpen(false);
    setCameraError('No se pudo abrir la cámara. Revisá permisos.');
    setErr('No se pudo abrir la cámara. Revisá permisos.');
  }
}
  function closeCamera() {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    } catch {}
    streamRef.current = null;
    setCameraOpen(false);
    setCameraMode(null);
    setCapturedPreview(null);
    setCapturedBlob(null);
    setIsCheckingPhoto(false);
  }

  function varianceOfLaplacian(imageData) {
    const { data, width, height } = imageData;
    const gray = new Float32Array(width * height);

    for (let i = 0; i < width * height; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }

    const lap = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const value =
          gray[idx - width] +
          gray[idx - 1] -
          4 * gray[idx] +
          gray[idx + 1] +
          gray[idx + width];
        lap.push(value);
      }
    }

    const mean = lap.reduce((a, b) => a + b, 0) / Math.max(lap.length, 1);
    const variance =
      lap.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / Math.max(lap.length, 1);

    return variance;
  }

  async function captureFromCamera() {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      setIsCheckingPhoto(true);

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;

      canvas.width = w;
      canvas.height = h;

      ctx.drawImage(video, 0, 0, w, h);

      const imageData = ctx.getImageData(0, 0, w, h);
      const sharpness = varianceOfLaplacian(imageData);

      const preview = canvas.toDataURL('image/jpeg', 0.92);

      const blob = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92)
      );

      if (!blob) {
        setIsCheckingPhoto(false);
        setErr('No se pudo capturar la foto.');
        return;
      }

      setCapturedPreview(preview);
      setCapturedBlob(blob);
      setIsCheckingPhoto(false);

      if (sharpness < 90) {
        setErr('La foto salió un poco borrosa. Te recomendamos repetirla.');
      } else {
        setErr(null);
      }
    } catch (e) {
      console.error(e);
      setIsCheckingPhoto(false);
      setErr('No se pudo capturar la foto.');
    }
  }

  async function confirmCapturedPhoto() {
    if (!capturedBlob) return;

    const fileName =
      cameraMode === 'avatar'
        ? `avatar_${Date.now()}.jpg`
        : `${cameraMode}_${Date.now()}.jpg`;

    const file = new File([capturedBlob], fileName, { type: 'image/jpeg' });

    if (cameraMode === 'avatar') {
      await handleAvatar(file);
    } else if (cameraMode === 'front') {
      await uploadIdentity('front', file);
    } else if (cameraMode === 'back') {
      await uploadIdentity('back', file);
    } else if (cameraMode === 'police') {
      await uploadPoliceRecord(file);
    }

    closeCamera();
  }

  function retakePhoto() {
    setCapturedPreview(null);
    setCapturedBlob(null);
    setErr(null);
  }

  async function saveLocation() {
    try {
      setErr(null);
      setMsg(null);

      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(
          (p) => res({ lat: p.coords.latitude, lon: p.coords.longitude }),
          rej,
          { enableHighAccuracy: true }
        )
      );

      setCoords(pos);

      await supabase.from('worker_profiles').upsert(
        {
          user_id: user.id,
          last_lat: pos.lat,
          last_lon: pos.lon,
        },
        { onConflict: 'user_id' }
      );

      setMsg('Ubicación guardada correctamente.');
    } catch (e) {
      setErr('No se pudo obtener ubicación: ' + e.message);
    }
  }

  async function uploadIdentity(side, fileOrEvent) {
    const file =
      fileOrEvent?.target?.files?.[0] ||
      fileOrEvent;

    if (!file || !user?.id) return;

    try {
      setErr(null);
      setMsg(null);

      const ext = file.name?.split('.').pop() || 'jpg';
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

      setMsg(`Documento ${side === 'front' ? 'frontal' : 'trasero'} subido correctamente.`);
    } catch (e) {
      setErr('No se pudo subir el documento: ' + e.message);
    }
  }

   async function uploadPoliceRecord(fileOrEvent) {
    const file =
      fileOrEvent?.target?.files?.[0] ||
      fileOrEvent;

    if (!file || !user?.id) return;

    try {
      setErr(null);
      setMsg(null);

      const ext = file.name?.split('.').pop() || 'jpg';
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
      setMsg('Antecedente policial subido correctamente.');
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
          phone: phone,
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
          city,
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

      setMsg('Perfil guardado y listo correctamente.');
    } catch (e) {
      setErr('No se pudo guardar: ' + (e.message || e));
    } finally {
      setBusy(false);
    }
  }

  /* --------- UI --------- */
  if (loading) {
    return (
      <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-10 text-center text-gray-500">
        Cargando perfil profesional...
      </div>
    );
  }

  return (
    <form onSubmit={saveAll} className="space-y-5">
      {/* RESUMEN / PROGRESO */}
      <section className="rounded-[28px] border border-emerald-100 bg-white shadow-[0_16px_40px_rgba(16,185,129,0.08)] p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-emerald-700">Tu perfil profesional</div>
            <h2 className="text-2xl font-extrabold text-gray-900 mt-1">
              Completá tu perfil para generar más confianza
            </h2>
            <p className="text-sm text-gray-500 mt-2 max-w-xl">
              Mientras más completo esté tu perfil, más serio, confiable y profesional te vas a ver.
            </p>
          </div>

          <div className="shrink-0 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-center">
            <div className="text-2xl font-extrabold text-emerald-700">{progress}%</div>
            <div className="text-xs font-semibold text-emerald-600">Perfil completado</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Te faltan pocos pasos para dejar tu perfil listo.
          </p>
        </div>
      </section>

      {/* PERFIL */}
      <SimpleSection
        number="1"
        title="Tu foto y tus datos"
        subtitle="Esto ayuda a que los clientes te reconozcan y confíen más."
      >
       <div className="flex flex-col md:flex-row gap-5 items-start">
  <div className="w-full md:w-auto flex flex-col items-center gap-3">
    <div className="relative">
      <button
        type="button"
        onClick={() => avatarUrl && setOpenAvatar(true)}
        className="relative w-28 h-28 rounded-full p-[4px] bg-gradient-to-br from-emerald-500 to-cyan-400 shadow-[0_14px_30px_rgba(16,185,129,0.18)]"
      >
        <div className="relative w-full h-full rounded-full overflow-hidden bg-white">
          <img
            src={avatarUrl || '/avatar-fallback.png'}
            alt="avatar"
            className="w-full h-full object-cover"
          />

          {/* aro visual */}
          <div className="absolute inset-[8px] rounded-full border-2 border-white/90 pointer-events-none" />
        </div>

        {/* verificado azul */}
        {isVerified && (
          <span className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-[6px] border-2 border-white shadow-md flex items-center justify-center">
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
      </button>
    </div>

    <p className="text-xs text-gray-500 font-medium text-center">
      Tu foto genera más confianza
    </p>

  <div className="flex flex-wrap justify-center gap-2">
  <button
    type="button"
    onClick={() => openCamera('avatar')}
    className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-sm shadow hover:bg-emerald-700 transition"
  >
    Sacar foto
  </button>

  <label className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold text-sm hover:bg-gray-50 transition cursor-pointer">
    Elegir archivo
    <input
      type="file"
      hidden
      accept="image/*"
      onChange={handleAvatar}
    />
  </label>
</div>

    {openAvatar && (
      <div
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        onClick={() => setOpenAvatar(false)}
      >
        <div className="relative w-80 h-80 rounded-[32px] overflow-hidden bg-white border-4 border-white shadow-2xl">
          <img
            src={avatarUrl || '/avatar-fallback.png'}
            alt="avatar grande"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-[28px] rounded-full border-[3px] border-white/90 pointer-events-none" />
        </div>
      </div>
    )}
  </div>

  <div className="flex-1 w-full grid md:grid-cols-2 gap-4">
    <Field label="Nombre y apellido">
      <input
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-400"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Ej: Juan Pérez"
      />
    </Field>

    <Field label="Número de teléfono">
      <input
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-400"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Ej: 0984 123 456"
      />
    </Field>
  </div>
</div>

        <div className="flex flex-wrap gap-2 mt-4">
          {isVerified && (
            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold border border-blue-200">
              Verificado por ManosYA
            </span>
          )}
          {avgRating && (
            <span className="bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-xs font-semibold border border-yellow-200">
              ⭐ {avgRating}/5
            </span>
          )}
        </div>
      </SimpleSection>

           {/* OFICIOS */}
      <SimpleSection
        number="2"
        title="Qué trabajos hacés"
        subtitle="Elegí tus oficios para que te encuentren más fácil."
      >
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-cyan-50 p-4 mb-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold text-emerald-800">
                Elegí tus servicios principales
              </div>
              <p className="text-xs text-emerald-700/80 mt-1">
                Mostrá primero lo que realmente hacés. Un perfil claro genera más confianza y más pedidos.
              </p>
            </div>

            <div className="shrink-0 rounded-2xl bg-white border border-emerald-200 px-4 py-3 text-center shadow-sm">
              <div className="text-2xl font-extrabold text-emerald-700">{skills.length}</div>
              <div className="text-[11px] font-semibold text-emerald-600">
                oficio{skills.length === 1 ? '' : 's'} seleccionado{skills.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-5">
          <Field label="Buscar oficio">
            <input
              type="text"
              value={skillQuery}
              onChange={(e) => setSkillQuery(e.target.value)}
              placeholder="Ej: peluquería, chofer, albañilería, técnico..."
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-400"
            />
          </Field>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <div className="text-sm font-extrabold text-gray-900">Tus oficios elegidos</div>
                <div className="text-xs text-gray-500 mt-1">
                  Esto es lo primero que debés revisar antes de guardar.
                </div>
              </div>

              {skills.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSkills([])}
                  className="text-xs font-bold text-red-600 hover:text-red-700"
                >
                  Limpiar todo
                </button>
              )}
            </div>

            {selectedSkillItems.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedSkillItems.map((s) => (
                  <button
                    key={s.slug}
                    type="button"
                    onClick={() => setSkills(skills.filter((x) => x !== s.slug))}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-500 bg-emerald-500 text-white text-sm font-bold shadow-sm transition hover:bg-emerald-600"
                  >
                    <span>{s.name}</span>
                    <span className="text-white/90">×</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-500">
                Todavía no seleccionaste ningún oficio.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
  <div className="mb-3 flex items-start justify-between gap-3">
    <div>
      <div className="text-sm font-extrabold text-gray-900">Oficios disponibles</div>
      <div className="text-xs text-gray-500 mt-1">
        Tocá para agregar. Mostramos primero los más visibles para que no canse a la vista.
      </div>
    </div>

    {filteredAvailableSkillItems.length > 12 && !normalizedSkillQuery && (
      <button
        type="button"
        onClick={() => setShowAllSkills((prev) => !prev)}
        className="shrink-0 text-xs font-bold text-emerald-700 hover:text-emerald-800"
      >
        {showAllSkills ? 'Ver menos' : 'Ver todos'}
      </button>
    )}
  </div>

  {filteredAvailableSkillItems.length > 0 ? (
    <>
      <div className="flex flex-wrap gap-2">
        {visibleAvailableSkillItems.map((s) => (
          <button
            key={s.slug}
            type="button"
            onClick={() => setSkills([...skills, s.slug])}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
          >
            {s.name}
          </button>
        ))}
      </div>

      {filteredAvailableSkillItems.length > 12 && !normalizedSkillQuery && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAllSkills((prev) => !prev)}
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-bold hover:bg-emerald-100 transition"
          >
            {showAllSkills
              ? 'Ver menos oficios'
              : `Ver todos (${filteredAvailableSkillItems.length})`}
          </button>
        </div>
      )}
    </>
  ) : (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-500">
      No encontramos oficios con esa búsqueda.
    </div>
  )}
</div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-5">
          <Field label="Hasta dónde querés trabajar">
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {RADII.map((km) => (
                <option key={km} value={km}>
                  {km} km
                </option>
              ))}
            </select>
          </Field>

          <Field label="Estado de tu perfil">
            <select
              value={active ? 'activo' : 'inactivo'}
              onChange={(e) => setActive(e.target.value === 'activo')}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="activo">Disponible</option>
              <option value="inactivo">Pausado</option>
            </select>
          </Field>
        </div>
      </SimpleSection>

      {/* UBICACIÓN */}
      <SimpleSection
        number="3"
        title="Tu zona de trabajo"
        subtitle="Guardá tu ubicación actual para mostrar mejor tu área."
      >
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <button
            type="button"
            onClick={saveLocation}
            className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-700 transition"
          >
            Guardar mi ubicación actual
          </button>

          {coords && (
            <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
              Ubicación guardada correctamente
            </div>
          )}
        </div>

        {coords && (
          <p className="text-xs text-gray-500 mt-3">
            Lat: {coords.lat?.toFixed(4)} · Lon: {coords.lon?.toFixed(4)}
          </p>
        )}
      </SimpleSection>

      {/* SOBRE VOS */}
      <SimpleSection
        number="4"
        title="Contale a la gente sobre vos"
        subtitle="Un perfil con descripción se ve más profesional y más confiable."
      >
        <Field label="Descripción corta">
          <textarea
            rows={4}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Ej: Soy responsable, puntual y tengo experiencia en atención al cliente."
          />
        </Field>

        <div className="mt-4">
          <Field label="Años de experiencia">
            <input
              type="number"
              min={0}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-400"
              value={yearsExp}
              onChange={(e) => setYearsExp(e.target.value)}
              placeholder="Ej: 3"
            />
          </Field>
        </div>
      </SimpleSection>

      {/* CIUDAD */}
      <SimpleSection
        number="5"
        title="Ciudad donde trabajás"
        subtitle="Elegí la zona principal donde querés aparecer."
      >
        <select
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-400"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        >
          <option value="">Seleccioná una ciudad</option>

          <option value="asuncion">Asunción</option>

          <optgroup label="Central">
            <option value="sanlorenzo">San Lorenzo</option>
            <option value="luque">Luque</option>
            <option value="fernando">Fernando de la Mora</option>
            <option value="lambare">Lambaré</option>
            <option value="nemby">Ñemby</option>
            <option value="capiata">Capiatá</option>
            <option value="itaugua">Itauguá</option>
            <option value="villaelisa">Villa Elisa</option>
            <option value="limpio">Limpio</option>
            <option value="mariano">Mariano Roque Alonso</option>
          </optgroup>

          <optgroup label="Alto Paraná">
            <option value="cde">Ciudad del Este</option>
            <option value="minga">Minga Guazú</option>
            <option value="hernandarias">Hernandarias</option>
            <option value="pfranco">Presidente Franco</option>
            <option value="itambe">Itambé</option>
          </optgroup>

          <optgroup label="Itapúa">
            <option value="encarnacion">Encarnación</option>
            <option value="cambyreta">Cambyretá</option>
            <option value="hnaguazu">Hohenau</option>
            <option value="obligado">Obligado</option>
            <option value="bella-vista">Bella Vista</option>
          </optgroup>

          <optgroup label="Caaguazú">
            <option value="coroneloviedo">Coronel Oviedo</option>
            <option value="jidominguez">J. Eulogio Estigarribia</option>
            <option value="repatriacion">Repatriación</option>
            <option value="raul-pena">Raúl Peña</option>
          </optgroup>

          <optgroup label="Cordillera">
            <option value="caacupe">Caacupé</option>
            <option value="sanber">San Bernardino</option>
            <option value="eusebio-ayala">Eusebio Ayala</option>
          </optgroup>

          <optgroup label="Guairá">
            <option value="villarrica">Villarrica</option>
          </optgroup>

          <optgroup label="Paraguarí">
            <option value="paraguari">Paraguarí</option>
            <option value="itas">Ybycuí</option>
          </optgroup>

          <optgroup label="Misiones">
            <option value="sanjuan">San Juan Bautista</option>
          </optgroup>

          <optgroup label="Concepción">
            <option value="concepcion">Concepción</option>
            <option value="horqueta">Horqueta</option>
          </optgroup>

          <optgroup label="Amambay">
            <option value="pedrojuan">Pedro Juan Caballero</option>
            <option value="capitan-bado">Capitán Bado</option>
          </optgroup>

          <optgroup label="Presidente Hayes">
            <option value="villa-hayes">Villa Hayes</option>
            <option value="benjamin-aceval">Benjamín Aceval</option>
          </optgroup>

          <optgroup label="Boquerón">
            <option value="filadelfia">Filadelfia</option>
            <option value="loma-plata">Loma Plata</option>
            <option value="neuland">Neuland</option>
          </optgroup>
        </select>
      </SimpleSection>

      {/* DOCUMENTACIÓN */}
      <SimpleSection
        number="6"
        title="Verificación de identidad"
        subtitle="Esto aumenta la confianza y te ayuda a verte más serio y profesional."
      >
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Tipo de documento">
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {DOC_TYPES.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="md:col-span-2">
            <Field label="Número de documento">
              <input
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-400"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                placeholder="Ej: 12345678"
              />
            </Field>
          </div>
        </div>

       <div className="grid md:grid-cols-2 gap-4 mt-5">
 <UploadCard
  title="Foto del frente"
  subtitle="Poné tu cédula dentro del marco y sacá la foto."
  uploaded={!!frontUrl}
  uploadLabel="Sacar frente"
  fileHref={frontUrl}
  onFileChange={(file) => uploadIdentity('front', file)}
  onOpenCamera={() => openCamera('front')}
  frame="document"
/>

<UploadCard
  title="Foto del dorso"
  subtitle="Poné el dorso de tu cédula dentro del marco."
  uploaded={!!backUrl}
  uploadLabel="Sacar dorso"
  fileHref={backUrl}
  onFileChange={(file) => uploadIdentity('back', file)}
  onOpenCamera={() => openCamera('back')}
  frame="document"
/>
</div>

        {showPolice ? (
          <div className="mt-4">
       <UploadCard
  title="Antecedente policial"
  subtitle="Podés sacar foto o subir archivo."
  uploaded={!!policeUrl}
  uploadLabel="Sacar foto"
  fileHref={policeUrl}
  onFileChange={(file) => uploadPoliceRecord(file)}
  onOpenCamera={() => openCamera('police')}
  accept="application/pdf,image/*"
  frame="document"
/>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
            <div className="text-sm font-bold text-gray-800">
              Antecedente policial
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Por ahora no es obligatorio. Más adelante se va a habilitar.
            </div>
          </div>
        )}
      </SimpleSection>
            {/* DATOS BANCARIOS */}
      <SimpleSection
        number="7"
        title="Datos bancarios"
        subtitle="Esta sección estará disponible más adelante. Por ahora todavía no se utilizará."
      >
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 mb-5">
          <div className="text-sm font-extrabold text-amber-800">
            Próximamente
          </div>
          <div className="text-xs text-amber-700 mt-1 leading-relaxed">
            ManosYA todavía no va a utilizar datos bancarios en esta etapa.
            Esta sección queda visible solo como referencia, pero por ahora no
            es obligatoria ni se usará para pagos.
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 opacity-60 pointer-events-none select-none">
          <Field label="Banco">
            <input
              disabled
              className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 outline-none"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Próximamente"
            />
          </Field>

          <Field label="Tipo de cuenta">
            <select
              disabled
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 outline-none"
            >
              <option value="ahorro">Caja de ahorro</option>
              <option value="corriente">Cuenta corriente</option>
            </select>
          </Field>

          <Field label="Número o alias">
            <input
              disabled
              className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 outline-none"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Próximamente"
            />
          </Field>

          <Field label="Nombre del titular">
            <input
              disabled
              className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 outline-none"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              placeholder="Próximamente"
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Documento del titular">
              <input
                disabled
                className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 outline-none"
                value={holderDoc}
                onChange={(e) => setHolderDoc(e.target.value)}
                placeholder="Próximamente"
              />
            </Field>
          </div>
        </div>
      </SimpleSection>

      {/* PRIVACIDAD */}
      <section className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            required
            id="privacy"
            checked={acceptedPrivacy}
            onChange={(e) => setAcceptedPrivacy(e.target.checked)}
            className="mt-1 accent-emerald-600"
          />

          <label htmlFor="privacy" className="text-sm text-gray-600 leading-relaxed">
            Declaro haber leído y aceptado la{' '}
            <a
              href="/privacy-policy"
              target="_blank"
              className="text-emerald-600 underline hover:text-emerald-700 font-semibold"
            >
              Política de Privacidad
            </a>
            .
          </label>
        </div>
      </section>

      {/* MENSAJES */}
      {msg && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 font-semibold">
          {msg}
        </div>
      )}

      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 font-semibold">
          {err}
        </div>
      )}

      {/* BOTÓN FINAL */}
      <div className="sticky bottom-4">
        <button
          type="submit"
          disabled={!canSave || busy}
          className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-extrabold py-4 shadow-[0_16px_34px_rgba(16,185,129,0.22)] hover:from-emerald-600 hover:to-cyan-600 transition disabled:opacity-60"
        >
          {busy ? 'Guardando...' : 'Guardar y activar mi perfil'}
        </button>

        <p className="text-center text-xs text-gray-500 mt-3">
          Un perfil más completo genera más confianza y más oportunidades.
        </p>
      </div>
            {cameraOpen && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 text-white border-b border-white/10">
            <div>
              <div className="text-sm font-bold">
                {cameraMode === 'avatar' ? 'Foto de perfil' : 'Foto del documento'}
              </div>
              <div className="text-xs text-white/70">
                {cameraMode === 'avatar'
                  ? 'Ubicá bien tu rostro dentro del círculo'
                  : 'Alineá el documento dentro del marco'}
              </div>
            </div>

            <button
              type="button"
              onClick={closeCamera}
              className="px-3 py-2 rounded-xl bg-white/10 text-white font-semibold"
            >
              Cerrar
            </button>
          </div>

          <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black">
            {!capturedPreview ? (
              <>
                <video
  ref={videoRef}
  autoPlay
  playsInline
  muted
  className={`absolute inset-0 w-full h-full object-cover ${
    cameraMode === 'avatar' ? 'scale-x-[-1]' : ''
  }`}
/>

                               {cameraMode === 'avatar' ? (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-6">
                    <div className="relative w-[82vw] max-w-[360px] h-[58vh] max-h-[460px] min-h-[320px]">
                      <div className="absolute inset-0 rounded-[50%] border-[4px] border-emerald-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />

                      {/* guías suaves para centrar rostro */}
                      <div className="absolute left-1/2 top-[18%] -translate-x-1/2 w-10 h-10 rounded-full border-2 border-white/70" />
                      <div className="absolute left-1/2 top-[38%] -translate-x-1/2 w-[38%] h-[24%] rounded-[999px] border border-white/25" />
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative w-[88%] max-w-[340px] aspect-[1.6/1] rounded-2xl border-[4px] border-emerald-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                      <div className="absolute left-3 top-3 w-8 h-8 border-l-4 border-t-4 border-white rounded-tl-md" />
                      <div className="absolute right-3 top-3 w-8 h-8 border-r-4 border-t-4 border-white rounded-tr-md" />
                      <div className="absolute left-3 bottom-3 w-8 h-8 border-l-4 border-b-4 border-white rounded-bl-md" />
                      <div className="absolute right-3 bottom-3 w-8 h-8 border-r-4 border-b-4 border-white rounded-br-md" />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <img
                src={capturedPreview}
                alt="captura previa"
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}

            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="px-4 py-4 bg-black border-t border-white/10">
            {!capturedPreview ? (
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={captureFromCamera}
                  disabled={isCheckingPhoto}
                  className="w-20 h-20 rounded-full border-[6px] border-white bg-emerald-500 shadow-lg disabled:opacity-60"
                >
                  <span className="sr-only">Capturar</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={retakePhoto}
                  className="flex-1 px-4 py-3 rounded-2xl bg-white/10 text-white font-bold"
                >
                  Volver a sacar
                </button>

                <button
                  type="button"
                  onClick={confirmCapturedPhoto}
                  className="flex-1 px-4 py-3 rounded-2xl bg-emerald-500 text-white font-extrabold"
                >
                  Usar esta foto
                </button>
              </div>
            )}

            <p className="text-center text-xs text-white/70 mt-3">
              {capturedPreview
                ? 'Si se ve bien y nítida, confirmá la foto.'
                : 'Mantené el pulso firme y buena luz para evitar fotos borrosas.'}
            </p>
          </div>
        </div>
      )}
    </form>
  );
}

/* ====================== MINI COMPONENTS ====================== */

function SimpleSection({ number, title, subtitle, children }) {
  return (
    <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
      <div className="flex items-start gap-4 mb-5">
        <div className="h-10 w-10 shrink-0 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-extrabold">
          {number}
        </div>

        <div>
          <h2 className="text-xl font-extrabold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
      </div>

      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">{label}</label>
      {children}
    </div>
  );
}

function UploadCard({
  title,
  subtitle,
  uploaded = false,
  uploadLabel = 'Subir',
  fileHref = null,
  onFileChange,
  onOpenCamera,
  accept = 'image/*',
  frame = 'document',
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-extrabold text-gray-900">{title}</div>
          <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
        </div>

        <span
          className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
            uploaded
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-white text-gray-600 border-gray-200'
          }`}
        >
          {uploaded ? 'Subido' : 'Pendiente'}
        </span>
      </div>

      <div className="mt-4 rounded-2xl bg-white border border-dashed border-emerald-300 p-3">
        <div className="relative mx-auto w-full max-w-[260px] h-[160px] rounded-2xl bg-gradient-to-br from-emerald-50 to-cyan-50 border border-emerald-200 overflow-hidden">
          {fileHref ? (
            <img
              src={fileHref}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(16,185,129,0.12),transparent_60%)]" />
          )}

          {frame === 'document' && (
            <>
              <div className="absolute inset-[14px] rounded-xl border-[3px] border-emerald-500/80 shadow-[0_0_0_2px_rgba(255,255,255,0.8)]" />
              <div className="absolute left-6 top-6 w-7 h-7 border-l-4 border-t-4 border-emerald-600 rounded-tl-md" />
              <div className="absolute right-6 top-6 w-7 h-7 border-r-4 border-t-4 border-emerald-600 rounded-tr-md" />
              <div className="absolute left-6 bottom-6 w-7 h-7 border-l-4 border-b-4 border-emerald-600 rounded-bl-md" />
              <div className="absolute right-6 bottom-6 w-7 h-7 border-r-4 border-b-4 border-emerald-600 rounded-br-md" />

              {!fileHref && (
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center">
                  <span className="inline-flex px-3 py-1 rounded-full bg-white/85 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                    Centrá el documento aquí
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={onOpenCamera}
          className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-sm shadow hover:bg-emerald-700 transition"
        >
          {uploadLabel}
        </button>

        <label className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold text-sm hover:bg-gray-50 transition cursor-pointer">
          Elegir archivo
          <input
            type="file"
            hidden
            accept={accept}
            onChange={(e) => onFileChange?.(e.target.files?.[0])}
          />
        </label>

        {fileHref ? (
          <a
            href={fileHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-emerald-200 bg-white text-emerald-700 font-semibold text-sm hover:bg-emerald-50 transition"
          >
            Ver archivo
          </a>
        ) : (
          <span className="text-xs text-gray-400 font-medium">Todavía no subiste archivo</span>
        )}
      </div>
    </div>
  );
}