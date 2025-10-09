'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function RequireAdminOrCashier({ children }) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (p?.role === 'admin' || p?.role === 'cashier') setOk(true);
      else window.location.href = '/';
    }
    check();
  }, []);
  if (!ok) return <div className="max-w-5xl mx-auto p-6">Cargando...</div>;
  return children;
}