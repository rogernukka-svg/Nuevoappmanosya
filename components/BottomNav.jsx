'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Home, ClipboardList, User, Briefcase } from 'lucide-react';

export default function BottomNav() {
  const [user, setUser] = useState(null);
  const [isWorker, setIsWorker] = useState(false);
  const [loadingWorker, setLoadingWorker] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      const u = data?.user ?? null;
      setUser(u);

      if (u?.id) {
        const { data: wp, error } = await supabase
          .from('worker_profiles')
          .select('is_active')
          .eq('user_id', u.id)
          .maybeSingle();

        if (!error && wp?.is_active) setIsWorker(true);
        else setIsWorker(false);
      } else {
        setIsWorker(false);
      }
      setLoadingWorker(false);
    }
    load();
  }, []);

  if (loadingWorker) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 grid grid-cols-4 text-center text-xs z-50">
      {/* Cliente */}
      {!isWorker && (
        <>
          <Link href="/" className="flex flex-col items-center py-2 hover:text-[var(--accent)]">
            <Home className="w-5 h-5" />
            <span>Inicio</span>
          </Link>
          <Link href="/map" className="flex flex-col items-center py-2 hover:text-[var(--accent)]">
            <Briefcase className="w-5 h-5" />
            <span>Pro</span>
          </Link>
          <Link href="/job" className="flex flex-col items-center py-2 hover:text-[var(--accent)]">
            <ClipboardList className="w-5 h-5" />
            <span>Pedidos</span>
          </Link>
          <Link href="/perfil" className="flex flex-col items-center py-2 hover:text-[var(--accent)]">
            <User className="w-5 h-5" />
            <span>Perfil</span>
          </Link>
        </>
      )}

      {/* Worker */}
      {isWorker && (
        <>
          <Link href="/worker" className="flex flex-col items-center py-2 hover:text-[var(--accent)]">
            <Home className="w-5 h-5" />
            <span>Inicio</span>
          </Link>
          <Link href="/worker/nearby" className="flex flex-col items-center py-2 hover:text-[var(--accent)]">
            <Briefcase className="w-5 h-5" />
            <span>Cerca</span>
          </Link>
          <Link href="/worker/jobs" className="flex flex-col items-center py-2 hover:text-[var(--accent)]">
            <ClipboardList className="w-5 h-5" />
            <span>Mis Trabajos</span>
          </Link>
          <Link href="/worker/profile" className="flex flex-col items-center py-2 hover:text-[var(--accent)]">
            <User className="w-5 h-5" />
            <span>Perfil</span>
          </Link>
        </>
      )}
    </nav>
  );
}
