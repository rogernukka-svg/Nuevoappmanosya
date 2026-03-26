'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import ClientRoot from './ClientRoot';

/**
 * 🌐 ClientOnlyLayout limpio (sin banner PWA manual)
 * - Mantiene tu control de rutas (login, worker, business)
 * - Deja que el navegador muestre el botón nativo de instalación
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
  pathname.startsWith('/worker') ||
  pathname.startsWith('/business') ||
  pathname.startsWith('/padron');

  // 🔹 LOGIN / ROLE SELECTOR → sin fondo global
  if (isAuthRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-900">
        {children}
      </div>
    );
  }

  // 🔹 Worker o Business → render directo (sin layout global)
  if (isIsolated) {
    return <>{children}</>;
  }

  // 🔹 Resto de páginas → usan ClientRoot (layout normal)
  return (
    <div className="flex flex-col min-h-screen bg-[#F9FAFB] text-gray-900">
      <ClientRoot>{children}</ClientRoot>
    </div>
  );
}
