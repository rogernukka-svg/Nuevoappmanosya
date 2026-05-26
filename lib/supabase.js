'use client';

import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

let supabaseInstance = null;

export function getSupabase() {
  if (supabaseInstance) return supabaseInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    console.error('Faltan variables de entorno de Supabase.');
    throw new Error('Variables de entorno Supabase no configuradas.');
  }

  const commonOptions = {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    global: {
      headers: {
        'x-client-info': 'manosya-app',
      },
    },
  };

  if (typeof window === 'undefined') {
    supabaseInstance = createClient(url, anon, {
      ...commonOptions,
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    return supabaseInstance;
  }

  supabaseInstance = createBrowserClient(url, anon, {
    ...commonOptions,
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseInstance;
}

export const supabase = getSupabase();
