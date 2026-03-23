'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

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

      await new Promise((r) => setTimeout(r, 450));
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
    }

    init();

    return () => {
      alive = false;
    };
  }, [router]);

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#f8fafc]">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(15,23,42,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.08) 1px, transparent 1px)',
            backgroundSize: '42px 42px',
          }}
        />

        <motion.div
          animate={{
            opacity: [0.25, 0.45, 0.25],
            scale: [1, 1.08, 1],
          }}
          transition={{ duration: 3.5, repeat: Infinity }}
          className="absolute left-1/2 top-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-emerald-200/40 via-cyan-200/30 to-teal-200/40 blur-3xl"
        />

        <motion.div
          animate={{
            scale: [1, 1.2],
            opacity: [0.15, 0],
          }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-300"
        />
      </div>

      <div className="relative z-10 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
          className="absolute h-[160px] w-[160px] rounded-full border border-emerald-200/60"
        />

        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          className="absolute h-[200px] w-[200px] rounded-full border border-cyan-200/40"
        />

        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.35, 0.6, 0.35],
          }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute h-28 w-72 rounded-full bg-gradient-to-r from-emerald-200 via-cyan-200 to-teal-200 blur-3xl"
        />

        <motion.img
          src="/logo-manosya.png"
          alt="ManosYA"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative w-[230px] object-contain drop-shadow-[0_15px_35px_rgba(15,23,42,0.18)]"
        />
      </div>
    </div>
  );
}