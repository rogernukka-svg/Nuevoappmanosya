"use client";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";

/**
 * ⚡ Cliente Supabase — Singleton seguro
 * Compatible con App Router (Next.js 13/14+) + Vercel Edge
 */

let _supabase = null;

/**
 * ✅ Devuelve una instancia única del cliente Supabase (solo cliente)
 */
export function getSupabase() {
  // 🧱 Evitar ejecución en build/server
  if (typeof window === "undefined") {
    console.warn("⚠️ getSupabase() llamado en entorno no cliente (build o edge). Retornando stub.");
    return {
      from: () => ({
        select: async () => ({ data: null, error: null }),
        insert: async () => ({ data: null, error: null }),
        update: async () => ({ data: null, error: null }),
        delete: async () => ({ data: null, error: null }),
      }),
      rpc: async () => ({ data: null, error: null }),
      auth: {
        getUser: async () => ({ data: null, error: null }),
        getSession: async () => ({ data: null, error: null }),
      },
    };
  }

  // ♻️ Reusar instancia existente
  if (_supabase) return _supabase;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error("❌ Faltan variables de entorno de Supabase.");
    throw new Error("Variables de entorno Supabase no configuradas.");
  }

  _supabase = createPagesBrowserClient({ supabaseUrl: url, supabaseKey: key });

  if (process.env.NODE_ENV === "development") {
    console.log("✅ Supabase inicializado correctamente (instancia única).");
  }

  return _supabase;
}

/**
 * 🧩 Exportación segura
 * 👉 Usa SIEMPRE getSupabase() dentro de tus componentes o hooks
 */
export default getSupabase;