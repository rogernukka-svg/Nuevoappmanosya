// app/driver/pending/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '../../../lib/supabase';
import { Loader2, ShieldCheck } from 'lucide-react';

type Status = 'pending' | 'rejected' | 'unknown';

export default function DriverPendingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status>('pending');

  useEffect(() => {
    let t: ReturnType<typeof setInterval> | null = null;
    let alive = true;

    const supabase = getSupabase(); // ✅ crear cliente solo en client component

    const run = async () => {
      const { data } = await supabase.auth.getUser();
      const u = data?.user;

      if (!u) {
        router.replace('/auth/login');
        return;
      }

      const check = async () => {
        const { data: dp, error } = await supabase
          .from('driver_profiles')
          .select('driver_verified, status')
          .eq('user_id', u.id)
          .maybeSingle();

        if (!alive) return;

        if (error || !dp) {
          setStatus('unknown');
          setLoading(false);
          return;
        }

        // ✅ si ya está verificado → adentro
        if (dp.driver_verified === true) {
          router.replace('/driver/requests');
          return;
        }

        // ✅ no inventamos valores (tu status tiene constraint)
        const s = String(dp.status || '').toLowerCase();
        if (s.includes('reject') || s.includes('deny')) setStatus('rejected');
        else setStatus('pending');

        setLoading(false);
      };

      await check();
      t = setInterval(check, 4000);
    };

    run();

    return () => {
      alive = false;
      if (t) clearInterval(t);
    };
  }, [router]);

  return (
    <div className="min-h-[100svh] flex items-center justify-center bg-[#0b0f16] text-white px-6">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-6 text-center">
        {loading ? (
          <div className="flex items-center justify-center gap-2 text-white/80">
            <Loader2 className="animate-spin w-5 h-5" />
            Verificando estado...
          </div>
        ) : status === 'rejected' ? (
          <>
            <div className="text-xl font-extrabold">🚫 Solicitud rechazada</div>
            <p className="text-white/70 text-sm mt-2">
              Tu documentación fue rechazada. Volvé al onboarding para corregir y reenviar.
            </p>

            <button
              className="mt-5 w-full py-3 rounded-2xl bg-white text-black font-extrabold hover:bg-white/90"
              onClick={() => router.push('/driver/onboard')}
            >
              Volver a completar
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2 text-amber-200">
              <ShieldCheck className="w-6 h-6" />
              <div className="text-xl font-extrabold">En verificación</div>
            </div>

            <p className="text-white/70 text-sm mt-2">
              Ya recibimos tus documentos. Un admin los revisa y te habilita.
            </p>

            <button
              className="mt-5 w-full py-3 rounded-2xl bg-white/10 border border-white/15 font-bold hover:bg-white/15"
              onClick={() => router.push('/driver/requests')}
            >
              Ir a notificaciones / pedidos
            </button>
          </>
        )}
      </div>
    </div>
  );
}
