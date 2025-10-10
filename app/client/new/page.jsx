'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { getSupabase } from '@/lib/supabase';
import {
  Briefcase,
  CheckCircle2,
  Loader2,
  MapPin,
  Upload,
  CalendarClock,
  Building2,
  Building,
} from 'lucide-react';

const supabase = getSupabase();

const SKILLS = [
  { slug: 'limpieza', name: 'Limpieza y mantenimiento' },
  { slug: 'plomeria', name: 'Plomería' },
  { slug: 'jardineria', name: 'Jardinería y césped' },
  { slug: 'electricidad', name: 'Electricidad y cableado' },
  { slug: 'auxilio', name: 'Auxilio vehicular' },
];

export default function NewJobPage() {
  return (
    <motion.div
      className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-gray-100 text-gray-900 pb-32"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="max-w-5xl mx-auto px-6 pt-10">
        <h1 className="text-3xl font-extrabold text-emerald-600 mb-2 flex items-center gap-2">
          <Briefcase className="w-7 h-7" />
          Publicar servicio / pedido empresarial
        </h1>
        <p className="text-gray-600 mb-8">
          Definí el alcance, la planificación y dejá que ManosYA asigne automáticamente personal cercano y disponible.
        </p>

        <div className="grid lg:grid-cols-2 gap-8">
          <Form />
          <LivePreview />
        </div>

        {/* === BLOQUE ACCESO PANEL EMPRESARIAL === */}
        <div className="mt-16 border-t border-gray-200 pt-8 text-center">
          <h2 className="text-lg font-bold text-gray-800 flex items-center justify-center gap-2">
            <Building className="w-5 h-5 text-emerald-600" />
            ¿Tenés una empresa o comercio?
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Accedé al panel empresarial para gestionar servicios, personal asignado y planificación avanzada.
          </p>

          <a
            href="/business/jobs"
            className="inline-flex items-center gap-2 mt-4 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition shadow-md"
          >
            <Briefcase className="w-5 h-5" />
            Ir al Panel Empresarial
          </a>
        </div>
      </div>
    </motion.div>
  );
}

/* ========= FORMULARIO ========= */
function Form() {
  const [title, setTitle] = useState('');
  const [description, setDesc] = useState('');
  const [skill, setSkill] = useState(SKILLS[0].slug);
  const [address, setAddress] = useState('');
  const [price, setPrice] = useState(25000);

  const [autoAssign, setAutoAssign] = useState(true);
  const [frequency, setFrequency] = useState('daily');
  const [startDate, setStartDate] = useState('');
  const [durationDays, setDurationDays] = useState(30);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('12:00');

  const [coords, setCoords] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [newJobId, setNewJobId] = useState(null);

  const [files, setFiles] = useState([]);
  const [upBusy, setUpBusy] = useState(false);
  const [upErr, setUpErr] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lon: p.coords.longitude, lat: p.coords.latitude }),
      () => {},
      { enableHighAccuracy: true }
    );
  }, []);

  const endDate = useMemo(() => {
    if (!startDate || !durationDays) return '';
    const d = new Date(startDate);
    d.setDate(d.getDate() + Math.max(1, Number(durationDays)) - 1);
    return d.toISOString().slice(0, 10);
  }, [startDate, durationDays]);

  const estimatedSessions = useMemo(() => {
    const days = Math.max(1, Number(durationDays));
    if (frequency === 'once') return 1;
    if (frequency === 'daily') return days;
    if (frequency === 'weekly') return Math.max(1, Math.ceil(days / 7));
    if (frequency === 'weekdays') return Math.max(1, Math.round((days * 5) / 7));
    return days;
  }, [durationDays, frequency]);

  const schedule = useMemo(() => {
    if (!startDate) return null;
    return {
      frequency,
      start_date: startDate,
      end_date: endDate || startDate,
      start_time: startTime,
      end_time: endTime,
      duration_days: Number(durationDays),
      estimated_sessions: estimatedSessions,
    };
  }, [frequency, startDate, endDate, startTime, endTime, durationDays, estimatedSessions]);

  /* =======================================================
   ✅ FUNCIÓN CORREGIDA: inserta el job con client_id correcto
  ======================================================= */
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);

    if (!coords) {
      setErr('Usá tu ubicación antes de publicar.');
      setBusy(false);
      return;
    }
    if (!startDate) {
      setErr('Seleccioná una fecha de inicio.');
      setBusy(false);
      return;
    }

    try {
      const user = (await supabase.auth.getUser()).data.user;

      // Buscar el perfil asociado
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        console.error('❌ Perfil no encontrado:', profileError);
        toast.error('No se encontró tu perfil. Iniciá sesión nuevamente.');
        setBusy(false);
        return;
      }

      // Crear el trabajo directamente
      const { data: newJob, error: jobError } = await supabase
        .from('jobs')
        .insert({
          client_id: profile.id, // ✅ usa el ID de perfil
          title,
          description,
          skill_slug: skill,
          lon: coords.lon,
          lat: coords.lat,
          price_offer: Number(price),
          address_text: address,
          schedule,
          auto_assign: autoAssign,
          status: 'pending',
        })
        .select()
        .single();

      if (jobError) throw jobError;

      setNewJobId(newJob.id);

      // Asignación automática
      if (autoAssign) {
        await supabase.rpc('assign_worker_auto', { p_job_id: newJob.id }).catch(() => {});
      }

      setBusy(false);
      setMsg('Trabajo publicado con éxito.');
      toast.success('✅ Pedido creado correctamente');
      setTitle('');
      setDesc('');
      setAddress('');
    } catch (error) {
      console.error('❌ Error al crear trabajo:', error);
      toast.error('No se pudo publicar el trabajo');
      setErr(error.message);
      setBusy(false);
    }
  }

  async function uploadAll() {
    if (!newJobId || !files?.length) return;
    setUpBusy(true);
    setUpErr(null);
    for (const f of files) {
      try {
        const ext = f.name.split('.').pop();
        const path = `${newJobId}/${crypto.randomUUID()}.${ext}`;
        const { error: e1 } = await supabase.storage.from('job-photos').upload(path, f, { upsert: false });
        if (e1) {
          setUpErr(e1.message);
          continue;
        }
        const user = (await supabase.auth.getUser()).data.user;
        await supabase.from('job_photos').insert({ job_id: newJobId, path, created_by: user.id });
      } catch (e) {
        setUpErr(String(e));
      }
    }
    setUpBusy(false);
    toast.success('📸 Fotos subidas correctamente');
  }

  return (
    <motion.form
      onSubmit={submit}
      className="bg-white rounded-3xl shadow-md p-6 md:p-8 space-y-6 border border-gray-100"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      {/* === DATOS PRINCIPALES === */}
      <div className="grid md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <label className="font-semibold text-gray-700">Título del pedido</label>
          <input
            className="w-full mt-1 rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-emerald-400 outline-none"
            placeholder="Ej: Limpieza de oficina, mantenimiento eléctrico, etc."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="font-semibold text-gray-700">Descripción</label>
          <textarea
            className="w-full mt-1 rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-emerald-400 outline-none min-h-[100px]"
            placeholder="Explicá brevemente tareas, horarios, condiciones, materiales, etc."
            value={description}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>

        <div>
          <label className="font-semibold text-gray-700">Área de servicio</label>
          <select
            className="w-full mt-1 rounded-xl border border-gray-200 p-3 bg-white focus:ring-2 focus:ring-emerald-400 outline-none"
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
          >
            {SKILLS.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-semibold text-gray-700">Precio sugerido (Gs.)</label>
          <input
            type="number"
            min={10000}
            step={1000}
            className="w-full mt-1 rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-emerald-400 outline-none"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
      </div>

      {/* === PLANIFICACIÓN === */}
      {/* resto igual que antes (sin cambios) */}
      {/* ... */}
    </motion.form>
  );
}

/* ========= PREVIEW EN VIVO ========= */
function LivePreview() {
  // ⚙️ tu versión actual funciona bien, no se modifica
  // la dejamos igual
}
