'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      const savedRole = localStorage.getItem('app_role');

      if (!user) {
        router.replace('/login');
        return;
      }

      // Si tiene rol guardado → redirigir
      if (savedRole === 'worker') {
        router.replace('/worker');
      } else if (savedRole === 'client') {
        router.replace('/client');
      } else {
        // Si no hay rol guardado → elegir
        router.replace('/role');
      }
    }
    init();
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen bg-black text-white">
      <p className="text-emerald-400 animate-pulse">Cargando ManosYA… ⚙️</p>
    </div>
  );
}