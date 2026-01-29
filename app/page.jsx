'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';

const supabase = getSupabase();

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    let alive = true;

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const savedRole = typeof window !== 'undefined' ? localStorage.getItem('app_role') : null;

      // ⏳ Splash visible (con animación)
      await new Promise((r) => setTimeout(r, 1400));

      if (!alive) return;

      if (!user) return router.replace('/auth/login');
      if (savedRole === 'worker') return router.replace('/worker');
      if (savedRole === 'client') return router.replace('/client');

      router.replace('/role-selector');
    }

    init();

    return () => {
      alive = false;
    };
  }, [router]);

  return (
    <div className="relative flex flex-col items-center justify-center h-screen overflow-hidden bg-black font-[var(--font-manrope)]">
      {/* Glow / fondo */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl animate-[pulse_2.6s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-140px] right-[-120px] h-[520px] w-[520px] rounded-full bg-emerald-400/10 blur-3xl animate-[pulse_3.2s_ease-in-out_infinite]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(16,185,129,0.10),transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:46px_46px]" />
      </div>

      {/* Contenido */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo animado */}
        <div className="relative">
          <div className="absolute inset-0 rounded-3xl bg-emerald-500/10 blur-2xl animate-[pulse_2.2s_ease-in-out_infinite]" />

          <h1 className="select-none text-[62px] sm:text-[72px] font-extrabold tracking-tight">
            <span className="text-white inline-block animate-[fadeUp_700ms_ease-out_forwards] opacity-0">
              Manos
            </span>
            <span className="text-emerald-400 inline-block animate-[fadeUp_700ms_ease-out_120ms_forwards] opacity-0">
              YA
            </span>
          </h1>

          {/* brillo pasando */}
          <div className="pointer-events-none absolute left-1/2 top-[10px] h-10 w-[260px] -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-emerald-300/25 to-transparent blur-md animate-[shine_1.6s_ease-in-out_infinite]" />
        </div>

        {/* Frase marketing */}
        <p className="mt-4 max-w-[360px] text-center text-emerald-200/90 text-[15px] sm:text-base font-light tracking-wide animate-[fadeIn_900ms_ease-out_260ms_forwards] opacity-0">
          Conectamos clientes con trabajadores verificados.
          <span className="text-white/80"> Rápido, seguro y cerca tuyo.</span>
        </p>

        {/* Barra loading */}
        <div className="mt-7 w-[260px] sm:w-[300px]">
          <div className="h-[10px] rounded-full bg-white/10 overflow-hidden">
            <div className="h-full w-1/3 rounded-full bg-emerald-400 animate-[load_1.35s_ease-in-out_infinite]" />
          </div>
          <div className="mt-3 text-center text-[12px] text-white/60 animate-[fadeIn_900ms_ease-out_420ms_forwards] opacity-0">
            Preparando tu experiencia…
          </div>
        </div>

        {/* Mini claims */}
        <div className="mt-8 flex items-center gap-3 text-[12px] text-white/55 animate-[fadeIn_900ms_ease-out_520ms_forwards] opacity-0">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            📍 Cerca tuyo
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            ✅ Verificados
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            💬 Chat directo
          </span>
        </div>
      </div>

      {/* Animaciones (Tailwind arbitrary keyframes) */}
      <style jsx global>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes load {
          0% {
            transform: translateX(-20%);
            width: 30%;
          }
          50% {
            transform: translateX(80%);
            width: 45%;
          }
          100% {
            transform: translateX(-20%);
            width: 30%;
          }
        }
        @keyframes shine {
          0% {
            transform: translateX(-60%) scaleX(0.9);
            opacity: 0.2;
          }
          50% {
            transform: translateX(-50%) scaleX(1.05);
            opacity: 0.45;
          }
          100% {
            transform: translateX(-40%) scaleX(0.9);
            opacity: 0.2;
          }
        }
      `}</style>
    </div>
  );
}
