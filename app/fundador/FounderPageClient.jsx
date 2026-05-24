'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BrainCircuit,
  BriefcaseBusiness,
  Facebook,
  FileText,
  Globe2,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Mic2,
  Newspaper,
  RadioTower,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

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

const navItems = [
  { label: 'Historia', href: '#historia' },
  { label: 'Dirección', href: '#direccion' },
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
  'Fue justamente en ese camino donde conoció a Roger Núñez. Lo que comenzó como una colaboración profesional durante campañas políticas en Ciudad del Este terminó convirtiéndose, con los años, en una relación construida sobre trabajo, visión y confianza. Mientras cada uno seguía desarrollando su propio recorrido, las ideas volvieron a cruzarlos una y otra vez.',
  'Tiempo después, Roger lo invitó a formar parte de ManosYA. Y algo hizo clic.',
  'Porque detrás de la tecnología, Iván encontró algo mucho más grande: una herramienta capaz de cambiar la manera en que las personas trabajan, se conectan y generan oportunidades en Paraguay.',
  'Hoy, como Director General de ManosYA, apuesta su experiencia, creatividad y visión estratégica al crecimiento del proyecto, con un objetivo claro: llevar esta idea a lo más alto y convertirla en una plataforma que impacte de verdad en la vida de miles de personas.',
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

function SectionTitle({ eyebrow, title, text }) {
  return (
    <motion.div {...fadeUp} className="mx-auto max-w-4xl text-center">
      <p className="text-sm font-black uppercase tracking-[0.16em] text-[#0f8f88]">{eyebrow}</p>
      <h2 className="mt-4 text-[34px] font-black leading-[1.08] tracking-[-0.04em] text-[#06182a] sm:text-[52px]">
        {title}
      </h2>
      {text ? <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-[#06182a]/66">{text}</p> : null}
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

function DirectorSection() {
  return (
    <section id="direccion" className="relative overflow-hidden bg-[#06182a] px-5 py-10 text-white sm:px-8 lg:py-14">
      <div className="absolute -right-24 top-4 h-56 w-56 rounded-full bg-[#62bfb9]/16 blur-3xl" />
      <div className="absolute -left-24 bottom-4 h-56 w-56 rounded-full bg-[#62bfb9]/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-[1120px] gap-7 lg:grid-cols-[0.62fr_1.38fr] lg:items-center">
        <motion.div
          {...fadeUp}
          className="relative mx-auto w-full max-w-[360px] overflow-hidden rounded-[26px] border border-white/12 bg-white/6 shadow-[0_18px_54px_rgba(0,0,0,0.26)]"
        >
          <Image
            src={director.photo}
            alt="Iván Armoa, Director General de ManosYA"
            width={1200}
            height={760}
            className="aspect-[4/3] w-full object-cover grayscale"
          />
          <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(6,24,42,0)_0%,rgba(6,24,42,0.72)_36%,rgba(6,24,42,0.98)_100%)] p-4 pt-14">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#62bfb9]">
              Dirección General
            </p>
            <h3 className="mt-1 text-2xl font-black tracking-[-0.04em] text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.72)]">
              {director.name}
            </h3>
            <p className="mt-1 text-sm font-semibold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">{director.role}</p>
          </div>
        </motion.div>

        <div>
          <motion.div {...fadeUp}>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#62bfb9]">
              Equipo directivo
            </p>
            <h2 className="mt-3 max-w-3xl text-[30px] font-black leading-[1.05] tracking-[-0.04em] text-white sm:text-[44px]">
              Iván Armoa, Director General de ManosYA.
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-white/72 sm:text-lg">
              Estrategia, comunicación y crecimiento institucional al servicio de una plataforma nacida para crear oportunidades reales.
            </p>
          </motion.div>

          <motion.article
            {...fadeUp}
            className="mt-6 border-l-4 border-[#62bfb9] pl-4 sm:pl-6"
          >
            <div className="space-y-3 text-[15px] leading-7 text-white/82 sm:text-[17px] sm:leading-8">
              {directorParagraphs.map((paragraph, index) => (
                <p
                  key={paragraph}
                  className={index === directorParagraphs.length - 1 ? 'font-bold text-white' : ''}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </motion.article>
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
      <div className="absolute left-1/2 top-0 h-[360px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[#62bfb9]" />
      <div className="relative mx-auto max-w-[1280px]">
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
  return (
    <main className="min-h-screen bg-white text-black">
      <Header />
      <Hero />
      <StorySection />
      <DirectorSection />
      <VisionSection />
      <ArchiveSection />
      <MilestonesSection />
      <PressSection />
      <Footer />
    </main>
  );
}
