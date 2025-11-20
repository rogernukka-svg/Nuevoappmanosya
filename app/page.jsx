'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
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

      // Delay para mostrar el splash (animación + audio)
      await new Promise((r) => setTimeout(r, 2500));

      if (!user) {
        router.replace('/auth/login');
        return;
      }

      if (savedRole === 'worker') {
        router.replace('/worker');
      } else if (savedRole === 'client') {
        router.replace('/client');
      } else {
        router.replace('/role-selector');
      }
    }
    init();
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-emerald-400 font-[var(--font-manrope)] overflow-hidden relative">

      {/* 🎵 AUDIO DE FONDO */}
      <audio
        src="/audios/manosya_intro.mp3" 
        autoPlay
        playsInline
        className="hidden"
      />

      {/* 💠 Luz suave estilo Apple */}
      <motion.div
        className="absolute w-[260px] h-[260px] rounded-full bg-emerald-400/15 blur-[90px]"
        animate={{ opacity: [0.2, 0.4, 0.2], scale: [1, 1.05, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* 🔥 Logo con entrada minimalista */}
      <motion.h1
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="text-5xl font-extrabold tracking-tight z-10"
      >
        <span className="text-white">Manos</span>
        <span className="text-emerald-400">YA</span>
      </motion.h1>

      {/* ✨ Mensaje corto neuromarketing */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.8, ease: 'easeOut', delay: 0.6 }}
        className="text-emerald-300 text-lg mt-5 z-10 font-light"
      >
        Bienvenido. Estamos preparando todo para enero.
      </motion.p>

      {/* ⏳ Indicador minimalista */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 2, ease: 'easeInOut' }}
        className="w-40 h-[2px] bg-emerald-400/40 mt-8 origin-left rounded-full"
      />

      {/* 🌫️ Brillo de ambiente */}
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,200,0.06)_0%,transparent_70%)]"
        animate={{ opacity: [0.05, 0.15, 0.05] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
