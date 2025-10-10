'use client';
import { createBrowserClient } from '@supabase/ssr';

/**
 * ⚡ Cliente Supabase — versión compatible con App Router (Next.js 13/14+)
 * ✅ Funciona igual en local y en Vercel
 */

let supabase = null;

export function getSupabase() {
  if (supabase) return supabase;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('❌ Faltan variables de entorno de Supabase.');
    throw new Error('Variables de entorno Supabase no configuradas.');
  }

  supabase = createBrowserClient(url, key);

  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Supabase (browser client) inicializado correctamente.');
  }

  return supabase;
}

export default getSupabase;
