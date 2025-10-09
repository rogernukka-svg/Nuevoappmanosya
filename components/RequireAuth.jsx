'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function RequireAuth({ children }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data?.session) window.location.href = '/login';
      else setReady(true);
    });
  }, []);
  if (!ready) return <div className="max-w-5xl mx-auto p-6">Cargando...</div>;
  return children;
}
