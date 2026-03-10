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

      await new Promise((r) => setTimeout(r, 1800));
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
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#f8fafc] font-[var(--font-manrope)] px-5">
      {/* Fondo premium */}
      <div className="pointer-events-none absolute inset-0">
        {/* base glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.16),transparent_30%),radial-gradient(circle_at_20%_25%,rgba(34,211,238,0.10),transparent_24%),radial-gradient(circle_at_80%_80%,rgba(16,185,129,0.10),transparent_26%)]" />

        {/* blobs */}
        <div className="absolute -top-24 left-1/2 h-[300px] w-[620px] -translate-x-1/2 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute top-20 -left-16 h-[240px] w-[240px] rounded-full bg-cyan-200/30 blur-3xl" />
        <div className="absolute bottom-[-90px] right-[-50px] h-[240px] w-[240px] rounded-full bg-teal-200/30 blur-3xl" />

        {/* grid */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(15,23,42,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.08) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* brillo central */}
        <motion.div
          animate={{ opacity: [0.18, 0.3, 0.18], scale: [1, 1.06, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-emerald-200/30 via-cyan-200/20 to-teal-200/30 blur-3xl"
        />
      </div>

      {/* Card principal */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="relative overflow-hidden rounded-[34px] border border-white/70 bg-white/80 px-6 py-9 text-center shadow-[0_30px_90px_rgba(2,6,23,0.10)] backdrop-blur-2xl">
          {/* reflejo superior */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/80 to-transparent" />

          {/* zona logo */}
          <div className="relative mb-7 flex justify-center">
            {/* anillo 1 */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
              className="absolute top-1/2 h-[150px] w-[150px] -translate-y-1/2 rounded-full border border-emerald-200/60"
              style={{
                boxShadow: '0 0 30px rgba(45,212,191,0.12)',
              }}
            />

            {/* anillo 2 */}
            <motion.div
              animate={{ rotate: -360, scale: [1, 1.03, 1] }}
              transition={{
                rotate: { duration: 16, repeat: Infinity, ease: 'linear' },
                scale: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
              }}
              className="absolute top-1/2 h-[190px] w-[190px] -translate-y-1/2 rounded-full border border-cyan-200/45"
            />

            {/* glow detrás logo */}
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.55, 0.35] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute h-28 w-72 rounded-full bg-gradient-to-r from-emerald-200 via-cyan-200 to-teal-200 blur-3xl"
            />

            {/* logo */}
            <motion.img
              src="/logo-manosya.png"
              alt="ManosYA"
              initial={{ opacity: 0, y: -10, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7 }}
              className="relative w-[250px] sm:w-[290px] object-contain drop-shadow-[0_18px_35px_rgba(15,23,42,0.16)]"
            />
          </div>

          {/* chip superior */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.45 }}
            className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/90 px-3.5 py-1.5 text-[11px] font-extrabold text-emerald-700 shadow-sm"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            Reclutamiento activo • 20 de marzo de 2025
          </motion.div>

          {/* título */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.45 }}
            className="text-[29px] sm:text-[32px] font-black tracking-tight text-slate-900 leading-tight"
          >
            Estamos preparando
            <br />
            una nueva etapa
          </motion.h2>

          {/* subtítulo */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.45 }}
            className="mt-4 text-[14px] leading-relaxed text-slate-600"
          >
            ManosYA está entrando en fase de mejoras, expansión y reclutamiento.
          </motion.p>

          {/* frase impacto */}
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.38, duration: 0.5 }}
            className="mt-5 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-cyan-50 px-4 py-4 shadow-[0_12px_30px_rgba(16,185,129,0.06)]"
          >
            <p className="text-sm font-bold leading-relaxed text-slate-800">
              ManosYA va a transformar la forma de trabajar y mover la economía local.
            </p>
          </motion.div>

          {/* loader premium */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.45 }}
            className="mt-8 flex flex-col items-center"
          >
            <div className="relative flex items-center justify-center">
              {/* aro externo */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
                className="h-14 w-14 rounded-full border-[3px] border-emerald-100 border-t-emerald-500"
              />

              {/* aro interno */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'linear' }}
                className="absolute h-8 w-8 rounded-full border-2 border-cyan-100 border-b-cyan-400"
              />

              {/* núcleo */}
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute h-2.5 w-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 shadow-[0_0_18px_rgba(45,212,191,0.55)]"
              />
            </div>

            <div className="mt-4 text-[12px] font-semibold tracking-wide text-slate-400">
              Cargando inicio…
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}