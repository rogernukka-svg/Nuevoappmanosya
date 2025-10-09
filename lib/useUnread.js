'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useUnread() {
  const [total, setTotal] = useState(0);
  const [perJob, setPerJob] = useState({}); // { [job_id]: { unread, last_message, last_message_at } }
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // per job
      const { data: rows, error } = await supabase
        .from('v_job_unread')
        .select('*');
      if (error) throw error;

      const map = {};
      (rows || []).forEach(r => {
        map[r.job_id] = {
          unread: r.unread || 0,
          last_message: r.last_message || null,
          last_message_at: r.last_message_at || null,
        };
      });
      setPerJob(map);

      // total
      const { data: t, error: e2 } = await supabase.rpc('unread_total');
      if (e2) throw e2;
      setTotal(t || 0);
    } finally {
      setLoading(false);
    }
  }, []);

  // inicial + realtime
  useEffect(() => {
    refresh();
    const ch = supabase
      .channel('unread-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'job_messages' },
        () => refresh()
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [refresh]);

  // marcar leído un pedido
  const markRead = useCallback(async (jobId) => {
    await supabase.rpc('mark_job_read', { p_job_id: jobId });
    // refrescamos rápido
    refresh();
  }, [refresh]);

  return { total, perJob, loading, refresh, markRead };
}
