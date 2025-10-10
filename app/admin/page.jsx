'use client';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const supabase = getSupabase();

export default function RequireAdmin({ children }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        console.log('🔍 Usuario actual (RequireAdmin):', data, error);

        const user = data?.user;
        if (!user) {
          console.warn('🚫 No hay sesión activa. Redirigiendo al login...');
          router.replace('/login');
          return;
        }

        // ✅ Verificar rol desde la tabla profiles
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (profileErr) throw profileErr;

        if (profile?.role === 'admin') {
          setAllowed(true);
        } else {
          console.warn('🚫 Acceso denegado: rol =', profile?.role);
          router.replace('/');
        }
      } catch (e) {
        console.error('❌ Error en RequireAdmin:', e);
      } finally {
        setLoading(false);
      }
    };

    check();
  }, [router]);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen text-white/70">
        Cargando panel de administración…
      </div>
    );

  if (!allowed) return null;

  return <>{children}</>;
}
