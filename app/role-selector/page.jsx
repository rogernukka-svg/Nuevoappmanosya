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
  KeyRound,
  HardHat,
  Sparkles,
  ArrowRight,
  Lock,
  Zap,
  CheckCircle2,
  Star,
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

    // ✅ permitir scroll normal
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';
    // ✅ momentum scroll iOS
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
      { icon: <ShieldCheck className="w-4 h-4" />, label: 'Perfiles verificados' },
      { icon: <Lock className="w-4 h-4" />, label: 'Pagos protegidos' },
      { icon: <Zap className="w-4 h-4" />, label: 'Respuesta en minutos' },
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
    // ✅ IMPORTANTE: no forzamos “header fijo”, dejamos que la página scrollee natural
    <div className="min-h-[100dvh] bg-white">
      {/* ===== Fondo tech minimal LIGHT ===== */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-56 left-1/2 -translate-x-1/2 w-[760px] h-[520px] rounded-full blur-3xl opacity-[0.22] bg-emerald-300" />
        <div className="absolute -top-48 left-[10%] w-[560px] h-[420px] rounded-full blur-3xl opacity-[0.18] bg-cyan-300" />
        <div className="absolute bottom-[-320px] right-[-180px] w-[660px] h-[660px] rounded-full blur-3xl opacity-[0.16] bg-fuchsia-300" />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(2,6,23,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(2,6,23,0.06) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
        <div className="absolute inset-0 bg-white" />
      </div>

      {/* ===== Contenido (scrollea natural) ===== */}
      <div className="relative px-4 py-6">
        <div className="w-full max-w-[460px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="
              rounded-[28px]
              border border-slate-200/70
              bg-white/85
              backdrop-blur-xl
              shadow-[0_26px_80px_rgba(2,6,23,0.10)]
              overflow-hidden
            "
          >
            {/* Header */}
            <div className="px-6 pt-7 pb-5">
              <div className="flex items-center justify-center gap-2">
                <div className="relative">
                  <div className="absolute -inset-2 rounded-2xl bg-emerald-400/20 blur-xl" />
                  <div className="relative w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-[28px] leading-none font-black tracking-tight">
                    <span className="text-slate-900">Manos</span>
                    <span className="text-emerald-600">YA</span>
                  </div>
                  <div className="text-[12px] text-slate-500 mt-1">
                    Tu ayuda al instante, con confianza.
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center">
                <div className="text-slate-900 text-[18px] font-extrabold tracking-tight">
                  ¿Qué querés hacer hoy?
                </div>
                <div className="text-slate-500 text-[12px] mt-1">
                  Elegí una opción. Podés cambiar cuando quieras.
                </div>

                {/* Chips: 1 fila con scroll horizontal (no rompe layout) */}
                <div className="mt-4">
  <div className="flex flex-wrap justify-center gap-2">
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
              </div>
            </div>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

            {/* CTAs */}
            <div className="px-6 py-6">
              <div className="grid gap-4">
                {/* ===== CLIENTE (RECOMENDADO) — COMPACTO ===== */}
<motion.button
  type="button"
  whileHover={{ scale: 1.01 }}
  whileTap={{ scale: 0.985 }}
  onClick={() => handleSelectRole('client')}
  className="group relative overflow-hidden w-full rounded-3xl p-[1.5px] text-left"
>
  <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-400 opacity-85" />
  <div className="pointer-events-none absolute inset-0 opacity-60 blur-2xl bg-gradient-to-r from-cyan-300/60 via-emerald-300/60 to-cyan-300/60" />

 <div className="relative z-10 rounded-3xl bg-white border border-slate-200 p-4 shadow-[0_18px_55px_rgba(2,6,23,0.14)]">
 {/* etiqueta (en flujo, NO se corta y NO se pisa) */}
<div className="pointer-events-none mb-2">
  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-[0_14px_40px_rgba(16,185,129,0.28)]">
    <Star className="w-3.5 h-3.5" />
    Recomendado
  </div>
</div>

    <div className="flex items-start gap-3">
      <div className="relative mt-0.5 shrink-0">
        <div className="pointer-events-none absolute -inset-2 rounded-2xl bg-cyan-300/40 blur-xl" />
        <div className="relative w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
          <KeyRound className="w-4.5 h-4.5 text-cyan-700" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-slate-900 font-extrabold text-[15px] tracking-tight break-words">
          Pedir servicios
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Match
          </span>
          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-cyan-700 bg-cyan-50 border border-cyan-200/70 px-2 py-0.5 rounded-full">
            <Zap className="w-3.5 h-3.5" />
            Rápida
          </span>
        </div>

       <div className="mt-3 flex items-center justify-end">
  <div className="pointer-events-none inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-[0_16px_45px_rgba(2,6,23,0.22)] transition">
    <span className="text-[12px] font-extrabold">Entrar</span>
    <ArrowRight className="w-4 h-4" />
  </div>
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
                        <div className="text-slate-900 font-extrabold text-[15px] tracking-tight break-words">
                          Ofrecer servicios
                        </div>
                        <div className="text-slate-600 text-[12.5px] mt-0.5">
                          Gestión 360: respaldo y reputación.
                        </div>
                        <div className="mt-2 text-[11px] text-emerald-700">
                          Más pedidos • Mejor ranking • Más confianza
                        </div>
                      </div>

                      <div className="shrink-0">
                        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-white border border-slate-200 text-slate-800 shadow-[0_14px_45px_rgba(2,6,23,0.10)] group-hover:shadow-[0_18px_55px_rgba(2,6,23,0.14)] transition">
                          <span className="text-[12px] font-extrabold">Entrar</span>
                          <ArrowRight className="w-4 h-4 text-slate-700 group-hover:translate-x-0.5 transition" />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.button>
              </div>

              {/* Actions */}
              <div className="mt-6 grid gap-2">
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
                  Gestión de mi cuenta
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
                  Cerrar sesión
                </button>
              </div>

              {/* Legal */}
              <div className="mt-6 text-center text-[11px] text-slate-500 leading-relaxed">
                Al continuar aceptás nuestras políticas.
                <div className="mt-1">
                  <a
                    href="/terms-of-use"
                    className="text-emerald-700 underline underline-offset-4 hover:text-emerald-600"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Condiciones de Uso
                  </a>{' '}
                  <span className="text-slate-300">·</span>{' '}
                  <a
                    href="/privacy-policy"
                    className="text-emerald-700 underline underline-offset-4 hover:text-emerald-600"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Privacidad
                  </a>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="mt-5 text-center text-[11px] text-slate-500">
            ManosYA — confianza, rapidez y respaldo local.
          </div>

          {/* ✅ “aire” abajo para iOS/PWA + safe-area */}
          <div className="h-6" />
          <div className="pb-[env(safe-area-inset-bottom)]" />
        </div>
      </div>
    </div>
  );
}