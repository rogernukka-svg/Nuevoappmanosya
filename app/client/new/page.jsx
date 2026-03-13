'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { getSupabase } from '@/lib/supabase';
import {
  Briefcase,
  Building2,
  CalendarClock,
  MapPin,
  User2,
  DollarSign,
  ClipboardList,
  Sparkles,
  BadgeCheck,
  ShieldCheck,
  Zap,
  ArrowRight,
  Phone,
  Mail,
  FileText,
  LocateFixed,
  CheckCircle2,
  BrainCircuit,
  Layers3,
} from 'lucide-react';

const supabase = getSupabase();

/* =====================================
   SERVICIOS DISPONIBLES
===================================== */

const SKILLS = [
  { slug: 'limpieza', name: 'Limpieza y mantenimiento' },
  { slug: 'plomeria', name: 'Plomería' },
  { slug: 'jardineria', name: 'Jardinería y césped' },
  { slug: 'electricidad', name: 'Electricidad y cableado' },
  { slug: 'auxilio', name: 'Auxilio vehicular' },
];

/* =====================================
   HELPERS
===================================== */

function skillLabel(slug) {
  return SKILLS.find((s) => s.slug === slug)?.name || 'Servicio general';
}

function formatGs(value) {
  const n = Number(value || 0);
  return `Gs. ${n.toLocaleString('es-PY')}`;
}

/* =====================================
   PAGE
===================================== */

export default function NewJobPage() {
  return (
    <motion.div
      className="min-h-screen bg-[linear-gradient(180deg,#f8fffd_0%,#ffffff_35%,#f7fafc_100%)] text-gray-900 pb-24"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10">
        {/* HERO / HEADER */}
        <div className="relative overflow-hidden rounded-[34px] border border-emerald-100 bg-white shadow-[0_20px_70px_rgba(16,185,129,0.10)] mb-8">
          <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.08),transparent_28%)]" />

          <div className="relative z-10 p-5 sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-bold text-emerald-700 mb-4">
                  <Sparkles size={14} />
                  Panel corporativo ManosYA
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-400 text-white shadow-[0_16px_34px_rgba(16,185,129,0.24)]">
                    <Briefcase className="w-7 h-7 sm:w-8 sm:h-8" />
                  </div>

                  <div>
                    <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
                      Panel de Servicios Empresariales
                    </h1>

                    <p className="mt-2 text-sm sm:text-base text-gray-500 leading-relaxed">
                      Publicá solicitudes corporativas con una experiencia más moderna, clara y profesional.
                      ManosYA está preparado para conectar tu empresa con personal cercano, disponible y validado.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <TopStat icon={<ShieldCheck size={16} />} label="Validación" value="Segura" />
                <TopStat icon={<Zap size={16} />} label="Asignación" value="Ágil" />
                <TopStat icon={<BrainCircuit size={16} />} label="Gestión" value="Smart" />
                <TopStat icon={<Layers3 size={16} />} label="Panel" value="Pro" />
              </div>
            </div>
          </div>
        </div>

        {/* GRID PRINCIPAL */}
        <div className="grid xl:grid-cols-[1.2fr_.8fr] gap-8">
          <Form />
          <LivePreview />
        </div>
      </div>
    </motion.div>
  );
}

/* =====================================
   TOP STAT
===================================== */

function TopStat({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white/90 px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-gray-400 font-bold">
        <span className="text-emerald-500">{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-sm font-extrabold text-gray-800">{value}</div>
    </div>
  );
}

/* =====================================
   FORMULARIO PRINCIPAL
===================================== */

function Form() {
  const [title, setTitle] = useState('');
  const [description, setDesc] = useState('');
  const [skill, setSkill] = useState(SKILLS[0].slug);
  const [address, setAddress] = useState('');
  const [price, setPrice] = useState(25000);

  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [billingRuc, setBillingRuc] = useState('');
  const [notes, setNotes] = useState('');

  const [coords, setCoords] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true }
    );
  }, []);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);

    try {
      const user = (await supabase.auth.getUser()).data.user;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      const { data: newJob, error } = await supabase
        .from('jobs')
        .insert({
          client_id: profile.id,
          title,
          description,
          skill_slug: skill,
          lon: coords?.lon,
          lat: coords?.lat,
          price_offer: Number(price),
          address_text: address,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('business_jobs').insert({
        job_id: newJob.id,
        business_id: profile.id,
        company_name: companyName,
        contact_name: contactName,
        contact_phone: contactPhone,
        billing_email: billingEmail,
        billing_ruc: billingRuc,
        notes,
      });

      toast.success('Servicio empresarial publicado');

      setTitle('');
      setDesc('');
      setAddress('');
      setCompanyName('');
      setContactName('');
      setContactPhone('');
      setBillingEmail('');
      setBillingRuc('');
      setNotes('');
    } catch (err) {
      console.error(err);
      toast.error('No se pudo publicar el pedido');
    }

    setBusy(false);
  }

  return (
    <motion.form
      onSubmit={submit}
      className="relative overflow-hidden rounded-[32px] border border-gray-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)]"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className="absolute -top-24 right-0 h-44 w-44 rounded-full bg-emerald-300/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-cyan-300/10 blur-3xl" />

      <div className="relative z-10 p-5 sm:p-7 space-y-8">
        {/* HEADER CARD */}
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-cyan-50/70 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-400 text-white shadow-md">
              <ClipboardList size={20} />
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">
                Crear nuevo pedido empresarial
              </h2>
              <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                Completá los datos del servicio y la información de tu empresa para publicar una solicitud más clara, profesional y lista para ser gestionada dentro de ManosYA.
              </p>
            </div>
          </div>
        </div>

        {/* SECCIÓN SERVICIO */}
        <section>
          <SectionTitle
            icon={<ClipboardList className="w-5 h-5 text-emerald-600" />}
            title="Detalles del servicio"
            subtitle="Definí el pedido para que el sistema y el equipo entiendan mejor la necesidad."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Field
              label="Título del pedido"
              hint="Ej: Limpieza integral de oficina"
              className="md:col-span-2"
            >
              <input
                className="field"
                placeholder="Título del pedido"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </Field>

            <Field
              label="Descripción del trabajo"
              hint="Explicá alcance, tareas, frecuencia o condiciones"
              className="md:col-span-2"
            >
              <textarea
                className="field min-h-[110px]"
                placeholder="Descripción del trabajo"
                value={description}
                onChange={(e) => setDesc(e.target.value)}
              />
            </Field>

            <Field label="Área de servicio" hint="Seleccioná el rubro principal">
              <select
                className="field bg-white"
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
              >
                {SKILLS.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Precio sugerido" hint="Referencia interna para tu empresa">
              <input
                type="number"
                className="field"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Precio sugerido"
              />
            </Field>

            <Field
              label="Dirección del servicio"
              hint="Ubicación donde se realizará el trabajo"
              className="md:col-span-2"
            >
              <input
                className="field"
                placeholder="Dirección del servicio"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </Field>
          </div>
        </section>

        {/* EMPRESA */}
        <section>
          <SectionTitle
            icon={<Building2 className="w-5 h-5 text-cyan-600" />}
            title="Información empresarial"
            subtitle="Datos de contacto y facturación para una gestión más ordenada."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Field
              label="Nombre de empresa"
              hint="Razón social o nombre comercial"
              className="md:col-span-2"
            >
              <input
                className="field"
                placeholder="Nombre de empresa"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </Field>

            <Field label="Responsable" hint="Persona de contacto">
              <div className="relative">
                <User2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  className="field pl-10"
                  placeholder="Responsable"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>
            </Field>

            <Field label="Teléfono" hint="Número principal de coordinación">
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  className="field pl-10"
                  placeholder="Teléfono"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </div>
            </Field>

            <Field label="Email de facturación" hint="Correo para comprobantes">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  className="field pl-10"
                  placeholder="Email facturación"
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                />
              </div>
            </Field>

            <Field label="RUC" hint="Documento tributario">
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  className="field pl-10"
                  placeholder="RUC"
                  value={billingRuc}
                  onChange={(e) => setBillingRuc(e.target.value)}
                />
              </div>
            </Field>

            <Field
              label="Notas adicionales"
              hint="Indicaciones internas, detalles del lugar, materiales, etc."
              className="md:col-span-2"
            >
              <textarea
                className="field min-h-[100px]"
                placeholder="Notas adicionales"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </div>
        </section>

        {/* UBICACIÓN */}
        <section className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <LocateFixed className="w-4 h-4 text-emerald-500" />
            Detección de ubicación
          </div>

          <p className="mt-2 text-sm text-gray-500">
            {coords
              ? `Ubicación detectada correctamente: lat ${coords.lat.toFixed(4)} · lon ${coords.lon.toFixed(4)}`
              : 'La plataforma intentará detectar tu ubicación para mejorar la asignación del personal.'}
          </p>
        </section>

        {/* CTA */}
        <button
          type="submit"
          disabled={busy}
          className={`w-full rounded-2xl py-4 text-sm font-extrabold text-white transition shadow-[0_16px_34px_rgba(16,185,129,0.20)] ${
            busy
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-500 to-cyan-400 hover:from-emerald-600 hover:to-cyan-500'
          }`}
        >
          <span className="inline-flex items-center gap-2">
            {busy ? 'Publicando...' : 'Publicar servicio empresarial'}
            {!busy && <ArrowRight size={16} />}
          </span>
        </button>
      </div>

      <style jsx>{`
        .field {
          width: 100%;
          border-radius: 16px;
          border: 1px solid rgb(229 231 235);
          background: white;
          padding: 14px 14px;
          font-size: 14px;
          color: rgb(31 41 55);
          outline: none;
          transition: all 0.2s ease;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.02);
        }

        .field:focus {
          border-color: rgb(52 211 153);
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.12);
        }

        .field::placeholder {
          color: rgb(156 163 175);
        }
      `}</style>
    </motion.form>
  );
}

/* =====================================
   SECTION TITLE
===================================== */

function SectionTitle({ icon, title, subtitle }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-extrabold text-gray-800">{title}</h2>
      </div>
      <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
    </div>
  );
}

/* =====================================
   FIELD WRAPPER
===================================== */

function Field({ label, hint, className = '', children }) {
  return (
    <div className={className}>
      <label className="block mb-2">
        <div className="text-sm font-bold text-gray-700">{label}</div>
        {hint && <div className="text-[12px] text-gray-400 mt-0.5">{hint}</div>}
      </label>
      {children}
    </div>
  );
}

/* =====================================
   PREVIEW INTELIGENTE
===================================== */

function LivePreview() {
  const [sampleTitle, setSampleTitle] = useState('Servicio corporativo');
  const [sampleSkill, setSampleSkill] = useState(SKILLS[0].slug);
  const [samplePrice, setSamplePrice] = useState(25000);

  useEffect(() => {
    const interval = setInterval(() => {
      setSampleTitle((prev) =>
        prev === 'Servicio corporativo'
          ? 'Operativa empresarial optimizada'
          : 'Servicio corporativo'
      );
      setSampleSkill((prev) =>
        prev === 'limpieza' ? 'electricidad' : prev === 'electricidad' ? 'auxilio' : 'limpieza'
      );
      setSamplePrice((prev) => (prev === 25000 ? 45000 : prev === 45000 ? 70000 : 25000));
    }, 2800);

    return () => clearInterval(interval);
  }, []);

  const score = useMemo(() => {
    if (samplePrice >= 70000) return 'Alta prioridad';
    if (samplePrice >= 45000) return 'Buena prioridad';
    return 'Prioridad estándar';
  }, [samplePrice]);

  return (
    <motion.div
      className="relative overflow-hidden rounded-[32px] border border-gray-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)] h-fit"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className="absolute -top-24 -right-24 h-52 w-52 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-52 w-52 rounded-full bg-emerald-300/20 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.10),transparent_24%)]" />

      <div className="relative z-10 p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-500" />
              Panel Inteligente ManosYA
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Vista estratégica para empresas exigentes.
            </p>
          </div>

          <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-bold text-emerald-700">
            Vista Pro
          </div>
        </div>

        {/* CARD PREVIEW */}
        <div className="rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-gray-400 font-bold">
                Preview ejecutivo
              </div>
              <h4 className="mt-1 text-xl font-extrabold text-gray-900">
                {sampleTitle}
              </h4>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-400 text-white shadow-md">
              <Briefcase size={20} />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <PreviewMini
              icon={<ClipboardList size={15} />}
              label="Servicio"
              value={skillLabel(sampleSkill)}
            />
            <PreviewMini
              icon={<DollarSign size={15} />}
              label="Referencia"
              value={formatGs(samplePrice)}
            />
            <PreviewMini
              icon={<BadgeCheck size={15} />}
              label="Asignación"
              value="Automática"
            />
            <PreviewMini
              icon={<CalendarClock size={15} />}
              label="Prioridad"
              value={score}
            />
          </div>
        </div>

        {/* BENEFICIOS */}
        <div className="mt-6 space-y-3">
          <Benefit
            icon={<BadgeCheck className="text-emerald-500 w-5 h-5" />}
            title="Asignación automática"
            text="Pensado para conectar tu empresa con trabajadores cercanos y disponibles."
          />

          <Benefit
            icon={<CalendarClock className="text-cyan-500 w-5 h-5" />}
            title="Planificación más inteligente"
            text="La plataforma evoluciona para dar más control sobre tiempos, seguimiento y organización."
          />

          <Benefit
            icon={<MapPin className="text-emerald-500 w-5 h-5" />}
            title="Ubicación estratégica"
            text="La detección geográfica ayuda a mejorar precisión, cercanía y velocidad de respuesta."
          />

          <Benefit
            icon={<ShieldCheck className="text-cyan-500 w-5 h-5" />}
            title="Experiencia profesional"
            text="Diseñado para clientes empresariales que necesitan una interfaz clara, moderna y seria."
          />
        </div>

        {/* INFO FINAL */}
        <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
          <div className="text-sm font-bold text-gray-800">
            ManosYA para empresas
          </div>
          <p className="mt-1 text-sm text-gray-500 leading-relaxed">
            Este panel está preparado para crecer hacia una experiencia corporativa más avanzada,
            con asignaciones más claras, trazabilidad del servicio y una gestión profesional para negocios, oficinas, comercios y operaciones empresariales.
          </p>

          <div className="mt-3 inline-flex items-center gap-2 text-[12px] font-bold text-emerald-700">
            <CheckCircle2 size={14} />
            Interfaz pensada para clientes exigentes
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* =====================================
   PREVIEW MINI
===================================== */

function PreviewMini({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/90 p-3 shadow-sm">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-gray-400 font-bold">
        <span className="text-emerald-500">{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-sm font-extrabold text-gray-800 leading-snug">
        {value}
      </div>
    </div>
  );
}

/* =====================================
   BENEFIT ITEM
===================================== */

function Benefit({ icon, title, text }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div>
          <div className="font-bold text-gray-800">{title}</div>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">{text}</p>
        </div>
      </div>
    </div>
  );
}