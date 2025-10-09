import "./globals.css";
import { Inter, Manrope } from "next/font/google";
import { Toaster } from "sonner";
import ClientOnlyLayout from "./ClientOnlyLayout"; // 👈 maneja lógica de rutas en cliente

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

/* === SEO + PWA Metadata === */
export const metadata = {
  title: "ManosYA | Tu ayuda al instante",
  description:
    "Conectamos clientes y profesionales en minutos. Rápido, seguro y confiable.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  themeColor: "#14B8A6",
};

/* === Root Layout Global (Server Component) === */
export default function RootLayout({ children }) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${inter.variable} ${manrope.variable} antialiased`}
    >
      <head>
        {/* === Metadatos esenciales === */}
        <meta name="theme-color" content="#14B8A6" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="icon" href="/icons/icon-192.png" sizes="192x192" />
        <link rel="manifest" href="/manifest.json" />

        {/* ✅ Evita FOUC al hidratar */}
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
        {/* ✅ Sistema de notificaciones global */}
        <Toaster position="top-center" richColors />

        {/* ✅ Lógica de cliente y footer condicional va acá */}
        <ClientOnlyLayout>{children}</ClientOnlyLayout>
      </body>
    </html>
  );
}