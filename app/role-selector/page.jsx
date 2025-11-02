'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, LogOut, UserRound, Wrench } from 'lucide-react';
import { motion } from 'framer-motion';

const supabase = getSupabase();

export default function RoleSelectorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);

  /* 🔐 Sesión */
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data?.session?.user) {
        router.replace('/login');
        return;
      }
      setLoading(false);
    };
    checkSession();
  }, [router]);

  /* 🎭 Selección de rol */
  const handleSelectRole = async (role) => {
    setSelectedRole(role);
    setLoading(true);

    const { data } = await supabase.auth.getSession();
    const userId = data?.session?.user?.id;
    if (!userId) {
      toast.error('Sesión expirada.');
      router.replace('/login');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (error) {
      toast.error('No se pudo guardar el rol.');
      setLoading(false);
      return;
    }

    localStorage.setItem('app_role', role);
    toast.success(role === 'worker' ? 'Modo Trabajador activado 💪' : 'Modo Cliente activado 🤝');
    router.push(`/${role}`);
  };

  /* 🚪 Salida suave */
  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('app_role');
    toast.success('Hasta pronto 👋 Tu cuenta queda segura.');
    router.replace('/login');
  };

  /* ⏳ Pantalla de carga */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-600">
        <Loader2 className="animate-spin w-6 h-6 mr-2" />
        Cargando...
      </div>
    );
  }

  /* 🌈 UI principal */
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 text-gray-800 font-[var(--font-manrope)] bg-gradient-to-b from-white via-emerald-50 to-cyan-50 overflow-hidden">
      
      {/* ✨ Halo de energía */}
      <motion.div
        className="absolute top-[25%] left-1/2 w-[280px] h-[280px] rounded-full bg-emerald-400/15 blur-[100px] -translate-x-1/2"
        animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.05, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* 👋 Saludo inicial */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="text-center mb-6"
      >
        <h2 className="text-sm text-gray-500 font-medium">
          👋 Hola, bienvenido a <span className="text-emerald-600 font-semibold">ManosYA</span>
        </h2>
        <p className="text-[13px] text-gray-400 mt-1">
          Tu ayuda al instante, cerca de vos 💚
        </p>
      </motion.div>

      {/* 🤝 Logo con latido */}
      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        className="text-6xl mb-4"
      >
        🤝
      </motion.div>

      {/* Título */}
      <h1 className="text-4xl font-extrabold tracking-tight text-center">
        <span className="text-[#111827]">Manos</span>
        <span className="text-emerald-600">YA</span>
      </h1>

      <p className="text-gray-600 text-[15px] mt-3 text-center max-w-sm">
        Conectamos personas que se ayudan, trabajan y hacen que las cosas pasen.
      </p>

      {/* 🔘 Opciones de acción */}
      <div className="w-full max-w-xs flex flex-col gap-4 mt-10">
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleSelectRole('client')}
          className={`flex items-center justify-center gap-2 py-3 rounded-full font-semibold shadow-sm transition-all ${
            selectedRole === 'client'
              ? 'bg-emerald-600 text-white'
              : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white'
          }`}
        >
          <UserRound className="w-5 h-5" />
          Quiero pedir ayuda
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleSelectRole('worker')}
          className={`flex items-center justify-center gap-2 py-3 rounded-full font-semibold shadow-sm transition-all ${
            selectedRole === 'worker'
              ? 'bg-cyan-600 text-white'
              : 'bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white'
          }`}
        >
          <Wrench className="w-5 h-5" />
          Quiero ofrecer mi servicio
        </motion.button>
      </div>

      {/* ⚙️ Footer */}
      <div className="mt-10 text-center">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 justify-center text-sm text-gray-500 hover:text-emerald-600 transition"
        >
          <LogOut className="w-4 h-4 opacity-70" />
          Salir por ahora
        </button>
        <p className="text-xs text-gray-400 mt-2">
          Podés volver en cualquier momento. Tu cuenta queda segura 💚
        </p>
      </div>

      {/* 📜 Info legal */}
      <p className="text-[11px] text-gray-400 mt-6 text-center max-w-xs leading-relaxed">
        Al continuar, confirmás que entendés cómo cuidamos tus datos y cómo funciona{' '}
        <span className="text-emerald-600 font-medium">ManosYA</span>.  
        <br />
        <a
          href="/terms-of-use"
          target="_blank"
          className="text-emerald-600 hover:text-emerald-700 underline"
        >
          Condiciones de Uso
        </a>{' '}
        ·{' '}
        <a
          href="/privacy-policy"
          target="_blank"
          className="text-emerald-600 hover:text-emerald-700 underline"
        >
          Privacidad
        </a>
      </p>
    </div>
  );
}
