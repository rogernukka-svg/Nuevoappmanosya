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

      // Simular un pequeño delay para mostrar el splash
      await new Promise((r) => setTimeout(r, 1500));

      if (!user) {
        router.replace('/login');
        return;
      }

      if (savedRole === 'worker') {
        router.replace('/worker');
      } else if (savedRole === 'client') {
        router.replace('/client');
      } else {
        router.replace('/role');
      }
    }
    init();
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-black via-neutral-900 to-black text-emerald-400 font-[var(--font-manrope)] overflow-hidden relative">
      
      {/* ✨ Halo de energía */}
      <motion.div
        className="absolute w-[300px] h-[300px] rounded-full bg-emerald-500/20 blur-[100px]"
        animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.1, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* 🤝 Logo principal con animación */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="flex items-center gap-2 z-10"
      >
        <h1 className="text-5xl font-extrabold tracking-tight">
          <span className="text-white">Manos</span>
          <span className="text-emerald-400">YA</span>
        </h1>
      </motion.div>

      {/* ⚙️ Texto y engranaje animado */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: [0, 1, 0.7, 1], y: [20, 0, 0, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="flex items-center mt-6 gap-2 text-emerald-300 text-lg z-10"
      >
        <p className="animate-pulse">Cargando ManosYA...</p>
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          ⚙️
        </motion.span>
      </motion.div>

      {/* 🌫 Fondo de partículas suaves */}
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,200,0.05)_0%,transparent_70%)]"
        animate={{ opacity: [0.1, 0.3, 0.1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
