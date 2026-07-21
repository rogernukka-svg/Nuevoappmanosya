import ToastProvider from "@/components/layout/ToastProvider";
import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://www.manosya.app"),
  title: "ManosYA Premium",
  description: "Trabajadores, clientes y proveedores en una app social de contratacion inmediata.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/icon-192x192.png",
  },
  openGraph: {
    title: "ManosYA",
    description: "El feed de trabajadores confiables cerca de vos.",
    url: "https://www.manosya.app",
    siteName: "ManosYA",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#64C7BE",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <ToastProvider />
        <main className="app-viewport">{children}</main>
      </body>
    </html>
  );
}
