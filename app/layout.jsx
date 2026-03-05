import "./globals.css";
import { Inter, Manrope } from "next/font/google";
import { Toaster } from "sonner";
import ClientOnlyLayout from "./ClientOnlyLayout";
import GlobalAudio from "@/components/GlobalAudio";
import "leaflet/dist/leaflet.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

/* === 🧠 SEO + PWA Metadata === */
export const metadata = {
  title: "ManosYA | Tu ayuda al instante",
  description:
    "Conectamos clientes y profesionales en minutos. Rápido, seguro y confiable.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/icons/icon-192x192.png",
  },
};

export const viewport = {
  themeColor: "#14B8A6",
};

/* === 🌍 Root Layout Global === */
export default function RootLayout({ children }) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${inter.variable} ${manrope.variable} antialiased`}
    >
      <head>
        {/* === 🧠 Metadatos PWA === */}
        <meta name="theme-color" content="#14B8A6" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="ManosYA" />
        <meta name="application-name" content="ManosYA" />

        {/* Icons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icons/icon-512x512.png" />
        <link rel="manifest" href="/manifest.json" />

        {/* ✅ FIX: evita pantalla gris (no bloqueamos render) */}
        <style>{`body{visibility:visible}`}</style>
      </head>

      {/* ⛔ FIX: evita que los celulares agranden la letra */}
      <body
        style={{ WebkitTextSizeAdjust: "none", textSizeAdjust: "none" }}
        className="
          min-h-[100dvh]
          bg-[#F9FAFB] text-gray-900 antialiased
          overflow-x-hidden
          selection:bg-emerald-200 selection:text-emerald-800
        "
      >
        {/* 🌟 Sistema global de notificaciones */}
        <Toaster position="top-center" richColors />

        {/* 🎧 AUDIO GLOBAL — Persistente en TODA la app */}
        <GlobalAudio />

        {/* ⚙️ Layout dinámico para roles y navegación */}
        <ClientOnlyLayout>{children}</ClientOnlyLayout>

        {/* ⚡ Registro del Service Worker SOLO en producción */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (
                'serviceWorker' in navigator &&
                location.hostname !== 'localhost'
              ) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker
                    .register('/service-worker.js')
                    .then(() => console.log('🟢 Service Worker ManosYA activo'))
                    .catch(() => {});
                });
              }
            `,
          }}
        />

        {/* 🎵 Habilitar audio al primer toque del usuario */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener(
                "click",
                () => {
                  const audio = document.querySelector("audio");
                  if (audio && audio.paused) audio.play().catch(() => {});
                },
                { once: true }
              );
            `,
          }}
        />
      </body>
    </html>
  );
}