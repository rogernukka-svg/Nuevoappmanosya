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
      <div className="flex min-h-[72dvh] items-center justify-center px-4 font-[var(--font-manrope)]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-emerald-300/40 blur-2xl" />
            <div className="relative h-11 w-11 rounded-full border-2 border-emerald-200 border-t-emerald-600 animate-spin" />
          </div>
          <p className="text-sm font-medium text-slate-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 font-[var(--font-manrope)]">
      <div className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
        {/* PANEL IZQUIERDO */}
        <div className="hidden lg:block">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="px-2 xl:px-6"
          >
            <div className="inline-flex items-center gap-3 rounded-full border border-white/70 bg-white/60 px-4 py-2 backdrop-blur-md shadow-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Acceso ManosYA
              </span>
            </div>

            <div className="mt-8">
              <div className="relative inline-block">
                <div className="absolute -inset-5 rounded-full bg-emerald-200/40 blur-3xl" />
                <img
                  src="/logo-manosya.png"
                  alt="ManosYA"
                  className="relative w-[230px] object-contain drop-shadow-[0_18px_50px_rgba(15,23,42,0.12)]"
                />
              </div>
            </div>

            <h1 className="mt-10 max-w-[620px] text-4xl font-black leading-[1.02] tracking-tight text-slate-900 xl:text-5xl">
              Entrá a <span className="text-slate-900">Manos</span>
              <span className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                YA
              </span>
              .
              <br />
              Todo empieza acá.
            </h1>

            <p className="mt-5 max-w-[520px] text-base leading-relaxed text-slate-600 xl:text-[17px]">
              Accedé como cliente o profesional en una plataforma simple, rápida y pensada para mover servicios reales con una experiencia clara, moderna y confiable.
            </p>

            <div className="mt-8 grid max-w-[560px] gap-4">
              <InfoLine
                title="Acceso seguro"
                desc="Inicio de sesión protegido y flujo controlado para cada usuario."
              />
              <InfoLine
                title="Modo cliente o profesional"
                desc="Cada persona entra directo a su experiencia según su rol."
              />
              <InfoLine
                title="Tecnología clara"
                desc="Diseño limpio, rápido y pensado para operar sin fricción."
              />
            </div>

            <div className="mt-8 flex flex-wrap gap-2.5">
              <MiniChip label="Verificado" />
              <MiniChip label="Seguro" />
              <MiniChip label="Rápido" />
              <MiniChip label="Moderno" />
            </div>

            <div className="mt-10 grid max-w-[560px] grid-cols-3 gap-3">
              <StatCard value="24/7" label="Acceso continuo" />
              <StatCard value="2 roles" label="Cliente y trabajador" />
              <StatCard value="UX" label="Simple y clara" />
            </div>

            <p className="mt-10 text-xs text-slate-400">
              © {new Date().getFullYear()} ManosYA. Plataforma de servicios.
            </p>
          </motion.div>
        </div>

        {/* FORMULARIO */}
        <div className="w-full max-w-[560px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="relative overflow-hidden rounded-[30px] border border-white/80 bg-white/80 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
          >
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-emerald-50/90 via-white/40 to-transparent" />
            <div className="absolute right-[-30px] top-[-30px] h-28 w-28 rounded-full bg-cyan-200/20 blur-2xl" />
            <div className="absolute left-[-20px] bottom-[-20px] h-24 w-24 rounded-full bg-emerald-200/20 blur-2xl" />

            {/* HEADER */}
            <div className="relative border-b border-slate-100 px-5 pb-6 pt-7 sm:px-8 sm:pt-8">
             <div className="flex items-center">
  <div className="lg:hidden">
    <img
      src="/logo-manosya.png"
      alt="ManosYA"
      className="w-[150px] object-contain sm:w-[180px]"
    />
  </div>
</div>

              <div className="mt-5">
                <h2 className="text-2xl font-black leading-tight tracking-tight text-slate-900 sm:text-3xl">
                  {mode === 'login' ? 'Bienvenido de nuevo' : 'Crear una cuenta'}
                </h2>
                <p className="mt-1.5 text-sm text-slate-500 sm:text-base">
                  {mode === 'login'
                    ? 'Ingresá con tu correo y contraseña.'
                    : 'Completá tus datos para comenzar.'}
                </p>
              </div>

              <div className="mt-5">
                <div className="inline-flex w-full rounded-2xl border border-slate-200 bg-slate-50/90 p-1.5">
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className={[
                      'w-1/2 rounded-xl py-2.5 text-sm font-black transition sm:text-base',
                      mode === 'login'
                        ? 'bg-white text-slate-900 shadow-[0_8px_20px_rgba(15,23,42,0.06)]'
                        : 'text-slate-500 hover:text-slate-700',
                    ].join(' ')}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className={[
                      'w-1/2 rounded-xl py-2.5 text-sm font-black transition sm:text-base',
                      mode === 'signup'
                        ? 'bg-white text-slate-900 shadow-[0_8px_20px_rgba(15,23,42,0.06)]'
                        : 'text-slate-500 hover:text-slate-700',
                    ].join(' ')}
                  >
                    Registro
                  </button>
                </div>
              </div>
            </div>

            {/* BODY */}
            <div className="relative px-5 py-6 sm:px-8 sm:py-7">
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
                  <label className="text-xs font-semibold text-slate-700 sm:text-sm">
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
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/90 py-3.5 pl-10 pr-20 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-200 focus:ring-2 focus:ring-emerald-400 sm:py-4"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500 transition hover:text-slate-700 sm:text-sm"
                    >
                      {showPassword ? 'OCULTAR' : 'VER'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-500 to-teal-500 py-3.5 text-base font-black text-white shadow-[0_16px_36px_rgba(16,185,129,0.24)] transition hover:from-emerald-600 hover:to-teal-600 disabled:cursor-not-allowed disabled:opacity-70 sm:py-4"
                >
                  {busy ? 'Procesando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
                </button>
              </form>

              <div className="mt-5 text-center text-sm text-slate-600 sm:text-base">
                {mode === 'login' ? (
                  <>
                    ¿No tenés cuenta?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
                      className="font-bold text-emerald-700 hover:underline"
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
                      className="font-bold text-emerald-700 hover:underline"
                    >
                      Iniciar sesión
                    </button>
                  </>
                )}
              </div>

              <p className="mt-6 text-center text-[11px] leading-snug text-slate-500 sm:text-xs">
                Al continuar, aceptás nuestras{' '}
                <a
                  href="/terms-of-use"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-emerald-700 hover:underline"
                >
                  condiciones de uso
                </a>{' '}
                y{' '}
                <a
                  href="/privacy-policy"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-emerald-700 hover:underline"
                >
                  política de privacidad
                </a>
                .
              </p>
            </div>
          </motion.div>

          <p className="mt-4 px-2 text-center text-xs text-slate-400">
            Plataforma en evolución. Mejoras activas.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ===================== UI helpers ===================== */

function MiniChip({ label }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-sm">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      {label}
    </div>
  );
}

function StatCard({ value, label }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/65 px-4 py-4 shadow-sm backdrop-blur-md">
      <div className="text-lg font-black text-slate-900">{value}</div>
      <div className="mt-1 text-xs font-medium text-slate-500">{label}</div>
    </div>
  );
}

function InfoLine({ title, desc }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-white/70 bg-white/55 p-3.5 shadow-sm backdrop-blur-md">
      <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50">
        <span className="font-bold text-emerald-700">✓</span>
      </div>
      <div>
        <div className="text-sm font-bold text-slate-900">{title}</div>
        <div className="text-sm text-slate-600">{desc}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  icon,
  type = 'text',
  required = false,
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-700 sm:text-sm">{label}</label>
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
          className="w-full rounded-2xl border border-slate-200 bg-slate-50/90 py-3.5 pl-10 pr-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-200 focus:ring-2 focus:ring-emerald-400 sm:py-4"
        />
      </div>
    </div>
  );
}