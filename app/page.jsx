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

      // Espera breve
      await new Promise((r) => setTimeout(r, 800));
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
    <div className="flex items-center justify-center h-screen bg-white font-[var(--font-manrope)] px-6">
      <div className="text-center max-w-md">
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight">
          <span className="text-gray-900">Manos</span>
          <span className="text-emerald-600">YA</span>
        </h1>

        <p className="mt-4 text-gray-600 text-sm sm:text-base leading-relaxed">
          Estamos realizando mejoras para ofrecer una experiencia más rápida y segura.
          <span className="font-semibold text-gray-900">
            {' '}Podés explorar la plataforma mientras tanto.
          </span>
        </p>

        <div className="mt-6 text-xs text-gray-400">
          Cargando inicio…
        </div>
      </div>
    </div>
  );
}