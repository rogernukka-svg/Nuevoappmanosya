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

  // 🧠 Verificar sesión activa
  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error('Error obteniendo sesión:', error);

      if (data?.session?.user) {
        console.log('✅ Sesión activa detectada:', data.session.user.email);
        if (isMounted) {
          toast.success('Bienvenido 👋 Redirigiendo...');
          setTimeout(() => router.push('/role-selector'), 500); // 👈 forzamos redirección visible
        }
      } else {
        console.log('ℹ️ No hay sesión activa.');
        if (isMounted) setCheckingSession(false);
      }
    };

    checkSession();
    // Segundo intento por si el token tarda en escribirse
    const retry = setTimeout(checkSession, 1000);

    return () => {
      isMounted = false;
      clearTimeout(retry);
    };
  }, [router]);

  // 🚀 Iniciar sesión
  async function handleLogin(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      console.log('✅ Login exitoso:', data);
      toast.success('Inicio de sesión exitoso 🎉');

      setTimeout(() => router.push('/role-selector'), 800);
    } catch (err) {
      console.error('❌ Error al iniciar sesión:', err);
      toast.error('Correo o contraseña incorrectos.');
    } finally {
      setBusy(false);
    }
  }

  // 🧩 Crear cuenta
  async function handleSignup(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      console.log('✅ Cuenta creada:', data);
      toast.success('Cuenta creada correctamente ✅');

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (loginError) throw loginError;

      setTimeout(() => router.push('/role-selector'), 800);
    } catch (err) {
      console.error('⚠️ Error al registrarse:', err);
      toast.error('No se pudo crear la cuenta');
    } finally {
      setBusy(false);
    }
  }

  // ⏳ Mientras se verifica sesión
  if (checkingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-pulse text-emerald-600 text-lg font-semibold">
          Verificando sesión...
        </div>
      </div>
    );
  }

  // 🎨 UI principal
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-gray-50 p-6">
      <div className="w-full max-w-md bg-white shadow-2xl rounded-2xl border border-gray-100 p-8 text-center">
        <h1 className="text-3xl font-extrabold mb-2">
          <span className="text-emerald-600">Manos</span>
          <span className="text-gray-900">YA</span>
        </h1>
        <p className="text-gray-600 italic mb-6">
          Conectamos talento y confianza en segundos.
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
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg shadow-md transition disabled:opacity-70"
          >
            {busy
              ? 'Procesando...'
              : mode === 'login'
              ? 'Entrar a ManosYA'
              : 'Crear cuenta'}
          </button>
        </form>

        <div className="mt-6">
          {mode === 'login' ? (
            <p className="text-sm text-gray-600">
              ¿No tenés cuenta?{' '}
              <button
                onClick={() => setMode('signup')}
                className="text-emerald-600 font-medium hover:underline"
              >
                Crear cuenta
              </button>
            </p>
          ) : (
            <p className="text-sm text-gray-600">
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
    </div>
  );
}
