'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { IdCard, Camera, CheckCircle } from 'lucide-react';

/* ================= COMPONENTE UPLOAD ================= */
function FileUpload({ buttonText, icon: Icon, file, setFile, preview, setPreview }) {
  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;

    if (f.size > 5 * 1024 * 1024) {
      alert("El archivo es demasiado pesado (máx 5MB).");
      setFile(null);
      setPreview(null);
      return;
    }

    setFile(f);

    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(f);
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
  };

  return (
    <div className="space-y-2">
      {!file ? (
        <label className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-400 text-black font-semibold cursor-pointer hover:opacity-90 transition">
          <Icon size={20} />
          {buttonText}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      ) : (
        <div className="bg-neutral-800 rounded-xl p-3 border border-emerald-400">
          {preview && <img src={preview} alt={buttonText} className="rounded-lg mb-2" />}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle size={16} /> {file.name}
            </div>
            <button
              type="button"
              onClick={clearFile}
              className="px-3 py-1 text-xs rounded-lg bg-red-500 hover:bg-red-600 text-white"
            >
              Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= PÁGINA PRINCIPAL ================= */
export default function RegistroTrabajador() {
  const [form, setForm] = useState({
    nombre: '',
    cedula: '',
    telefono: '',
    oficio: '',
    ciudad: '',
  });

  const [cedulaFrente, setCedulaFrente] = useState(null);
  const [cedulaDorso, setCedulaDorso] = useState(null);
  const [fotoCara, setFotoCara] = useState(null);

  const [previewFrente, setPreviewFrente] = useState(null);
  const [previewDorso, setPreviewDorso] = useState(null);
  const [previewCara, setPreviewCara] = useState(null);

  const [loading, setLoading] = useState(false);

  // === FRASES ROTATIVAS ===
  const frases = [
    "Detrás de cada oficio hay una persona con sueños. En ManosYA queremos darte más oportunidades.",
    "Registrate y sé parte de una comunidad que ayuda, conecta y genera futuro.",
    "No es solo una app, somos personas que nos apoyamos entre todos.",
    "Queremos que tu esfuerzo tenga más valor. Este es el primer paso.",
  ];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % frases.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // === FORMULARIO ===
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const uploadFile = async (file, path) => {
    if (!file) return null;

    const { error } = await supabase.storage
      .from('workers-docs')
      .upload(path, file, { upsert: true });

    if (error) {
      console.error(error);
      return null;
    }

    const { data: publicUrl } = supabase.storage
      .from('workers-docs')
      .getPublicUrl(path);

    return publicUrl.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const timestamp = Date.now();
    const frenteUrl = await uploadFile(cedulaFrente, `cedulas/${form.cedula}_${timestamp}_frente.png`);
    const dorsoUrl = await uploadFile(cedulaDorso, `cedulas/${form.cedula}_${timestamp}_dorso.png`);
    const caraUrl = await uploadFile(fotoCara, `caras/${form.cedula}_${timestamp}_cara.png`);

    const { error } = await supabase.from('workers').insert([{
      ...form,
      cedula_frente: frenteUrl,
      cedula_dorso: dorsoUrl,
      foto_cara: caraUrl,
    }]);

    setLoading(false);

    if (error) {
      console.error(error);
      alert("Error al registrar ❌");
    } else {
      alert("Registro exitoso ✅");
      setForm({ nombre: '', cedula: '', telefono: '', oficio: '', ciudad: '' });
      setCedulaFrente(null);
      setCedulaDorso(null);
      setFotoCara(null);
      setPreviewFrente(null);
      setPreviewDorso(null);
      setPreviewCara(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white relative">
      <main className="flex-1 px-6 py-16 max-w-md mx-auto">
        
        {/* TÍTULO con marca resaltada */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-extrabold text-center mb-6 text-white"
        >
          Registro de Trabajadores – Unite a{" "}
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            ManosYA
          </span>
        </motion.h1>

        {/* FRASES ROTATIVAS */}
        <div className="min-h-[100px] flex items-center justify-center mb-8">
          <AnimatePresence mode="wait">
            <motion.p
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.8 }}
              className="text-center text-base md:text-xl italic font-semibold text-emerald-400 leading-relaxed px-4 whitespace-normal break-words"
            >
              {frases[index]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* FORMULARIO */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5 bg-neutral-900 p-6 rounded-2xl shadow-lg border border-white/10"
        >
          <div>
            <label className="block text-sm text-white/70">Nombre completo</label>
            <input
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              required
              className="mt-1 w-full px-3 py-2 rounded-lg bg-black border border-white/20"
              placeholder="Ej: Juan Pérez"
            />
          </div>

          <div>
            <label className="block text-sm text-white/70">Cédula</label>
            <input
              type="text"
              name="cedula"
              value={form.cedula}
              onChange={handleChange}
              required
              className="mt-1 w-full px-3 py-2 rounded-lg bg-black border border-white/20"
              placeholder="Ej: 4573262"
            />
          </div>

          <div>
            <label className="block text-sm text-white/70">Teléfono</label>
            <input
              type="text"
              name="telefono"
              value={form.telefono}
              onChange={handleChange}
              required
              className="mt-1 w-full px-3 py-2 rounded-lg bg-black border border-white/20"
              placeholder="Ej: 0981 123 456"
            />
          </div>

          <div>
            <label className="block text-sm text-white/70">Oficio / Servicio</label>
            <select
              name="oficio"
              value={form.oficio}
              onChange={handleChange}
              required
              className="mt-1 w-full px-3 py-2 rounded-lg bg-black border border-white/20"
            >
              <option value="">Seleccioná tu oficio</option>
              <option value="electricista">Electricista</option>
              <option value="plomero">Plomero</option>
              <option value="fletes">Fletes</option>
              <option value="mascotas">Cuidado de mascotas</option>
              <option value="limpieza">Limpieza</option>
              <option value="jardineria">Jardinería</option>
              <option value="auxilio">Auxilio vehicular</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-white/70">Ciudad / Zona</label>
            <input
              type="text"
              name="ciudad"
              value={form.ciudad}
              onChange={handleChange}
              required
              className="mt-1 w-full px-3 py-2 rounded-lg bg-black border border-white/20"
              placeholder="Ej: Ciudad del Este"
            />
          </div>

          {/* UPLOADS */}
          <FileUpload
            buttonText="Sacá foto de tu C.I. (frente)"
            icon={IdCard}
            file={cedulaFrente}
            setFile={setCedulaFrente}
            preview={previewFrente}
            setPreview={setPreviewFrente}
          />

          <FileUpload
            buttonText="Sacá foto de tu C.I. (dorso)"
            icon={IdCard}
            file={cedulaDorso}
            setFile={setCedulaDorso}
            preview={previewDorso}
            setPreview={setPreviewDorso}
          />

          <FileUpload
            buttonText="Sacate una selfie"
            icon={Camera}
            file={fotoCara}
            setFile={setFotoCara}
            preview={previewCara}
            setPreview={setPreviewCara}
          />

          {/* BOTÓN SUBMIT */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-neutral-200 transition"
          >
            {loading ? "Guardando..." : "Registrarme"}
          </button>
        </form>

        <p className="text-xs text-center text-white/60 mt-4">
          Este registro es preparatorio. Los contratos y pagos se realizarán con ManosYA S.A. una vez habilitada oficialmente.
        </p>

        <Link href="/" className="block text-center mt-6 text-sm text-[var(--accent)] hover:underline">
          ← Volver al inicio
        </Link>
      </main>
    </div>
  );
}
