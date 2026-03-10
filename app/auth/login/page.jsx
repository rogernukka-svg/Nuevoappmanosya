'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const supabase = getSupabase();

export default function LoginManosYA() {
  const router = useRouter();

  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (data?.session?.user) {
        toast.success('Bienvenido');
        router.push('/role-selector');
      } else {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, [router]);

  async function handleLogin(e) {
    e.preventDefault();
    if (busy) return;

    setBusy(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      toast.success('Inicio de sesión exitoso');
      router.push('/role-selector');
    } catch (err) {
      console.error('Error login:', err);
      toast.error('Correo o contraseña incorrectos.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    if (busy) return;

    if (!fullName.trim()) {
      toast.error('Ingresá tu nombre completo.');
      return;
    }

    setBusy(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = fullName.trim();

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });

      if (error) throw error;

      const userId = data?.user?.id;

      if (!userId) {
        throw new Error('No se pudo obtener el ID del usuario.');
      }

      const { error: profileError } = await supabase.from('profiles').upsert(
        [
          {
            id: userId,
            full_name: cleanName,
            email: cleanEmail,
            created_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'id' }
      );

      if (profileError) throw profileError;

      toast.success('Cuenta creada correctamente');
      router.push('/role-selector');
    } catch (err) {
      console.error('Error signup:', err);
      toast.error('No se pudo crear la cuenta.');
    } finally {
      setBusy(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-[100svh] flex items-center justify-center bg-[#f8fafc] font-[var(--font-manrope)] px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-emerald-200 blur-xl opacity-60" />
            <div className="relative h-10 w-10 rounded-full border-2 border-emerald-200 border-t-emerald-600 animate-spin" />
          </div>
          <p className="text-sm text-slate-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] overflow-hidden bg-[#f8fafc] font-[var(--font-manrope)] flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
      {/* Fondo */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.10),transparent_34%),radial-gradient(circle_at_85%_20%,rgba(34,211,238,0.08),transparent_22%)]" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[580px] h-[240px] rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute top-28 -left-20 w-[220px] h-[220px] rounded-full bg-cyan-200/30 blur-3xl" />
        <div className="absolute bottom-[-90px] right-[-50px] w-[250px] h-[250px] rounded-full bg-teal-200/25 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(15,23,42,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.08) 1px, transparent 1px)',
            backgroundSize: '42px 42px',
          }}
        />
      </div>

      <div className="relative w-full max-w-6xl grid lg:grid-cols-2 gap-10 items-center">
        {/* PANEL IZQUIERDO */}
        <div className="hidden lg:block">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute -inset-3 rounded-full bg-emerald-200/50 blur-2xl" />
                <img
                  src="/logo-manosya.png"
                  alt="ManosYA"
                  className="relative w-[230px] object-contain drop-shadow-[0_18px_40px_rgba(0,0,0,0.10)]"
                />
              </div>
            </div>

            <h1 className="mt-10 text-4xl xl:text-5xl font-black tracking-tight text-slate-900 leading-tight">
              Entrá a <span className="text-slate-900">Manos</span>
              <span className="bg-gradient-to-r from-emerald-500 to-cyan-400 bg-clip-text text-transparent">YA</span>
              .
              <br />
              Todo empieza acá.
            </h1>

            <p className="mt-5 text-slate-600 text-base leading-relaxed max-w-md">
              Accedé como cliente o profesional en una plataforma simple, rápida y pensada para mover servicios reales.
            </p>

            <div className="mt-8 grid gap-3 max-w-md">
              <InfoLine title="Acceso seguro" desc="Inicio de sesión protegido y controlado." />
              <InfoLine title="Modo cliente o profesional" desc="Cada usuario entra directo a su flujo." />
              <InfoLine title="Diseño claro" desc="Menos vueltas, más acción." />
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              <MiniChip label="Verificado" />
              <MiniChip label="Pago protegido" />
              <MiniChip label="Rápido" />
            </div>

            <p className="mt-10 text-xs text-slate-400">
              © {new Date().getFullYear()} ManosYA. Plataforma de servicios.
            </p>
          </motion.div>
        </div>

        {/* CARD */}
        <div className="w-full mx-auto max-w-[540px]">
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="rounded-3xl sm:rounded-[30px] border border-white/80 bg-white/90 shadow-[0_20px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl overflow-hidden"
          >
            {/* Header */}
            <div className="relative px-5 sm:px-8 pt-7 sm:pt-8 pb-6 border-b border-slate-100">
              <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-emerald-50/80 to-transparent" />

              <div className="relative flex justify-between items-center">
                <div className="lg:hidden">
                  <img
                    src="/logo-manosya.png"
                    alt="ManosYA"
                    className="w-[150px] sm:w-[180px] object-contain"
                  />
                </div>

                <div className="ml-auto text-xs text-slate-400">v1.0 Beta</div>
              </div>

              <div className="relative mt-5">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight tracking-tight">
                  {mode === 'login' ? 'Bienvenido de nuevo' : 'Crear una cuenta'}
                </h2>
                <p className="text-sm sm:text-base text-slate-500 mt-1.5">
                  {mode === 'login'
                    ? 'Ingresá con tu correo y contraseña.'
                    : 'Completá tus datos para comenzar.'}
                </p>
              </div>

              {/* Switch */}
              <div className="relative mt-5">
                <div className="inline-flex w-full rounded-2xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className={[
                      'w-1/2 py-2.5 text-sm sm:text-base font-bold rounded-xl transition',
                      mode === 'login'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700',
                    ].join(' ')}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className={[
                      'w-1/2 py-2.5 text-sm sm:text-base font-bold rounded-xl transition',
                      mode === 'signup'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700',
                    ].join(' ')}
                  >
                    Registro
                  </button>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 sm:px-8 py-6 sm:py-7">
              <form
                onSubmit={mode === 'login' ? handleLogin : handleSignup}
                className="space-y-4 sm:space-y-5"
              >
                {mode === 'signup' && (
                  <Field
                    label="Nombre completo"
                    placeholder="Ej: Juan Pérez"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    icon="👤"
                    required
                  />
                )}

                <Field
                  label="Correo"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon="✉️"
                  type="email"
                  required
                />

                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-slate-700">
                    Contraseña
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      🔒
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      className="w-full bg-slate-50 text-slate-900 placeholder:text-slate-400 pl-10 pr-20 py-3.5 sm:py-4 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-200 text-base"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-700 transition"
                    >
                      {showPassword ? 'OCULTAR' : 'VER'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-base shadow-[0_12px_28px_rgba(16,185,129,0.22)] transition disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {busy ? 'Procesando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
                </button>
              </form>

              <div className="mt-5 text-sm sm:text-base text-slate-600 text-center">
                {mode === 'login' ? (
                  <>
                    ¿No tenés cuenta?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
                      className="text-emerald-700 font-bold hover:underline"
                    >
                      Crear cuenta
                    </button>
                  </>
                ) : (
                  <>
                    ¿Ya tenés cuenta?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-emerald-700 font-bold hover:underline"
                    >
                      Iniciar sesión
                    </button>
                  </>
                )}
              </div>

              <p className="mt-6 text-[11px] sm:text-xs text-slate-500 text-center leading-snug">
                Al continuar, aceptás nuestras{' '}
                <a
                  href="/terms-of-use"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 font-bold hover:underline"
                >
                  condiciones de uso
                </a>{' '}
                y{' '}
                <a
                  href="/privacy-policy"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 font-bold hover:underline"
                >
                  política de privacidad
                </a>
                .
              </p>
            </div>
          </motion.div>

          <p className="mt-4 text-xs text-slate-400 text-center px-2">
            Plataforma en evolución. Mejoras activas para enero.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ===================== UI helpers ===================== */

function MiniChip({ label }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      {label}
    </div>
  );
}

function InfoLine({ title, desc }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 h-10 w-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
        <span className="text-emerald-700 font-bold">✓</span>
      </div>
      <div>
        <div className="text-sm font-bold text-slate-900">{title}</div>
        <div className="text-sm text-slate-600">{desc}</div>
      </div>
    </div>
  );
}

function Field({ label, placeholder, value, onChange, icon, type = 'text', required = false }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs sm:text-sm font-semibold text-slate-700">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          className="w-full bg-slate-50 text-slate-900 placeholder:text-slate-400 pl-10 pr-4 py-3.5 sm:py-4 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-200 text-base"
        />
      </div>
    </div>
  );
}