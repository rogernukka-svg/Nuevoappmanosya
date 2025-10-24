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

  /* 🔍 Verificar sesión activa */
  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error('Error obteniendo sesión:', error);

      if (data?.session?.user) {
        console.log('✅ Sesión activa detectada:', data.session.user.email);
        if (isMounted) {
          toast.success('Bienvenido 👋 Redirigiendo...');
          setTimeout(() => router.push('/role-selector'), 500);
        }
      } else {
        console.log('ℹ️ No hay sesión activa.');
        if (isMounted) setCheckingSession(false);
      }
    };

    checkSession();
    const retry = setTimeout(checkSession, 1000);

    return () => {
      isMounted = false;
      clearTimeout(retry);
    };
  }, [router]);

  /* 🚀 Iniciar sesión */
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

  /* 🧩 Crear cuenta nueva */
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

      // 🧱 Crear perfil en tabla "profiles"
      const userId = data.user?.id;
      if (userId && fullName.trim()) {
        const { error: profileError } = await supabase.from('profiles').insert([
          {
            id: userId,
            full_name: fullName.trim(),
            created_at: new Date(),
          },
        ]);
        if (profileError) {
          console.error('⚠️ Error creando perfil:', profileError);
        } else {
          console.log('✅ Perfil creado correctamente');
        }
      }

      // 🔑 Iniciar sesión automáticamente
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

  /* ⏳ Mientras se verifica sesión */
  if (checkingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-pulse text-emerald-600 text-lg font-semibold">
          Verificando sesión...
        </div>
      </div>
    );
  }

  /* 🎨 UI principal */
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-gray-50 p-6">
      <div className="w-full max-w-md bg-white shadow-2xl rounded-2xl border border-gray-100 p-8 text-center">
        {/* Logo */}
        <h1 className="text-3xl font-extrabold mb-2">
          <span className="text-emerald-600">Manos</span>
          <span className="text-gray-900">YA</span>
        </h1>

        {/* CTA */}
        <p className="text-gray-700 font-medium mb-3">
          💡 <span className="text-emerald-600">Unite a la red</span> que conecta talento con oportunidades.
        </p>
        <p className="text-gray-500 italic mb-6 text-sm">
          Empezá hoy y encontrá trabajo o ayuda en minutos.
        </p>

        {/* Formulario */}
        <form onSubmit={mode === 'login' ? handleLogin : handleSignup}>
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Tu nombre completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full mb-3 p-3 border rounded-lg focus:ring-2 focus:ring-emerald-400 outline-none"
            />
          )}
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
              : 'Crear cuenta y comenzar'}
          </button>
        </form>

        {/* Cambiar modo */}
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

      {/* Frase motivadora inferior */}
      <p className="mt-6 text-sm text-gray-500 text-center max-w-sm">
        🌎 En ManosYA, cada persona tiene algo valioso que ofrecer.  
        Empezá hoy y formá parte del cambio.
      </p>
    </div>
  );
}
