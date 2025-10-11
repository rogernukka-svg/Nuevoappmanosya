import "./globals.css";
import { Inter, Manrope } from "next/font/google";
import { Toaster } from "sonner";
import ClientOnlyLayout from "./ClientOnlyLayout"; // 👈 lógica cliente (roles, rutas, etc.)

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
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ManosYA" />
        <meta name="application-name" content="ManosYA" />

        {/* ✅ Favicon / Icons / Manifest */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icons/icon-512x512.png" />
        <link rel="manifest" href="/manifest.json" />

        {/* ✅ Evita FOUC (flash blanco antes de hidratar) */}
        <style>{`html:not(.hydrated){visibility:hidden}`}</style>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('DOMContentLoaded', () => {
                document.documentElement.classList.add('hydrated');
              });
            `,
          }}
        />
      </head>

      <body
        className="
          min-h-screen flex flex-col
          bg-[#F9FAFB] text-gray-900 antialiased
          overflow-x-hidden overflow-y-visible
          selection:bg-emerald-200 selection:text-emerald-800
        "
      >
        {/* 🌟 Sistema global de notificaciones */}
        <Toaster position="top-center" richColors />

        {/* ⚙️ Layout dinámico para roles y navegación */}
        <ClientOnlyLayout>{children}</ClientOnlyLayout>

        {/* ⚡ Registro automático del Service Worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker
                    .register('/sw.js')
                    .then(() => console.log('🟢 Service Worker ManosYA activo'))
                    .catch(err => console.error('❌ Error registrando SW:', err));
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
