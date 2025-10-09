'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { getSupabase } from "@/lib/supabase";

/* === Footer dinámico === */
function DynamicFooterMessage() {
  const pathname = usePathname();
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith("/client"))
      setMessage("— Conectamos clientes y profesionales 💪");
    else if (pathname.startsWith("/worker"))
      setMessage("— Impulsamos tu trabajo en cada pedido ⚙️");
    else if (pathname.startsWith("/admin"))
      setMessage("— Panel interno de gestión y monitoreo 🧠");
    else setMessage("");
  }, [pathname]);

  if (!message) return null;
  return (
    <div className="mt-1 text-emerald-600/80 text-xs font-medium animate-fadeIn">
      {message}
    </div>
  );
}

/* === Layout global con sesión persistente === */
export default function ClientRoot({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const supabase = getSupabase();

  useEffect(() => {
    setIsMounted(true);

    // 🧩 Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker
          .register("/sw.js")
          .then(() => console.log("✅ Service Worker activo"))
          .catch((err) => console.warn("⚠️ Error SW:", err));
      } else {
        navigator.serviceWorker
          .getRegistrations()
          .then((regs) => regs.forEach((r) => r.unregister()))
          .then(() => console.log("🧩 SW desactivado en modo dev"));
      }
    }

    // 🧠 Listener global de sesión Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          console.log("✅ Sesión activa:", session.user.email);
        }
        if (event === "SIGNED_OUT") {
          console.log("🚪 Sesión cerrada → redirigiendo a /login");
          router.replace("/login");
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  if (!isMounted) return null;

  // === Detectar ruta actual ===
  const isWorker = pathname?.startsWith("/worker");
  const isClient = pathname?.startsWith("/client");
  const isAdmin = pathname?.startsWith("/admin");

  // === Ocultar header en pantallas de autenticación ===
  const hideHeader =
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/register") ||
    pathname?.startsWith("/role-selector");

  const homeLink = isWorker
    ? "/worker/onboard"
    : isClient
    ? "/client"
    : isAdmin
    ? "/admin"
    : "/";

  return (
    <div
      suppressHydrationWarning
      className="
        bg-white text-gray-900 min-h-screen flex flex-col
        antialiased selection:bg-emerald-100 selection:text-emerald-700
        overflow-x-hidden overflow-y-visible relative
      "
    >
      {/* ===== FONDO ===== */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-gray-50 to-gray-100" />
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_30%_20%,rgba(20,184,166,0.08),transparent_70%)]" />
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(ellipse_at_70%_40%,rgba(59,130,246,0.05),transparent_70%)]" />
      </div>

      {/* ===== HEADER ===== */}
      {!hideHeader && (
        <header className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white/90 backdrop-blur-sm shadow-sm">
          <Link
            href={homeLink}
            className="text-[1.4rem] font-extrabold tracking-tight hover:opacity-90 transition-opacity"
          >
            <span className="text-gray-900">Manos</span>
            <span className="text-emerald-600">YA</span>
          </Link>

          {isWorker && (
            <span className="text-sm text-gray-600 font-medium">
              Modo Trabajador 🧑‍🔧
            </span>
          )}
          {isClient && (
            <span className="text-sm text-gray-600 font-medium">
              Modo Cliente 🏡
            </span>
          )}
          {isAdmin && (
            <span className="text-sm text-gray-600 font-medium">
              Modo Admin 🧠
            </span>
          )}
          {!isWorker && !isClient && !isAdmin && (
            <span className="text-xs text-gray-500 tracking-wide">
              v1.0 Beta
            </span>
          )}
        </header>
      )}

      {/* ===== MAIN ===== */}
      <main className="flex-1 relative z-10 animate-fadeIn">{children}</main>

      {/* ===== FOOTER ===== */}
      {!pathname?.startsWith("/client") &&
        !pathname?.startsWith("/worker") && (
          <footer className="bg-gray-50 text-center py-4 border-t border-gray-200 text-sm text-gray-600">
            © {new Date().getFullYear()}{" "}
            <span className="text-emerald-600 font-semibold">ManosYA</span> · Alto Paraná 🇵🇾
            <DynamicFooterMessage />
            <div className="mt-1 text-xs text-gray-500">Tu ayuda al instante ⚡</div>
          </footer>
        )}

      {/* ===== TOASTER ===== */}
      <Toaster
        position="bottom-center"
        richColors
        toastOptions={{
          style: {
            background: "#fff",
            color: "#1f2937",
            border: "1px solid rgba(0,0,0,0.05)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          },
        }}
      />
    </div>
  );
}
