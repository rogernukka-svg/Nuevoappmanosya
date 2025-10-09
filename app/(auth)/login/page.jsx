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
  const [busy, setBusy] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // ✅ Si ya hay sesión activa, ir directo a /role-selector
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log('🔁 Sesión activa detectada:', session.user.email);
        window.location.href = '/role-selector';
      } else {
        setCheckingSession(false);
      }
    })();
  }, []);

  /* === LOGIN === */
  async function handleLogin(e) {
    e.preventDefault();
    setBusy(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        toast.error('Credenciales incorrectas ❌');
        console.error('Error login:', error.message);
        setBusy(false);
        return;
      }

      console.log('✅ Sesión iniciada:', data.user?.email);
      toast.success('Bienvenido 👋');

      // 🔄 Forzar sincronización de cookie y esperar propagación
      await supabase.auth.refreshSession();
      await new Promise((resolve) => setTimeout(resolve, 1200)); // 1.2s

      // 🔥 Redirección forzada (sin router)
      window.location.href = '/role-selector';
    } catch (err) {
      console.error('⚠️ Error inesperado:', err.message);
      toast.error('Error al iniciar sesión');
    } finally {
      setBusy(false);
    }
  }

  /* === REGISTRO === */
  async function handleSignup(e) {
    e.preventDefault();
    setBusy(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        toast.error('Error al crear la cuenta ❌');
        console.error('Error signup:', error.message);
        setBusy(false);
        return;
      }

      toast.success('Cuenta creada ✅ Verificá tu correo.');
      await new Promise((resolve) => setTimeout(resolve, 1000));
      window.location.href = '/role-selector';
    } catch (err) {
      console.error('⚠️ Error inesperado:', err.message);
      toast.error('Error al registrarse');
    } finally {
      setBusy(false);
    }
  }

  // 🌀 Estado intermedio mientras revisa sesión existente
  if (checkingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F9FAFB]">
        <div className="animate-pulse text-emerald-600 text-lg font-semibold">
          Verificando sesión...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md mx-auto animate-fadeIn">
      <h1 className="text-2xl font-extrabold text-center text-emerald-600 mb-2">
        Manos<span className="text-gray-900">YA</span>
      </h1>
      <p className="text-center text-gray-500 mb-6">
        {mode === 'login' ? 'Iniciá sesión' : 'Creá tu cuenta'}
      </p>

      <form onSubmit={mode === 'login' ? handleLogin : handleSignup}>
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full mb-3 p-3 border rounded-lg focus:ring-2 focus:ring-emerald-400 outline-none"
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full mb-4 p-3 border rounded-lg focus:ring-2 focus:ring-emerald-400 outline-none"
        />

        <button
          type="submit"
          disabled={busy}
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition disabled:opacity-70"
        >
          {busy ? 'Procesando...' : mode === 'login' ? 'Entrar' : 'Registrarme'}
        </button>
      </form>

      <div className="mt-6 text-center">
        {mode === 'login' ? (
          <p className="text-sm">
            ¿No tenés cuenta?{' '}
            <button
              onClick={() => setMode('signup')}
              className="text-emerald-600 font-medium hover:underline"
            >
              Crear cuenta
            </button>
          </p>
        ) : (
          <p className="text-sm">
            ¿Ya tenés cuenta?{' '}
            <button
              onClick={() => setMode('login')}
              className="text-emerald-600 font-medium hover:underline"
            >
              Iniciar sesión
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
