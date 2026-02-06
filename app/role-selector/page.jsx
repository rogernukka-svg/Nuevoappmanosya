'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Loader2,
  LogOut,
  Settings,
  ShieldCheck,
  Key,
  KeyRound,
  HardHat,
  Construction,
} from 'lucide-react';
import { motion } from 'framer-motion';

const supabase = getSupabase();

export default function RoleSelectorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);

  /* ✅ FIX SCROLL */
  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
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

    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (error) {
      toast.error('No se pudo guardar el modo.');
      setLoading(false);
      return;
    }

    localStorage.setItem('app_role', role);

    if (role === 'worker') {
      toast.success('Modo Profesional activado ✅');
      router.push('/worker');
    } else {
      toast.success('Modo Cliente activado 🙌');
      router.push('/client');
    }
  };

  /* 🚪 Logout */
  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('app_role');
    toast.success('Cerraste sesión correctamente.');
    router.replace('/auth/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] text-gray-600">
        <Loader2 className="animate-spin w-6 h-6 mr-2" />
        Cargando...
      </div>
    );
  }

  const KeyIcon = KeyRound || Key;
  const HardHatIcon = HardHat || Construction;

  return (
    <div className="h-[100dvh] overflow-y-auto bg-[#F8FAFC] px-4 py-8">
      <div className="w-full max-w-[420px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-3xl border border-gray-200 shadow-[0_18px_60px_rgba(0,0,0,0.10)] p-7"
        >
          {/* LOGO */}
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight">
              <span className="text-[#0F172A]">Manos</span>
              <span className="text-emerald-600">YA</span>
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Tu ayuda al instante.
            </p>
          </div>

          {/* Marketing */}
          <div className="mt-6 text-center">
            <h2 className="text-lg font-semibold text-gray-800">
              ¿Qué querés hacer hoy?
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Elegí una opción. Podés cambiar cuando quieras.
            </p>

            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-4 h-4" />
                Perfiles verificados
              </span>
            </div>
          </div>

          {/* BOTONES */}
          <div className="mt-6 flex flex-col gap-4">
            {/* CLIENTE */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleSelectRole('client')}
              className="relative overflow-hidden w-full rounded-2xl px-5 py-4 text-left border border-cyan-200"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-cyan-600 opacity-95" />
              <div className="relative flex items-center gap-4 text-white">
                <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
                  <KeyIcon className="w-5 h-5" />
                </div>

                <div>
                  <div className="font-extrabold">
                    Pedir servicios del hogar
                  </div>
                  <div className="text-xs text-white/85">
                    Encontrá profesionales cerca en minutos.
                  </div>
                </div>
              </div>
            </motion.button>

            {/* PROFESIONAL */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleSelectRole('worker')}
              className="relative overflow-hidden w-full rounded-2xl px-5 py-4 text-left border border-emerald-200"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 opacity-95" />
              <div className="relative flex items-center gap-4 text-white">
                <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
                  <HardHatIcon className="w-5 h-5" />
                </div>

                <div>
                  <div className="font-extrabold">
                    Ofrecer servicios
                  </div>
                  <div className="text-xs text-white/85">
                    Gestión 360: trabajá con respaldo y construí reputación.
                  </div>
                </div>
              </div>
            </motion.button>
          </div>

          {/* ACCESOS */}
          <div className="mt-6">
            <button
              onClick={() => router.push('/settings/account')}
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-emerald-700 transition py-2"
            >
              <Settings className="w-4 h-4 opacity-70" />
              Gestión de mi cuenta
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-emerald-700 transition py-2"
            >
              <LogOut className="w-4 h-4 opacity-70" />
              Cerrar sesión
            </button>
          </div>

          {/* LEGAL */}
          <p className="text-xs text-gray-400 mt-4 text-center">
            Al continuar aceptás nuestras políticas.
            <br />
            <a
              href="/terms-of-use"
              className="text-emerald-600 underline"
              target="_blank"
            >
              Condiciones de Uso
            </a>{' '}
            ·{' '}
            <a
              href="/privacy-policy"
              className="text-emerald-600 underline"
              target="_blank"
            >
              Privacidad
            </a>
          </p>
        </motion.div>

        <p className="text-center text-xs text-gray-400 mt-4">
          ManosYA — confianza, rapidez y respaldo local.
        </p>
      </div>
    </div>
  );
}