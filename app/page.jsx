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
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.10),transparent_32%),linear-gradient(180deg,#ecfdf5_0%,#f0fdfa_32%,#f8fafc_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(15,23,42,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.08) 1px, transparent 1px)',
            backgroundSize: '42px 42px',
          }}
        />

        <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_70%)]" />

        <motion.div
          animate={{
            opacity: [0.22, 0.42, 0.22],
            scale: [1, 1.08, 1],
          }}
          transition={{ duration: 3.8, repeat: Infinity }}
          className="absolute left-1/2 top-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-emerald-200/40 via-cyan-200/30 to-teal-200/40 blur-3xl"
        />

        <motion.div
          animate={{
            scale: [1, 1.18],
            opacity: [0.14, 0],
          }}
          transition={{ duration: 2.6, repeat: Infinity }}
          className="absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-300/80"
        />

        <motion.div
          animate={{
            scale: [1, 1.28],
            opacity: [0.08, 0],
          }}
          transition={{ duration: 3.4, repeat: Infinity, delay: 0.4 }}
          className="absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/60"
        />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center">
        <div className="relative flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
            className="absolute h-[160px] w-[160px] rounded-full border border-emerald-200/60"
          />

          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
            className="absolute h-[205px] w-[205px] rounded-full border border-cyan-200/40"
          />

          <motion.div
            animate={{
              scale: [1, 1.08, 1],
              opacity: [0.34, 0.62, 0.34],
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute h-28 w-72 rounded-full bg-gradient-to-r from-emerald-200 via-cyan-200 to-teal-200 blur-3xl"
          />

          <motion.img
            src="/logo-manosya.png"
            alt="ManosYA"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative w-[230px] object-contain drop-shadow-[0_18px_38px_rgba(15,23,42,0.18)]"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.18 }}
          className="mt-8 max-w-sm"
        >
          <h1 className="text-[26px] font-black tracking-[-0.03em] text-slate-900">
            Conectando ayuda real,
            <span className="block bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
              cerca tuyo
            </span>
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Preparando tu entrada a ManosYA...
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-6 flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur"
        >
          <motion.div
            animate={{ scale: [1, 1.25, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="h-2.5 w-2.5 rounded-full bg-emerald-500"
          />
          <span className="text-xs font-semibold tracking-[0.08em] text-slate-700">
            INICIANDO EXPERIENCIA
          </span>
        </motion.div>
      </div>
    </div>
  );
}