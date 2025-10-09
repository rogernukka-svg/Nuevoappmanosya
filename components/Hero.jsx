// components/Hero.jsx
'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function Hero() {
  return (
    <section className="w-full bg-black text-white">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-12 md:grid-cols-2 md:py-16">
        {/* Texto */}
        <div>
          <h1 className="font-extrabold leading-tight tracking-tight text-4xl md:text-6xl">
            Conseguí ayuda cuando <br className="hidden md:block" />
            quieras y pagá lo que <br className="hidden md:block" />
            necesitás
          </h1>
          <p className="mt-4 max-w-xl text-white/70">
            Manos<span className="text-teal-400">YA</span> te conecta con profesionales verificados de limpieza, plomería, electricidad, jardinería y más, cerca tuyo.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login?mode=signup"
              className="rounded-full bg-white px-5 py-3 text-center font-semibold text-black transition hover:opacity-90"
              aria-label="Registrate en ManosYA"
            >
              Registrate
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-white/20 px-5 py-3 text-center font-semibold text-white hover:bg-white/10"
              aria-label="Iniciá sesión en ManosYA"
            >
              Iniciá sesión
            </Link>
          </div>
        </div>

        {/* Ilustración / Imagen */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-white/10 bg-white/5">
          {/* Poné tu imagen en /public o usa un placeholder */}
          <Image
            src="/hero-manosya.png" // cámbialo si querés
            alt="Profesional realizando un servicio"
            fill
            className="object-cover"
            sizes="(min-width: 768px) 560px, 100vw"
            priority
          />
        </div>
      </div>
    </section>
  );
}
