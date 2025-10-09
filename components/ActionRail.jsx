// components/ActionRail.jsx
'use client';

import Link from 'next/link';

const Item = ({ title, href, right }) => (
  <Link
    href={href}
    className="group flex items-center justify-between border-t border-white/10 px-4 py-8 transition hover:bg-white/5 md:px-6"
    aria-label={title}
  >
    <span className="text-2xl font-semibold md:text-3xl">{title}</span>
    <span className="text-3xl transition group-hover:translate-x-1" aria-hidden>→</span>
  </Link>
);

export default function ActionRail() {
  return (
    <nav className="w-full bg-white text-black">
      <div className="mx-auto max-w-6xl">
        {/* hacemos el bloque blanco con texto negro como Uber */}
        <div className="divide-y divide-black/10">
          <Item title="Registrate" href="/login?mode=signup" />
          <Item title="Iniciá sesión" href="/login" />
          {/* El camino único y visible */}
          <Item title="Utilidades" href="/utilidades" />
        </div>
      </div>
    </nav>
  );
}
