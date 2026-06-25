'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  BriefcaseBusiness,
  HelpCircle,
  Loader2,
  LogOut,
  Mail,
  MapPinned,
  Phone,
  Settings,
  Store,
  UserRound,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabase } from '@/lib/supabase';

const supabase = getSupabase();
const LOGIN_BG = '#62bfb9';
const SUPPORT_EMAIL = 'manosya.py@gmail.com';
const SUPPORT_PHONE_LABEL = '+595 984 921 024';
const SUPPORT_PHONE_TEL = '+595984921024';
const HELP_CENTER_PHONE_LABEL = '0982 030 926';
const HELP_CENTER_PHONE_TEL = '0982030926';

const ROLE_OPTIONS = [
  {
    role: 'client',
    title: 'Necesito ayuda',
    subtitle: 'Buscar un servicio',
    icon: MapPinned,
    tone: 'bg-[#06182a]',
  },
  {
    role: 'worker',
    title: 'Quiero trabajar',
    subtitle: 'Entrar como profesional',
    icon: BriefcaseBusiness,
    tone: 'bg-white/11',
  },
  {
    role: 'supplier',
    title: 'Vendo insumos',
    subtitle: 'Publicar productos y recibir compras',
    icon: Store,
    tone: 'bg-white/14',
  },
];

export default function RoleSelectorPage() {
  const router = useRouter();
 const [loading, setLoading] = useState(true);
const [supportOpen, setSupportOpen] = useState(false);
const [accountOpen, setAccountOpen] = useState(false);
const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

    useEffect(() => {
    let alive = true;

    const checkSession = async () => {
      try {
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise((resolve) => setTimeout(() => resolve(null), 1800)),
        ]);

        if (!alive) return;

        const user = sessionResult?.data?.session?.user || null;

        if (!user) {
          router.replace('/auth/login');
          return;
        }

        setLoading(false);
      } catch (error) {
        console.warn('role selector session error:', error);

        if (!alive) return;
        router.replace('/auth/login');
      }
    };

    checkSession();

    return () => {
      alive = false;
    };
  }, [router]);  const handleSelectRole = async (role) => {
    setLoading(true);

    const { data } = await supabase.auth.getSession();
    const userId = data?.session?.user?.id;

    if (!userId) {
      toast.error('Sesion expirada.');
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
      router.push('/worker/feed');
    } else if (role === 'supplier') {
      toast.success('Modo proveedor activado');
      router.push('/supplier');
    } else {
      toast.success('Modo cliente activado');
      router.push('/client');
    }
  };

  const handleLogout = async () => {
  setLoading(true);

  await supabase.auth.signOut();

  localStorage.removeItem('app_role');
  setAccountOpen(false);
  setSupportOpen(false);
  setLogoutConfirmOpen(false);

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
    <main className="fixed inset-0 h-[100dvh] w-screen min-w-full overflow-hidden text-white" style={{ background: LOGIN_BG }}>
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.34),transparent_30%),radial-gradient(circle_at_90%_18%,rgba(255,255,255,0.22),transparent_26%)]" />
        <div className="absolute -left-24 top-28 h-72 w-72 rounded-full bg-white/18 blur-3xl" />
        <div className="absolute -right-24 bottom-20 h-72 w-72 rounded-full bg-[#0c6b70]/18 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex h-full w-full max-w-[430px] flex-col px-4 py-3">
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[30px] border border-white/35 bg-white/8 px-4 pb-4 pt-3 text-center shadow-[0_26px_80px_rgba(8,15,52,0.12)] backdrop-blur-2xl"
        >
          <img
            src="/logo-manosya.png"
            alt="ManosYA"
            className="mx-auto h-[clamp(38px,7dvh,62px)] w-auto object-contain"
          />

                    <div className="relative mx-auto mt-1 h-[clamp(92px,21dvh,158px)] w-[clamp(92px,21dvh,158px)] shrink-0">
            <div className="absolute inset-8 rounded-full bg-white/28 blur-3xl" />
            <img
              src="/ROGER OK.png"
              alt="Roger ManosYA"
              className="relative z-10 h-full w-full object-contain drop-shadow-[0_24px_35px_rgba(8,15,52,0.20)]"
            />
          </div>

          <h1 className="mx-auto mt-1 max-w-[12ch] text-[clamp(2rem,6dvh,2.9rem)] font-black leading-[0.92] tracking-normal text-white [text-wrap:balance]">
            ¿Cómo querés entrar?
          </h1>

          <p className="mx-auto mt-2 max-w-[300px] text-[clamp(0.78rem,2dvh,0.95rem)] font-bold leading-tight text-white/88">
            Elegí una opción y seguimos al toque.
          </p>

          <div className="mt-4 grid min-h-0 flex-1 gap-2.5">
            {ROLE_OPTIONS.map((option) => {
              const Icon = option.icon;

              return (
                <button
                  key={option.role}
                  type="button"
                  onClick={() => handleSelectRole(option.role)}
                  className={[
                    'flex min-h-0 items-center gap-3 rounded-[26px] border border-white/32 px-4 py-3 text-left text-white shadow-[0_16px_34px_rgba(8,15,52,0.10)] backdrop-blur-xl transition active:scale-[0.985]',
                    option.tone,
                  ].join(' ')}
                >
                  <div className="flex h-[clamp(46px,8.8dvh,58px)] w-[clamp(46px,8.8dvh,58px)] shrink-0 items-center justify-center rounded-[20px] bg-white/14 text-white ring-1 ring-white/25">
                    <Icon className="h-6 w-6" strokeWidth={1.9} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[clamp(1rem,2.9dvh,1.35rem)] font-black leading-tight">
                      {option.title}
                    </div>
                    <div className="mt-0.5 truncate text-[clamp(0.72rem,1.8dvh,0.86rem)] font-bold text-white/76">
                      {option.subtitle}
                    </div>
                  </div>

                  <ArrowRight className="h-5 w-5 shrink-0 text-white/78" strokeWidth={2} />
                </button>
              );
            })}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
  <button
    type="button"
    onClick={() => setAccountOpen(true)}
    className="flex h-12 items-center justify-center gap-2 rounded-[18px] border border-white/30 bg-white/12 text-white backdrop-blur-xl transition active:scale-95"
    aria-label="Abrir cuenta"
  >
    <Settings className="h-5 w-5" strokeWidth={1.9} />
    <span className="text-xs font-black">Cuenta</span>
  </button>

  <button
    type="button"
    onClick={() => setSupportOpen(true)}
    className="flex h-12 items-center justify-center gap-2 rounded-[18px] border border-white/30 bg-white/12 text-white backdrop-blur-xl transition active:scale-95"
    aria-label="Soporte ManosYA"
  >
    <Phone className="h-5 w-5" strokeWidth={1.9} />
    <span className="text-xs font-black">Soporte</span>
  </button>
</div>

          <div className="mt-2 text-[10px] font-bold text-white/58">
            ManosYA • Tu ayuda al instante
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
  {accountOpen ? (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-[#06182a]/54 px-4 pb-4 backdrop-blur-md">
      <motion.section
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-[420px] rounded-[30px] border border-white/24 bg-[#69c4c0] p-4 text-white shadow-[0_30px_80px_rgba(0,0,0,0.26)]"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.14em] text-white/64">
              Cuenta ManosYA
            </div>
            <div className="mt-1 text-2xl font-black leading-tight">Tu acceso</div>
          </div>

          <button
            type="button"
            onClick={() => {
              setAccountOpen(false);
              setLogoutConfirmOpen(false);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/12 text-white"
            aria-label="Cerrar cuenta"
          >
            <X className="h-5 w-5" strokeWidth={2.1} />
          </button>
        </div>

        <div className="mt-4 grid gap-2">
          <button
            type="button"
            onClick={() => router.push('/settings/account')}
            className="flex items-center gap-3 rounded-[20px] border border-white/26 bg-white/12 px-4 py-3 text-left text-[13px] font-black text-white active:scale-[0.98]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/14 text-white">
              <UserRound className="h-4 w-4" strokeWidth={1.9} />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block leading-tight">Editar perfil</span>
              <span className="mt-0.5 block text-[11px] font-bold text-white/68">
                Datos, cuenta y preferencias
              </span>
            </span>

            <ArrowRight className="h-4 w-4 shrink-0 text-white/72" strokeWidth={2} />
          </button>

          <button
            type="button"
            onClick={() => {
              setAccountOpen(false);
              setSupportOpen(true);
            }}
            className="flex items-center gap-3 rounded-[20px] border border-white/26 bg-white/12 px-4 py-3 text-left text-[13px] font-black text-white active:scale-[0.98]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/14 text-white">
              <HelpCircle className="h-4 w-4" strokeWidth={1.9} />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block leading-tight">Ayuda y soporte</span>
              <span className="mt-0.5 block text-[11px] font-bold text-white/68">
                Contactar al equipo ManosYA
              </span>
            </span>

            <ArrowRight className="h-4 w-4 shrink-0 text-white/72" strokeWidth={2} />
          </button>
        </div>

        <div className="mt-4 rounded-[24px] border border-white/20 bg-white/10 p-3 text-left">
          <div className="text-[11px] font-black uppercase tracking-[0.12em] text-white/58">
            Sesión
          </div>

          <button
            type="button"
            onClick={() => setLogoutConfirmOpen(true)}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-[18px] border border-red-200/70 bg-red-600 px-4 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(220,38,38,0.22)] active:scale-[0.98]"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.9} />
            Cerrar sesión
          </button>
        </div>
      </motion.section>
    </div>
  ) : null}

  {supportOpen ? (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-[#06182a]/54 px-4 pb-4 backdrop-blur-md">
      <motion.section
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-[420px] rounded-[30px] border border-white/24 bg-[#69c4c0] p-4 text-white shadow-[0_30px_80px_rgba(0,0,0,0.26)]"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.14em] text-white/64">
              Soporte ManosYA
            </div>
            <div className="mt-1 text-2xl font-black leading-tight">Estamos cerca</div>
          </div>

          <button
            type="button"
            onClick={() => setSupportOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/12 text-white"
            aria-label="Cerrar soporte"
          >
            <X className="h-5 w-5" strokeWidth={2.1} />
          </button>
        </div>

        <div className="mt-4 grid gap-2">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="flex items-center gap-3 rounded-[20px] border border-white/26 bg-white/12 px-4 py-3 text-[13px] font-black text-white active:scale-[0.98]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/14 text-white">
              <Mail className="h-4 w-4" strokeWidth={1.9} />
            </span>
            <span className="min-w-0 truncate">{SUPPORT_EMAIL}</span>
          </a>

          <a
            href={`tel:${SUPPORT_PHONE_TEL}`}
            className="flex items-center gap-3 rounded-[20px] border border-white/26 bg-white/12 px-4 py-3 text-[13px] font-black text-white active:scale-[0.98]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/14 text-white">
              <Phone className="h-4 w-4" strokeWidth={1.9} />
            </span>
            <span>{SUPPORT_PHONE_LABEL}</span>
          </a>

          <a
            href={`tel:${HELP_CENTER_PHONE_TEL}`}
            className="flex items-center gap-3 rounded-[20px] border border-white/26 bg-white/12 px-4 py-3 text-[13px] font-black text-white active:scale-[0.98]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/14 text-white">
              <Phone className="h-4 w-4" strokeWidth={1.9} />
            </span>
            <span className="min-w-0">Centro de ayuda: {HELP_CENTER_PHONE_LABEL}</span>
          </a>
        </div>
      </motion.section>
    </div>
  ) : null}

  {logoutConfirmOpen ? (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#06182a]/62 px-5 backdrop-blur-md">
      <motion.section
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.96 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-[360px] rounded-[28px] border border-white/24 bg-white p-5 text-center text-[#06182a] shadow-[0_30px_80px_rgba(0,0,0,0.28)]"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <LogOut className="h-5 w-5" strokeWidth={2.1} />
        </div>

        <h2 className="mt-3 text-xl font-black leading-tight">
          ¿Cerrar sesión?
        </h2>

        <p className="mx-auto mt-2 max-w-[260px] text-sm font-bold leading-snug text-slate-500">
          Vas a salir de tu cuenta. Podés volver a entrar cuando quieras.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setLogoutConfirmOpen(false)}
            className="h-12 rounded-[18px] border border-slate-200 bg-slate-50 text-sm font-black text-slate-700 active:scale-[0.98]"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="h-12 rounded-[18px] bg-red-600 text-sm font-black text-white shadow-[0_14px_28px_rgba(220,38,38,0.22)] active:scale-[0.98]"
          >
            Sí, salir
          </button>
        </div>
      </motion.section>
    </div>
  ) : null}
</AnimatePresence>
    </main>
  );
}
