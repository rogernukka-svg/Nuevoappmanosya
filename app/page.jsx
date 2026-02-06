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

      const savedRole =
        typeof window !== 'undefined' ? localStorage.getItem('app_role') : null;

      // ⏳ Splash breve (sin exagerar)
      await new Promise((r) => setTimeout(r, 900));
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
    <div className="relative flex flex-col items-center justify-center h-screen overflow-hidden bg-white font-[var(--font-manrope)]">
      {/* Fondo sutil (pro) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-500/8 blur-3xl" />
        <div className="absolute bottom-[-180px] right-[-180px] h-[520px] w-[520px] rounded-full bg-cyan-500/8 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,rgba(0,0,0,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.08)_1px,transparent_1px)] [background-size:52px_52px]" />
      </div>

      {/* Contenido */}
      <div className="relative z-10 flex flex-col items-center px-6">
        {/* Marca */}
        <div className="text-center">
          <h1 className="select-none text-[56px] sm:text-[70px] font-extrabold tracking-tight leading-none">
            <span className="text-gray-900">Manos</span>
            <span className="text-emerald-600">YA</span>
          </h1>

          <p className="mt-3 text-sm sm:text-base text-gray-600 max-w-[420px]">
            Estamos mejorando para una experiencia más rápida y segura.
            <span className="text-gray-900 font-semibold">
              {' '}
              Igual ya podés curiosear
            </span>{' '}
            y ver el mapa, servicios y chat.
          </p>
        </div>

        {/* Estado / mensaje de confianza */}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[12px] text-emerald-700 font-semibold">
            ✅ Verificación en progreso
          </span>
          <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[12px] text-cyan-700 font-semibold">
            🧭 Explorá sin compromiso
          </span>
          <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[12px] text-gray-600 font-semibold">
            🔒 Seguridad primero
          </span>
        </div>

        {/* Loader minimal */}
        <div className="mt-8 w-[280px] sm:w-[320px]">
          <div className="h-[10px] rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full w-1/3 rounded-full bg-emerald-500 animate-[softload_1.6s_ease-in-out_infinite]" />
          </div>
          <div className="mt-3 text-center text-[12px] text-gray-500">
            Cargando… te llevamos al inicio en segundos
          </div>
        </div>

        {/* Nota sutil */}
        <p className="mt-6 text-[12px] text-gray-400 text-center max-w-[460px]">
          Tip: si algo no carga, recargá la página. Estamos ajustando rendimiento y estabilidad.
        </p>
      </div>

      {/* Animación MUY suave */}
      <style jsx global>{`
        @keyframes softload {
          0% {
            transform: translateX(-25%);
            width: 30%;
            opacity: 0.85;
          }
          50% {
            transform: translateX(70%);
            width: 42%;
            opacity: 1;
          }
          100% {
            transform: translateX(-25%);
            width: 30%;
            opacity: 0.85;
          }
        }
      `}</style>
    </div>
  );
}