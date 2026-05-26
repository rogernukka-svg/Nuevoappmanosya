"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { redirectToRole } from "@/lib/roleRedirect";

export default function AuthCallback() {
  const router = useRouter();
  const supabase = getSupabase();

  useEffect(() => {
    async function handleCallback() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Error obteniendo sesion:", error);
          router.push("/auth/login");
          return;
        }

        const user = data?.session?.user;

        if (user) {
          await redirectToRole({ supabase, router, userId: user.id });
          return;
        }

        router.push("/auth/login");
      } catch (err) {
        console.error("Error en AuthCallback:", err);
        router.push("/auth/login");
      }
    }

    handleCallback();
  }, [router, supabase]);

  return (
    <div className="flex min-h-screen items-center justify-center text-emerald-600">
      Procesando acceso...
    </div>
  );
}
