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
  const [userEmail, setUserEmail] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);

  // 🔐 Sesión
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data?.session?.user) {
        router.replace('/login');
        return;
      }
      setUserEmail(data.session.user.email);
      setLoading(false);
    };
    checkSession();
  }, [router]);

  const handleSelectRole = async (role) => {
    setSelectedRole(role);
    setLoading(true);

    const { data } = await supabase.auth.getSession();
    const userId = data?.session?.user?.id;
    if (!userId) {
      toast.error('Sesión expirada');
      router.replace('/login');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (error) {
      toast.error('Error al guardar rol');
      setLoading(false);
      return;
    }

    localStorage.setItem('app_role', role);
    toast.success(`Modo ${role === 'worker' ? 'Trabajador' : 'Cliente'} activado ✅`);
    router.push(`/${role}`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('app_role');
    router.replace('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-600">
        <Loader2 className="animate-spin w-6 h-6 mr-2" />
        Cargando...
      </div>
    );
  }

  // 🌈 UI Principal
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 font-[var(--font-manrope)] text-gray-800 overflow-hidden bg-gradient-to-b from-white via-emerald-50 to-cyan-50">
      
      {/* ✨ Halo de energía detrás del logo */}
      <motion.div
        className="absolute top-[25%] left-1/2 w-[320px] h-[320px] rounded-full bg-emerald-400/20 blur-[120px] -translate-x-1/2"
        animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.08, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* 🤝 Logo y texto */}
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center z-10"
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="text-6xl mb-4"
        >
          🤝
        </motion.div>

        <h1 className="text-4xl font-extrabold tracking-tight">
          <span className="text-[#111827]">Manos</span>
          <span className="text-emerald-600">YA</span>
        </h1>

        <p className="mt-4 text-gray-600 leading-relaxed text-[15px] max-w-sm mx-auto">
          Conectá con <span className="text-emerald-600 font-semibold">ManosYA</span> para pedir o brindar servicios al instante.
        </p>
      </motion.div>

      {/* 🟢 Botones de selección */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.3 }}
        className="w-full max-w-xs flex flex-col gap-4 mt-10 z-10"
      >
        {/* Cliente */}
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => handleSelectRole('client')}
          className={`flex items-center justify-center gap-2 py-3 rounded-full font-semibold shadow-md transition-all ${
            selectedRole === 'client'
              ? 'bg-emerald-600 text-white shadow-emerald-400/40'
              : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-300/30'
          }`}
        >
          <UserRound className="w-5 h-5" />
          Soy Cliente
        </motion.button>

        {/* Trabajador */}
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => handleSelectRole('worker')}
          className={`flex items-center justify-center gap-2 py-3 rounded-full font-semibold shadow-md transition-all ${
            selectedRole === 'worker'
              ? 'bg-cyan-600 text-white shadow-cyan-400/40'
              : 'bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white shadow-cyan-300/30'
          }`}
        >
          <Wrench className="w-5 h-5" />
          Soy Trabajador
        </motion.button>
      </motion.div>

      {/* ⚙️ Footer */}
      <div className="mt-10 text-center z-10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 justify-center text-sm text-gray-500 hover:text-red-500 transition"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
        <p className="text-xs text-gray-400 mt-2">
          Podés cambiar tu rol más adelante desde tu perfil.
        </p>
      </div>
    </div>
  );
}
