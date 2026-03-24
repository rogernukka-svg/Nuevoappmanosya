import "./globals.css";
import { Inter, Manrope } from "next/font/google";
import { Toaster } from "sonner";
import ClientOnlyLayout from "./ClientOnlyLayout";
import GlobalAudio from "@/components/GlobalAudio";
import "leaflet/dist/leaflet.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

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
        {/* PWA */}
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

        {/* Evita flicker */}
        <style>{`
          html, body {
            background: #f8fafc;
          }
          body {
            visibility: visible;
          }
        `}</style>
      </head>

      <body
        style={{
          WebkitTextSizeAdjust: "none",
          textSizeAdjust: "none",
        }}
        className="
          min-h-[100dvh]
          overflow-x-hidden
          bg-slate-50
          text-slate-900
          antialiased
          selection:bg-emerald-200
          selection:text-emerald-900
          [font-family:var(--font-manrope)]
        "
      >
        {/* 🌫️ Fondo global tecnológico limpio */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#f8fafc,#f1f5f9)]" />

          <div className="absolute left-1/2 top-[-180px] h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-emerald-300/20 blur-3xl" />
          <div className="absolute left-[-120px] top-[18%] h-[260px] w-[260px] rounded-full bg-cyan-300/15 blur-3xl" />
          <div className="absolute bottom-[-120px] right-[-80px] h-[320px] w-[320px] rounded-full bg-teal-300/15 blur-3xl" />

          <div
            className="absolute inset-0 opacity-[0.045]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(15,23,42,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.08) 1px, transparent 1px)",
              backgroundSize: "42px 42px",
            }}
          />

          <div className="absolute inset-0 bg-white/45" />
        </div>

        {/* 🔔 Toaster premium */}
        <Toaster
          position="top-center"
          richColors
          toastOptions={{
            classNames: {
              toast:
                "!rounded-2xl !border !border-white/80 !bg-white/90 !backdrop-blur-xl !shadow-[0_14px_40px_rgba(15,23,42,0.10)]",
              title: "!text-slate-900 !font-bold",
              description: "!text-slate-600",
            },
          }}
        />

        {/* 🎧 Audio global */}
        <GlobalAudio />

        {/* ⚙️ Layout dinámico */}
        <ClientOnlyLayout>{children}</ClientOnlyLayout>

        {/* ⚡ Service Worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
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

        {/* 🎵 Activar audio en primer toque */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener(
                "click",
                () => {
                  const audio = document.querySelector("audio");
                  if (audio && audio.paused) {
                    audio.play().catch(() => {});
                  }
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