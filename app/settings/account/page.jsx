'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ArrowLeft, Loader2, ShieldCheck, Trash2, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabase } from '@/lib/supabase';

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
        toast.error('Sesion expirada.');
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
      toast.error('Ocurrio un error al eliminar tu cuenta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="fixed inset-0 h-[100dvh] w-screen overflow-hidden text-white" style={{ background: LOGIN_BG }}>
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.34),transparent_30%),radial-gradient(circle_at_90%_18%,rgba(255,255,255,0.22),transparent_26%)]" />
        <div className="absolute -left-24 top-28 h-72 w-72 rounded-full bg-white/18 blur-3xl" />
        <div className="absolute -right-24 bottom-20 h-72 w-72 rounded-full bg-[#0c6b70]/18 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex h-full w-full max-w-[430px] flex-col px-4 py-3">
        <motion.section
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[30px] border border-white/35 bg-white/8 px-4 pb-4 pt-3 text-center shadow-[0_26px_80px_rgba(8,15,52,0.12)] backdrop-blur-2xl"
        >
          <button
            type="button"
            onClick={() => router.back()}
            className="absolute left-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/12 text-white backdrop-blur-xl active:scale-95"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2.1} />
          </button>

          <img
            src="/logo-manosya.png"
            alt="ManosYA"
            className="mx-auto h-[clamp(36px,6.4dvh,56px)] w-auto object-contain"
          />

          <div className="relative mx-auto mt-1 h-[clamp(88px,19dvh,145px)] w-[clamp(88px,19dvh,145px)] shrink-0">
            <div className="absolute inset-8 rounded-full bg-white/28 blur-3xl" />
            <img
              src="/ROGER OK.png"
              alt="Roger ManosYA"
              className="relative z-10 h-full w-full object-contain drop-shadow-[0_24px_35px_rgba(8,15,52,0.20)]"
            />
          </div>

          <div className="mx-auto mt-1 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/12 px-3 py-1.5 text-[11px] font-black text-white backdrop-blur-xl">
            <UserCog className="h-3.5 w-3.5" strokeWidth={1.9} />
            Gestionar perfil
          </div>

          <h1 className="mx-auto mt-3 max-w-[11ch] text-[clamp(1.85rem,5.2dvh,2.75rem)] font-black leading-[0.94] tracking-normal text-white [text-wrap:balance]">
            Configuracion de cuenta
          </h1>

          <p className="mx-auto mt-2 max-w-[310px] text-[clamp(0.78rem,2dvh,0.95rem)] font-bold leading-tight text-white/86">
            Aca podes gestionar la parte sensible de tu cuenta.
          </p>

          <div className="mt-4 grid gap-2.5">
            <div className="rounded-[26px] border border-white/32 bg-[#06182a] p-4 text-left text-white shadow-[0_16px_34px_rgba(8,15,52,0.14)]">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-white/12 text-white ring-1 ring-white/20">
                  <ShieldCheck className="h-6 w-6" strokeWidth={1.9} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[20px] font-black leading-tight">Zona segura</h2>
                  <p className="mt-0.5 text-[13px] font-bold leading-tight text-white/74">
                    Si eliminas tu cuenta, la accion es permanente.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[26px] border border-white/32 bg-white/12 p-4 text-left text-white shadow-[0_16px_34px_rgba(8,15,52,0.10)] backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-red-600 text-white shadow-[0_12px_28px_rgba(220,38,38,0.22)]">
                  <Trash2 className="h-6 w-6" strokeWidth={1.9} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[20px] font-black leading-tight">Eliminar cuenta</h2>
                  <p className="mt-0.5 text-[13px] font-bold leading-tight text-white/74">
                    Borra tu cuenta y tus datos de ManosYA.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={loading}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-[22px] bg-red-600 px-5 py-3.5 text-[14px] font-black text-white shadow-[0_16px_34px_rgba(220,38,38,0.22)] active:scale-95 disabled:opacity-60"
              >
                <Trash2 className="h-5 w-5" strokeWidth={1.9} />
                Eliminar mi cuenta
              </button>
            </div>
          </div>

          <div className="mt-auto pt-3 text-[10px] font-bold text-white/58">
            ManosYA • Gestion segura
          </div>
        </motion.section>
      </div>

      <AnimatePresence>
        {confirming ? (
          <div className="fixed inset-0 z-30 flex items-end justify-center bg-[#06182a]/54 px-4 pb-4 backdrop-blur-md">
            <motion.section
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-[420px] rounded-[30px] border border-white/24 bg-[#69c4c0] p-4 text-white shadow-[0_30px_80px_rgba(0,0,0,0.26)]"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-red-600 text-white">
                  <AlertTriangle className="h-5 w-5" strokeWidth={1.9} />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-lg font-black leading-tight">Confirmacion final</p>
                  <p className="mt-1 text-sm font-bold leading-tight text-white/76">
                    Esta accion no se puede deshacer.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={loading}
                  className="rounded-[20px] border border-white/30 bg-white/12 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 rounded-[20px] bg-red-700 px-4 py-3 text-sm font-black text-white disabled:opacity-70"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                  Eliminar
                </button>
              </div>
            </motion.section>
          </div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
