'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';

const supabase = getSupabase();

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const savedRole = localStorage.getItem('app_role');

      // ⏳ Duración visible del splash (simple, sin animación)
      await new Promise((r) => setTimeout(r, 800));

      if (!user) return router.replace('/auth/login');
      if (savedRole === 'worker') return router.replace('/worker');
      if (savedRole === 'client') return router.replace('/client');

      router.replace('/role-selector');
    }

    init();
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-emerald-400 font-[var(--font-manrope)]">
      <h1 className="text-[56px] font-extrabold tracking-tight">
        <span className="text-white">Manos</span>
        <span className="text-emerald-400">YA</span>
      </h1>

      <p className="text-emerald-300 text-lg mt-4 font-light tracking-wide">
        Preparando tu experiencia para enero.
      </p>

      <div className="w-48 h-[2.5px] bg-emerald-400/60 mt-6 rounded-full" />
    </div>
  );
}
