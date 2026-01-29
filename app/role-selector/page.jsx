'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Loader2,
  LogOut,
  UserRound,
  Wrench,
  Settings,
  Car,
  ShieldCheck,
} from 'lucide-react';
import { motion } from 'framer-motion';

const supabase = getSupabase();

export default function RoleSelectorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);

  // ✅ FIX SCROLL (si algún layout/global dejó overflow hidden)
  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyHeight = document.body.style.height;
    const prevBodyPosition = document.body.style.position;
    const prevBodyTop = document.body.style.top;
    const prevBodyWidth = document.body.style.width;

    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';
    document.body.style.position = 'static';
    document.body.style.top = '';
    document.body.style.width = 'auto';

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.height = prevBodyHeight;
      document.body.style.position = prevBodyPosition;
      document.body.style.top = prevBodyTop;
      document.body.style.width = prevBodyWidth;
    };
  }, []);

  /* 🔐 Sesión */
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data?.session?.user) {
        router.replace('/auth/login');
        return;
      }
      setLoading(false);
    };
    checkSession();
  }, [router]);

  /* 🎭 Selección de rol */
  const handleSelectRole = async (role) => {
    setSelectedRole(role);
    setLoading(true);

    const { data } = await supabase.auth.getSession();
    const userId = data?.session?.user?.id;

    if (!userId) {
      toast.error('Sesión expirada.');
      router.replace('/auth/login');
      return;
    }

    // OJO: en tu DB usás .eq('id', userId). Si tu tabla profiles usa user_id, cambiá a .eq('user_id', userId)
    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);

    if (error) {
      toast.error('No se pudo guardar el modo.');
      setLoading(false);
      return;
    }

    localStorage.setItem('app_role', role);

    if (role === 'worker') toast.success('Modo Profesional activado ✅');
    else if (role === 'taxi') toast.success('Modo Taxista activado 🚕');
    else toast.success('Modo Cliente activado 🙌');

    if (role === 'taxi') router.push('/driver');
    else router.push(`/${role}`);
  };

  /* 🚪 Salida */
  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('app_role');
    toast.success('Cerraste sesión correctamente.');
    router.replace('/auth/login');
  };

  /* ⏳ Pantalla de carga */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] text-gray-600">
        <Loader2 className="animate-spin w-6 h-6 mr-2" />
        Cargando...
      </div>
    );
  }

  /* 🌈 UI principal — responsive real */
  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] px-4 sm:px-6 py-6 sm:py-8 pb-[env(safe-area-inset-bottom)] overflow-x-hidden">
      <div className="w-full max-w-[420px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-white/95 backdrop-blur rounded-3xl border border-gray-200 shadow-[0_18px_60px_rgba(0,0,0,0.10)] p-5 sm:p-7"
        >
          {/* LOGO */}
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              <span className="text-[#0F172A]">Manos</span>
              <span className="text-emerald-600">YA</span>
            </h1>
            <p className="text-gray-500 text-[12px] sm:text-sm mt-1">
              Tu ayuda al instante.
            </p>
          </div>

          {/* Marketing copy */}
          <div className="mt-5 text-center">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">
              ¿Qué querés hacer hoy?
            </h2>
            <p className="text-[11px] sm:text-[12px] text-gray-500 mt-1 leading-relaxed">
              Elegí una opción. Podés cambiar de modo cuando quieras.
            </p>

            <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-4 h-4" />
                Perfiles verificados
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] px-3 py-1 rounded-full bg-gray-50 text-gray-700 border border-gray-200">
                Soporte local
              </span>
            </div>
          </div>

          {/* Opciones */}
          <div className="mt-5 flex flex-col gap-3">
            {/* CLIENTE */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleSelectRole('client')}
              className={`relative overflow-hidden w-full rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 text-left border transition-all ${
                selectedRole === 'client'
                  ? 'border-cyan-300 shadow-[0_12px_30px_rgba(6,182,212,0.18)]'
                  : 'border-gray-200 hover:border-cyan-200'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-cyan-600 opacity-95" />
              <div className="relative flex items-center gap-3 sm:gap-4 text-white">
                <div className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/15 flex items-center justify-center">
                  <UserRound className="w-5 h-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-[15px] sm:text-base font-extrabold tracking-tight truncate">
                    Pedí tu chofer y servicios
                  </div>
                  <div className="text-[11px] sm:text-xs text-white/85 leading-snug line-clamp-2">
                    Encontrá ayuda cerca, en minutos.
                  </div>
                </div>

                <div className="shrink-0 text-[10px] sm:text-xs font-semibold bg-white/15 px-3 py-1 rounded-full">
                  Rápido
                </div>
              </div>
            </motion.button>

            {/* PROFESIONAL */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleSelectRole('worker')}
              className={`relative overflow-hidden w-full rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 text-left border transition-all ${
                selectedRole === 'worker'
                  ? 'border-emerald-300 shadow-[0_12px_30px_rgba(16,185,129,0.18)]'
                  : 'border-gray-200 hover:border-emerald-200'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 opacity-95" />
              <div className="relative flex items-center gap-3 sm:gap-4 text-white">
                <div className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/15 flex items-center justify-center">
                  <Wrench className="w-5 h-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-[15px] sm:text-base font-extrabold tracking-tight truncate">
                    Ofrecer servicios
                  </div>
                  <div className="text-[11px] sm:text-xs text-white/85 leading-snug line-clamp-2">
                    Gestión 360: trabajá con respaldo y construí reputación.
                  </div>
                </div>

                <div className="shrink-0 text-[10px] sm:text-xs font-semibold bg-white/15 px-3 py-1 rounded-full">
                  Ingresos
                </div>
              </div>
            </motion.button>

            {/* TAXI */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleSelectRole('taxi')}
              className={`relative overflow-hidden w-full rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 text-left border transition-all ${
                selectedRole === 'taxi'
                  ? 'border-gray-400 shadow-[0_12px_30px_rgba(2,6,23,0.18)]'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-gray-900 to-black opacity-95" />
              <div className="relative flex items-center gap-3 sm:gap-4 text-white">
                <div className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/10 flex items-center justify-center">
                  <Car className="w-5 h-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-[15px] sm:text-base font-extrabold tracking-tight truncate">
                    Ser chofer
                  </div>
                  <div className="text-[11px] sm:text-xs text-white/80 leading-snug line-clamp-2">
                    Gestión 360: te documentamos para cobrar mejor y acceder a beneficios.
                  </div>
                </div>

                <div className="shrink-0 text-[10px] sm:text-xs font-semibold bg-white/10 px-3 py-1 rounded-full">
                  Seguro
                </div>
              </div>
            </motion.button>

            <p className="text-[10px] sm:text-[11px] text-gray-500 text-center mt-1 leading-relaxed">
              Taxi se activa tras completar verificación. Así protegemos a choferes y pasajeros.
            </p>
          </div>

          {/* Accesos */}
          <div className="mt-6">
            <button
              onClick={() => router.push('/settings/account')}
              className="w-full flex items-center justify-center gap-2 text-[13px] sm:text-sm text-gray-600 hover:text-emerald-700 transition py-2"
            >
              <Settings className="w-4 h-4 opacity-70" />
              Gestión de mi cuenta
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 text-[13px] sm:text-sm text-gray-600 hover:text-emerald-700 transition py-2"
            >
              <LogOut className="w-4 h-4 opacity-70" />
              Cerrar sesión
            </button>
          </div>

          {/* Legal */}
          <p className="text-[10px] sm:text-[11px] text-gray-400 mt-4 text-center leading-relaxed">
            Al continuar aceptás nuestras políticas.
            <br />
            <a
              href="/terms-of-use"
              className="text-emerald-600 underline"
              target="_blank"
              rel="noreferrer"
            >
              Condiciones de Uso
            </a>{' '}
            ·{' '}
            <a
              href="/privacy-policy"
              className="text-emerald-600 underline"
              target="_blank"
              rel="noreferrer"
            >
              Privacidad
            </a>
          </p>
        </motion.div>

        <p className="text-center text-[10px] sm:text-[11px] text-gray-400 mt-4">
          ManosYA — confianza, rapidez y respaldo local.
        </p>
      </div>

      {/* util para line-clamp si no lo tenés */}
      <style jsx global>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
