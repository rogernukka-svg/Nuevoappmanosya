'use client';

import '../globals.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getSupabase } from '@/lib/supabase';

const supabase = getSupabase();

const SKILLS = [
  'Limpieza',
  'Plomería',
  'Electricidad',
  'Jardinería',
  'Peluquería',
  'Fletes y mudanzas',
  'Auxilio vehicular',
  'Gestiones de documentos',
  'Contador',
  'Abogado',
  'Taxi',
  'Otro',
];

const CITIES = [
  'Ciudad del Este',
  'Minga Guazú',
  'Hernandarias',
  'Presidente Franco',
  'Asunción',
  'San Lorenzo',
  'Luque',
  'Encarnación',
  'Coronel Oviedo',
  'Otro',
];

export default function ReclutamientoPage() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('nuevo');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [isCheckingPhoto, setIsCheckingPhoto] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    ci_number: '',
    ci_photo_url: '',
    city: '',
    zone: '',
    main_skill: '',
    other_skill: '',
    years_experience: '',
    availability: '',
    price_from: '',
    has_tools: false,
    tools_summary: '',
    has_mobility: false,
    mobility_type: '',
    has_bank_account: false,
    bank_name: '',
    needs_bank_help: false,
    has_invoice: false,
    ruc_number: '',
    needs_invoice_help: false,
    notes: '',
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user ?? null);
    });
    loadRows();
  }, []);

  async function loadRows() {
    setLoading(true);
    setErr('');
    try {
      const { data, error } = await supabase
        .from('worker_leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRows(data || []);
    } catch (e) {
      setErr(e.message || 'No se pudieron cargar los registros.');
    } finally {
      setLoading(false);
    }
  }

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function resetForm() {
    setForm({
      full_name: '',
      phone: '',
      ci_number: '',
      ci_photo_url: '',
      city: '',
      zone: '',
      main_skill: '',
      other_skill: '',
      years_experience: '',
      availability: '',
      price_from: '',
      has_tools: false,
      tools_summary: '',
      has_mobility: false,
      mobility_type: '',
      has_bank_account: false,
      bank_name: '',
      needs_bank_help: false,
      has_invoice: false,
      ruc_number: '',
      needs_invoice_help: false,
      notes: '',
    });
  }

  async function openCamera() {
    try {
      setErr('');
      setCameraError('');
      setCapturedPreview(null);
      setCapturedBlob(null);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      setCameraOpen(true);

      let stream = null;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;

      setTimeout(async () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch {}
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
        setErr('');
      }
    } catch (e) {
      console.error(e);
      setIsCheckingPhoto(false);
      setErr('No se pudo capturar la foto.');
    }
  }

  function retakePhoto() {
    setCapturedPreview(null);
    setCapturedBlob(null);
    setErr('');
  }

  async function uploadCiPhoto(fileOrBlob) {
    const file =
      fileOrBlob instanceof File
        ? fileOrBlob
        : new File([fileOrBlob], `ci_${Date.now()}.jpg`, { type: 'image/jpeg' });

    try {
      setErr('');
      setMsg('');

      const path = `worker-leads/ci_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}.jpg`;

      const { error } = await supabase.storage
        .from('worker-docs')
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      const { data } = supabase.storage.from('worker-docs').getPublicUrl(path);
      const url = data.publicUrl;

      setField('ci_photo_url', url);
      setMsg('Foto de cédula cargada correctamente.');
      closeCamera();
    } catch (e) {
      setErr('No se pudo subir la foto de la cédula: ' + (e.message || e));
    }
  }

  async function confirmCapturedPhoto() {
    if (!capturedBlob) return;
    await uploadCiPhoto(capturedBlob);
  }

  const canSave = useMemo(() => {
    return (
      (form.full_name || '').trim() &&
      (form.phone || '').trim() &&
      (form.city || '').trim() &&
      (form.main_skill || '').trim()
    );
  }, [form]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSave) return;

    setSaving(true);
    setMsg('');
    setErr('');

    try {
      const payload = {
        ...form,
        captured_by: user?.id ?? null,
        years_experience: form.years_experience ? Number(form.years_experience) : null,
        price_from: form.price_from ? Number(form.price_from) : null,
      };

      const { error } = await supabase.from('worker_leads').insert(payload);
      if (error) throw error;

      setMsg('Registro guardado correctamente.');
      resetForm();
      await loadRows();
      setTab('registros');
    } catch (e) {
      setErr(e.message || 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  }

  function exportCSV() {
    if (!rows.length) return;

    const headers = [
      'Fecha',
      'Nombre',
      'Telefono',
      'Cedula',
      'Foto cedula',
      'Ciudad',
      'Zona',
      'Oficio principal',
      'Otro oficio',
      'Anios experiencia',
      'Disponibilidad',
      'Precio desde',
      'Tiene herramientas',
      'Herramientas',
      'Tiene movilidad',
      'Movilidad',
      'Tiene cuenta bancaria',
      'Banco',
      'Necesita ayuda bancaria',
      'Tiene factura',
      'RUC',
      'Necesita ayuda factura',
      'Observaciones',
      'Estado',
    ];

    const csvRows = rows.map((r) => [
      new Date(r.created_at).toLocaleString('es-PY'),
      safe(r.full_name),
      safe(r.phone),
      safe(r.ci_number),
      safe(r.ci_photo_url),
      safe(r.city),
      safe(r.zone),
      safe(r.main_skill),
      safe(r.other_skill),
      safe(r.years_experience),
      safe(r.availability),
      safe(r.price_from),
      r.has_tools ? 'Sí' : 'No',
      safe(r.tools_summary),
      r.has_mobility ? 'Sí' : 'No',
      safe(r.mobility_type),
      r.has_bank_account ? 'Sí' : 'No',
      safe(r.bank_name),
      r.needs_bank_help ? 'Sí' : 'No',
      r.has_invoice ? 'Sí' : 'No',
      safe(r.ruc_number),
      r.needs_invoice_help ? 'Sí' : 'No',
      safe(r.notes),
      safe(r.status),
    ]);

    const csvContent = [headers, ...csvRows]
      .map((row) =>
        row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');

    const blob = new Blob(['\ufeff' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `manosya-reclutamiento-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function shareWhatsApp(row) {
    const text =
      `📌 ManosYA - Ficha de trabajador\n\n` +
      `Nombre: ${row.full_name || '-'}\n` +
      `Teléfono: ${row.phone || '-'}\n` +
      `Cédula: ${row.ci_number || '-'}\n` +
      `Foto cédula: ${row.ci_photo_url || '-'}\n` +
      `Ciudad: ${row.city || '-'}\n` +
      `Zona: ${row.zone || '-'}\n` +
      `Oficio principal: ${row.main_skill || '-'}\n` +
      `Otro oficio: ${row.other_skill || '-'}\n` +
      `Experiencia: ${row.years_experience || '-'} años\n` +
      `Disponibilidad: ${row.availability || '-'}\n` +
      `Precio desde: ${
        row.price_from ? `Gs. ${Number(row.price_from).toLocaleString('es-PY')}` : '-'
      }\n` +
      `Herramientas: ${row.has_tools ? 'Sí' : 'No'}\n` +
      `Detalle herramientas: ${row.tools_summary || '-'}\n` +
      `Movilidad: ${row.has_mobility ? 'Sí' : 'No'}\n` +
      `Tipo movilidad: ${row.mobility_type || '-'}\n` +
      `Cuenta bancaria: ${row.has_bank_account ? 'Sí' : 'No'}\n` +
      `Necesita ayuda bancaria: ${row.needs_bank_help ? 'Sí' : 'No'}\n` +
      `Factura / RUC: ${row.has_invoice ? 'Sí' : 'No'}\n` +
      `Necesita ayuda factura: ${row.needs_invoice_help ? 'Sí' : 'No'}\n` +
      `Observaciones: ${row.notes || '-'}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  const stats = useMemo(() => {
    return {
      total: rows.length,
      tools: rows.filter((r) => r.has_tools).length,
      bankHelp: rows.filter((r) => r.needs_bank_help).length,
      invoiceHelp: rows.filter((r) => r.needs_invoice_help).length,
    };
  }, [rows]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#d1fae5_0%,#ecfeff_24%,#f8fafc_58%,#ffffff_100%)] px-4 py-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <div className="rounded-[32px] border border-emerald-100/80 bg-white/80 backdrop-blur-xl shadow-[0_20px_70px_rgba(16,185,129,0.10)] p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="hidden sm:flex h-20 w-20 md:h-24 md:w-24 rounded-3xl bg-slate-950 shadow-[0_18px_40px_rgba(15,23,42,0.20)] items-center justify-center p-3 shrink-0">
                  <img
                    src="/gestion.png"
                    alt="Gestión 360"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-4 py-2 text-emerald-700 text-sm font-bold shadow-sm">
                    ManosYA · Centro de Reclutamiento
                  </div>

                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-4 bg-gradient-to-r from-slate-900 via-emerald-700 to-cyan-600 text-transparent bg-clip-text leading-tight">
                    Gestión estratégica de trabajadores
                  </h1>

                  <p className="text-slate-600 mt-3 max-w-3xl leading-relaxed">
                    Registrá, organizá y analizá información esencial de cada trabajador para
                    fortalecer el reclutamiento, la operación y la expansión de ManosYA.
                  </p>

                  <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs md:text-sm font-semibold text-amber-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    Con apoyo operativo de Gestión 360
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Registros" value={stats.total} />
                <StatCard label="Con herramientas" value={stats.tools} />
                <StatCard label="Ayuda bancaria" value={stats.bankHelp} />
                <StatCard label="Ayuda factura" value={stats.invoiceHelp} />
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-wrap gap-3 mb-5">
          <button
            type="button"
            onClick={() => setTab('nuevo')}
            className={`px-5 py-3 rounded-2xl font-bold transition ${
              tab === 'nuevo'
                ? 'bg-gradient-to-r from-emerald-500 via-cyan-500 to-sky-500 text-white shadow-[0_12px_30px_rgba(6,182,212,0.25)]'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Nuevo registro
          </button>

          <button
            type="button"
            onClick={() => setTab('registros')}
            className={`px-5 py-3 rounded-2xl font-bold transition ${
              tab === 'registros'
                ? 'bg-gradient-to-r from-emerald-500 via-cyan-500 to-sky-500 text-white shadow-[0_12px_30px_rgba(6,182,212,0.25)]'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Ver registros
          </button>

          <button
            type="button"
            onClick={loadRows}
            className="px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition"
          >
            Actualizar
          </button>

          <button
            type="button"
            onClick={exportCSV}
            className="px-5 py-3 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition"
          >
            Descargar Excel
          </button>
        </div>

        {msg && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 font-semibold">
            {msg}
          </div>
        )}

        {err && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 font-semibold">
            {err}
          </div>
        )}

        {tab === 'nuevo' ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <Panel
              title="Datos principales"
              subtitle="Información básica para registrar correctamente al trabajador."
            >
              <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">
                <Field label="Nombre y apellido">
                  <input
                    value={form.full_name}
                    onChange={(e) => setField('full_name', e.target.value)}
                    className={inputClass}
                    placeholder="Ej: Juan Pérez"
                  />
                </Field>

                <Field label="Teléfono">
                  <input
                    value={form.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                    className={inputClass}
                    placeholder="0984 123 456"
                  />
                </Field>

                <Field label="Número de cédula">
                  <input
                    value={form.ci_number}
                    onChange={(e) => setField('ci_number', e.target.value)}
                    className={inputClass}
                    placeholder="Ej: 4567890"
                  />
                </Field>

                <div className="md:col-span-2 xl:col-span-2">
                  <Field label="Foto de cédula del trabajador">
                    <UploadCard
                      title="Cédula del trabajador"
                      subtitle="Poné la cédula dentro del marco y sacá la foto."
                      uploaded={!!form.ci_photo_url}
                      uploadLabel="Sacar foto"
                      fileHref={form.ci_photo_url}
                      onFileChange={(file) => uploadCiPhoto(file)}
                      onOpenCamera={openCamera}
                      frame="document"
                    />
                  </Field>
                </div>

                <Field label="Ciudad">
                  <select
                    value={form.city}
                    onChange={(e) => setField('city', e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Seleccionar</option>
                    {CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Barrio / zona">
                  <input
                    value={form.zone}
                    onChange={(e) => setField('zone', e.target.value)}
                    className={inputClass}
                    placeholder="Km 7, Barrio Obrero..."
                  />
                </Field>
              </div>
            </Panel>

            <Panel
              title="Oficio y experiencia"
              subtitle="Información de especialidad y disponibilidad laboral."
            >
              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                <Field label="Oficio principal">
                  <select
                    value={form.main_skill}
                    onChange={(e) => setField('main_skill', e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Seleccionar</option>
                    {SKILLS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Otro oficio">
                  <input
                    value={form.other_skill}
                    onChange={(e) => setField('other_skill', e.target.value)}
                    className={inputClass}
                    placeholder="Ej: Soldadura, pintura..."
                  />
                </Field>

                <Field label="Años de experiencia">
                  <input
                    type="number"
                    min="0"
                    value={form.years_experience}
                    onChange={(e) => setField('years_experience', e.target.value)}
                    className={inputClass}
                    placeholder="Ej: 3"
                  />
                </Field>

                <Field label="Disponibilidad">
                  <input
                    value={form.availability}
                    onChange={(e) => setField('availability', e.target.value)}
                    className={inputClass}
                    placeholder="Mañana / tarde / urgencias"
                  />
                </Field>
              </div>
            </Panel>

            <Panel
              title="Precio y capacidad operativa"
              subtitle="Capacidad real para ejecutar trabajos y rango de precio base."
            >
              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                <Field label="Precio desde (Gs.)">
                  <input
                    type="number"
                    min="0"
                    value={form.price_from}
                    onChange={(e) => setField('price_from', e.target.value)}
                    className={inputClass}
                    placeholder="Ej: 80000"
                  />
                </Field>

                <Field label="Tiene herramientas">
                  <select
                    value={form.has_tools ? 'si' : 'no'}
                    onChange={(e) => setField('has_tools', e.target.value === 'si')}
                    className={inputClass}
                  >
                    <option value="no">No</option>
                    <option value="si">Sí</option>
                  </select>
                </Field>

                <Field label="Tiene movilidad">
                  <select
                    value={form.has_mobility ? 'si' : 'no'}
                    onChange={(e) => setField('has_mobility', e.target.value === 'si')}
                    className={inputClass}
                  >
                    <option value="no">No</option>
                    <option value="si">Sí</option>
                  </select>
                </Field>

                <Field label="Tipo de movilidad">
                  <input
                    value={form.mobility_type}
                    onChange={(e) => setField('mobility_type', e.target.value)}
                    className={inputClass}
                    placeholder="Moto, auto, bicicleta..."
                  />
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Qué herramientas tiene">
                  <textarea
                    rows={3}
                    value={form.tools_summary}
                    onChange={(e) => setField('tools_summary', e.target.value)}
                    className={textareaClass}
                    placeholder="Ej: Taladro, pinza, escalera, máquina, tijeras, carretilla..."
                  />
                </Field>
              </div>
            </Panel>

            <Panel
              title="Bancarización y factura"
              subtitle="Datos clave para formalización y acompañamiento con Gestión 360."
            >
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                <Field label="Tiene cuenta bancaria">
                  <select
                    value={form.has_bank_account ? 'si' : 'no'}
                    onChange={(e) => setField('has_bank_account', e.target.value === 'si')}
                    className={inputClass}
                  >
                    <option value="no">No</option>
                    <option value="si">Sí</option>
                  </select>
                </Field>

                <Field label="Banco">
                  <input
                    value={form.bank_name}
                    onChange={(e) => setField('bank_name', e.target.value)}
                    className={inputClass}
                    placeholder="Itaú, Ueno, Visión..."
                  />
                </Field>

                <Field label="Necesita ayuda para abrir cuenta">
                  <select
                    value={form.needs_bank_help ? 'si' : 'no'}
                    onChange={(e) => setField('needs_bank_help', e.target.value === 'si')}
                    className={inputClass}
                  >
                    <option value="no">No</option>
                    <option value="si">Sí</option>
                  </select>
                </Field>

                <Field label="Tiene factura / RUC">
                  <select
                    value={form.has_invoice ? 'si' : 'no'}
                    onChange={(e) => setField('has_invoice', e.target.value === 'si')}
                    className={inputClass}
                  >
                    <option value="no">No</option>
                    <option value="si">Sí</option>
                  </select>
                </Field>

                <Field label="Número de RUC">
                  <input
                    value={form.ruc_number}
                    onChange={(e) => setField('ruc_number', e.target.value)}
                    className={inputClass}
                    placeholder="Opcional"
                  />
                </Field>

                <Field label="Necesita ayuda con factura">
                  <select
                    value={form.needs_invoice_help ? 'si' : 'no'}
                    onChange={(e) => setField('needs_invoice_help', e.target.value === 'si')}
                    className={inputClass}
                  >
                    <option value="no">No</option>
                    <option value="si">Sí</option>
                  </select>
                </Field>
              </div>
            </Panel>

            <Panel
              title="Observaciones"
              subtitle="Información adicional relevante para seguimiento y evaluación."
            >
              <Field label="Notas">
                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  className={textareaClass}
                  placeholder="Ej: También hace trabajos urgentes, necesita ayuda con perfil, cobra más en horarios nocturnos..."
                />
              </Field>
            </Panel>

            <div className="sticky bottom-4">
              <button
                type="submit"
                disabled={!canSave || saving}
                className="w-full rounded-[24px] bg-gradient-to-r from-emerald-500 via-cyan-500 to-sky-500 text-white font-extrabold py-4 shadow-[0_20px_40px_rgba(6,182,212,0.25)] hover:scale-[1.01] transition disabled:opacity-60"
              >
                {saving ? 'Guardando...' : 'Guardar trabajador en ManosYA'}
              </button>
            </div>
          </form>
        ) : (
          <Panel
            title="Registros captados"
            subtitle="Base activa de trabajadores registrados en el sistema."
          >
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                Cargando registros...
              </div>
            ) : rows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                Todavía no hay registros.
              </div>
            ) : (
              <div className="grid lg:grid-cols-2 gap-4">
                {rows.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] hover:shadow-[0_16px_38px_rgba(15,23,42,0.10)] transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-900">
                          {row.full_name}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                          {row.main_skill} · {row.city}
                        </p>
                      </div>

                      <span className="px-3 py-1 rounded-full text-xs font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                        {row.status || 'nuevo'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                      <MiniItem label="Teléfono" value={row.phone} />
                      <MiniItem label="Cédula" value={row.ci_number} />
                      <MiniItem label="Zona" value={row.zone} />
                      <MiniItem
                        label="Experiencia"
                        value={row.years_experience ? `${row.years_experience} años` : '-'}
                      />
                      <MiniItem label="Disponibilidad" value={row.availability || '-'} />
                      <MiniItem
                        label="Precio desde"
                        value={
                          row.price_from
                            ? `Gs. ${Number(row.price_from).toLocaleString('es-PY')}`
                            : '-'
                        }
                      />
                      <MiniItem
                        label="Movilidad"
                        value={row.has_mobility ? row.mobility_type || 'Sí' : 'No'}
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {row.has_tools && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
                          Tiene herramientas
                        </span>
                      )}
                      {row.needs_bank_help && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Necesita ayuda bancaria
                        </span>
                      )}
                      {row.needs_invoice_help && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200">
                          Necesita ayuda factura
                        </span>
                      )}
                    </div>

                    <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-600">
                      <div>
                        <span className="font-bold text-slate-800">Herramientas:</span>{' '}
                        {row.tools_summary || '-'}
                      </div>
                      <div className="mt-1">
                        <span className="font-bold text-slate-800">Banco:</span>{' '}
                        {row.has_bank_account ? row.bank_name || 'Sí' : 'No'}
                      </div>
                      <div className="mt-1">
                        <span className="font-bold text-slate-800">Factura/RUC:</span>{' '}
                        {row.has_invoice ? row.ruc_number || 'Sí' : 'No'}
                      </div>
                      <div className="mt-1">
                        <span className="font-bold text-slate-800">Notas:</span>{' '}
                        {row.notes || '-'}
                      </div>
                    </div>

                    {row.ci_photo_url && (
                      <div className="mt-4">
                        <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
                          Foto de cédula
                        </div>
                        <a
                          href={row.ci_photo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-2xl overflow-hidden border border-slate-200 bg-slate-50"
                        >
                          <img
                            src={row.ci_photo_url}
                            alt="Cédula del trabajador"
                            className="w-full h-48 object-cover"
                          />
                        </a>
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => shareWhatsApp(row)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition"
                      >
                        Compartir por WhatsApp
                      </button>

                      <a
                        href={`tel:${row.phone}`}
                        className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 transition"
                      >
                        Llamar
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

        {cameraOpen && (
          <div className="fixed inset-0 z-[100] bg-black flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 text-white border-b border-white/10">
              <div>
                <div className="text-sm font-bold">Foto de cédula</div>
                <div className="text-xs text-white/70">
                  Alineá la cédula dentro del marco
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
                    className="absolute inset-0 w-full h-full object-cover"
                  />

                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative w-[88%] max-w-[340px] aspect-[1.6/1] rounded-2xl border-[4px] border-emerald-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                      <div className="absolute left-3 top-3 w-8 h-8 border-l-4 border-t-4 border-white rounded-tl-md" />
                      <div className="absolute right-3 top-3 w-8 h-8 border-r-4 border-t-4 border-white rounded-tr-md" />
                      <div className="absolute left-3 bottom-3 w-8 h-8 border-l-4 border-b-4 border-white rounded-bl-md" />
                      <div className="absolute right-3 bottom-3 w-8 h-8 border-r-4 border-b-4 border-white rounded-br-md" />
                    </div>
                  </div>
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

              {cameraError && (
                <p className="text-center text-xs text-red-300 mt-2">{cameraError}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function safe(v) {
  return v ?? '';
}

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-300 shadow-sm transition';

const textareaClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-300 shadow-sm resize-none transition';

function Panel({ title, subtitle, children }) {
  return (
    <section className="rounded-[28px] border border-white/70 bg-white/85 backdrop-blur-xl p-5 shadow-[0_16px_44px_rgba(15,23,42,0.07)]">
      <div className="mb-5">
        <h2 className="text-xl font-extrabold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-700 mb-2">{label}</label>
      {children}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-cyan-50 px-4 py-3 min-w-[120px] shadow-sm">
      <div className="text-2xl font-extrabold text-slate-900">{value}</div>
      <div className="text-xs font-semibold text-slate-500 mt-1">{label}</div>
    </div>
  );
}

function MiniItem({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-400 font-bold">{label}</div>
      <div className="text-sm font-semibold text-slate-800 mt-1">{value || '-'}</div>
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-extrabold text-slate-900">{title}</div>
          <div className="text-xs text-slate-500 mt-1">{subtitle}</div>
        </div>

        <span
          className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
            uploaded
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-white text-slate-600 border-slate-200'
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
                    Centrá la cédula aquí
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

        <label className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 transition cursor-pointer">
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
          <span className="text-xs text-slate-400 font-medium">Todavía no subiste archivo</span>
        )}
      </div>
    </div>
  );
}