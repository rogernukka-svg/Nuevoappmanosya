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

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(null); setMsg(null);

    if (!coords) { setErr('Usá tu ubicación antes de publicar.'); setBusy(false); return; }
    if (!startDate) { setErr('Seleccioná una fecha de inicio.'); setBusy(false); return; }

    const { data, error } = await supabase.rpc('create_job', {
      title,
      description,
      skill_slug: skill,
      lon: coords.lon,
      lat: coords.lat,
      price_offer: Number(price),
      address_text: address
    });

    if (error) {
      setBusy(false);
      setErr(error.message);
      toast.error('No se pudo publicar el trabajo');
      return;
    }

    const newId = data;
    setNewJobId(newId);

    const { error: e2 } = await supabase
      .from('jobs')
      .update({ schedule, auto_assign: autoAssign })
      .eq('id', newId);

    if (e2) {
      setBusy(false);
      toast.error('Creado, pero no se pudo guardar la planificación');
      return;
    }

    if (autoAssign) {
      await supabase.rpc('assign_worker_auto', { p_job_id: newId }).catch(() => {});
    }

    setBusy(false);
    setMsg('Trabajo publicado con éxito.');
    toast.success('✅ Pedido creado correctamente');
    setTitle(''); setDesc(''); setAddress('');
  }

  async function uploadAll() {
    if (!newJobId || !files?.length) return;
    setUpBusy(true); setUpErr(null);
    for (const f of files) {
      try {
        const ext = f.name.split('.').pop();
        const path = `${newJobId}/${crypto.randomUUID()}.${ext}`;
        const { error: e1 } = await supabase.storage.from('job-photos').upload(path, f, { upsert: false });
        if (e1) { setUpErr(e1.message); continue; }
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
      <div className="rounded-2xl border border-gray-200 p-4 bg-gray-50">
        <div className="flex items-center gap-2 mb-3">
          <CalendarClock className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-gray-800">Planificación</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-700">Frecuencia</label>
            <select
              className="w-full mt-1 rounded-xl border border-gray-200 p-3 bg-white focus:ring-2 focus:ring-emerald-400 outline-none"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              <option value="once">Una vez</option>
              <option value="daily">Diaria</option>
              <option value="weekdays">Lunes a Viernes</option>
              <option value="weekly">Semanal</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-700">Fecha de inicio</label>
            <input
              type="date"
              className="w-full mt-1 rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-emerald-400 outline-none"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm text-gray-700">Duración (días)</label>
            <input
              type="number"
              min={1}
              className="w-full mt-1 rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-emerald-400 outline-none"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-700">Hora inicio</label>
              <input
                type="time"
                className="w-full mt-1 rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-emerald-400 outline-none"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-700">Hora fin</label>
              <input
                type="time"
                className="w-full mt-1 rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-emerald-400 outline-none"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
        </div>

        {startDate && (
          <p className="text-xs text-gray-600 mt-2">
            {frequency !== 'once'
              ? `Se estima ${estimatedSessions} sesión(es) entre `
              : 'Programado para '}
            <strong>{startDate}</strong>
            {frequency !== 'once' && endDate ? (
              <> y <strong>{endDate}</strong></>
            ) : null}{' '}
            de {startTime} a {endTime}.
          </p>
        )}

        <div className="flex items-center gap-2 mt-4">
          <input
            id="autoAssign"
            type="checkbox"
            checked={autoAssign}
            onChange={(e) => setAutoAssign(e.target.checked)}
            className="w-5 h-5 text-emerald-600"
          />
          <label htmlFor="autoAssign" className="text-sm text-gray-800">
            Permitir <strong>asignación automática</strong> de personal disponible y cercano
          </label>
        </div>
      </div>

      {/* === UBICACIÓN === */}
      <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4 border border-gray-100">
        <div className="flex items-center gap-2">
          <MapPin className="text-emerald-500 w-5 h-5" />
          <span className="text-sm text-gray-700">
            {coords ? (
              <>
                Ubicación lista ✅ ({coords.lat.toFixed(4)}, {coords.lon.toFixed(4)})
              </>
            ) : (
              'Esperando ubicación del dispositivo...'
            )}
          </span>
        </div>
        <button
          type="button"
          className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
          onClick={() => {
            if (!navigator.geolocation) return setErr('Geolocalización no soportada');
            navigator.geolocation.getCurrentPosition(
              (p) => setCoords({ lon: p.coords.longitude, lat: p.coords.latitude }),
              (e) => toast.error(e.message),
              { enableHighAccuracy: true, timeout: 10000 }
            );
          }}
        >
          Actualizar
        </button>
      </div>

      {/* === FOTOS === */}
      <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50">
        <label className="font-semibold text-gray-700 flex items-center gap-2">
          <Upload className="w-5 h-5 text-emerald-500" /> Fotos (opcional)
        </label>
        <input
          type="file"
          accept="image/*"
          multiple
          className="mt-2"
          onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 3))}
        />
        <p className="text-xs text-gray-500 mt-1">
          Podés subir hasta 3 imágenes relevantes del trabajo.
        </p>
        {upErr && <p className="text-red-500 text-xs mt-1">{upErr}</p>}
      </div>

      {/* === BOTONES === */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-semibold hover:bg-emerald-600 transition flex items-center justify-center gap-2 disabled:opacity-60"
          disabled={busy}
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          {busy ? 'Publicando...' : 'Publicar pedido'}
        </button>

        {newJobId && (
          <button
            type="button"
            onClick={uploadAll}
            disabled={upBusy}
            className="flex-1 bg-gray-100 text-gray-800 py-3 rounded-xl font-semibold hover:bg-gray-200 transition flex items-center justify-center gap-2"
          >
            {upBusy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {upBusy ? 'Subiendo...' : 'Subir fotos'}
          </button>
        )}
      </div>

      {err && <p className="text-red-500 text-sm">{err}</p>}
      {msg && <p className="text-emerald-600 text-sm">{msg}</p>}
    </motion.form>
  );
}

/* ========= PREVIEW EN VIVO ========= */
function LivePreview() {
  const [snapshot, setSnapshot] = useState({
    title: '',
    description: '',
    address: '',
    price: 25000,
    skill: SKILLS[0].slug,
    frequency: 'daily',
    startDate: '',
    endDate: '',
    startTime: '08:00',
    endTime: '12:00',
    estimatedSessions: 0,
    autoAssign: true,
  });

  useEffect(() => {
    const i = setInterval(() => {
      const q = (sel) => document.querySelector(sel);
      const title = q('input[placeholder^="Ej: Limpieza"]')?.value || '';
      const description = q('textarea')?.value || '';
      const address = q('input[placeholder^="Ej: Av."]')?.value || '';
      const price = Number(q('input[type="number"]')?.value || 0);
      const selects = document.querySelectorAll('select');
      const skill = selects?.[0]?.value || SKILLS[0].slug;
      const frequency = selects?.[1]?.value || 'daily';
      const inputs = document.querySelectorAll('input[type="date"], input[type="time"]');
      const startDate = inputs?.[0]?.value || '';
      const durationEl = document.querySelectorAll('input[type="number"]')?.[1];
      const durationDays = Number(durationEl?.value || 0);
      let endDate = '';
      if (startDate && durationDays) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + Math.max(1, durationDays) - 1);
        endDate = d.toISOString().slice(0, 10);
      }
      const startTime = inputs?.[1]?.value || '08:00';
      const endTime = inputs?.[2]?.value || '12:00';
      let estimatedSessions = 0;
      if (durationDays) {
        if (frequency === 'once') estimatedSessions = 1;
        else if (frequency === 'daily') estimatedSessions = durationDays;
        else if (frequency === 'weekly') estimatedSessions = Math.max(1, Math.ceil(durationDays / 7));
        else if (frequency === 'weekdays') estimatedSessions = Math.max(1, Math.round((durationDays * 5) / 7));
      }
      const autoAssign = document.getElementById('autoAssign')?.checked ?? true;
      setSnapshot({
        title, description, address, price, skill,
        frequency, startDate, endDate, startTime, endTime, estimatedSessions, autoAssign
      });
    }, 250);
    return () => clearInterval(i);
  }, []);

  const skillName = useMemo(
    () => SKILLS.find(s => s.slug === snapshot.skill)?.name || snapshot.skill,
    [snapshot.skill]
  );

  return (
    <motion.aside
      className="bg-white rounded-3xl shadow-md p-6 md:p-8 border border-gray-100 sticky top-8 h-max"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-5 h-5 text-emerald-600" />
        <h3 className="font-bold text-gray-800">Resumen del pedido</h3>
      </div>
      <div className="space-y-3 text-sm">
        <div><div className="text-gray-500">Título</div><div className="font-semibold text-gray-800">{snapshot.title || '—'}</div></div>
        <div><div className="text-gray-500">Servicio</div><div className="font-semibold text-gray-800">{skillName}</div></div>
        <div><div className="text-gray-500">Descripción</div><div className="text-gray-700">{snapshot.description || '—'}</div></div>
        <div className="grid grid-cols-2 gap-3">
          <div><div className="text-gray-500">Inicio</div><div className="font-semibold text-gray-800">{snapshot.startDate || '—'} {snapshot.startTime && `· ${snapshot.startTime}`}</div></div>
          <div><div className="text-gray-500">Fin</div><div className="font-semibold text-gray-800">{snapshot.endDate || '—'} {snapshot.endTime && `· ${snapshot.endTime}`}</div></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><div className="text-gray-500">Frecuencia</div><div className="font-semibold text-gray-800">
            {snapshot.frequency === 'once' ? 'Una vez' :
             snapshot.frequency === 'daily' ? 'Diaria' :
             snapshot.frequency === 'weekdays' ? 'Lunes a Viernes' : 'Semanal'}
          </div></div>
          <div><div className="text-gray-500">Sesiones estimadas</div><div className="font-semibold text-gray-800">{snapshot.estimatedSessions || '—'}</div></div>
        </div>
        <div><div className="text-gray-500">Dirección / referencia</div><div className="text-gray-700">{snapshot.address || '—'}</div></div>
        <div className="grid grid-cols-2 gap-3">
          <div><div className="text-gray-500">Asignación automática</div><div className="font-semibold text-gray-800">{snapshot.autoAssign ? 'Activada' : 'Desactivada'}</div></div>
          <div><div className="text-gray-500">Presupuesto</div><div className="font-semibold text-gray-800">Gs. {Number(snapshot.price || 0).toLocaleString('es-PY')}</div></div>
        </div>
      </div>
      <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
        Con la asignación automática, ManosYA seleccionará al mejor profesional disponible y cercano en cada sesión. Si alguien falta, la plataforma reasigna en segundos.
      </div>
    </motion.aside>
  );
}