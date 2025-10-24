'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, UserRound, Wrench, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

const supabase = getSupabase();

export default function RoleSelectorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState(null);

  // 🔐 Verificar sesión
  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data?.session?.user) {
        toast.error('Iniciá sesión para continuar');
        router.replace('/login');
        return;
      }
      setUserEmail(data.session.user.email);
      setLoading(false);
    };
    checkSession();
  }, [router]);

  // ⚙️ Selección de rol
  const handleSelectRole = async (role) => {
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (!session?.user) {
        toast.error('Sesión expirada. Iniciá sesión nuevamente.');
        router.replace('/login');
        return;
      }

      const userId = session.user.id;
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId);

      if (error) throw error;

      localStorage.setItem('app_role', role);
      toast.success(`Modo ${role === 'worker' ? 'Trabajador' : 'Cliente'} activado ✅`);

      setTimeout(() => router.replace(`/${role}`), 500);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo guardar tu elección.');
      setLoading(false);
    }
  };

  // 🚪 Cerrar sesión
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('app_role');
      toast.info('Sesión cerrada correctamente 👋');
      router.replace('/login');
    } catch (err) {
      toast.error('Error al cerrar sesión');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-700">
        <Loader2 className="animate-spin w-6 h-6 mr-2" />
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-between py-10 px-6 bg-gradient-to-b from-white to-emerald-50">
      {/* === Header === */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-xl font-semibold text-gray-800">
          ¡Hola, <span className="text-emerald-600 font-bold">{userEmail}</span>!
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          <span className="text-emerald-500 font-semibold">ManosYA</span> te conecta al instante 🚀
        </p>
      </motion.div>

      {/* === Botones === */}
      <div className="w-full max-w-sm flex flex-col gap-4 mt-8">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => handleSelectRole('client')}
          className="relative flex items-center justify-center gap-3 py-3 px-5 
                     bg-white/60 backdrop-blur-md border border-emerald-200 
                     rounded-xl shadow-sm hover:shadow-md transition-all"
        >
          <UserRound className="w-5 h-5 text-emerald-600" />
          <span className="font-medium text-gray-800">Soy Cliente</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => handleSelectRole('worker')}
          className="relative flex items-center justify-center gap-3 py-3 px-5 
                     bg-white/60 backdrop-blur-md border border-cyan-200 
                     rounded-xl shadow-sm hover:shadow-md transition-all"
        >
          <Wrench className="w-5 h-5 text-cyan-600" />
          <span className="font-medium text-gray-800">Soy Trabajador</span>
        </motion.button>
      </div>

      {/* === Footer === */}
      <div className="flex flex-col items-center mt-10 gap-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-red-500 transition"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>

        <p className="text-xs text-gray-400 text-center max-w-xs">
          Podés cambiar tu rol en cualquier momento desde tu perfil.
        </p>
      </div>
    </div>
  );
}
