'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { getSupabase } from '@/lib/supabase';
import {
  ArrowRight,
  BrainCircuit,
  BriefcaseBusiness,
  CheckCircle2,
  Facebook,
  FileText,
  Globe2,
  Handshake,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Mic2,
  Newspaper,
  RadioTower,
  Rocket,
  Sparkles,
  UsersRound,
} from 'lucide-react';

const supabase = getSupabase();

const founder = {
  name: 'Roger Núñez',
  role: 'Fundador de ManosYA',
  photo: '/founder-roger-nunez.png',
  whatsapp: 'https://wa.me/message/PRXLIIJV27NVD1',
  email: 'mailto:manosya.py@gmail.com',
  instagram: 'https://www.instagram.com/manosya.py?igsh=MTdobXp2dzlvNHJ3Zw==',
  facebook: 'https://www.facebook.com/profile.php?id=61583934836185',
};

const director = {
  name: 'Iván Armoa',
  role: 'Director General de ManosYA',
  photo: '/ivan-armoa-director-general.jpeg',
};

const executives = [
  {
    name: 'Sergio Gonzalez',
    role: 'Director Ejecutivo',
    photo: '/sergio-gonzalez-ceo.jpeg',
    eyebrow: 'CEO',
    story:
      'Sergio fue compañero de colegio de Roger desde séptimo hasta octavo grado. Con el tiempo, aquella amistad se convirtió en una visión empresarial compartida: construir una plataforma paraguaya capaz de ordenar trabajo, confianza y crecimiento real.',
    responsibilities: [
      'Dirección ejecutiva',
      'Estrategia de crecimiento',
      'Expansión nacional',
      'Operaciones',
      'Decisiones estratégicas',
      'Coordinación interna',
    ],
  },
  {
    name: 'Alex Gonzalez',
    role: 'Vicepresidente',
    photo: '/alex-gonzalez-vicepresidente.png',
    eyebrow: 'Vicepresidencia',
    story:
      'Alex es uno de los amigos más cercanos de Roger y una pieza clave en el crecimiento interno de ManosYA. Su lugar en el proyecto aporta confianza, apoyo estratégico y una mirada moderna sobre cómo la tecnología debe sentirse humana.',
    responsibilities: [
      'Vicepresidencia',
      'Innovación',
      'Mejoras internas',
      'Apoyo estratégico',
      'Experiencia humana',
      'Expansión del proyecto',
    ],
  },
];

const navItems = [
  { label: 'Historia', href: '#historia' },
  { label: 'Equipo', href: '#equipo' },
  { label: 'Nosotros', href: '#nosotros' },
  { label: 'Visión', href: '#vision' },
  { label: 'Archivo', href: '#archivo' },
  { label: 'Prensa', href: '#prensa' },
];

const contactButtons = [
  { label: 'WhatsApp', href: founder.whatsapp, icon: MessageCircle },
  { label: 'Gmail', href: founder.email, icon: Mail },
  { label: 'Instagram', href: founder.instagram, icon: Instagram },
  { label: 'Facebook', href: founder.facebook, icon: Facebook },
];

const storyParagraphs = [
  'ManosYA nació mucho antes de convertirse en una aplicación. Nació en una conversación familiar, compartiendo una comida sencilla entre padre e hijo, hablando sobre trabajadores, oportunidades y las dificultades que vive la gente todos los días para encontrar empleo o conseguir ayuda confiable.',
  'Roger Núñez, fundador de ManosYA, creció viendo a su padre, Rogelio Núñez Arzamendia, luchar durante años por los derechos y la dignidad de los trabajadores en Ciudad del Este. Su padre siempre tuvo una visión clara: crear una gran agencia de trabajadores que pudiera conectar personas honestas con oportunidades reales.',
  'Pero con el paso del tiempo, Roger comenzó a imaginar algo diferente. Mientras hablaban juntos sobre trabajo, necesidades y futuro, nació una idea que quedó grabada en su mente: "¿Y si el trabajo pudiera estar en la palma de la mano?"',
  'Desde ese momento, la idea nunca volvió a salir de su cabeza. La visión ya no era solamente una agencia física. Era llevar el trabajo al teléfono. Crear una plataforma inteligente donde una persona pudiera encontrar un trabajador en tiempo real desde una app, de forma rápida, humana y moderna.',
  'Durante más de tres años, esa idea fue creciendo entre bocetos, aprendizajes, desvelos y una obsesión constante por construir algo grande desde Paraguay. Así nació ManosYA: una plataforma tecnológica creada para conectar trabajadores y clientes mediante geolocalización, comunicación instantánea y tecnología pensada para la realidad de Latinoamérica.',
  'Más que una aplicación, ManosYA representa una continuidad de valores entre generaciones: la lucha por el trabajo digno, las oportunidades y la modernización del acceso al empleo.',
  'Desde Ciudad del Este, Roger Núñez transformó aquella conversación con su padre en una visión tecnológica que hoy busca cambiar la manera en que las personas trabajan y se conectan en Paraguay.',
];

const directorParagraphs = [
  'Iván Armoa llegó a Paraguay después de construir una trayectoria de más de dos décadas en publicidad, diseño y comunicación.',
  'Fue en ese camino donde conoció a Roger Núñez. Lo que comenzó como una colaboración profesional terminó convirtiéndose en una relación construida sobre trabajo, visión y confianza.',
  'Hoy, como Director General de ManosYA, aporta experiencia creativa, visión estratégica y estructura institucional para el crecimiento del proyecto.',
];

const timeline = [
  {
    title: 'Idea',
    text: 'Una conversación familiar abrió el camino: llevar el trabajo digno al teléfono de cada persona.',
    icon: Sparkles,
  },
  {
    title: 'Construcción',
    text: 'Bocetos, pruebas, noches largas y una convicción: Paraguay también puede crear tecnología de escala.',
    icon: Rocket,
  },
  {
    title: 'Equipo',
    text: 'Amistad, confianza y talento se sumaron para transformar una visión en una plataforma real.',
    icon: UsersRound,
  },
  {
    title: 'Expansión',
    text: 'ManosYA empieza a tomar forma como puente entre clientes, trabajadores y proveedores.',
    icon: Handshake,
  },
];

const updates = [
  {
    title: 'Origen',
    text: 'ManosYA nace de una visión familiar sobre trabajo digno, oportunidades reales y tecnología al servicio de la gente.',
  },
  {
    title: 'Construcción',
    text: 'El proyecto documenta una nueva forma de conectar clientes, trabajadores y proveedores desde Paraguay.',
  },
];

const vision = [
  {
    title: 'Inteligencia artificial',
    text: 'IA aplicada para interpretar necesidades, clasificar servicios y acercar respuestas más precisas.',
    icon: BrainCircuit,
  },
  {
    title: 'Geolocalización',
    text: 'La cercanía se vuelve infraestructura: encontrar ayuda alrededor del lugar donde ocurre la necesidad.',
    icon: MapPin,
  },
  {
    title: 'Economía digital',
    text: 'Cada solicitud digital crea una oportunidad para formalizar y profesionalizar servicios en Paraguay.',
    icon: Globe2,
  },
  {
    title: 'Trabajo real',
    text: 'Perfiles, reputación y trazabilidad para trabajadores honestos que quieren crecer.',
    icon: BriefcaseBusiness,
  },
];

const archiveStats = [
  { label: 'País', value: 'Paraguay' },
  { label: 'Origen', value: 'Ciudad del Este' },
  { label: 'Compañía', value: 'ManosYA' },
  { label: 'Rol', value: 'Founder' },
];

const pressItems = [
  {
    title: 'Entrevistas',
    text: 'Conversaciones con medios, comunidad tecnológica y ecosistema emprendedor.',
    icon: Mic2,
  },
  {
    title: 'Noticias',
    text: 'Actualizaciones oficiales sobre producto, crecimiento, alianzas y expansión.',
    icon: Newspaper,
  },
  {
    title: 'Medios',
    text: 'Biografía, imágenes oficiales y datos institucionales para prensa.',
    icon: FileText,
  },
  {
    title: 'Podcasts',
    text: 'Charlas sobre tecnología paraguaya, trabajo independiente e inteligencia artificial.',
    icon: RadioTower,
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
};

function Shell({ children, className = '' }) {
  return (
    <div className={`mx-auto w-full max-w-[1180px] px-5 sm:px-8 lg:px-10 ${className}`}>
      {children}
    </div>
  );
}

function Eyebrow({ children, dark = false }) {
  return (
    <p
      className={[
        'text-[12px] font-semibold uppercase tracking-[0.22em]',
        dark ? 'text-white/52' : 'text-[#0f8f88]',
      ].join(' ')}
    >
      {children}
    </p>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/78 backdrop-blur-2xl">
      <Shell>
        <div className="flex min-h-[72px] items-center justify-between gap-5">
          <Link href="/" className="group flex items-center gap-3" aria-label="ManosYA">
            <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-[#62bfb9] shadow-sm">
              <Image
                src="/logo-manosya.png"
                alt="ManosYA"
                width={120}
                height={80}
                className="h-full w-full object-contain p-1.5"
                priority
              />
            </span>

            <span className="leading-tight">
              <span className="block text-[17px] font-semibold tracking-[-0.04em] text-[#06182a]">
                Founder Files
              </span>
              <span className="hidden text-[12px] font-medium text-[#06182a]/46 sm:block">
                Roger Núñez archive
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-[13px] font-medium text-[#06182a]/68 lg:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-[#06182a]">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href={founder.instagram}
              aria-label="Instagram"
              className="hidden h-10 w-10 items-center justify-center rounded-full text-[#06182a]/70 transition hover:bg-black/[0.04] hover:text-[#06182a] sm:flex"
            >
              <Instagram className="h-4 w-4" />
            </Link>

            <Link
              href={founder.facebook}
              aria-label="Facebook"
              className="hidden h-10 w-10 items-center justify-center rounded-full text-[#06182a]/70 transition hover:bg-black/[0.04] hover:text-[#06182a] sm:flex"
            >
              <Facebook className="h-4 w-4" />
            </Link>

            <Link
              href={founder.whatsapp}
              className="inline-flex h-10 items-center rounded-full bg-[#06182a] px-4 text-[13px] font-semibold text-white shadow-[0_12px_30px_rgba(6,24,42,0.16)] transition hover:-translate-y-0.5 hover:bg-[#0b233c]"
            >
              Contacto
            </Link>
          </div>
        </div>

        <div className="flex gap-5 overflow-x-auto border-t border-black/[0.04] py-3 text-[13px] font-medium text-[#06182a]/60 lg:hidden">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="shrink-0">
              {item.label}
            </Link>
          ))}
        </div>
      </Shell>
    </header>
  );
}

function PrimaryButton({ href, children, dark = false, icon: Icon = ArrowRight }) {
  return (
    <Link
      href={href}
      className={[
        'inline-flex h-12 items-center justify-center rounded-full px-5 text-[15px] font-semibold tracking-[-0.02em] transition hover:-translate-y-0.5',
        dark
          ? 'bg-[#06182a] text-white shadow-[0_18px_44px_rgba(6,24,42,0.22)] hover:bg-[#0b233c]'
          : 'border border-black/[0.08] bg-white text-[#06182a] shadow-[0_14px_34px_rgba(6,24,42,0.08)] hover:bg-[#f7f9fa]',
      ].join(' ')}
    >
      {children}
      {Icon ? <Icon className="ml-2 h-4 w-4" aria-hidden="true" /> : null}
    </Link>
  );
}

function FounderImage() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto w-full max-w-[560px]"
    >
      <div className="absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(98,191,185,0.22),transparent_64%)] blur-2xl" />

      <div className="relative overflow-hidden rounded-[44px] border border-black/[0.06] bg-[#f4f7f7] shadow-[0_38px_100px_rgba(6,24,42,0.16)]">
        <Image
          src={founder.photo}
          alt="Roger Núñez, fundador de ManosYA"
          width={1000}
          height={1100}
          priority
          className="aspect-[0.92/1] h-full w-full scale-[1.02] object-cover grayscale"
        />

        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0)_42%,rgba(6,24,42,0.48)_100%)]" />

        <div className="absolute bottom-5 left-5 right-5 rounded-[28px] border border-white/30 bg-white/18 p-4 text-white shadow-2xl backdrop-blur-2xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/70">
            Archivo oficial
          </p>
          <h2 className="mt-1 text-[24px] font-semibold tracking-[-0.04em]">
            {founder.name}
          </h2>
          <p className="mt-1 text-sm text-white/72">{founder.role}</p>
        </div>
      </div>
    </motion.div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#f5f7f7]">
      <div className="absolute left-1/2 top-0 h-[620px] w-[900px] -translate-x-1/2 rounded-full bg-white blur-3xl" />
      <div className="absolute right-[-180px] top-[180px] h-[420px] w-[420px] rounded-full bg-[#62bfb9]/18 blur-3xl" />

      <Shell className="relative grid min-h-[calc(100vh-72px)] items-center gap-14 py-16 lg:grid-cols-[1.02fr_0.98fr] lg:py-20">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-4 py-2 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#62bfb9]" />
            <span className="text-[13px] font-semibold text-[#06182a]/60">
              ManosYA Founder Archive
            </span>
          </div>

          <h1 className="mt-8 text-[50px] font-semibold leading-[0.96] tracking-[-0.075em] text-[#06182a] sm:text-[76px] lg:text-[92px]">
            La historia detrás de ManosYA.
          </h1>

          <p className="mt-8 max-w-2xl text-[21px] leading-[1.48] tracking-[-0.035em] text-[#06182a]/66 sm:text-[26px]">
            Roger Núñez fundó ManosYA para conectar trabajadores, clientes y proveedores en tiempo real desde Paraguay.
          </p>

          <p className="mt-5 max-w-2xl text-[18px] leading-[1.7] tracking-[-0.02em] text-[#06182a]/56">
            Una conversación familiar se convirtió en una plataforma tecnológica pensada para trabajo digno, confianza digital y oportunidades reales.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <PrimaryButton href="#historia" dark>
              Leer historia
            </PrimaryButton>
            <PrimaryButton href="#equipo">
              Ver equipo
            </PrimaryButton>
          </div>
        </motion.div>

        <FounderImage />
      </Shell>
    </section>
  );
}

function SectionTitle({ eyebrow, title, text, dark = false, align = 'center' }) {
  return (
    <motion.div
      {...fadeUp}
      className={[
        'max-w-3xl',
        align === 'center' ? 'mx-auto text-center' : 'text-left',
      ].join(' ')}
    >
      <Eyebrow dark={dark}>{eyebrow}</Eyebrow>

      <h2
        className={[
          'mt-4 text-[38px] font-semibold leading-[1.04] tracking-[-0.06em] sm:text-[58px]',
          dark ? 'text-white' : 'text-[#06182a]',
        ].join(' ')}
      >
        {title}
      </h2>

      {text ? (
        <p
          className={[
            'mt-5 text-[18px] leading-8 tracking-[-0.02em]',
            dark ? 'text-white/62' : 'text-[#06182a]/58',
            align === 'center' ? 'mx-auto max-w-2xl' : 'max-w-2xl',
          ].join(' ')}
        >
          {text}
        </p>
      ) : null}
    </motion.div>
  );
}

function StorySection() {
  return (
    <section id="historia" className="bg-white py-20 sm:py-28">
      <Shell>
        <div className="grid gap-12 lg:grid-cols-[0.84fr_1.16fr] lg:gap-16">
          <SectionTitle
            eyebrow="Historia"
            title="Una idea simple, ejecutada con obsesión."
            text="El origen de ManosYA no fue una sala de inversión. Fue una conversación sobre trabajo, dignidad y futuro."
            align="left"
          />

          <motion.article {...fadeUp} className="space-y-8">
            {storyParagraphs.map((paragraph, index) => (
              <p
                key={paragraph}
                className={[
                  'text-[20px] leading-[1.72] tracking-[-0.025em]',
                  index === 2
                    ? 'text-[26px] font-semibold leading-[1.35] text-[#06182a]'
                    : 'text-[#06182a]/62',
                ].join(' ')}
              >
                {paragraph}
              </p>
            ))}
          </motion.article>
        </div>
      </Shell>
    </section>
  );
}

function DirectorCard() {
  return (
    <motion.article
      {...fadeUp}
      className="group overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.06] shadow-[0_26px_80px_rgba(0,0,0,0.24)] backdrop-blur-2xl"
    >
      <div className="relative overflow-hidden">
        <Image
          src={director.photo}
          alt="Iván Armoa, Director General de ManosYA"
          width={1200}
          height={850}
          className="aspect-[4/3] w-full object-cover grayscale transition duration-700 group-hover:scale-[1.025]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(6,24,42,0.86)_100%)]" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#62bfb9]">
            Dirección General
          </p>
          <h3 className="mt-2 text-[34px] font-semibold tracking-[-0.05em] text-white">
            {director.name}
          </h3>
          <p className="mt-1 text-sm text-white/70">{director.role}</p>
        </div>
      </div>
    </motion.article>
  );
}

function ExecutiveCard({ member }) {
  return (
    <motion.article
      {...fadeUp}
      className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.055] shadow-[0_26px_80px_rgba(0,0,0,0.22)] backdrop-blur-2xl"
    >
      <div className="grid lg:grid-cols-[0.88fr_1.12fr]">
        <div className="relative min-h-[380px] overflow-hidden">
          <Image
            src={member.photo}
            alt={`${member.name}, ${member.role}`}
            width={1200}
            height={1500}
            className="h-full min-h-[380px] w-full object-cover grayscale"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,rgba(6,24,42,0.88)_100%)]" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#62bfb9]">
              {member.eyebrow}
            </p>
            <h3 className="mt-2 text-[38px] font-semibold leading-none tracking-[-0.06em] text-white">
              {member.name}
            </h3>
            <p className="mt-2 text-sm text-white/70">{member.role}</p>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <p className="text-[17px] leading-8 tracking-[-0.02em] text-white/70">
            {member.story}
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {member.responsibilities.map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#62bfb9]" />
                <span className="text-sm font-medium text-white/76">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function ExecutiveTeamSection() {
  return (
    <section id="equipo" className="relative overflow-hidden bg-[#06182a] py-20 text-white sm:py-28">
      <div className="absolute left-[-220px] top-[-220px] h-[520px] w-[520px] rounded-full bg-[#62bfb9]/16 blur-3xl" />
      <div className="absolute bottom-[-260px] right-[-220px] h-[560px] w-[560px] rounded-full bg-[#62bfb9]/10 blur-3xl" />

      <Shell className="relative">
        <SectionTitle
          eyebrow="Equipo Ejecutivo"
          title="Personas reales. Visión real. Tecnología real."
          text="ManosYA crece desde vínculos, confianza y una idea clara: convertir una necesidad paraguaya en infraestructura tecnológica."
          dark
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-[0.84fr_1.16fr]">
          <div className="space-y-6">
            <DirectorCard />

            <motion.article
              {...fadeUp}
              className="rounded-[34px] border border-white/10 bg-white/[0.055] p-7 shadow-[0_26px_80px_rgba(0,0,0,0.18)] backdrop-blur-2xl"
            >
              <Eyebrow dark>Dirección institucional</Eyebrow>
              <h3 className="mt-4 text-[34px] font-semibold leading-[1.06] tracking-[-0.055em] text-white">
                Iván convierte visión en estructura.
              </h3>

              <div className="mt-6 space-y-5 text-[16px] leading-8 tracking-[-0.015em] text-white/62">
                {directorParagraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </motion.article>
          </div>

          <div className="grid gap-6">
            {executives.map((member) => (
              <ExecutiveCard key={member.name} member={member} />
            ))}
          </div>
        </div>
      </Shell>
    </section>
  );
}

function AboutSection() {
  return (
    <section id="nosotros" className="bg-[#f5f7f7] py-20 sm:py-28">
      <Shell>
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <motion.div {...fadeUp} className="lg:sticky lg:top-28">
            <SectionTitle
              eyebrow="Nosotros"
              title="Una startup paraguaya con pulso humano."
              text="ManosYA está creciendo desde abajo, con personas reales, problemas reales y una misión concreta: hacer más simple encontrar ayuda, trabajo y oportunidades."
              align="left"
            />
          </motion.div>

          <div className="space-y-4">
            {timeline.map((item, index) => {
              const Icon = item.icon;

              return (
                <motion.article
                  key={item.title}
                  {...fadeUp}
                  className="rounded-[30px] border border-black/[0.06] bg-white p-6 shadow-[0_18px_60px_rgba(6,24,42,0.06)]"
                >
                  <div className="flex gap-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eafffb] text-[#0f8f88]">
                      <Icon className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#06182a]/38">
                        Paso {String(index + 1).padStart(2, '0')}
                      </p>
                      <h3 className="mt-1 text-[25px] font-semibold tracking-[-0.045em] text-[#06182a]">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-[16px] leading-7 tracking-[-0.015em] text-[#06182a]/56">
                        {item.text}
                      </p>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </Shell>
    </section>
  );
}

function VisionCard({ item }) {
  const Icon = item.icon;

  return (
    <motion.article
      {...fadeUp}
      className="rounded-[32px] border border-black/[0.06] bg-white p-7 shadow-[0_18px_60px_rgba(6,24,42,0.06)] transition hover:-translate-y-1 hover:shadow-[0_26px_80px_rgba(6,24,42,0.10)]"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eafffb] text-[#0f8f88]">
        <Icon className="h-5 w-5" />
      </div>

      <h3 className="mt-7 text-[25px] font-semibold tracking-[-0.045em] text-[#06182a]">
        {item.title}
      </h3>

      <p className="mt-3 text-[16px] leading-7 tracking-[-0.015em] text-[#06182a]/56">
        {item.text}
      </p>
    </motion.article>
  );
}

function VisionSection() {
  return (
    <section id="vision" className="bg-white py-20 sm:py-28">
      <Shell>
        <SectionTitle
          eyebrow="Visión"
          title="Tecnología paraguaya para una economía más justa."
          text="ManosYA combina inteligencia artificial, ubicación, comunicación instantánea y confianza digital para crear oportunidades laborales reales."
        />

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {vision.map((item) => (
            <VisionCard key={item.title} item={item} />
          ))}
        </div>
      </Shell>
    </section>
  );
}

function ArchiveSection() {
  return (
    <section id="archivo" className="bg-[#f5f7f7] py-20 sm:py-28">
      <Shell>
        <div className="rounded-[44px] border border-black/[0.06] bg-white p-6 shadow-[0_30px_100px_rgba(6,24,42,0.08)] sm:p-10 lg:p-12">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <SectionTitle
              eyebrow="Archivo"
              title="Registro oficial."
              text="Una síntesis pública del origen, la visión y la evolución institucional de ManosYA."
              align="left"
            />

            <motion.div {...fadeUp} className="grid gap-4 sm:grid-cols-2">
              {archiveStats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[26px] border border-black/[0.06] bg-[#f8faf9] p-6"
                >
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#06182a]/36">
                    {item.label}
                  </p>
                  <p className="mt-3 text-[24px] font-semibold tracking-[-0.045em] text-[#06182a]">
                    {item.value}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {updates.map((item) => (
              <motion.article
                key={item.title}
                {...fadeUp}
                className="rounded-[30px] border border-black/[0.06] bg-white p-7 shadow-[0_14px_46px_rgba(6,24,42,0.045)]"
              >
                <h3 className="text-[28px] font-semibold leading-tight tracking-[-0.05em] text-[#06182a]">
                  {item.title}
                </h3>
                <p className="mt-4 text-[16px] leading-7 tracking-[-0.015em] text-[#06182a]/56">
                  {item.text}
                </p>
              </motion.article>
            ))}
          </div>
        </div>
      </Shell>
    </section>
  );
}

function PressSection() {
  return (
    <section id="prensa" className="bg-white py-20 sm:py-28">
      <Shell>
        <SectionTitle
          eyebrow="Prensa"
          title="Recursos oficiales para medios y entrevistas."
          text="Un espacio público para ordenar la evolución de ManosYA, su historia fundacional y su impacto en el trabajo independiente paraguayo."
        />

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {pressItems.map((item) => {
            const Icon = item.icon;

            return (
              <motion.article
                key={item.title}
                {...fadeUp}
                className="rounded-[32px] border border-black/[0.06] bg-[#f8faf9] p-7"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#0f8f88] shadow-sm">
                  <Icon className="h-5 w-5" />
                </div>

                <h3 className="mt-7 text-[25px] font-semibold tracking-[-0.045em] text-[#06182a]">
                  {item.title}
                </h3>

                <p className="mt-3 text-[16px] leading-7 tracking-[-0.015em] text-[#06182a]/56">
                  {item.text}
                </p>
              </motion.article>
            );
          })}
        </div>

        <motion.div
          {...fadeUp}
          className="mt-16 rounded-[44px] bg-[#f5f7f7] p-7 text-center sm:p-10"
        >
          <h3 className="text-[34px] font-semibold tracking-[-0.055em] text-[#06182a] sm:text-[48px]">
            Contacto institucional
          </h3>

          <p className="mx-auto mt-4 max-w-2xl text-[17px] leading-7 text-[#06182a]/56">
            Para entrevistas, prensa, alianzas o información oficial sobre ManosYA.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {contactButtons.map((item) => (
              <PrimaryButton
                key={item.label}
                href={item.href}
                icon={item.icon}
                dark={item.label === 'WhatsApp'}
              >
                {item.label}
              </PrimaryButton>
            ))}
          </div>
        </motion.div>
      </Shell>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-black/[0.06] bg-white py-8">
      <Shell>
        <div className="flex flex-col gap-5 text-[14px] font-medium text-[#06182a]/48 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="transition hover:text-[#06182a]">
            ManosYA Founder Files
          </Link>

          <div className="flex flex-wrap gap-5">
            <Link href="#historia" className="transition hover:text-[#06182a]">
              Historia
            </Link>
            <Link href="#equipo" className="transition hover:text-[#06182a]">
              Equipo
            </Link>
            <Link href="#vision" className="transition hover:text-[#06182a]">
              Visión
            </Link>
            <Link href={founder.email} className="transition hover:text-[#06182a]">
              Contacto
            </Link>
          </div>
        </div>
      </Shell>
    </footer>
  );
}

export default function FounderPageClient() {
  useEffect(() => {
    const trackFounderView = async () => {
      try {
        await supabase.from('page_views').insert({
          path: '/fundador',
          page: 'founder',
          referrer: document.referrer || null,
          user_agent: navigator.userAgent || null,
          created_at: new Date().toISOString(),
        });
      } catch {
        // Optional analytics table. The public page must never fail because of tracking.
      }
    };

    trackFounderView();
  }, []);

  return (
    <main className="min-h-screen bg-white text-[#06182a] antialiased">
      <Header />
      <Hero />
      <StorySection />
      <ExecutiveTeamSection />
      <AboutSection />
      <VisionSection />
      <ArchiveSection />
      <PressSection />
      <Footer />
    </main>
  );
}