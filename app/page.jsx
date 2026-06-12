'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getSupabase } from '@/lib/supabase';
import { motion, useReducedMotion } from 'framer-motion';
import { redirectToRole } from '@/lib/roleRedirect';

const supabase = getSupabase();

export default function RootPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    let alive = true;

    async function init() {
      try {
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise((resolve) => setTimeout(() => resolve(null), 1200)),
        ]);

        const user = sessionResult?.data?.session?.user || null;

        await new Promise((r) => setTimeout(r, 950));
        if (!alive) return;

        if (!user) {
          router.replace('/auth/login');
          return;
        }

        await redirectToRole({
          supabase,
          router,
          userId: user.id,
          fallbackRole:
            typeof window !== 'undefined'
              ? localStorage.getItem('app_role')
              : '',
        });
      } catch (error) {
        console.error('Root init error:', error);

        if (!alive) return;
        router.replace('/auth/login');
      }
    }

    init();

    return () => {
      alive = false;
    };
  }, [router]);

  return (
    <main
      className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-6"
      style={{
        background:
          'radial-gradient(circle at 50% 34%, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.09) 27%, rgba(98,196,191,0) 62%), #62c4bf',
      }}
    >
      {/* Capa de profundidad premium */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: reduceMotion ? 0 : 1.2,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.02) 48%, rgba(5,52,58,0.10) 100%)',
        }}
      />

      {/* 26 premium visible */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, y: 14, scale: 0.985 }}
        animate={{
          opacity: 0.135,
          y: reduceMotion ? 0 : [0, -2, 0],
          scale: reduceMotion ? 1 : [1, 1.004, 1],
        }}
        transition={{
          opacity: {
            duration: reduceMotion ? 0 : 1.1,
            ease: [0.16, 1, 0.3, 1],
          },
          y: {
            duration: 8.5,
            repeat: Infinity,
            ease: 'easeInOut',
          },
          scale: {
            duration: 8.5,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        }}
        className="pointer-events-none absolute left-1/2 top-[25%] select-none font-black leading-none tracking-[-0.105em] text-white"
        style={{
          fontSize: 'min(50vw, 282px)',
          transform: 'translateX(-50%)',
          textShadow: '0 24px 80px rgba(4,48,53,0.08)',
        }}
      >
        26
      </motion.div>

      {/* Línea fina detrás */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, scaleX: 0.18 }}
        animate={{ opacity: 0.28, scaleX: 1 }}
        transition={{
          duration: reduceMotion ? 0 : 1.15,
          delay: reduceMotion ? 0 : 0.26,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="absolute top-[39%] h-px w-[58vw] max-w-[304px] origin-center rounded-full bg-white/60"
      />

      {/* Halo general */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{
          opacity: reduceMotion ? 0.22 : [0.18, 0.24, 0.18],
          scale: reduceMotion ? 1 : [1, 1.025, 1],
        }}
        transition={{
          duration: 7.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute left-1/2 top-[34%] h-72 w-72 -translate-x-1/2 rounded-full bg-white/16 blur-3xl"
      />

      {/* Contenido central */}
      <section className="relative z-10 flex w-full max-w-[430px] flex-col items-center justify-center text-center">
        {/* Copa principal */}
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
            scale: 0.965,
            filter: 'blur(10px)',
          }}
          animate={{
            opacity: 1,
            y: reduceMotion ? 0 : [0, -3, 0],
            scale: reduceMotion ? 1 : [1, 1.006, 1],
            filter: 'blur(0px)',
          }}
          transition={{
            opacity: {
              duration: reduceMotion ? 0 : 0.95,
              ease: [0.16, 1, 0.3, 1],
            },
            filter: {
              duration: reduceMotion ? 0 : 0.95,
              ease: [0.16, 1, 0.3, 1],
            },
            y: {
              duration: 6.8,
              repeat: Infinity,
              ease: 'easeInOut',
            },
            scale: {
              duration: 6.8,
              repeat: Infinity,
              ease: 'easeInOut',
            },
          }}
          className="relative mb-10 mt-3 flex h-[205px] w-full items-center justify-center"
        >
          {/* Sombra premium */}
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0, scaleX: 0.4 }}
            animate={{
              opacity: reduceMotion ? 0.28 : [0.22, 0.31, 0.22],
              scaleX: reduceMotion ? 1 : [0.92, 1.04, 0.92],
            }}
            transition={{
              duration: 6.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute bottom-5 h-5 w-36 origin-center rounded-full bg-[#063640]/20 blur-xl"
          />

          <Image
            src="/manosya-copa.png"
            alt="Copa ManosYA"
            width={420}
            height={420}
            priority
            className="relative z-10 h-[176px] w-auto select-none object-contain drop-shadow-[0_30px_56px_rgba(4,48,53,0.24)]"
            draggable={false}
          />

          {/* Reflejo premium */}
          {!reduceMotion ? (
            <motion.span
              aria-hidden="true"
              initial={{ x: '-150%', opacity: 0 }}
              animate={{ x: '155%', opacity: [0, 0.28, 0] }}
              transition={{
                duration: 1.9,
                delay: 1.05,
                repeat: Infinity,
                repeatDelay: 5.8,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="absolute z-20 h-[158px] w-7 rotate-12 rounded-full blur-[2px]"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(255,255,255,0.52), transparent)',
              }}
            />
          ) : null}
        </motion.div>

        {/* Logo */}
        <motion.div
          initial={{
            opacity: 0,
            y: 18,
            scale: 0.985,
            filter: 'blur(8px)',
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
            filter: 'blur(0px)',
          }}
          transition={{
            duration: reduceMotion ? 0 : 0.95,
            delay: reduceMotion ? 0 : 0.18,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="select-none"
          aria-label="ManosYA"
        >
          <h1 className="text-[50px] font-black leading-none tracking-[-0.06em] sm:text-[58px]">
            <span className="text-[#072D42]">Manos</span>
            <span className="text-white">YA</span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 8, filter: 'blur(5px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{
              duration: reduceMotion ? 0 : 0.75,
              delay: reduceMotion ? 0 : 0.62,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="mt-4 text-[15px] font-extrabold leading-none text-white/88 drop-shadow-[0_8px_18px_rgba(4,48,53,0.10)]"
          >
            Donde hay garra, hay solución
          </motion.p>
        </motion.div>

        {/* Loader discreto */}
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0, scaleX: 0.4 }}
          animate={{
            opacity: 0.78,
            scaleX: reduceMotion ? 1 : [0.82, 1, 0.82],
          }}
          transition={{
            opacity: {
              duration: reduceMotion ? 0 : 0.7,
              delay: reduceMotion ? 0 : 0.78,
            },
            scaleX: {
              duration: 2.6,
              repeat: Infinity,
              ease: 'easeInOut',
            },
          }}
          className="mt-7 h-[3px] w-20 origin-center rounded-full bg-white/72 shadow-[0_10px_24px_rgba(255,255,255,0.18)]"
        />
      </section>

      {/* Borde interno suave */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: reduceMotion ? 0 : 1.15,
          delay: reduceMotion ? 0 : 0.2,
        }}
        className="pointer-events-none absolute inset-2 rounded-[28px] border border-white/22"
      />

      {/* Viñeta baja */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0a7472]/14 to-transparent" />
    </main>
  );
}