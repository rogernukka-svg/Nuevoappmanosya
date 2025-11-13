'use client';

import { createBrowserClient } from '@supabase/ssr';

let supabaseInstance = null;

/**
 * ✅ Cliente Supabase — versión completa para Next.js App Router
 * - Sesión persistente y refresco automático
 * - Compatible con SSR/CSR sin errores
 * - Realtime WebSocket activado para chat, jobs, etc.
 */
export function getSupabase() {
  if (supabaseInstance) return supabaseInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    console.error('❌ Faltan variables de entorno de Supabase.');
    throw new Error('Variables de entorno Supabase no configuradas.');
  }

  // ⚡ Cliente con soporte completo de autenticación + Realtime
  supabaseInstance = createBrowserClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10, // permite hasta 10 eventos por segundo
      },
    },
    global: {
      headers: {
        'x-client-info': 'manosya-app', // identifica tu app en el backend
      },
    },
  });

  console.log('✅ Supabase (browser client) inicializado en', url);
  return supabaseInstance;
}

/**
 * 📌 Exporto también una constante `supabase`
 * para que tus páginas NO rompan:
 *
 * import { supabase } from '@/lib/supabase'
 */
export const supabase = getSupabase();
