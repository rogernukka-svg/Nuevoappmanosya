'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Loader2,
  LogOut,
  Settings,
  ShieldCheck,
  Lock,
  Zap,
  ArrowRight,
  BriefcaseBusiness,
  MapPinned,
} from 'lucide-react';
import { motion } from 'framer-motion';

const supabase = getSupabase();

export default function RoleSelectorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

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

  const micro = useMemo(
    () => [
      { icon: <ShieldCheck className="w-4 h-4" />, label: 'Verificado' },
      { icon: <Lock className="w-4 h-4" />, label: 'Pago seguro' },
      { icon: <Zap className="w-4 h-4" />, label: 'Rápido' },
    ],
    []
  );

  const handleSelectRole = async (role) => {
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
      toast.success('Modo Profesional activado');
      router.push('/worker');
    } else {
      toast.success('Modo Cliente activado');
      router.push('/client');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('app_role');
    router.replace('/auth/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-slate-700">
        <Loader2 className="animate-spin w-6 h-6 mr-2 text-teal-500" />
        Cargando ManosYA...
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-white">

      {/* Fondo suave usando color YA */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.12),transparent_35%)]" />
      </div>

      <div className="relative px-4 py-10">
        <div className="max-w-[460px] mx-auto">

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-[32px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(2,6,23,0.06)] overflow-hidden"
          >

            {/* HEADER */}
            <div className="px-6 pt-8 pb-6 text-center">

              <div className="flex justify-center mb-5">
                <img
                  src="/logo-manosya.png"
                  alt="ManosYA"
                  className="w-[240px] object-contain"
                />
              </div>

              <h1 className="text-[28px] font-black text-slate-900 tracking-tight">
                Elegí cómo ingresar
              </h1>

              <p className="text-[14px] text-slate-500 mt-2">
                Elegí una opción para continuar.
              </p>

              {/* micro confianza */}
              <div className="flex justify-center gap-2 mt-5 flex-wrap">
                {micro.map((x, i) => (
                  <div
                    key={i}
                    className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-700"
                  >
                    <span className="text-teal-500">{x.icon}</span>
                    {x.label}
                  </div>
                ))}
              </div>

            </div>

            {/* OPCIONES */}
            <div className="px-5 pb-5 space-y-4">

              {/* CLIENTE */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => handleSelectRole('client')}
                className="w-full text-left rounded-[26px] border border-teal-500 bg-teal-50 px-5 py-5"
              >

                <div className="flex items-start gap-4">

                  <div className="w-14 h-14 rounded-2xl bg-white border border-teal-200 flex items-center justify-center shrink-0">
                    <MapPinned className="w-6 h-6 text-teal-500" />
                  </div>

                  <div className="flex-1">

                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-900 text-white mb-3">
                      <Zap className="w-3.5 h-3.5" />
                      Recomendado
                    </div>

                    <div className="text-[22px] font-black text-slate-900">
                      Necesito un servicio
                    </div>

                    <div className="text-[13px] text-slate-500 mt-2">
                      Buscar profesionales cerca de mí.
                    </div>

                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white font-semibold bg-gradient-to-r from-teal-500 to-cyan-400">
                      Entrar como cliente
                      <ArrowRight className="w-4 h-4"/>
                    </div>

                  </div>

                </div>

              </motion.button>

              {/* PROFESIONAL */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => handleSelectRole('worker')}
                className="w-full text-left rounded-[26px] border border-slate-200 bg-white px-5 py-5"
              >

                <div className="flex items-start gap-4">

                  <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                    <BriefcaseBusiness className="w-6 h-6 text-slate-700" />
                  </div>

                  <div className="flex-1">

                    <div className="text-[22px] font-black text-slate-900">
                      Soy profesional
                    </div>

                    <div className="text-[13px] text-slate-500 mt-2">
                      Gestionar mis trabajos y recibir pedidos.
                    </div>

                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-900 font-semibold">
                      Entrar como profesional
                      <ArrowRight className="w-4 h-4"/>
                    </div>

                  </div>

                </div>

              </motion.button>

              {/* CONFIG */}
              <button
                onClick={() => router.push('/settings/account')}
                className="w-full rounded-2xl px-4 py-3 bg-white border border-slate-200 text-slate-800 text-[13px] font-semibold hover:bg-slate-50 flex items-center justify-center gap-2"
              >
                <Settings className="w-4 h-4"/>
                Configuración de cuenta
              </button>

              {/* LOGOUT */}
              <button
                onClick={handleLogout}
                className="w-full rounded-2xl px-4 py-3 bg-white border border-slate-200 text-slate-600 text-[13px] font-semibold hover:bg-slate-50 flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4"/>
                Cerrar sesión
              </button>

            </div>

            {/* FOOTER */}
            <div className="pb-6 text-center text-[11px] text-slate-400">
              ManosYA • Plataforma de servicios
            </div>

          </motion.div>

          <div className="h-6"/>
          <div className="pb-[env(safe-area-inset-bottom)]"/>

        </div>
      </div>
    </div>
  );
}