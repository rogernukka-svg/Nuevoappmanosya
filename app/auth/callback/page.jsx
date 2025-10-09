'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // 🔹 Forzar actualización de sesión (por si viene desde OAuth)
        await supabase.auth.refreshSession();

        // 🔹 Obtener sesión actual
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const session = data?.session;
        if (!session) {
          console.warn('⚠️ No hay sesión activa, redirigiendo al login');
          router.replace('/login');
          return;
        }

        const user = session.user;
        console.log('✅ Usuario autenticado:', user.email);

        // 🔹 Buscar el perfil del usuario
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        // 🔹 Si el usuario es trabajador, asegurar perfil worker
        if (profile?.role === 'worker') {
          try {
            const { error: rpcError } = await supabase.rpc('ensure_worker_profile');
            if (rpcError) console.warn('No se pudo crear/verificar worker_profile:', rpcError.message);
          } catch (e) {
            console.error('Error ejecutando ensure_worker_profile:', e.message);
          }
        }

        // 🔀 Redirección según rol
        switch (profile?.role) {
          case 'worker':
            router.replace('/worker/dashboard');
            break;
          case 'client':
            router.replace('/client/dashboard');
            break;
          default:
            router.replace('/');
            break;
        }
      } catch (err) {
        console.error('❌ Error en AuthCallback:', err.message);
        router.replace('/login');
      }
    };

    handleAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      Procesando inicio de sesión…
    </div>
  );
}
