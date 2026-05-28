'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function RequireAdminOrCashier({ children }) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/auth/login'; return; }
      const { data: p } = await supabase.from('profiles').select('role, admin_role').eq('id', user.id).maybeSingle();
      if (
        p?.role === 'admin' ||
        p?.role === 'cashier' ||
        ['admin', 'superadmin', 'cashier'].includes(p?.admin_role || '')
      ) setOk(true);
      else window.location.href = '/';
    }
    check();
  }, []);
  if (!ok) return <div className="max-w-5xl mx-auto p-6">Cargando...</div>;
  return children;
}
