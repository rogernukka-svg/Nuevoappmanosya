'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, UserRound, Wrench } from 'lucide-react';
import { motion } from 'framer-motion';

const supabase = getSupabase();

/**
 * 🎯 Role Selector — versión estable ManosYA (Vercel + Local)
 */
export default function RoleSelectorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState(null);

  // 🔐 Verificar sesión Supabase (método estable)
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error || !data?.user) {
          console.warn('🔒 Sesión no encontrada, redirigiendo a login...');
          toast.error('Iniciá sesión para continuar');
          router.replace('/login');
          return;
        }

        setUserEmail(data.user.email);
      } catch (err) {
        console.error('❌ Error verificando sesión:', err);
        toast.error('Error verificando sesión');
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  // ⚙️ Guardar rol seleccionado
  const handleSelectRole = async (role) => {
    setLoading(true);
    try {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!user) {
        toast.error('Sesión expirada. Iniciá sesión nuevamente.');
        router.replace('/login');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', user.id);

      if (error) throw error;

      localStorage.setItem('app_role', role);
      toast.success(`Modo ${role === 'worker' ? 'Trabajador' : 'Cliente'} activado ✅`);

      // Redirección suave
      setTimeout(() => router.replace(`/${role}`), 600);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo guardar tu elección.');
    } finally {
      setLoading(false);
    }
  };

  // 🌀 Pantalla de carga
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-800">
        <Loader2 className="animate-spin w-6 h-6 mr-2" />
        <p className="text-lg font-medium">Verificando sesión...</p>
      </div>
    );
  }

  // 🌟 Pantalla principal
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50 to-cyan-50 flex flex-col items-center justify-between py-10 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-2xl font-extrabold text-gray-900">
          ¡Hola, <span className="text-emerald-600">{userEmail}</span>!
        </h1>
        <p className="text-gray-600 text-base mt-2">
          <span className="text-emerald-500 font-semibold">ManosYA</span> te conecta al instante 🚀
        </p>
      </motion.div>

      <div className="w-full max-w-xs flex flex-col gap-5 mt-8">
        <motion.button
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.03 }}
          onClick={() => handleSelectRole('client')}
          className="bg-white border border-emerald-400 rounded-xl py-4 px-5 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center active:scale-95"
        >
          <UserRound className="w-8 h-8 text-emerald-500 mb-2" />
          <h2 className="text-lg font-bold text-emerald-600">Soy Cliente</h2>
          <p className="text-sm text-gray-500 mt-1 leading-tight">
            Encontrá ayuda confiable en minutos.
          </p>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.03 }}
          onClick={() => handleSelectRole('worker')}
          className="bg-white border border-cyan-400 rounded-xl py-4 px-5 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center active:scale-95"
        >
          <Wrench className="w-8 h-8 text-cyan-500 mb-2" />
          <h2 className="text-lg font-bold text-cyan-600">Soy Trabajador</h2>
          <p className="text-sm text-gray-500 mt-1 leading-tight">
            Ofrecé tus servicios y crecé con nosotros.
          </p>
        </motion.button>
      </div>

      <p className="text-xs text-gray-500 text-center mt-10">
        Podés cambiar tu rol en cualquier momento desde tu perfil.
      </p>
    </div>
  );
}
