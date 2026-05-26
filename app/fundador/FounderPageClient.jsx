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
  Compass,
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
  Search,
  ShieldCheck,
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
    role: 'Director Ejecutivo (CEO)',
    photo: '/sergio-gonzalez-ceo.jpeg',
    eyebrow: 'Dirección ejecutiva',
    story:
      'Sergio fue compañero de colegio de Roger desde séptimo hasta octavo grado. Con el tiempo, aquella amistad se convirtió en una visión empresarial compartida: construir una plataforma paraguaya capaz de ordenar trabajo, confianza y crecimiento real.',
    responsibilities: [
      'Dirección ejecutiva general',
      'Estrategia de crecimiento',
      'Expansión nacional',
      'Supervisión de operaciones',
      'Toma de decisiones estratégicas',
      'Coordinación interna del equipo',
      'Desarrollo empresarial y alianzas',
    ],
  },
  {
    name: 'Alex Gonzalez',
    role: 'Vicepresidente de ManosYA',
    photo: '/alex-gonzalez-vicepresidente.png',
    eyebrow: 'Vicepresidencia',
    story:
      'Alex es uno de los amigos más cercanos de Roger y una pieza clave en el crecimiento interno de ManosYA. Su lugar en el proyecto aporta confianza, apoyo estratégico y una mirada moderna sobre cómo la tecnología debe sentirse humana.',
    responsibilities: [
      'Vicepresidencia general',
      'Supervisión de innovación',
      'Coordinación de mejoras internas',
      'Apoyo estratégico al fundador',
      'Experiencia humana y tecnológica',
      'Desarrollo de nuevas ideas',
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
  'Hay historias que no empiezan en una oficina. Empiezan cruzando fronteras, aprendiendo de nuevo y entendiendo cómo se mueve la gente cuando necesita salir adelante.',
  'Iván Armoa llegó a Paraguay después de construir una trayectoria de más de dos décadas en el mundo de la publicidad, el diseño y la comunicación. Desde entonces, trabajó en campañas políticas, empresas, marcas nacionales e internacionales, desarrollando estrategias, construyendo identidades y transformando ideas en proyectos reales.',
  'Fue justamente en ese camino donde conoció a Roger Núñez. Lo que comenzó como una colaboración profesional durante campañas políticas en Ciudad del Este terminó convirtiéndose, con los años, en una relación construida sobre trabajo, visión y confianza.',
  'Tiempo después, Roger lo invitó a formar parte de ManosYA. Y algo hizo clic.',
  'Porque detrás de la tecnología, Iván encontró algo mucho más grande: una herramienta capaz de cambiar la manera en que las personas trabajan, se conectan y generan oportunidades en Paraguay.',
  'Hoy, como Director General de ManosYA, apuesta su experiencia, creatividad y visión estratégica al crecimiento del proyecto, con un objetivo claro: llevar esta idea a lo más alto y convertirla en una plataforma que impacte de verdad en la vida de miles de personas.',
];

const timeline = [
  {
    title: 'Colegio',
    text: 'Amistades reales, conversaciones simples y vínculos que más tarde sostendrían decisiones grandes.',
    icon: UsersRound,
  },
  {
    title: 'Idea',
    text: 'Una pregunta familiar abrió el camino: cómo llevar el trabajo digno al teléfono de cada persona.',
    icon: Sparkles,
  },
  {
    title: 'Crecimiento',
    text: 'Bocetos, pruebas, noches largas y una convicción: Paraguay también puede crear tecnología de escala.',
    icon: Rocket,
  },
  {
    title: 'Fundación',
    text: 'ManosYA empezó a tomar forma como puente entre clientes, trabajadores y proveedores.',
    icon: Handshake,
  },
  {
    title: 'Expansión tecnológica',
    text: 'IA, geolocalización, reputación y comunicación instantánea para profesionalizar servicios reales.',
    icon: BrainCircuit,
  },
];

const updates = [
  {
    title: 'La conversación familiar que originó ManosYA',
    date: 'Historia oficial',
    text: 'El punto de partida fue una visión compartida entre padre e hijo: trabajo digno, oportunidades reales y tecnología al servicio de la gente.',
  },
  {
    title: 'ManosYA como plataforma tecnológica paraguaya',
    date: 'Archivo institucional',
    text: 'El proyecto documenta una nueva forma de conectar clientes, trabajadores y proveedores mediante geolocalización, confianza digital e inteligencia artificial.',
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
    title: 'Oportunidad laboral',
    text: 'Perfiles, reputación y trazabilidad para trabajadores honestos que quieren crecer.',
    icon: BriefcaseBusiness,
  },
];

const archiveStats = [
  { label: 'País', value: 'Paraguay' },
  { label: 'Ciudad origen', value: 'Ciudad del Este' },
  { label: 'Compañía', value: 'ManosYA' },
  { label: 'Rol', value: 'Founder' },
];

const milestones = [
  {
    title: 'Trabajadores conectados',
    text: 'Base digital para visibilidad, confianza y nuevas oportunidades.',
    icon: ShieldCheck,
  },
  {
    title: 'Servicios digitales',
    text: 'Categorías, búsquedas y solicitudes pensadas para necesidades reales.',
    icon: Search,
  },
  {
    title: 'Expansión',
    text: 'Un modelo paraguayo con vocación regional para la economía de servicios.',
    icon: RadioTower,
  },
  {
    title: 'Innovación tecnológica',
    text: 'IA, ubicación y comunicación instantánea integradas en una app útil.',
    icon: Sparkles,
  },
];

const pressItems = [
  { title: 'Entrevistas', text: 'Conversaciones con medios, comunidad tecnológica y ecosistema emprendedor.', icon: Mic2 },
  { title: 'Noticias', text: 'Actualizaciones oficiales sobre producto, crecimiento, alianzas y expansión.', icon: Newspaper },
  { title: 'Medios', text: 'Biografía, imágenes oficiales y datos institucionales para prensa.', icon: FileText },
  { title: 'Podcasts', text: 'Charlas sobre tecnología paraguaya, trabajo independiente e inteligencia artificial.', icon: RadioTower },
];

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-70px' },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
};

function Header() {
  return (
    <header className="border-b border-[#62bfb9]/24 bg-white">
      <div className="mx-auto flex min-h-[116px] max-w-[1800px] flex-col justify-between gap-6 px-5 py-6 sm:px-8 lg:min-h-[164px] lg:flex-row lg:items-center lg:px-12">
        <Link href="/" className="group inline-flex items-center gap-4" aria-label="ManosYA">
          <span className="relative flex h-14 w-32 items-center justify-center overflow-hidden rounded-md bg-[#62bfb9] px-3 shadow-[0_12px_28px_rgba(6,24,42,0.10)] sm:h-16 sm:w-40 sm:px-4">
            <Image
              src="/logo-manosya.png"
              alt="ManosYA"
              width={320}
              height={170}
              className="h-full w-full object-contain"
            />
          </span>
          <span className="leading-none">
            <span className="block text-[30px] font-black tracking-[-0.06em] text-[#06182a] sm:text-[48px]">
              founder files
            </span>
            <span className="mt-1 block text-[16px] font-semibold tracking-[-0.03em] text-[#06182a]/62 sm:text-[22px]">
              Roger Núñez archive
            </span>
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-4 text-[15px] font-semibold text-[#06182a] sm:gap-6 sm:text-lg">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-[#0f8f88]">
              {item.label}
            </Link>
          ))}
          <Link
            href={founder.whatsapp}
            className="rounded-full border-2 border-[#62bfb9] px-4 py-2 text-[#0f746f] transition hover:bg-[#62bfb9] hover:text-white"
          >
            Contacto
          </Link>
          <Link href={founder.instagram} aria-label="Instagram" className="text-[#06182a] transition hover:text-[#0f8f88]">
            <Instagram className="h-5 w-5" />
          </Link>
          <Link href={founder.facebook} aria-label="Facebook" className="text-[#06182a] transition hover:text-[#0f8f88]">
            <Facebook className="h-5 w-5" />
          </Link>
        </nav>
      </div>
    </header>
  );
}

function PrimaryButton({ href, children, dark = false, icon: Icon = ArrowRight }) {
  return (
    <Link
      href={href}
      className={[
        'inline-flex h-12 items-center justify-center rounded-md border-2 px-5 text-base font-black transition hover:-translate-y-0.5',
        dark
          ? 'border-[#06182a] bg-[#06182a] text-white shadow-[0_12px_26px_rgba(6,24,42,0.2)]'
          : 'border-[#06182a] bg-[#62bfb9] text-[#06182a] hover:bg-white',
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
      initial={{ opacity: 0, scale: 0.96, y: 18 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto w-full max-w-[500px] lg:max-w-[720px]"
    >
      <div className="relative aspect-[1.16/1] overflow-hidden rounded-[50%] bg-black shadow-[0_28px_80px_rgba(0,0,0,0.22)]">
        <Image
          src={founder.photo}
          alt="Roger Núñez, fundador de ManosYA"
          width={1000}
          height={1000}
          priority
          className="h-full w-full scale-[1.06] object-cover grayscale"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_55%_30%,transparent_0%,rgba(0,0,0,0.18)_58%,rgba(0,0,0,0.5)_100%)]" />
      </div>
    </motion.div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#62bfb9]">
      <div className="absolute -right-[18vw] -top-[19vw] h-[46vw] w-[58vw] rounded-[50%] bg-white" />
      <div className="absolute -bottom-[24vw] left-[10vw] h-[48vw] w-[56vw] rounded-[50%] bg-[#eafffb]" />

      <div className="relative mx-auto grid min-h-[680px] max-w-[1800px] items-center gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[0.94fr_1.06fr] lg:px-12 lg:py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.68, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-4xl"
        >
          <p className="text-[16px] font-black uppercase tracking-[0.1em] text-[#063b42] sm:text-xl">
            Archivo oficial del fundador
          </p>
          <h1 className="mt-7 max-w-4xl text-[44px] font-black leading-[1.05] tracking-[-0.04em] text-[#06182a] sm:text-[64px] lg:text-[74px]">
            Roger Núñez es el fundador de ManosYA.
          </h1>
          <div className="mt-8 space-y-7 text-[24px] leading-[1.55] tracking-[-0.02em] text-[#06182a] sm:text-[30px]">
            <p>
              <strong>ManosYA</strong> es una plataforma tecnológica paraguaya creada para conectar trabajadores,
              clientes y proveedores en tiempo real.
            </p>
            <p>
              Su historia nace en Ciudad del Este, en una conversación familiar sobre trabajo digno,
              oportunidades reales y una pregunta simple: <strong>¿y si el trabajo pudiera estar en la palma de la mano?</strong>
            </p>
          </div>

          <div className="mt-9 flex flex-wrap gap-4">
            <PrimaryButton href="#historia" dark>
              Leer historia
            </PrimaryButton>
            <PrimaryButton href="/" icon={ArrowRight}>
              Conocer ManosYA
            </PrimaryButton>
          </div>
        </motion.div>

        <FounderImage />
      </div>
    </section>
  );
}

function SectionTitle({ eyebrow, title, text, dark = false }) {
  return (
    <motion.div {...fadeUp} className="mx-auto max-w-4xl text-center">
      <p className="text-sm font-black uppercase tracking-[0.16em] text-[#62bfb9]">{eyebrow}</p>
      <h2
        className={[
          'mt-4 text-[34px] font-black leading-[1.08] tracking-[-0.04em] sm:text-[52px]',
          dark ? 'text-white' : 'text-[#06182a]',
        ].join(' ')}
      >
        {title}
      </h2>
      {text ? (
        <p className={['mx-auto mt-5 max-w-3xl text-lg leading-8', dark ? 'text-white/68' : 'text-[#06182a]/66'].join(' ')}>
          {text}
        </p>
      ) : null}
    </motion.div>
  );
}

function StorySection() {
  return (
    <section id="historia" className="relative bg-white px-5 py-16 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-[1280px]">
        <SectionTitle
          eyebrow="Founder story"
          title="La historia oficial de ManosYA"
          text="Este texto está estructurado para que Google pueda entender el vínculo entre Roger Núñez, ManosYA y el origen de la plataforma."
        />

        <motion.article
          {...fadeUp}
          className="mx-auto mt-12 max-w-5xl border-l-8 border-[#62bfb9] pl-5 sm:pl-8"
        >
          <div className="space-y-7 text-[22px] leading-[1.65] tracking-[-0.02em] text-[#06182a] sm:text-[27px]">
            {storyParagraphs.map((paragraph, index) => (
              <p key={paragraph} className={index === 2 ? 'font-black text-[#0f8f88]' : ''}>
                {paragraph}
              </p>
            ))}
          </div>
        </motion.article>
      </div>
    </section>
  );
}

function DirectorCard() {
  return (
    <motion.div
      {...fadeUp}
      whileHover={{ y: -6 }}
      className="relative overflow-hidden rounded-[30px] border border-white/14 bg-white/[0.06] shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl"
    >
      <Image
        src={director.photo}
        alt="Iván Armoa, Director General de ManosYA"
        width={1200}
        height={760}
        className="aspect-[4/3] w-full object-cover grayscale"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,24,42,0)_0%,rgba(6,24,42,0.22)_42%,rgba(6,24,42,0.94)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#62bfb9]">
          Dirección General
        </p>
        <h3 className="mt-2 text-3xl font-black tracking-[-0.04em] text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.72)]">
          {director.name}
        </h3>
        <p className="mt-1 text-sm font-semibold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">{director.role}</p>
      </div>
    </motion.div>
  );
}

function ExecutiveCard({ member, featured = false }) {
  return (
    <motion.article
      {...fadeUp}
      whileHover={{ y: -8, scale: 1.01 }}
      className={[
        'group relative overflow-hidden rounded-[34px] border border-white/14 bg-white/[0.07] shadow-[0_26px_90px_rgba(0,0,0,0.32)] backdrop-blur-2xl',
        featured ? 'lg:grid lg:grid-cols-[0.88fr_1.12fr]' : '',
      ].join(' ')}
    >
      <div className="relative min-h-[360px] overflow-hidden">
        <Image
          src={member.photo}
          alt={`${member.name}, ${member.role}`}
          width={1200}
          height={1500}
          className="h-full min-h-[360px] w-full object-cover grayscale transition duration-700 group-hover:scale-[1.035]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,24,42,0)_0%,rgba(6,24,42,0.36)_48%,rgba(6,24,42,0.98)_100%)]" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#62bfb9]">{member.eyebrow}</p>
          <h3 className="mt-2 text-[32px] font-black leading-none tracking-[-0.05em] text-white sm:text-[42px]">
            {member.name}
          </h3>
          <p className="mt-2 text-base font-bold text-white/86">{member.role}</p>
        </div>
      </div>

      <div className="relative p-6 sm:p-7">
        <div className="absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,#62bfb9,transparent)]" />
        <p className="text-[17px] leading-8 text-white/82">{member.story}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {member.responsibilities.map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#62bfb9]" />
              <span className="text-sm font-bold leading-5 text-white/84">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.article>
  );
}

function ExecutiveTeamSection() {
  return (
    <section id="equipo" className="relative overflow-hidden bg-[#06182a] px-5 py-16 text-white sm:px-8 lg:py-24">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(98,191,185,0.18)_0%,rgba(6,24,42,0)_34%,rgba(98,191,185,0.08)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-[#62bfb9]/40" />

      <div className="relative mx-auto max-w-[1280px]">
        <SectionTitle
          eyebrow="Equipo Ejecutivo"
          title="Nacido entre amistad, visión y tecnología."
          text="ManosYA no se levantó desde una oficina perfecta. Se levantó desde vínculos reales, confianza, trabajo y la decisión de convertir una necesidad paraguaya en infraestructura tecnológica."
          dark
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div className="space-y-6">
            <DirectorCard />
            <motion.article {...fadeUp} className="rounded-[30px] border border-white/12 bg-white/[0.055] p-6 backdrop-blur-xl">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#62bfb9]">
                Dirección institucional
              </p>
              <h3 className="mt-3 text-[30px] font-black leading-tight tracking-[-0.04em] text-white">
                Iván Armoa convierte visión en estructura.
              </h3>
              <div className="mt-5 space-y-4 text-[15px] leading-7 text-white/72">
                {directorParagraphs.slice(0, 3).map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </motion.article>
          </div>

          <div className="grid gap-6">
            {executives.map((member, index) => (
              <ExecutiveCard key={member.name} member={member} featured={index === 0} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section id="nosotros" className="bg-[#071d2f] px-5 py-16 text-white sm:px-8 lg:py-24">
      <div className="mx-auto max-w-[1280px]">
        <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
          <motion.div {...fadeUp} className="sticky top-6">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#62bfb9]">Sobre Nosotros</p>
            <h2 className="mt-4 text-[38px] font-black leading-[1.02] tracking-[-0.05em] text-white sm:text-[58px]">
              Una startup paraguaya con historia humana.
            </h2>
            <p className="mt-6 text-xl leading-9 text-white/72">
              ManosYA no intenta parecer grande. Está creciendo desde abajo, con personas reales, problemas reales y una misión concreta:
              que pedir ayuda, encontrar trabajo o vender insumos sea más simple, más confiable y más justo.
            </p>
            <div className="mt-7 rounded-[28px] border border-[#62bfb9]/26 bg-[#62bfb9]/10 p-6">
              <Compass className="h-8 w-8 text-[#62bfb9]" />
              <p className="mt-4 text-[22px] font-black leading-8 tracking-[-0.03em] text-white">
                Amistad, sacrificio y tecnología puestos al servicio de una economía que necesita moverse mejor.
              </p>
            </div>
          </motion.div>

          <div className="space-y-4">
            {timeline.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.article
                  key={item.title}
                  {...fadeUp}
                  className="relative overflow-hidden rounded-[28px] border border-white/12 bg-white/[0.06] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)]"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#62bfb9] text-[#06182a]">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#62bfb9]">
                        Paso {String(index + 1).padStart(2, '0')}
                      </p>
                      <h3 className="mt-1 text-2xl font-black tracking-[-0.04em] text-white">{item.title}</h3>
                      <p className="mt-2 text-base leading-7 text-white/68">{item.text}</p>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function VisionCard({ item }) {
  const Icon = item.icon;

  return (
    <motion.article {...fadeUp} className="border-t-4 border-[#62bfb9] bg-white p-6 shadow-[0_18px_42px_rgba(6,24,42,0.07)]">
      <Icon className="h-7 w-7 text-[#0f8f88]" />
      <h3 className="mt-5 text-2xl font-black tracking-[-0.03em] text-[#06182a]">{item.title}</h3>
      <p className="mt-3 text-lg leading-8 text-[#06182a]/66">{item.text}</p>
    </motion.article>
  );
}

function VisionSection() {
  return (
    <section id="vision" className="bg-[#eafffb] px-5 py-16 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-[1280px]">
        <SectionTitle
          eyebrow="Visión"
          title="Tecnología paraguaya para una economía de servicios más justa."
          text="ManosYA combina inteligencia artificial, geolocalización, comunicación instantánea y confianza digital para crear oportunidades laborales reales."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {vision.map((item) => (
            <VisionCard key={item.title} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ArchiveSection() {
  return (
    <section id="archivo" className="relative overflow-hidden bg-white px-5 py-16 sm:px-8 lg:py-24">
      <div className="absolute left-0 right-0 top-0 h-28 bg-[#62bfb9]" />
      <div className="relative mx-auto max-w-[1280px] pt-10">
        <h2 className="text-center text-[38px] font-black tracking-[-0.04em] text-[#06182a] sm:text-[56px]">
          Latest Updates:
        </h2>

        <motion.div {...fadeUp} className="mx-auto mt-10 max-w-5xl border-l-8 border-[#62bfb9] pl-5 sm:pl-8">
          <p className="text-[23px] font-black leading-[1.4] tracking-[-0.03em] text-[#06182a] sm:text-[32px]">
            ManosYA documenta la visión de Roger Núñez como fundador, el origen familiar del proyecto y
            la construcción de una plataforma tecnológica hecha desde Paraguay.
          </p>
          <p className="mt-6 text-lg font-semibold text-[#06182a]/56">ManosYA Founder Files</p>
        </motion.div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {updates.map((item) => (
            <motion.article key={item.title} {...fadeUp}>
              <h3 className="text-[27px] font-black leading-tight tracking-[-0.03em] text-[#06182a]">
                {item.title}
              </h3>
              <p className="mt-5 text-[20px] leading-9 text-[#06182a]/76">{item.text}</p>
              <p className="mt-5 text-lg text-[#06182a]/46">{item.date}</p>
            </motion.article>
          ))}
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {archiveStats.map((item) => (
            <motion.div key={item.label} {...fadeUp} className="border border-[#62bfb9]/24 bg-white p-5 shadow-[0_14px_34px_rgba(6,24,42,0.05)]">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#06182a]/48">{item.label}</p>
              <p className="mt-3 text-2xl font-black tracking-[-0.03em] text-[#06182a]">{item.value}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MilestonesSection() {
  return (
    <section className="bg-[#62bfb9] px-5 py-16 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-[1280px]">
        <SectionTitle
          eyebrow="Logros"
          title="Una infraestructura para conectar trabajo real."
          text="El archivo del fundador también registra los pilares de producto: trabajadores conectados, servicios digitales, expansión e innovación tecnológica."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {milestones.map((item) => {
            const Icon = item.icon;
            return (
              <motion.article key={item.title} {...fadeUp} className="bg-white p-6 shadow-[0_18px_44px_rgba(0,0,0,0.12)]">
                <Icon className="h-7 w-7 text-[#0f8f88]" />
                <h3 className="mt-5 text-2xl font-black tracking-[-0.03em] text-[#06182a]">{item.title}</h3>
                <p className="mt-3 text-lg leading-8 text-[#06182a]/66">{item.text}</p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PressSection() {
  return (
    <section id="prensa" className="bg-white px-5 py-16 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-[1280px]">
        <SectionTitle
          eyebrow="Prensa"
          title="Recursos oficiales para medios, entrevistas y podcasts."
          text="Un espacio público para ordenar la evolución de ManosYA, su historia fundacional y su impacto en el trabajo independiente paraguayo."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {pressItems.map((item) => {
            const Icon = item.icon;
            return (
              <motion.article key={item.title} {...fadeUp} className="border border-[#62bfb9]/24 bg-white p-6 shadow-[0_14px_34px_rgba(6,24,42,0.05)]">
                <Icon className="h-7 w-7 text-[#0f8f88]" />
                <h3 className="mt-5 text-2xl font-black tracking-[-0.03em] text-[#06182a]">{item.title}</h3>
                <p className="mt-3 text-lg leading-8 text-[#06182a]/66">{item.text}</p>
              </motion.article>
            );
          })}
        </div>

        <div className="mt-14 flex flex-wrap justify-center gap-4">
          {contactButtons.map((item) => (
            <PrimaryButton key={item.label} href={item.href} icon={item.icon} dark={item.label === 'WhatsApp'}>
              {item.label}
            </PrimaryButton>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[#62bfb9]/24 bg-white px-5 py-8 sm:px-8">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-5 text-base font-semibold text-[#06182a]/62 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="underline decoration-black/35 underline-offset-4">
          ManosYA Founder Files
        </Link>
        <div className="flex flex-wrap gap-5">
          <Link href="#historia" className="underline decoration-black/35 underline-offset-4">
            Historia
          </Link>
          <Link href="#equipo" className="underline decoration-black/35 underline-offset-4">
            Equipo Ejecutivo
          </Link>
          <Link href="#vision" className="underline decoration-black/35 underline-offset-4">
            Visión
          </Link>
          <Link href={founder.email} className="underline decoration-black/35 underline-offset-4">
            Contacto
          </Link>
        </div>
      </div>
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
    <main className="min-h-screen bg-white text-black">
      <Header />
      <Hero />
      <StorySection />
      <ExecutiveTeamSection />
      <AboutSection />
      <VisionSection />
      <ArchiveSection />
      <MilestonesSection />
      <PressSection />
      <Footer />
    </main>
  );
}
