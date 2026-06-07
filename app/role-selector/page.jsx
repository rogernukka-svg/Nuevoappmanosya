'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Loader2,
  LogOut,
  ArrowRight,
  BriefcaseBusiness,
  MapPinned,
  Store,
  Settings,
  Mail,
  Phone,
} from 'lucide-react';
import { motion } from 'framer-motion';

const supabase = getSupabase();
const LOGIN_BG = '#62bfb9';
const SUPPORT_EMAIL = 'manosya.py@gmail.com';
const SUPPORT_PHONE_LABEL = '+595 984 921 024';
const SUPPORT_PHONE_TEL = '+595984921024';
const HELP_CENTER_PHONE_LABEL = '0982 030 926';
const HELP_CENTER_PHONE_TEL = '0982030926';

export default function RoleSelectorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

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

  const handleSelectRole = async (role) => {
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
      .upsert(
        {
          id: userId,
          email: data?.session?.user?.email || null,
          role,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (error) {
      toast.error('No se pudo guardar el modo.');
      setLoading(false);
      return;
    }

    localStorage.setItem('app_role', role);

    if (role === 'worker') {
      toast.success('Modo profesional activado');
      router.push('/worker');
    } else if (role === 'supplier') {
      toast.success('Modo proveedor activado');
      router.push('/supplier');
    } else {
      toast.success('Modo cliente activado');
      router.push('/client');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('app_role');
    router.replace('/auth/login');
  };

  if (loading) {
    return (
      <main
        className="fixed inset-0 flex h-screen w-screen items-center justify-center text-white"
        style={{ background: LOGIN_BG }}
      >
        <div className="flex items-center gap-3 rounded-[28px] bg-white/20 px-6 py-4 text-sm font-black shadow-[0_18px_50px_rgba(8,15,52,0.16)] backdrop-blur-xl">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando ManosYA...
        </div>
      </main>
    );
  }

  return (
    <main
      className="fixed inset-0 h-[100dvh] w-screen min-w-full overflow-y-auto overflow-x-hidden text-[#08233a]"
      style={{ background: LOGIN_BG }}
    >
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.34),transparent_30%),radial-gradient(circle_at_90%_18%,rgba(255,255,255,0.22),transparent_26%)]" />
        <div className="absolute -left-24 top-28 h-72 w-72 rounded-full bg-white/18 blur-3xl" />
        <div className="absolute -right-24 bottom-20 h-72 w-72 rounded-full bg-[#0c6b70]/18 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col items-center justify-center px-5 py-8">
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="w-full text-center"
        >
          <img
            src="/logo-manosya.png"
            alt="ManosYA"
            className="mx-auto mb-3 w-[230px] object-contain"
          />

          <div className="relative mx-auto mb-2 h-[210px] w-[210px]">
            <div className="absolute inset-8 rounded-full bg-white/28 blur-3xl" />
            <img
              src="/ROGER SALUDANDO.png"
              alt="Roger ManosYA"
              className="relative z-10 h-full w-full object-contain drop-shadow-[0_24px_35px_rgba(8,15,52,0.20)]"
            />
          </div>

          <h1 className="text-[42px] font-black leading-[0.94] tracking-[-0.05em] text-white">
            ¿Cómo querés
            <br />
            entrar?
          </h1>

          <p className="mx-auto mt-4 max-w-[320px] text-[17px] font-semibold leading-6 text-[#071a27]/78">
            Elegí una opción y seguimos al toque.
          </p>

          <div className="mt-8 space-y-4">
            <button
              type="button"
              onClick={() => handleSelectRole('client')}
              className="flex w-full items-center gap-4 rounded-[34px] bg-white px-5 py-5 text-left shadow-[0_18px_44px_rgba(8,15,52,0.14)] active:scale-[0.985]"
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] bg-[#06182a] text-white">
                <MapPinned className="h-7 w-7" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-[23px] font-black leading-tight text-[#08233a]">
                  Necesito ayuda
                </div>
                <div className="mt-1 text-[14px] font-semibold text-[#5e7486]">
                  Buscar un servicio
                </div>
              </div>

              <ArrowRight className="h-5 w-5 shrink-0 text-[#62bfb9]" />
            </button>

            <button
              type="button"
              onClick={() => handleSelectRole('worker')}
              className="flex w-full items-center gap-4 rounded-[34px] bg-white/78 px-5 py-5 text-left shadow-[0_18px_44px_rgba(8,15,52,0.10)] backdrop-blur-xl active:scale-[0.985]"
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] bg-white text-[#0c6b70] shadow-sm">
                <BriefcaseBusiness className="h-7 w-7" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-[23px] font-black leading-tight text-[#08233a]">
                  Quiero trabajar
                </div>
                <div className="mt-1 text-[14px] font-semibold text-[#5e7486]">
                  Entrar como profesional
                </div>
              </div>

              <ArrowRight className="h-5 w-5 shrink-0 text-[#0c6b70]" />
            </button>

            <button
              type="button"
              onClick={() => handleSelectRole('supplier')}
              className="flex w-full items-center gap-4 rounded-[34px] bg-[#08233a] px-5 py-5 text-left text-white shadow-[0_18px_44px_rgba(8,15,52,0.18)] active:scale-[0.985]"
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] bg-white/12 text-[#9ee5df] shadow-sm">
                <Store className="h-7 w-7" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-[23px] font-black leading-tight">
                  Vendo insumos
                </div>
                <div className="mt-1 text-[14px] font-semibold text-white/66">
                  Publicar productos y recibir compras
                </div>
              </div>

              <ArrowRight className="h-5 w-5 shrink-0 text-[#9ee5df]" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => router.push('/settings/account')}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-[24px] bg-white/34 px-5 py-4 text-[14px] font-black text-[#08233a] backdrop-blur-xl active:scale-95"
          >
            <Settings className="h-4 w-4" />
            Gestionar perfil
          </button>

          <section className="mt-4 w-full rounded-[28px] border border-white/34 bg-white/28 p-4 text-left shadow-[0_14px_36px_rgba(8,15,52,0.08)] backdrop-blur-xl">
            <div className="text-[12px] font-black uppercase tracking-[0.14em] text-[#08233a]/58">
              Soporte ManosYA
            </div>
            <div className="mt-3 grid gap-2">
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="flex items-center gap-3 rounded-[18px] bg-white/64 px-4 py-3 text-[13px] font-black text-[#08233a] active:scale-[0.98]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#08233a] text-white">
                  <Mail className="h-4 w-4" />
                </span>
                <span className="min-w-0 truncate">{SUPPORT_EMAIL}</span>
              </a>

              <a
                href={`tel:${SUPPORT_PHONE_TEL}`}
                className="flex items-center gap-3 rounded-[18px] bg-white/64 px-4 py-3 text-[13px] font-black text-[#08233a] active:scale-[0.98]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0c6b70] text-white">
                  <Phone className="h-4 w-4" />
                </span>
                <span>{SUPPORT_PHONE_LABEL}</span>
              </a>

              <a
                href={`tel:${HELP_CENTER_PHONE_TEL}`}
                className="flex items-center gap-3 rounded-[18px] bg-white/64 px-4 py-3 text-[13px] font-black text-[#08233a] active:scale-[0.98]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#0c6b70] shadow-sm">
                  <Phone className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  Centro de ayuda: {HELP_CENTER_PHONE_LABEL}
                </span>
              </a>
            </div>
          </section>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 inline-flex items-center justify-center gap-2 rounded-full bg-white/22 px-5 py-3 text-[13px] font-black text-[#08233a]/70 backdrop-blur-xl active:scale-95"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>

          <div className="mt-8 text-[11px] font-bold text-[#08233a]/45">
            ManosYA • Tu ayuda al instante
          </div>
        </motion.div>
      </div>
    </main>
  );
}
