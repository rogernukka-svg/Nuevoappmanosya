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

  // 🌟 Estados nuevos para la instalación PWA
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // 🔍 Verificar sesión activa
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        toast.success('Bienvenido 👋 Redirigiendo...');
        router.push('/role-selector'); // ✅ ruta corregida
      } else {
        setCheckingSession(false);
      }
    };
    checkSession();
  }, [router]);

  // 📱 Detectar si se puede instalar la app
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // 🚀 Instalar la app
  async function handleInstall() {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      toast.success('¡Gracias por instalar ManosYA! 🎉');
    }
    setInstallPrompt(null);
    setShowInstallBanner(false);
  }

  // 🚀 Login normal
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
      router.push('/role-selector'); // ✅ ruta corregida
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
      router.push('/role-selector'); // ✅ ruta corregida
    } catch (err) {
      toast.error('No se pudo crear la cuenta.');
    } finally {
      setBusy(false);
    }
  }

  // 🚀 Login con Google
  async function handleLoginWithGoogle() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo:
            process.env.NODE_ENV === 'development'
              ? 'http://localhost:3000/role-selector' // ✅ funciona local
              : 'https://www.manosya.app/role-selector', // ✅ dominio final
        },
      });
      if (error) throw error;
    } catch (err) {
      toast.error('Error al conectar con Google.');
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
        <form
          onSubmit={mode === 'login' ? handleLogin : handleSignup}
          className="space-y-3"
        >
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

        {/* 🚀 Login con Google */}
        <div className="mt-4">
          <button
            onClick={handleLoginWithGoogle}
            className="w-full flex items-center justify-center gap-2 py-3 border border-gray-300 hover:bg-gray-50 rounded-xl transition text-gray-700 font-medium"
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              className="w-5 h-5"
            />
            Continuar con Google
          </button>
        </div>

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

      <p className="text-xs text-gray-500 text-center mt-4 leading-snug">
        Al continuar, estás de acuerdo con nuestras{' '}
        <a
          href="/terms-of-use"
          target="_blank"
          className="text-emerald-600 hover:text-emerald-700 font-medium"
        >
          condiciones de uso
        </a>{' '}
        y nuestros{' '}
        <a
          href="/privacy-policy"
          target="_blank"
          className="text-emerald-600 hover:text-emerald-700 font-medium"
        >
          cuidados de privacidad
        </a>.
      </p>

      {/* Footer */}
      <p className="text-xs text-gray-400 mt-8 text-center max-w-xs">
        🌎 En ManosYA, cada persona tiene algo valioso que ofrecer.
      </p>

      {/* 📲 Banner de instalación PWA */}
      {showInstallBanner && (
        <div className="fixed bottom-5 inset-x-0 flex justify-center z-50">
          <div className="bg-white border border-emerald-200 shadow-lg rounded-2xl p-4 w-[90%] max-w-sm text-center animate-bounce">
            <p className="text-emerald-700 font-semibold mb-3">
              📱 ¡Instalá{' '}
              <span className="text-emerald-500 font-bold">ManosYA</span> en tu
              pantalla!
            </p>
            <button
              onClick={handleInstall}
              className="px-4 py-2 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition font-medium"
            >
              Instalar ahora
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
