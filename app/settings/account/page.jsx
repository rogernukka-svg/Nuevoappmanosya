'use client';

import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Loader2,
  Trash2,
  ArrowLeft,
  AlertTriangle,
  UserCog,
  ShieldCheck,
} from 'lucide-react';
import { motion } from 'framer-motion';

const supabase = getSupabase();
const LOGIN_BG = '#62bfb9';

export default function AccountSettingsPage() {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (alive && !data?.session?.user) {
        router.replace('/auth/login');
      }
    });

    return () => {
      alive = false;
    };
  }, [router]);

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

      const { error } = await supabase.rpc('delete_account', {
        user_id: userId,
      });

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
    <main
      className="fixed inset-0 h-[100dvh] w-screen overflow-y-auto overflow-x-hidden text-[#08233a]"
      style={{ background: LOGIN_BG }}
    >
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.34),transparent_30%),radial-gradient(circle_at_90%_18%,rgba(255,255,255,0.22),transparent_26%)]" />
        <div className="absolute -left-24 top-28 h-72 w-72 rounded-full bg-white/18 blur-3xl" />
        <div className="absolute -right-24 bottom-20 h-72 w-72 rounded-full bg-[#0c6b70]/18 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col px-5 py-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/28 text-[#08233a] backdrop-blur-xl active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <motion.section
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="flex flex-1 flex-col items-center justify-center text-center"
        >
          <img
            src="/logo-manosya.png"
            alt="ManosYA"
            className="mx-auto mb-3 w-[225px] object-contain"
          />

          <div className="relative mx-auto mb-2 h-[185px] w-[185px]">
            <div className="absolute inset-8 rounded-full bg-white/28 blur-3xl" />
            <img
              src="/ROGER OK.png"
              alt="Roger ManosYA"
              className="relative z-10 h-full w-full object-contain drop-shadow-[0_24px_35px_rgba(8,15,52,0.20)]"
            />
          </div>

          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-white/24 px-4 py-2 text-[12px] font-black text-[#08233a] backdrop-blur-xl">
            <UserCog className="h-4 w-4" />
            Gestionar perfil
          </div>

          <h1 className="text-[40px] font-black leading-[0.94] tracking-[-0.05em] text-white">
            Configuración
            <br />
            de cuenta
          </h1>

          <p className="mx-auto mt-4 max-w-[330px] text-[16px] font-semibold leading-6 text-[#071a27]/78">
            Acá podés gestionar la parte sensible de tu cuenta.
          </p>

          <div className="mt-7 w-full rounded-[34px] bg-white px-5 py-5 text-left shadow-[0_18px_44px_rgba(8,15,52,0.14)]">
            <div className="flex items-start gap-4">
              <div className="flex h-15 w-15 shrink-0 items-center justify-center rounded-[24px] bg-[#06182a] p-4 text-white">
                <ShieldCheck className="h-7 w-7" />
              </div>

              <div>
                <h2 className="text-[22px] font-black leading-tight text-[#08233a]">
                  Zona segura
                </h2>
                <p className="mt-1 text-[14px] font-semibold leading-5 text-[#5e7486]">
                  Si eliminás tu cuenta, la acción es permanente.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 w-full rounded-[34px] bg-white/78 px-5 py-5 text-left shadow-[0_18px_44px_rgba(8,15,52,0.10)] backdrop-blur-xl">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] bg-red-50 text-red-600">
                <Trash2 className="h-7 w-7" />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-[22px] font-black leading-tight text-[#08233a]">
                  Eliminar cuenta
                </h2>
                <p className="mt-1 text-[14px] font-semibold leading-5 text-[#5e7486]">
                  Borra tu cuenta y tus datos de ManosYA.
                </p>
              </div>
            </div>

            {!confirming ? (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-[24px] bg-red-600 px-5 py-4 text-[14px] font-black text-white shadow-[0_16px_34px_rgba(220,38,38,0.22)] active:scale-95"
              >
                <Trash2 className="h-5 w-5" />
                Eliminar mi cuenta
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 rounded-[26px] bg-white p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-red-50 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-sm font-black text-[#08233a]">
                      Confirmación final
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-5 text-[#5e7486]">
                      Esta acción no se puede deshacer.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    disabled={loading}
                    className="rounded-[20px] bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 disabled:opacity-60"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 rounded-[20px] bg-red-700 px-4 py-3 text-sm font-black text-white disabled:opacity-70"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Trash2 className="h-5 w-5" />
                    )}
                    Eliminar
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          <div className="mt-8 text-[11px] font-bold text-[#08233a]/45">
            ManosYA • Gestión segura
          </div>
        </motion.section>
      </div>
    </main>
  );
}
