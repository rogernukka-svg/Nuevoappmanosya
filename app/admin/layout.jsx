import "@/app/globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import InstallPrompt from "@/components/InstallPrompt";
import { Toaster } from "sonner";

/* === Metadatos del panel administrativo === */
export const metadata = {
  title: "Panel Admin | ManosYA",
  description: "Dashboard interno de ManosYA",
};

/* === Layout principal del panel Admin === */
export default function AdminLayout({ children }) {
  return (
    <html lang="es">
      <head>
        {/* === PWA y metadatos === */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#14B8A6" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="icon" href="/icons/icon-192.png" sizes="192x192" />
      </head>

      <body className="bg-black text-white antialiased min-h-screen flex flex-col">
        {/* ===== HEADER ===== */}
        <header className="bg-transparent">
          <Nav />
        </header>

        {/* ===== CONTENIDO PRINCIPAL ===== */}
        <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8">
          {children}
        </main>

        {/* ===== FOOTER ===== */}
        <Footer />

        {/* ===== PROMPT DE INSTALACIÓN PWA ===== */}
        <InstallPrompt />

        {/* ===== TOASTER (Notificaciones globales) ===== */}
        <Toaster
          position="top-center"
          richColors
          expand
          closeButton
          toastOptions={{
            style: {
              background: "#111",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
            },
          }}
        />

        {/* ===== REGISTRO DEL SERVICE WORKER ===== */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ("serviceWorker" in navigator) {
                window.addEventListener("load", function () {
                  navigator.serviceWorker
                    .register("/sw.js")
                    .then(function (reg) {
                      console.log("✅ Service Worker registrado:", reg.scope);
                    })
                    .catch(function (err) {
                      console.error("❌ Error al registrar SW:", err);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
