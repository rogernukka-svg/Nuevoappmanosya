'use client';

import { useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Trash2, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const supabase = getSupabase();

export default function AccountSettingsPage() {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;

    if (!userId) {
      toast.error('Sesión expirada.');
      router.replace('/login');
      return;
    }

    // 🔥 Llamar al RPC que borra la cuenta
    const { error } = await supabase.rpc('delete_account', { user_id: userId });

    if (error) {
      toast.error('No se pudo eliminar la cuenta.');
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    toast.success('Tu cuenta fue eliminada correctamente.');

    router.replace('/login');
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-6 pt-10 pb-20 text-gray-800 bg-gradient-to-b from-white via-emerald-50 to-cyan-50 font-[var(--font-manrope)]">

      {/* 🔙 Volver */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 transition self-start mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Volver
      </button>

      {/* 💚 Título */}
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold mb-2"
      >
        Gestión de cuenta
      </motion.h1>

      <p className="text-gray-600 text-center max-w-xs text-sm mb-10">
        Aquí podés manejar la información de tu cuenta y solicitar su eliminación si lo necesitás.
      </p>

      {/* ❗ Zona de eliminación */}
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-800">Eliminar mi cuenta</h2>
        <p className="text-gray-500 text-sm mt-2">
          Si eliminás tu cuenta, se borrarán tus datos de ManosYA de manera permanente.
        </p>

        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="mt-5 w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
          >
            <Trash2 className="w-5 h-5" />
            Eliminar mi cuenta
          </button>
        ) : (
          <div className="mt-5">
            <p className="text-red-600 font-medium text-sm text-center mb-3">
              ¿Seguro que querés eliminar tu cuenta?
            </p>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="w-full bg-red-700 hover:bg-red-800 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
              Confirmar eliminación
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
