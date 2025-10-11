"use client";
export const dynamic = "force-dynamic";

import "../globals.css";
import { Inter, Manrope } from "next/font/google";
import { useEffect, useState } from "react";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export default function BusinessLayout({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <html
      lang="es"
      className={`${inter.variable} ${manrope.variable} bg-gray-50 text-gray-900 antialiased`}
    >
      <body className="min-h-screen flex flex-col">
        {/* === HEADER EMPRESARIAL === */}
        <header className="w-full bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-6xl mx-auto flex justify-between items-center px-6 py-3">
            <h1 className="text-xl font-bold text-emerald-600">
              ManosYA <span className="text-gray-700">Empresas</span>
            </h1>
            <span className="text-sm text-gray-500">v1.0 Beta</span>
          </div>
        </header>

        {/* === CONTENIDO === */}
        <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
          {children}
        </main>

        {/* === FOOTER === */}
        <footer className="w-full border-t border-gray-200 bg-white text-center text-sm text-gray-500 py-4">
          © 2025 ManosYA · Alto Paraná ·{" "}
          <span className="text-emerald-600">Tu ayuda al instante ⚡</span>
        </footer>
      </body>
    </html>
  );
}
