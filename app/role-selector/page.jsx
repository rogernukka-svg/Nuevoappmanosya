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
  Sparkles,
  ArrowRight,
  HardHat,
  KeyRound,
} from 'lucide-react';
import { motion } from 'framer-motion';

const supabase = getSupabase();

export default function RoleSelectorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);

  /* ✅ FIX SCROLL (PWA / iOS friendly) */
  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevWebkit = document.body.style.webkitOverflowScrolling;

    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';
    document.body.style.webkitOverflowScrolling = 'touch';

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.webkitOverflowScrolling = prevWebkit;
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

  const micro = useMemo(
    () => [
      { icon: <ShieldCheck className="w-4 h-4" />, label: 'Verificado' },
      { icon: <Lock className="w-4 h-4" />, label: 'Pago protegido' },
      { icon: <Zap className="w-4 h-4" />, label: 'En minutos' },
    ],
    []
  );

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

    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
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
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-700">
        <Loader2 className="animate-spin w-6 h-6 mr-2 text-emerald-600" />
        Cargando...
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-white">
      {/* ===== Fondo “2030” (aurora + grid + glow) ===== */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-56 left-1/2 -translate-x-1/2 w-[820px] h-[560px] rounded-full blur-3xl opacity-[0.18] bg-emerald-300" />
        <div className="absolute -top-44 left-[8%] w-[600px] h-[440px] rounded-full blur-3xl opacity-[0.14] bg-cyan-300" />
        <div className="absolute bottom-[-340px] right-[-200px] w-[720px] h-[720px] rounded-full blur-3xl opacity-[0.12] bg-fuchsia-300" />

        <div
          className="absolute inset-0 opacity-[0.10]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(2,6,23,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(2,6,23,0.06) 1px, transparent 1px)',
            backgroundSize: '46px 46px',
          }}
        />

        <div className="absolute inset-0 bg-white" />
      </div>

      {/* ===== Contenido ===== */}
      <div className="relative px-4 py-6">
        <div className="w-full max-w-[460px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="
              rounded-[28px]
              border border-slate-200/70
              bg-white/85
              backdrop-blur-xl
              shadow-[0_26px_80px_rgba(2,6,23,0.10)]
              overflow-hidden
            "
          >
            {/* ===== Header (directo) ===== */}
            <div className="px-6 pt-7 pb-5">
              <div className="flex items-center justify-center gap-3">
                <div className="relative">
                  <div className="absolute -inset-2 rounded-2xl bg-emerald-400/20 blur-xl" />
                  <div className="relative w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-[30px] leading-none font-black tracking-tight">
                    <span className="text-slate-900">Manos</span>
                    <span className="text-emerald-600">YA</span>
                  </div>
                  <div className="text-[12px] text-slate-500 mt-1">
                    Elegí modo y entrá.
                  </div>
                </div>
              </div>

              {/* Chips minimal (prueba rápida de confianza) */}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {micro.map((x, i) => (
                  <div
                    key={i}
                    className="
                      inline-flex items-center gap-1.5
                      text-[11px] px-3 py-1.5
                      rounded-full
                      border border-slate-200
                      bg-white
                      text-slate-700
                      shadow-[0_10px_30px_rgba(2,6,23,0.06)]
                    "
                  >
                    <span className="text-emerald-600">{x.icon}</span>
                    {x.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

            {/* ===== CTAs (acción, poco texto) ===== */}
            <div className="px-6 py-6">
              <div className="grid gap-4">
                {/* ===== CLIENTE (principal) ===== */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => handleSelectRole('client')}
                  className="group relative overflow-hidden w-full rounded-3xl p-[1.5px] text-left"
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-400 opacity-90" />
                  <div className="pointer-events-none absolute inset-0 opacity-70 blur-2xl bg-gradient-to-r from-cyan-300/60 via-emerald-300/60 to-cyan-300/60" />

                  <div className="relative z-10 rounded-3xl bg-white border border-slate-200 p-4 shadow-[0_18px_55px_rgba(2,6,23,0.14)]">
                    {/* etiqueta */}
                    <div className="mb-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-extrabold bg-slate-900 text-white shadow-[0_14px_40px_rgba(2,6,23,0.20)]">
                        <Zap className="w-3.5 h-3.5" />
                        Rápido
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div className="pointer-events-none absolute -inset-2 rounded-2xl bg-cyan-300/40 blur-xl" />
                        <div className="relative w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                          <KeyRound className="w-5 h-5 text-cyan-700" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-slate-900 font-black text-[16px] tracking-tight">
                          Pedir servicios
                        </div>
                        <div className="text-[12px] text-slate-500 mt-0.5">
                          Entrar al mapa
                        </div>
                      </div>

                      <div className="shrink-0">
                        <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-[0_16px_45px_rgba(2,6,23,0.22)]">
                          <span className="text-[12px] font-extrabold">Entrar</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.button>

                {/* ===== PROFESIONAL ===== */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => handleSelectRole('worker')}
                  className="group relative overflow-hidden w-full rounded-3xl p-[1.5px] text-left"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/80 via-emerald-300/80 to-cyan-400/80 opacity-55" />
                  <div className="relative rounded-3xl bg-white border border-slate-200 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.10)]">
                    <div className="flex items-center gap-4">
                      <div className="relative shrink-0">
                        <div className="absolute -inset-2 rounded-2xl bg-emerald-300/40 blur-xl" />
                        <div className="relative w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                          <HardHat className="w-5 h-5 text-emerald-700" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-slate-900 font-black text-[16px] tracking-tight">
                          Soy profesional
                        </div>
                        <div className="text-slate-500 text-[12px] mt-0.5">
                          Entrar a mi panel
                        </div>
                      </div>

                      <div className="shrink-0">
                        <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-900 shadow-[0_14px_45px_rgba(2,6,23,0.10)]">
                          <span className="text-[12px] font-extrabold">Entrar</span>
                          <ArrowRight className="w-4 h-4 text-slate-700 group-hover:translate-x-0.5 transition" />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.button>
              </div>

              {/* ===== Acciones (compactas) ===== */}
              <div className="mt-5 grid gap-2">
                <button
                  onClick={() => router.push('/settings/account')}
                  className="
                    w-full rounded-2xl px-4 py-3
                    bg-white
                    border border-slate-200
                    text-slate-800
                    text-[13px] font-semibold
                    hover:bg-slate-50 transition
                    flex items-center justify-center gap-2
                    shadow-[0_12px_40px_rgba(2,6,23,0.06)]
                  "
                >
                  <Settings className="w-4 h-4 opacity-80" />
                  Cuenta
                </button>

                <button
                  onClick={handleLogout}
                  className="
                    w-full rounded-2xl px-4 py-3
                    bg-white
                    border border-slate-200
                    text-slate-600
                    text-[13px] font-semibold
                    hover:bg-slate-50 transition
                    flex items-center justify-center gap-2
                  "
                >
                  <LogOut className="w-4 h-4 opacity-80" />
                  Salir
                </button>
              </div>

              {/* ===== Footer mini ===== */}
              <div className="mt-5 text-center text-[11px] text-slate-500">
                ManosYA • 2030 UX
              </div>
            </div>
          </motion.div>

          {/* ✅ “aire” abajo para iOS/PWA + safe-area */}
          <div className="h-6" />
          <div className="pb-[env(safe-area-inset-bottom)]" />
        </div>
      </div>
    </div>
  );
}