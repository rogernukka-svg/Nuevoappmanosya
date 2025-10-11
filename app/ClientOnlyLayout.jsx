'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import ClientRoot from './ClientRoot';
import InstallPrompt from '@/components/InstallPrompt'; // 👈 nuevo banner PWA

/**
 * 🌐 ClientOnlyLayout actualizado
 * - Mantiene tu control de rutas (login, worker, business)
 * - Añade el banner de instalación PWA (Android)
 */
export default function ClientOnlyLayout({ children }) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  // 🔹 Rutas que se renderizan solas (sin ClientRoot)
  const isAuthRoute =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/role-selector' ||
    pathname === '/registro';

  // 🔹 Rutas especiales (worker o business aisladas)
  const isIsolated =
    pathname.startsWith('/worker') || pathname.startsWith('/business');

  // 🔹 LOGIN / ROLE SELECTOR → sin fondo global
  if (isAuthRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-900">
        {children}
        {/* 📲 Banner PWA también visible en auth si aplica */}
        <InstallPrompt />
      </div>
    );
  }

  // 🔹 Worker o Business → render directo (sin layout global)
  if (isIsolated) {
    return (
      <>
        {children}
        {/* 📲 Banner PWA visible aquí también */}
        <InstallPrompt />
      </>
    );
  }

  // 🔹 Resto de páginas → usan ClientRoot (layout normal)
  return (
    <div className="flex flex-col min-h-screen bg-[#F9FAFB] text-gray-900">
      <ClientRoot>{children}</ClientRoot>

      {/* 📲 Banner “Instalar ManosYA” */}
      <InstallPrompt />
    </div>
  );
}
