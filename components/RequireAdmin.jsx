'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function RequireAdmin({ children }) {
  const [ok, setOk] = useState(null); // null=loading, true=admin, false=no
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) return setOk(false);
      const { data: p } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', uid)
        .maybeSingle();
      setOk(p?.role === 'admin');
    })();
  }, []);
  if (ok === null) return <div className="container"><div className="card p-5 mt-6">Cargando…</div></div>;
  if (!ok) return <div className="container"><div className="card p-5 mt-6">Acceso restringido.</div></div>;
  return children;
}