'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Nav() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isWorker, setIsWorker] = useState(false);
  const [loadingWorker, setLoadingWorker] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let unsub = null;

    async function load() {
      const { data } = await supabase.auth.getUser();
      const u = data?.user ?? null;
      setUser(u);

      if (u?.id) {
        // 🔹 Revisar si tiene perfil worker activo
        setLoadingWorker(true);
        const { data: wp, error } = await supabase
          .from('worker_profiles')
          .select('user_id, is_active')
          .eq('user_id', u.id)
          .maybeSingle();

        setIsWorker(!error && wp?.is_active);
        setLoadingWorker(false);

        // 🔹 Revisar rol admin
        const { data: p } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', u.id)
          .maybeSingle();

        setIsAdmin(p?.role === 'admin' || u?.email === 'isaacminho6@gmail.com');
      } else {
        setIsWorker(false);
        setIsAdmin(false);
        setLoadingWorker(false);
      }
    }

    load();

    const sub = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user?.id) load();
    });

    unsub = sub?.data?.subscription;
    return () => {
      try {
        unsub?.unsubscribe?.();
      } catch {}
    };
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <header className="bg-black text-white border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-6">
        
        {/* ✅ Logo que lleva SIEMPRE al selector de rol */}
        <button
          onClick={() => {
            router.push('/role-selector');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-1 font-heading font-extrabold text-xl hover:opacity-90 transition"
        >
          <span>Manos</span>
          <span className="text-[var(--accent)]">YA</span>
        </button>

        {/* Navegación */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {/* 🔹 Cliente */}
          <Link href="/client" className="hover:text-[var(--accent)]">Inicio Cliente</Link>
          <Link href="/map" className="hover:text-[var(--accent)]">Buscar Profesionales</Link>
          <Link href="/client/new" className="hover:text-[var(--accent)]">Publicar Trabajo</Link>
          <Link href="/client/jobs" className="hover:text-[var(--accent)]">Mis Pedidos</Link>
          <Link href="/perfil" className="hover:text-[var(--accent)]">Perfil</Link>

          {/* 🔹 Trabajador */}
          {user && !loadingWorker && (
            isWorker ? (
              <>
                <Link href="/worker" className="hover:text-[var(--accent)]">Panel Worker</Link>
                <Link href="/worker/nearby" className="hover:text-[var(--accent)]">Trabajos Cercanos</Link>
                <Link href="/worker/jobs" className="hover:text-[var(--accent)]">Mis Trabajos</Link>
              </>
            ) : (
              <Link href="/worker/onboard" className="hover:text-[var(--accent)]">
                Activar Perfil Worker
              </Link>
            )
          )}

          {/* 🔹 Admin */}
          {isAdmin && (
            <Link href="/admin" className="text-emerald-400 font-bold hover:text-white">
              ⚙️ Admin
            </Link>
          )}
        </nav>

        {/* Usuario */}
        <div className="flex items-center gap-3">
          {user && (
            <span className="hidden sm:block text-xs md:text-sm text-white/60 truncate max-w-[120px]">
              {user.email}
            </span>
          )}
          {user ? (
            <button
              onClick={logout}
              className="bg-[var(--accent)] text-black px-3 py-1.5 rounded-md font-semibold hover:bg-white hover:text-black"
            >
              Salir
            </button>
          ) : (
            <Link
              href="/login"
              className="bg-[var(--accent)] text-black px-3 py-1.5 rounded-md font-semibold hover:bg-white hover:text-black"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}