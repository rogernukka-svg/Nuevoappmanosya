// components/Footer.jsx
'use client';

import Link from 'next/link';
import { Sparkles, Rocket, Users, Globe2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="relative mt-20 border-t border-white/10 bg-gradient-to-tr from-black via-neutral-900 to-black text-white overflow-hidden">
      {/* Glow de fondo */}
      <div className="absolute inset-0 -z-10 opacity-40">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-500/30 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-cyan-500/20 blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-14">
        {/* Tagline aspiracional */}
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Transformando la forma de trabajar en LATAM 🚀
          </h2>
          <p className="mt-3 text-white/70 max-w-2xl mx-auto text-lg">
            Manos<span className="text-[var(--accent)] drop-shadow">YA</span> conecta personas,
            crea oportunidades y genera impacto real en miles de hogares y empresas.
          </p>
        </div>

        {/* Grillas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 text-sm">
          <div>
            <h3 className="flex items-center gap-2 font-bold mb-3 text-white/80">
              <Sparkles size={16} /> Visión
            </h3>
            <ul className="space-y-2 text-white/60">
              <li><Link href="/about">Quiénes somos</Link></li>
              <li><Link href="/future">Nuestro futuro</Link></li>
              <li><Link href="/investors">Inversionistas</Link></li>
              <li><Link href="/impact">Impacto social</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="flex items-center gap-2 font-bold mb-3 text-white/80">
              <Rocket size={16} /> Soluciones
            </h3>
            <ul className="space-y-2 text-white/60">
              <li><Link href="/services/home">Para hogares</Link></li>
              <li><Link href="/services/business">Para empresas</Link></li>
              <li><Link href="/api">API & tecnología</Link></li>
              <li><Link href="/match">Match con Pro</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="flex items-center gap-2 font-bold mb-3 text-white/80">
              <Users size={16} /> Comunidad
            </h3>
            <ul className="space-y-2 text-white/60">
              <li><Link href="/team">Equipo y cultura</Link></li>
              <li><Link href="/blog">Blog & recursos</Link></li>
              <li><Link href="/stories">Historias de usuarios</Link></li>
              <li><Link href="/help">Centro de ayuda</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="flex items-center gap-2 font-bold mb-3 text-white/80">
              <Globe2 size={16} /> Expansión
            </h3>
            <ul className="space-y-2 text-white/60">
              <li><Link href="/cities">Ciudades</Link></li>
              <li><Link href="/countries">Países</Link></li>
              <li><Link href="/latam">LATAM 2025</Link></li>
              <li><Link href="/next">Próximos mercados</Link></li>
            </ul>
          </div>
        </div>

        {/* Barra inferior con disclaimers */}
        <div className="mt-14 flex flex-col md:flex-row items-center justify-between text-white/60 text-xs md:text-sm gap-4">
          <p>
            © {new Date().getFullYear()} ManosYA, Inc. · Todos los derechos reservados.  
            Las marcas, nombres e imágenes son propiedad de sus respectivos titulares.
          </p>
          <div className="flex gap-4">
            <Link href="/legal/terminos" className="hover:text-white">Términos</Link>
            <Link href="/legal/privacidad" className="hover:text-white">Privacidad</Link>
            <Link href="/apps/android" className="hover:text-white">Google Play</Link>
            <Link href="/apps/ios" className="hover:text-white">App Store</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
