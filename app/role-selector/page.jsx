'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, LogOut, UserRound, Wrench, Settings } from 'lucide-react';
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
        router.replace('/auth/login');
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
      router.replace('/auth/login');
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
    toast.success(role === 'worker' ? 'Modo Trabajador activado 💼' : 'Modo Cliente activado 🙌');

    router.push(`/${role}`);
  };

  /* 🚪 Salida */
  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('app_role');
    toast.success('Cerraste sesión correctamente.');
    router.replace('/auth/login');
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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-gray-800 font-[var(--font-manrope)] bg-white">

      {/* LOGO */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-10"
      >
        <h1 className="text-4xl font-extrabold tracking-tight">
          <span className="text-[#111827]">Manos</span>
          <span className="text-emerald-600">YA</span>
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Tu ayuda al instante.
        </p>
      </motion.div>

      {/* TITULO */}
      <motion.h2
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-lg font-semibold text-gray-700 mb-6 text-center"
      >
        Elegí cómo querés usar ManosYA
      </motion.h2>

      {/* 🔘 Opciones */}
      <div className="w-full max-w-xs flex flex-col gap-4">

        {/* BOTÓN TRABAJADOR (Primario) */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => handleSelectRole('worker')}
          className={`flex items-center justify-center gap-2 py-3 rounded-full font-semibold text-white shadow-md transition-all 
          ${selectedRole === 'worker'
            ? 'bg-emerald-600'
            : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
          }`}
        >
          <Wrench className="w-5 h-5" />
          Quiero trabajar y ganar dinero
        </motion.button>

        {/* BOTÓN CLIENTE */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => handleSelectRole('client')}
          className={`flex items-center justify-center gap-2 py-3 rounded-full font-semibold shadow-sm transition-all ${
            selectedRole === 'client'
              ? 'bg-cyan-600 text-white'
              : 'bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white'
          }`}
        >
          <UserRound className="w-5 h-5" />
          Quiero pedir un servicio
        </motion.button>
      </div>

      {/* ⚙️ ACCESOS SECUNDARIOS */}
      <div className="mt-8 text-center">
        <button
          onClick={() => router.push('/settings/account')}
          className="flex items-center gap-2 justify-center text-sm text-gray-500 hover:text-emerald-600 transition"
        >
          <Settings className="w-4 h-4 opacity-70" />
          Gestión de mi cuenta
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 justify-center text-sm text-gray-500 hover:text-emerald-600 transition mt-3"
        >
          <LogOut className="w-4 h-4 opacity-70" />
          Cerrar sesión
        </button>
      </div>

      {/* 📜 Legal */}
      <p className="text-[11px] text-gray-400 mt-8 text-center max-w-xs leading-relaxed">
        Al continuar aceptás nuestras políticas.  
        <br />
        <a href="/terms-of-use" className="text-emerald-600 underline" target="_blank">
          Condiciones de Uso
        </a>{' '}
        ·{' '}
        <a href="/privacy-policy" className="text-emerald-600 underline" target="_blank">
          Privacidad
        </a>
      </p>
    </div>
  );
}
