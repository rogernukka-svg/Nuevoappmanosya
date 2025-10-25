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

  // 🔍 Verificar sesión activa
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        toast.success('Bienvenido 👋 Redirigiendo...');
        router.push('/role-selector');
      } else {
        setCheckingSession(false);
      }
    };
    checkSession();
  }, [router]);

  // 🚀 Login
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
    } catch (err) {
      toast.error('Correo o contraseña incorrectos.');
    } finally {
      setBusy(false);
    }
  }

  // 🧩 Registro
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
    } catch (err) {
      toast.error('No se pudo crear la cuenta.');
    } finally {
      setBusy(false);
    }
  }

  // 🕓 Cargando sesión
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-emerald-600">
        Verificando sesión...
      </div>
    );
  }

  // 💎 UI limpia
  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-6 bg-gradient-to-b from-white to-emerald-50 font-[var(--font-manrope)]">
      {/* Logo */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight">
          <span className="text-[#111827]">Manos</span>
          <span className="text-emerald-600">YA</span>
        </h1>
        <p className="text-gray-500 mt-2 text-sm">
          Conectamos talento con oportunidades.
        </p>
      </div>

      {/* Formulario */}
      <div className="w-full max-w-sm bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-3">
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Nombre completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-400 outline-none transition"
            />
          )}
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-400 outline-none transition"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-400 outline-none transition"
          />

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition shadow-sm"
          >
            {busy
              ? 'Procesando...'
              : mode === 'login'
              ? 'Entrar'
              : 'Crear cuenta'}
          </button>
        </form>

        {/* Cambiar modo */}
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

      {/* Footer */}
      <p className="text-xs text-gray-400 mt-8 text-center max-w-xs">
        🌎 En ManosYA, cada persona tiene algo valioso que ofrecer.
      </p>
    </div>
  );
}
