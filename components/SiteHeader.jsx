'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MapPin, PlusCircle, UserCheck } from 'lucide-react';

const NAV = [
  { name: 'Match', href: '/match', icon: Home },
  { name: 'Cerca', href: '/map', icon: MapPin },
  { name: 'Chamba', href: '/client/new', icon: PlusCircle },
  { name: 'Online', href: '/worker/onboard', icon: UserCheck },
  // 👇 Eliminado: { name: 'Admin', href: '/admin', icon: Shield },
];

export default function SiteHeader({ email }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md">
      {/* Header principal */}
      <div className="container h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-heading text-xl font-extrabold">
          Manos<span className="text-[var(--accent)]">YA</span>
        </Link>

        {/* Usuario */}
        <div className="flex items-center gap-3">
          {email && (
            <span className="hidden sm:inline-block truncate max-w-[120px] text-xs text-white/60">
              {email}
            </span>
          )}
          <Link
            href={email ? '/auth/signout' : '/login'}
            className="btn btn-primary h-9 px-4"
          >
            {email ? 'Salir' : 'Entrar'}
          </Link>
        </div>
      </div>

      {/* Barra secundaria tipo tabs */}
      <nav className="site-tabs">
        <ul>
          {NAV.map(({ name, href, icon: Icon }) => {
            const active = pathname?.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex flex-col items-center gap-1 text-xs ${
                    active
                      ? 'text-[var(--accent)] font-semibold'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  {name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
