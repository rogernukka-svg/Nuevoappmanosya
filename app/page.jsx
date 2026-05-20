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
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const savedRole =
          typeof window !== 'undefined'
            ? localStorage.getItem('app_role')
            : null;

        await new Promise((r) => setTimeout(r, 550));
        if (!alive) return;

        if (!user) {
  router.replace('/auth/login');
  return;
}

        if (savedRole === 'worker') {
          router.replace('/worker');
          return;
        }

        if (savedRole === 'client') {
          router.replace('/client');
          return;
        }

        router.replace('/role-selector');
      } catch (error) {
        console.error('Root init error:', error);

        if (!alive) return;
        router.replace('/auth/login');
      }
    }

    init();

    return () => {
      alive = false;
    };
  }, [router]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-white px-6">
      <img
        src="/logo-manosya.png"
        alt="ManosYA"
        className="w-[230px] max-w-full object-contain"
      />
    </div>
  );
}
