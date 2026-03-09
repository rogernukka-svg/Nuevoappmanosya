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
  HardHat,
  KeyRound,
  Sparkles,
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
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-slate-700">
        <Loader2 className="animate-spin w-6 h-6 mr-2 text-emerald-600" />
        Cargando ManosYA...
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#f8fafc] overflow-hidden">
      {/* BACKGROUND PREMIUM */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.10),transparent_35%),radial-gradient(circle_at_20%_30%,rgba(34,211,238,0.10),transparent_28%),radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.08),transparent_30%)]" />

        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(15,23,42,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.08) 1px, transparent 1px)',
            backgroundSize: '42px 42px',
          }}
        />

        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[620px] h-[280px] rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="absolute top-24 -left-20 w-[260px] h-[260px] rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="absolute bottom-[-80px] right-[-80px] w-[280px] h-[280px] rounded-full bg-fuchsia-300/10 blur-3xl" />
      </div>

      <div className="relative px-4 py-8">
        <div className="max-w-[470px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="
              relative overflow-hidden
              rounded-[34px]
              border border-white/70
              bg-white/85
              backdrop-blur-2xl
              shadow-[0_30px_90px_rgba(2,6,23,0.14)]
            "
          >
            {/* glow top */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-emerald-50/90 to-transparent" />

            {/* HEADER */}
            <div className="relative px-6 pt-8 pb-6 text-center">
             <motion.div
  initial={{ opacity: 0, scale: 0.9, y: -10 }}
  animate={{ opacity: 1, scale: 1, y: 0 }}
  transition={{ duration: 0.45 }}
  className="flex justify-center mb-6"
>
  <div className="relative flex items-center justify-center">

    {/* glow atrás */}
    <div className="absolute w-[220px] h-[120px] bg-emerald-300/30 blur-3xl rounded-full" />

    {/* logo */}
    <img
      src="/logo-manosya.png"
      alt="ManosYA"
      className="
        relative
        w-[220px]
        sm:w-[260px]
        object-contain
        drop-shadow-[0_20px_40px_rgba(0,0,0,0.20)]
      "
    />

  </div>
</motion.div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-[11px] font-bold text-emerald-700 mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                Plataforma inteligente de servicios
              </div>

              <h1 className="text-[26px] leading-tight font-black text-slate-900 tracking-tight">
                ¿Cómo querés entrar?
              </h1>

              <p className="text-[13px] text-slate-500 mt-2 max-w-[320px] mx-auto leading-relaxed">
                Elegí una opción y seguí en segundos.
              </p>

              <div className="flex justify-center gap-2 mt-5 flex-wrap">
                {micro.map((x, i) => (
                  <div
                    key={i}
                    className="
                      inline-flex items-center gap-1.5
                      text-[11px] px-3 py-1.5
                      rounded-full border border-slate-200
                      bg-white text-slate-700
                      shadow-[0_10px_30px_rgba(2,6,23,0.05)]
                    "
                  >
                    <span className="text-emerald-600">{x.icon}</span>
                    {x.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

            {/* CTA SECTION */}
            <div className="p-6 space-y-4">
              {/* CLIENTE */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => handleSelectRole('client')}
                className="group relative w-full text-left rounded-[30px] p-[2px] overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400" />
                <div className="absolute inset-0 opacity-70 blur-2xl bg-gradient-to-r from-emerald-300/60 via-cyan-300/60 to-emerald-300/60" />

                <div className="relative rounded-[30px] bg-white p-5 shadow-[0_18px_60px_rgba(2,6,23,0.14)] border border-white/70">
                  <div className="flex items-start gap-4">
                    <div className="relative shrink-0">
                      <div className="absolute -inset-2 rounded-2xl bg-emerald-300/30 blur-xl" />
                      <div className="relative w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                        <MapPinned className="w-6 h-6 text-emerald-600" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-extrabold bg-slate-900 text-white mb-3">
                        <Zap className="w-3.5 h-3.5" />
                        Opción recomendada
                      </div>

                      <div className="text-[20px] font-black text-slate-900 leading-none">
                        Necesito un servicio
                      </div>

                      <div className="text-[13px] text-slate-500 mt-2 leading-relaxed">
                        Entrar al mapa para buscar profesionales cerca de mí.
                      </div>

                      <div className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_14px_40px_rgba(16,185,129,0.25)]">
                        <span className="text-[13px] font-extrabold">Entrar como cliente</span>
                        <ArrowRight className="w-4 h-4 transition group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.button>

              {/* PROFESIONAL */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => handleSelectRole('worker')}
                className="group relative w-full text-left rounded-[30px] p-[2px] overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-slate-300 via-slate-200 to-cyan-200" />

                <div className="relative rounded-[30px] bg-white p-5 shadow-[0_18px_50px_rgba(2,6,23,0.10)] border border-slate-200">
                  <div className="flex items-start gap-4">
                    <div className="relative shrink-0">
                      <div className="absolute -inset-2 rounded-2xl bg-slate-200/60 blur-xl" />
                      <div className="relative w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                        <BriefcaseBusiness className="w-6 h-6 text-slate-700" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-[20px] font-black text-slate-900 leading-none">
                        Soy profesional
                      </div>

                      <div className="text-[13px] text-slate-500 mt-2 leading-relaxed">
                        Entrar a mi panel para recibir pedidos y gestionar mis trabajos.
                      </div>

                      <div className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm">
                        <span className="text-[13px] font-extrabold">Entrar como profesional</span>
                        <ArrowRight className="w-4 h-4 transition group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.button>

              {/* ACTIONS */}
              <div className="grid gap-2 pt-1">
                <button
                  onClick={() => router.push('/settings/account')}
                  className="
                    w-full rounded-2xl px-4 py-3
                    bg-white border border-slate-200
                    text-slate-800 text-[13px] font-semibold
                    hover:bg-slate-50 transition
                    flex items-center justify-center gap-2
                    shadow-[0_10px_35px_rgba(2,6,23,0.05)]
                  "
                >
                  <Settings className="w-4 h-4" />
                  Configuración de cuenta
                </button>

                <button
                  onClick={handleLogout}
                  className="
                    w-full rounded-2xl px-4 py-3
                    bg-white border border-slate-200
                    text-slate-600 text-[13px] font-semibold
                    hover:bg-slate-50 transition
                    flex items-center justify-center gap-2
                  "
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión
                </button>
              </div>
            </div>

            {/* FOOTER */}
            <div className="px-6 pb-6">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-center">
                <div className="text-[12px] font-bold text-slate-700">
                  ManosYA
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Elegí una opción y empezá en segundos.
                </div>
              </div>
            </div>
          </motion.div>

          <div className="h-6" />
          <div className="pb-[env(safe-area-inset-bottom)]" />
        </div>
      </div>
    </div>
  );
}