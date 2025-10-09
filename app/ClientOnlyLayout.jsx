'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import ClientRoot from './ClientRoot';

/**
 * ClientOnlyLayout
 * - Evita render antes de la hidratación.
 * - Aísla rutas de login y role-selector dentro del mismo layout global.
 * - Evita loops y pantallas en blanco sin mover carpetas.
 */
export default function ClientOnlyLayout({ children }) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  // Rutas que deben renderizarse solas (sin ClientRoot global)
  const isAuthRoute =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/role-selector' ||
    pathname === '/registro';

  // Rutas especiales (worker / business aisladas)
  const isIsolated =
    pathname.startsWith('/worker') || pathname.startsWith('/business');

  // 🔹 Si estamos en login o role-selector → render sin fondo global
  if (isAuthRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-900">
        {children}
      </div>
    );
  }

  // 🔹 Si es worker o business → render directo sin envoltorio
  if (isIsolated) {
    return children;
  }

  // 🔹 Resto de páginas → usan layout global normal
  return (
    <div className="flex flex-col min-h-screen bg-[#F9FAFB] text-gray-900">
      <ClientRoot>{children}</ClientRoot>
    </div>
  );
}
