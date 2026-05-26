'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { redirectToRole } from '@/lib/roleRedirect';

const supabase = getSupabase();

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    let alive = true;

    async function init() {
      try {
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise((resolve) => setTimeout(() => resolve(null), 1200)),
        ]);

        const user = sessionResult?.data?.session?.user || null;

        await new Promise((r) => setTimeout(r, 700));
        if (!alive) return;

        if (!user) {
          router.replace('/auth/login');
          return;
        }

        await redirectToRole({
          supabase,
          router,
          userId: user.id,
          fallbackRole: typeof window !== 'undefined' ? localStorage.getItem('app_role') : '',
        });
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
    <div className="flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#62c4bf] px-6">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.92 }}
        animate={{
          opacity: 1,
          y: [0, -8, 0],
          scale: [1, 1.035, 1],
        }}
        transition={{
          opacity: { duration: 0.35 },
          y: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
          scale: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
        }}
        className="select-none text-center text-[52px] font-black leading-none tracking-normal drop-shadow-[0_16px_34px_rgba(0,0,0,0.16)] sm:text-[76px]"
        aria-label="ManosYA"
      >
        <span className="text-black">Manos</span>
        <span className="text-white">YA</span>
      </motion.div>
    </div>
  );
}
