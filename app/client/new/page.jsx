'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { getSupabase } from '@/lib/supabase';
import {
  Briefcase,
  Building,
  Building2,
  CalendarClock,
  Clock4,
  MapPin,
  User2,
  DollarSign,
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

  // 🏢 Datos empresariales
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [billingRuc, setBillingRuc] = useState('');
  const [notes, setNotes] = useState('');

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
     ✅ Inserta job + business_job + asignación automática
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

      // Crear el trabajo principal
      const { data: newJob, error: jobError } = await supabase
        .from('jobs')
        .insert({
          client_id: profile.id,
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

      // Crear datos empresariales asociados
      const { error: bizErr } = await supabase.from('business_jobs').insert({
        job_id: newJob.id,
        business_id: profile.id,
        company_name: companyName,
        contact_name: contactName,
        contact_phone: contactPhone,
        billing_email: billingEmail,
        billing_ruc: billingRuc,
        notes,
      });
      if (bizErr) console.error('⚠️ Error creando business_job:', bizErr);

      // Asignar automáticamente trabajador cercano
      if (autoAssign) {
        await supabase.rpc('assign_worker_auto', { p_job_id: newJob.id }).catch(() => {});
      }

      toast.success('✅ Pedido empresarial creado correctamente');
      setMsg('Trabajo publicado con éxito.');
      setBusy(false);

      // Limpiar
      setTitle('');
      setDesc('');
      setAddress('');
      setCompanyName('');
      setContactName('');
      setContactPhone('');
      setBillingEmail('');
      setBillingRuc('');
      setNotes('');
    } catch (error) {
      console.error('❌ Error al crear trabajo:', error);
      toast.error('No se pudo publicar el trabajo');
      setErr(error.message);
      setBusy(false);
    }
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

      {/* === DATOS EMPRESARIALES === */}
      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-emerald-600 mb-3 flex items-center gap-2">
          <Building2 className="w-5 h-5" /> Datos de empresa / facturación
        </h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="font-semibold text-gray-700">Nombre de la empresa</label>
            <input
              className="w-full mt-1 rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-emerald-400 outline-none"
              placeholder="Ej: LimpiaMax S.A."
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="font-semibold text-gray-700">Responsable / contacto</label>
            <input
              className="w-full mt-1 rounded-xl border border-gray-200 p-3"
              placeholder="Nombre completo"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </div>

          <div>
            <label className="font-semibold text-gray-700">Teléfono</label>
            <input
              className="w-full mt-1 rounded-xl border border-gray-200 p-3"
              placeholder="0991 123 456"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>

          <div>
            <label className="font-semibold text-gray-700">Email de facturación</label>
            <input
              type="email"
              className="w-full mt-1 rounded-xl border border-gray-200 p-3"
              placeholder="facturacion@empresa.com"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="font-semibold text-gray-700">RUC</label>
            <input
              className="w-full mt-1 rounded-xl border border-gray-200 p-3"
              placeholder="Ej: 80012345-6"
              value={billingRuc}
              onChange={(e) => setBillingRuc(e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="font-semibold text-gray-700">Notas / comentarios</label>
            <textarea
              className="w-full mt-1 rounded-xl border border-gray-200 p-3 min-h-[80px]"
              placeholder="Indicaciones adicionales, materiales incluidos, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* === RESUMEN DE PLANIFICACIÓN === */}
      {startDate && (
        <div className="mt-6 bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-sm text-emerald-800">
          <p className="font-semibold mb-1 flex items-center gap-2">
            <CalendarClock className="w-4 h-4" /> Planificación:
          </p>
          <p>
            📅 Del <b>{startDate}</b> al <b>{endDate}</b> ({estimatedSessions} días)
          </p>
          <p>
            ⏰ De <b>{startTime}</b> a <b>{endTime}</b> — Frecuencia: <b>{frequency}</b>
          </p>
          <p className="mt-1">
            💰 Precio sugerido: <b>{price.toLocaleString()} Gs.</b>
          </p>
          {coords && (
            <p className="mt-1">
              📍 Ubicación detectada: lat {coords.lat.toFixed(4)}, lon {coords.lon.toFixed(4)}
            </p>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className={`w-full py-3 rounded-xl font-semibold text-white transition ${
          busy ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 shadow-md'
        }`}
      >
        {busy ? 'Publicando...' : 'Publicar pedido empresarial'}
      </button>
    </motion.form>
  );
}

/* ========= PREVIEW EN VIVO ========= */
function LivePreview() {
  return (
    <div className="bg-white rounded-3xl shadow-md p-6 border border-gray-100 text-center text-gray-600">
      <p className="text-sm">
        🧩 Vista previa en construcción. Próximamente mostrará el resumen del pedido empresarial antes de publicar.
      </p>
    </div>
  );
}
