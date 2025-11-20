'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { getSupabase } from '@/lib/supabase';

const supabase = getSupabase();

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // 🎧 Intentar reproducir audio AUTOMÁTICAMENTE desde el inicio
    const tryPlay = () => {
      const audio = document.querySelector("audio");
      if (!audio) return;

      audio.volume = 1;

      audio.play().catch(() => {
        // intentar 3 veces por si el navegador bloquea
        setTimeout(() => audio.play().catch(() => {}), 200);
        setTimeout(() => audio.play().catch(() => {}), 600);
        setTimeout(() => audio.play().catch(() => {}), 1200);
      });
    };

    // ejecutar al inicio
    tryPlay();

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const savedRole = localStorage.getItem('app_role');

      // ⏳ Duración visible del splash
      await new Promise((r) => setTimeout(r, 2500));

      if (!user) return router.replace('/auth/login');
      if (savedRole === 'worker') return router.replace('/worker');
      if (savedRole === 'client') return router.replace('/client');

      router.replace('/role-selector');
    }

    init();
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-emerald-400 font-[var(--font-manrope)] overflow-hidden relative">

      {/* 🔷 Círculo de energía estilo Neural Engine */}
      <motion.div
        className="absolute w-[320px] h-[320px] rounded-full bg-emerald-400/20 blur-[110px]"
        animate={{ opacity: [0.15, 0.30, 0.18], scale: [1, 1.07, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* 🔶 Líneas futuristas (súper sutiles) */}
      <div className="absolute inset-0 opacity-[0.12] pointer-events-none">
        <div className="absolute left-1/3 top-0 h-full w-[1px] bg-gradient-to-b from-transparent via-emerald-500/40 to-transparent animate-pulse"></div>
        <div className="absolute left-2/3 top-0 h-full w-[1px] bg-gradient-to-b from-transparent via-emerald-500/40 to-transparent animate-pulse delay-300"></div>
      </div>

      {/* 🔥 Logo futurista */}
      <motion.h1
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1.3, ease: 'easeOut' }}
        className="text-[56px] font-extrabold tracking-tight z-10 drop-shadow-[0_0_18px_rgba(16,255,200,0.25)]"
      >
        <span className="text-white">Manos</span>
        <span className="text-emerald-400">YA</span>
      </motion.h1>

      {/* ✨ Mensaje */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.8, ease: 'easeOut', delay: 0.6 }}
        className="text-emerald-300 text-lg mt-4 z-10 font-light tracking-wide"
      >
        Preparando tu experiencia para enero.
      </motion.p>

      {/* ⏳ Indicador tipo scanner */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 2.2, ease: 'easeInOut' }}
        className="w-48 h-[2.5px] bg-gradient-to-r from-emerald-500/30 via-emerald-400 to-emerald-500/30 mt-6 origin-left rounded-full shadow-[0_0_10px_rgba(0,255,200,0.6)]"
      />

      {/* 🌌 Fondo reactivo */}
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,200,0.08)_0%,transparent_75%)]"
        animate={{ opacity: [0.07, 0.16, 0.07] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
