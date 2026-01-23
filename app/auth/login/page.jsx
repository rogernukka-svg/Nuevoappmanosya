'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { toast } from 'sonner';

const supabase = getSupabase();

export default function LoginManosYA() {
  const router = useRouter();

  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // 👁️ mostrar contraseña
  const [showPassword, setShowPassword] = useState(false);

  // 🔐 Sesión
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

  // 🔑 Login
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
    } catch {
      toast.error('Correo o contraseña incorrectos.');
    } finally {
      setBusy(false);
    }
  }

  // 🆕 Registro
  async function handleSignup(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      const userId = data.user?.id;
      if (userId && fullName.trim()) {
        await supabase.from('profiles').insert([
          {
            id: userId,
            full_name: fullName.trim(),
            created_at: new Date().toISOString(),
          },
        ]);
      }

      toast.success('Cuenta creada correctamente');
      router.push('/role-selector');
    } catch {
      toast.error('No se pudo crear la cuenta.');
    } finally {
      setBusy(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-emerald-700 font-[var(--font-manrope)]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-emerald-200 border-t-emerald-600 animate-spin" />
          <p className="text-sm text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-[var(--font-manrope)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-10 items-center">
        {/* PANEL IZQUIERDO (profesional, sin redundancia de logos) */}
        <div className="hidden lg:block">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100">
              <span className="text-emerald-700 font-extrabold">MY</span>
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-gray-900">
                Manos<span className="text-emerald-600">YA</span>
              </div>
              <div className="text-xs text-gray-500">v1.0 Beta</div>
            </div>
          </div>

          <h1 className="mt-8 text-4xl font-extrabold tracking-tight text-gray-900 leading-tight">
            Un acceso simple.
            <br />
            Una operación profesional.
          </h1>

          <p className="mt-4 text-gray-600 text-base leading-relaxed max-w-md">
            Ingresá para gestionar tu experiencia como <span className="font-semibold">cliente</span> o{' '}
            <span className="font-semibold">trabajador</span>. Seguro, claro y rápido.
          </p>

          <div className="mt-8 grid gap-3 max-w-md">
            <InfoLine title="Seguridad" desc="Autenticación con Supabase y sesión controlada." />
            <InfoLine title="Orden" desc="Acceso por roles y flujo directo a tu panel." />
            <InfoLine title="Velocidad" desc="Interfaz ligera, moderna y sin distracciones." />
          </div>

          <p className="mt-10 text-xs text-gray-400">
            © {new Date().getFullYear()} ManosYA. Todos los derechos reservados.
          </p>
        </div>

        {/* CARD DERECHA */}
        <div className="w-full max-w-md mx-auto">
          <div className="rounded-3xl border border-gray-100 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.10)]">
            {/* Header card */}
            <div className="px-8 pt-8 pb-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="text-lg font-extrabold tracking-tight text-gray-900">
                  Manos<span className="text-emerald-600">YA</span>
                </div>
                <div className="text-xs text-gray-400">v1.0 Beta</div>
              </div>

              <div className="mt-5">
                <h2 className="text-2xl font-bold text-gray-900">
                  {mode === 'login' ? 'Bienvenido de nuevo' : 'Crear una cuenta'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {mode === 'login'
                    ? 'Ingresá con tu correo y contraseña.'
                    : 'Completá tus datos para comenzar.'}
                </p>
              </div>

              {/* Switch modo (pro y limpio) */}
              <div className="mt-5">
                <div className="inline-flex w-full rounded-2xl border border-gray-200 bg-gray-50 p-1">
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className={[
                      'w-1/2 py-2 text-sm font-semibold rounded-xl transition',
                      mode === 'login'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700',
                    ].join(' ')}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className={[
                      'w-1/2 py-2 text-sm font-semibold rounded-xl transition',
                      mode === 'signup'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700',
                    ].join(' ')}
                  >
                    Registro
                  </button>
                </div>
              </div>
            </div>

            {/* Body card */}
            <div className="px-8 py-7">
              <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-4">
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
                  <label className="text-xs font-semibold text-gray-700">Contraseña</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      🔒
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      className="w-full bg-gray-50 text-gray-900 placeholder:text-gray-400 pl-10 pr-16 py-3 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500 hover:text-gray-700 transition"
                    >
                      {showPassword ? 'OCULTAR' : 'VER'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-[0_10px_24px_rgba(16,185,129,0.20)] transition disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {busy ? 'Procesando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
                </button>
              </form>

              <div className="mt-5 text-sm text-gray-600 text-center">
                {mode === 'login' ? (
                  <>
                    ¿No tenés cuenta?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
                      className="text-emerald-700 font-semibold hover:underline"
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
                      className="text-emerald-700 font-semibold hover:underline"
                    >
                      Iniciar sesión
                    </button>
                  </>
                )}
              </div>

              <p className="mt-6 text-xs text-gray-500 text-center leading-snug">
                Al continuar, aceptás nuestras{' '}
                <a
                  href="/terms-of-use"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 font-semibold hover:underline"
                >
                  condiciones de uso
                </a>{' '}
                y{' '}
                <a
                  href="/privacy-policy"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 font-semibold hover:underline"
                >
                  política de privacidad
                </a>
                .
              </p>
            </div>
          </div>

          {/* Nota corta, tecnológica, sin “frases raras” */}
          <p className="mt-4 text-xs text-gray-400 text-center">
            Plataforma en evolución. Mejoras activas para enero.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ===================== UI helpers (sin dependencias) ===================== */

function InfoLine({ title, desc }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 h-9 w-9 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
        <span className="text-emerald-700 font-bold">✓</span>
      </div>
      <div>
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <div className="text-sm text-gray-600">{desc}</div>
      </div>
    </div>
  );
}

function Field({ label, placeholder, value, onChange, icon, type = 'text', required = false }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-700">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          className="w-full bg-gray-50 text-gray-900 placeholder:text-gray-400 pl-10 pr-4 py-3 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-200"
        />
      </div>
    </div>
  );
}
