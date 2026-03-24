'use client';

import { useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Loader2,
  Trash2,
  ArrowLeft,
  ShieldAlert,
  UserCog,
  AlertTriangle,
} from 'lucide-react';
import { motion } from 'framer-motion';

const supabase = getSupabase();

export default function AccountSettingsPage() {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    try {
      setLoading(true);

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        toast.error('Sesión expirada.');
        router.replace('/auth/login');
        return;
      }

      const { error } = await supabase.rpc('delete_account', { user_id: userId });

      if (error) {
        toast.error('No se pudo eliminar la cuenta.');
        setLoading(false);
        return;
      }

      await supabase.auth.signOut();
      toast.success('Tu cuenta fue eliminada correctamente.');
      router.replace('/auth/login');
    } catch (err) {
      console.error('Error eliminando cuenta:', err);
      toast.error('Ocurrió un error al eliminar tu cuenta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(to_bottom,#ffffff,#f0fdfa,#ecfeff)] px-5 pb-20 pt-8 text-slate-800 font-[var(--font-manrope)] sm:px-6">
      {/* Fondo */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-140px] h-[320px] w-[620px] -translate-x-1/2 rounded-full bg-emerald-200/35 blur-3xl" />
        <div className="absolute left-[-80px] top-[24%] h-[220px] w-[220px] rounded-full bg-cyan-200/25 blur-3xl" />
        <div className="absolute bottom-[-80px] right-[-60px] h-[240px] w-[240px] rounded-full bg-teal-200/20 blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.045]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(15,23,42,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.08) 1px, transparent 1px)',
            backgroundSize: '42px 42px',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-xl">
        {/* Top bar */}
        <button
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm backdrop-blur-md transition hover:text-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-[30px] border border-white/80 bg-white/70 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-7"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-cyan-50 shadow-sm">
            <UserCog className="h-8 w-8 text-emerald-600" />
          </div>

          <h1 className="mt-5 text-center text-3xl font-black tracking-tight text-slate-900">
            Gestión de cuenta
          </h1>

          <p className="mx-auto mt-3 max-w-md text-center text-sm leading-relaxed text-slate-600 sm:text-[15px]">
            Acá podés gestionar la parte sensible de tu cuenta. Si decidís eliminarla,
            tus datos se borrarán de forma permanente.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Tag icon={<ShieldAlert className="h-3.5 w-3.5" />} label="Zona protegida" />
            <Tag icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Acción irreversible" />
          </div>
        </motion.div>

        {/* Danger card */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, delay: 0.05 }}
          className="mt-6 rounded-[28px] border border-red-100 bg-white/80 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-50 ring-1 ring-red-100">
              <Trash2 className="h-7 w-7 text-red-600" />
            </div>

            <div className="min-w-0">
              <h2 className="text-xl font-black tracking-tight text-slate-900">
                Eliminar mi cuenta
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                Esta acción elimina tu cuenta y borra tu información de ManosYA.
                No se puede deshacer después.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-red-100 bg-red-50/70 px-4 py-3 text-sm text-red-700">
            Antes de confirmar, asegurate de que realmente querés salir de la plataforma.
          </div>

          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3.5 text-base font-black text-white shadow-[0_14px_30px_rgba(220,38,38,0.22)] transition hover:bg-red-700"
            >
              <Trash2 className="h-5 w-5" />
              Eliminar mi cuenta
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 rounded-2xl border border-red-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">
                    Confirmación final
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    Estás por eliminar tu cuenta de forma permanente. Esta acción no tiene vuelta atrás.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => setConfirming(false)}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                >
                  Cancelar
                </button>

                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-700 px-4 py-3 font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Trash2 className="h-5 w-5" />
                  )}
                  Confirmar eliminación
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-400">
          ManosYA · Gestión segura de cuenta
        </p>
      </div>
    </div>
  );
}

function Tag({ icon, label }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-sm">
      <span className="text-emerald-600">{icon}</span>
      {label}
    </div>
  );
}