// 📦 lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

// === ⚙️ VARIABLES DE ENTORNO ===
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const realtimeUrl = process.env.NEXT_PUBLIC_SUPABASE_REALTIME_URL; // opcional
const clientTag = process.env.NEXT_PUBLIC_CLIENT_TAG || "manosya-pwa";

// === 🧩 VALIDACIÓN DE CONFIGURACIÓN ===
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("❌ Faltan variables NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en el .env.local");
}

// === 🚀 CREACIÓN ÚNICA DEL CLIENTE (Singleton Pattern) ===
function createSupabaseSingleton() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,    // ✅ Mantiene sesión local
      autoRefreshToken: true,  // ✅ Renueva tokens automáticamente
      detectSessionInUrl: true // ✅ Requerido para OAuth
    },
    realtime: {
      // ✅ Conexión WebSocket segura (wss://)
      url: realtimeUrl || `${supabaseUrl.replace("https://", "wss://")}/realtime/v1`,
      params: {
        eventsPerSecond: 10, // Límite seguro para estabilidad
      },
    },
    global: {
      headers: {
        "x-client-info": clientTag, // Identificador de cliente para logs
      },
    },
  });
}

// ✅ Singleton global — evita múltiples instancias de GoTrueClient
export const supabase =
  globalThis.__supabase__ || (globalThis.__supabase__ = createSupabaseSingleton());
