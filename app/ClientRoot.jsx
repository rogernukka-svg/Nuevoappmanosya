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

    if (pathname.startsWith("/client")) {
      setMessage("— Conectamos clientes y profesionales 💪");
    } else if (pathname.startsWith("/worker")) {
      setMessage("— Impulsamos tu trabajo en cada pedido ⚙️");
    } else if (pathname.startsWith("/admin")) {
      setMessage("— Panel interno de gestión y monitoreo 🧠");
    } else {
      setMessage("");
    }
  }, [pathname]);

  if (!message) return null;

  return (
    <div className="mt-1 text-xs font-medium text-emerald-600/80 animate-fadeIn">
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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        console.log("🟢 Sesión activa:", session.user.email);

        try {
          const { registerPushSubscription } = await import("@/lib/pushSubscription");
          await registerPushSubscription(session.user.id);
          console.log("🔔 Push subscription registrada");
        } catch (err) {
          console.warn("⚠ No se pudo registrar push subscription:", err);
        }
      }

      if (event === "SIGNED_OUT") {
        console.log("🚪 Sesión cerrada → redirigiendo a /auth/login");
        router.replace("/auth/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  if (!isMounted) return null;

  // === Detectar ruta actual ===
  const isWorker = pathname?.startsWith("/worker");
  const isClient = pathname?.startsWith("/client");
  const isAdmin = pathname?.startsWith("/admin");

  // === Ocultar header en auth y cliente ===
  const hideHeader =
    pathname?.startsWith("/auth") ||
    pathname?.startsWith("/role-selector") ||
    pathname?.startsWith("/client");

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
        relative flex min-h-screen flex-col overflow-x-hidden overflow-y-visible
        bg-slate-50 text-slate-900 antialiased
        selection:bg-emerald-100 selection:text-emerald-700
      "
    >
      {/* ===== FONDO ===== */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#ffffff,#f8fafc,#f1f5f9)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(20,184,166,0.09),transparent_70%)] opacity-50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,rgba(59,130,246,0.05),transparent_70%)] opacity-40" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(15,23,42,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.08) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />
      </div>

      {/* ===== HEADER ===== */}
      {!hideHeader && (
        <header className="sticky top-0 z-40 border-b border-white/70 bg-white/80 backdrop-blur-xl shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4">
            <Link
              href={homeLink}
              className="text-[1.4rem] font-extrabold tracking-tight transition-opacity hover:opacity-90"
            >
              <span className="text-slate-900">Manos</span>
              <span className="text-emerald-600">YA</span>
            </Link>
          </div>
        </header>
      )}

      {/* ===== MAIN ===== */}
      <main className="relative z-10 flex-1 animate-fadeIn">{children}</main>

      {/* ===== FOOTER ===== */}
      {!pathname?.startsWith("/client") && !pathname?.startsWith("/worker") && (
        <footer className="border-t border-white/70 bg-white/70 py-4 text-center text-sm text-slate-600 backdrop-blur-md">
          © {new Date().getFullYear()}{" "}
          <span className="font-semibold text-emerald-600">ManosYA</span> · Alto Paraná 🇵🇾
          <DynamicFooterMessage />
          <div className="mt-1 text-xs text-slate-500">Tu ayuda al instante ⚡</div>
        </footer>
      )}

      {/* ===== TOASTER ===== */}
      <Toaster
        position="bottom-center"
        richColors
        toastOptions={{
          style: {
            background: "rgba(255,255,255,0.92)",
            color: "#0f172a",
            border: "1px solid rgba(255,255,255,0.75)",
            boxShadow: "0 10px 30px rgba(15,23,42,0.10)",
            backdropFilter: "blur(14px)",
          },
        }}
      />
    </div>
  );
}