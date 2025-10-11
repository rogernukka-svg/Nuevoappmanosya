'use client';

import { createBrowserClient } from '@supabase/ssr';

let supabase = null;

/**
 * ✅ Cliente Supabase — versión oficial para Next.js App Router
 * - Maneja localStorage automáticamente
 * - Funciona en SSR y CSR sin parches
 * - Corrige la pérdida de sesión y los problemas de redirección
 */
export function getSupabase() {
  if (supabase) return supabase;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    console.error('❌ Faltan variables de entorno de Supabase.');
    throw new Error('Variables de entorno Supabase no configuradas.');
  }

  // ⚡ Cliente moderno con soporte de sesión persistente automático
  supabase = createBrowserClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  console.log('✅ Supabase (browser client) inicializado en', url);
  return supabase;
}
