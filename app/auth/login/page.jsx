'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { toast } from 'sonner';

const supabase = getSupabase();

export default function LoginManosYA() {
  const router = useRouter();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // 👁️ Control de mostrar contraseña
  const [showPassword, setShowPassword] = useState(false);

  // 🔐 Sesión
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        toast.success('Bienvenido 👋');
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
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      toast.success('Inicio de sesión exitoso 🎉');
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
            created_at: new Date(),
          },
        ]);
      }

      toast.success('Cuenta creada correctamente ✅');
      router.push('/role-selector');
    } catch {
      toast.error('No se pudo crear la cuenta.');
    } finally {
      setBusy(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-emerald-600">
        Verificando sesión...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-6 bg-gradient-to-b from-emerald-50 to-white font-[var(--font-manrope)]">

      {/* HEADER */}
      <div className="text-center mb-10">
        <h1 className="text-5xl font-extrabold tracking-tight">
          <span className="text-[#111827]">Manos</span>
          <span className="text-emerald-600">YA</span>
        </h1>
        <p className="text-gray-600 mt-2 text-sm">
          Tu talento, tu oportunidad.
        </p>
      </div>

      {/* CARD */}
      <div className="w-full max-w-sm bg-white/80 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-emerald-100">

        <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-4">

          {/* Nombre SOLO en registro */}
          {mode === 'signup' && (
            <div className="relative">
              <input
                type="text"
                placeholder="Nombre completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full bg-gray-100 px-12 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <span className="absolute left-4 top-3.5 text-gray-500 text-lg">👤</span>
            </div>
          )}

          {/* Email */}
          <div className="relative">
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-gray-100 px-12 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <span className="absolute left-4 top-3.5 text-gray-500 text-lg">📧</span>
          </div>

          {/* Password con botón mostrar/ocultar */}
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-gray-100 px-12 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-400"
            />
            {/* Ícono del candado */}
            <span className="absolute left-4 top-3.5 text-gray-500 text-lg">🔒</span>

            {/* Botón mostrar/ocultar */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-3.5 text-gray-500 text-lg hover:text-gray-700 transition"
            >
              {showPassword ? '🚫' : '👁️'}
            </button>
          </div>

          {/* Botón */}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:brightness-110 text-white font-semibold rounded-xl shadow-lg transition-all"
          >
            {busy
              ? 'Procesando...'
              : mode === 'login'
              ? 'Entrar'
              : 'Crear cuenta'}
          </button>
        </form>

        <div className="mt-4 text-sm text-gray-600 text-center">
          {mode === 'login' ? (
            <>
              ¿No tenés cuenta?{' '}
              <button
                onClick={() => setMode('signup')}
                className="text-emerald-600 font-medium hover:underline"
              >
                Crear cuenta
              </button>
            </>
          ) : (
            <>
              ¿Ya tenés cuenta?{' '}
              <button
                onClick={() => setMode('login')}
                className="text-emerald-600 font-medium hover:underline"
              >
                Iniciar sesión
              </button>
            </>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <p className="text-xs text-gray-500 text-center mt-6 leading-snug">
        Al continuar, aceptás nuestras{' '}
        <a href="/terms-of-use" target="_blank" className="text-emerald-600 font-medium">
          condiciones de uso
        </a>{' '}y{' '}
        <a href="/privacy-policy" target="_blank" className="text-emerald-600 font-medium">
          cuidados de privacidad
        </a>.
      </p>

      <p className="text-xs text-gray-400 mt-6 text-center max-w-xs">
        🌎 En ManosYA, cada persona tiene algo valioso que ofrecer.
      </p>
    </div>
  );
}
