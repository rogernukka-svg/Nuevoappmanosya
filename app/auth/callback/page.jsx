"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase"; // ✔ corregido el import

export default function AuthCallback() {
  const router = useRouter();
  const supabase = getSupabase();

  useEffect(() => {
    async function handleCallback() {
      try {
        // Obtener sesión desde Supabase
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Error obteniendo sesión:", error);
          router.push("/login"); // ✔ ruta corregida
          return;
        }

        const session = data?.session;

        // Si hay usuario, redirige
        if (session?.user) {
          router.push("/role-selector");
        } else {
          router.push("/login"); // ✔ ruta corregida
        }
      } catch (err) {
        console.error("Error en AuthCallback:", err);
        router.push("/login"); // ✔ ruta corregida
      }
    }

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-emerald-600">
      Procesando acceso...
    </div>
  );
}
