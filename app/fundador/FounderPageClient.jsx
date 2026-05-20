'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BrainCircuit,
  BriefcaseBusiness,
  Building2,
  Globe2,
  Linkedin,
  Mail,
  MapPin,
  Mic2,
  Newspaper,
  RadioTower,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

const founder = {
  name: 'Roger Núñez',
  role: 'Fundador de ManosYA',
  photo: '/founder-roger-nunez.png',
  linkedin: 'https://www.linkedin.com/in/roger-nunez',
  contact: 'mailto:contacto@manosya.app',
};

const storyParagraphs = [
  'ManosYA nació mucho antes de convertirse en una aplicación. Nació en una conversación familiar, compartiendo una comida sencilla entre padre e hijo, hablando sobre trabajadores, oportunidades y las dificultades que vive la gente todos los días para encontrar empleo o conseguir ayuda confiable.',
  'Roger Núñez, fundador de ManosYA, creció viendo a su padre, Rogelio Núñez Arzamendia, luchar durante años por los derechos y la dignidad de los trabajadores en Ciudad del Este. Su padre siempre tuvo una visión clara: crear una gran agencia de trabajadores que pudiera conectar personas honestas con oportunidades reales.',
  'Pero con el paso del tiempo, Roger comenzó a imaginar algo diferente. Mientras hablaban juntos sobre trabajo, necesidades y futuro, nació una idea que quedó grabada en su mente: "¿Y si el trabajo pudiera estar en la palma de la mano?"',
  'Desde ese momento, la idea nunca volvió a salir de su cabeza. La visión ya no era solamente una agencia física. Era llevar el trabajo al teléfono. Crear una plataforma inteligente donde una persona pudiera encontrar un trabajador en tiempo real desde una app, de forma rápida, humana y moderna.',
  'Durante más de tres años, esa idea fue creciendo entre bocetos, aprendizajes, desvelos y una obsesión constante por construir algo grande desde Paraguay. Así nació ManosYA: una plataforma tecnológica creada para conectar trabajadores y clientes mediante geolocalización, comunicación instantánea y tecnología pensada para la realidad de Latinoamérica.',
  'Más que una aplicación, ManosYA representa una continuidad de valores entre generaciones: la lucha por el trabajo digno, las oportunidades y la modernización del acceso al empleo.',
  'Desde Ciudad del Este, Roger Núñez transformó aquella conversación con su padre en una visión tecnológica que hoy busca cambiar la manera en que las personas trabajan y se conectan en Paraguay.',
];

const achievements = [
  {
    label: 'Trabajadores conectados',
    value: 'Red activa',
    text: 'Infraestructura para que profesionales independientes ganen visibilidad, confianza y nuevas oportunidades.',
    icon: BriefcaseBusiness,
  },
  {
    label: 'Servicios digitales',
    value: 'On demand',
    text: 'Categorías de trabajo, solicitudes inteligentes y flujos preparados para resolver necesidades reales en minutos.',
    icon: RadioTower,
  },
  {
    label: 'Expansión',
    value: 'Paraguay primero',
    text: 'Un modelo escalable que nace desde el mercado paraguayo y se proyecta hacia una economía de servicios más conectada.',
    icon: Globe2,
  },
  {
    label: 'Innovación tecnológica',
    value: 'IA + ubicación',
    text: 'Búsqueda semántica, geolocalización y automatización para reducir fricción entre quien necesita ayuda y quien puede resolverla.',
    icon: BrainCircuit,
  },
];

const vision = [
  {
    title: 'Inteligencia artificial aplicada',
    text: 'ManosYA usa IA para interpretar necesidades, clasificar servicios y acercar respuestas más precisas en menos tiempo.',
    icon: BrainCircuit,
  },
  {
    title: 'Geolocalización en tiempo real',
    text: 'La cercanía importa. La plataforma conecta demanda y oferta alrededor del lugar exacto donde ocurre la necesidad.',
    icon: MapPin,
  },
  {
    title: 'Economía digital paraguaya',
    text: 'Cada solicitud digital crea una oportunidad para formalizar trabajo, profesionalizar servicios y mover valor dentro del país.',
    icon: Building2,
  },
  {
    title: 'Oportunidades para trabajadores',
    text: 'El producto está diseñado para construir identidad, reputación y trazabilidad para trabajadores honestos y clientes reales.',
    icon: ShieldCheck,
  },
];

const pressItems = [
  {
    title: 'Entrevistas',
    text: 'Espacio reservado para conversaciones con medios, comunidades tecnológicas y ecosistema emprendedor.',
    icon: Mic2,
  },
  {
    title: 'Noticias',
    text: 'Actualizaciones oficiales sobre producto, crecimiento, alianzas y expansión territorial de ManosYA.',
    icon: Newspaper,
  },
  {
    title: 'Medios',
    text: 'Kit institucional, biografía del fundador, imágenes oficiales y materiales para prensa.',
    icon: Sparkles,
  },
  {
    title: 'Podcasts',
    text: 'Charlas sobre tecnología paraguaya, economía digital, trabajo independiente e inteligencia artificial.',
    icon: RadioTower,
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-70px' },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
};

function SectionHeading({ eyebrow, title, text, align = 'center', light = false }) {
  const centered = align === 'center';

  return (
    <motion.div
      {...fadeUp}
      className={centered ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#258f88]">
        {eyebrow}
      </p>
      <h2
        className={[
          'mt-4 text-3xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-5xl',
          light ? 'text-white' : 'text-slate-950',
        ].join(' ')}
      >
        {title}
      </h2>
      {text ? (
        <p
          className={[
            'mt-5 max-w-2xl text-base leading-8 sm:text-lg',
            light ? 'text-slate-300' : 'text-slate-600',
            centered ? 'mx-auto' : '',
          ].join(' ')}
        >
          {text}
        </p>
      ) : null}
    </motion.div>
  );
}

function PremiumButton({ href, children, variant = 'dark', icon: Icon }) {
  const classes =
    variant === 'dark'
      ? 'bg-slate-950 text-white shadow-[0_18px_38px_rgba(15,23,42,0.22)] hover:bg-slate-800'
      : 'border border-slate-200 bg-white/88 text-slate-950 shadow-[0_12px_30px_rgba(15,23,42,0.07)] hover:border-[#62bfb9]/70';

  return (
    <Link
      href={href}
      className={`inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 sm:h-12 sm:px-5 ${classes}`}
    >
      <span>{children}</span>
      {Icon ? <Icon className="ml-2 h-4 w-4" aria-hidden="true" /> : null}
    </Link>
  );
}

function FounderPortrait() {
  return (
    <motion.aside
      initial={{ opacity: 0, scale: 0.97, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.62, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto w-full max-w-[230px] sm:max-w-[320px] lg:max-w-[380px]"
    >
      <div className="relative overflow-hidden rounded-lg border border-white bg-white shadow-[0_28px_72px_rgba(15,23,42,0.14)]">
        <Image
          src={founder.photo}
          alt="Roger Núñez, fundador oficial de ManosYA"
          width={900}
          height={1100}
          priority
          className="aspect-[4/5] w-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(15,23,42,0.88))] p-5 text-white">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/72">
            Founder Profile
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
            {founder.name}
          </p>
          <p className="mt-1 text-sm text-white/78">{founder.role}</p>
        </div>
      </div>
      <p className="mt-3 hidden text-center text-xs font-medium leading-5 text-slate-500 sm:block">
        Foto oficial provisional. Reemplazar public/founder-roger-nunez.png con la imagen final.
      </p>
    </motion.aside>
  );
}

function FeatureCard({ item }) {
  const Icon = item.icon;

  return (
    <motion.article
      {...fadeUp}
      className="rounded-lg border border-slate-200/80 bg-white/86 p-5 shadow-[0_16px_42px_rgba(15,23,42,0.06)] backdrop-blur sm:p-6"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#62bfb9]/12 text-[#217a74]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="mt-5 text-lg font-semibold tracking-[-0.02em] text-slate-950 sm:text-xl">
        {item.title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{item.text}</p>
    </motion.article>
  );
}

function AchievementCard({ item }) {
  const Icon = item.icon;

  return (
    <motion.article
      {...fadeUp}
      className="rounded-lg border border-white/80 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.07)] sm:p-6"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <span className="rounded-full bg-[#62bfb9]/12 px-3 py-1 text-xs font-semibold text-[#217a74]">
          {item.label}
        </span>
      </div>
      <div className="mt-7 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">
        {item.value}
      </div>
      <p className="mt-3 text-sm leading-7 text-slate-600">{item.text}</p>
    </motion.article>
  );
}

function PressCard({ item }) {
  const Icon = item.icon;

  return (
    <motion.article
      {...fadeUp}
      className="rounded-lg border border-white/10 bg-white/[0.04] p-5 backdrop-blur transition duration-200 hover:-translate-y-1 hover:border-[#62bfb9]/60 sm:p-6"
    >
      <Icon className="h-6 w-6 text-[#62bfb9]" aria-hidden="true" />
      <h3 className="mt-5 text-lg font-semibold text-white">{item.title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-300">{item.text}</p>
    </motion.article>
  );
}

export default function FounderPageClient() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f8fffd] text-slate-950">
      <section className="relative border-b border-slate-200/70 bg-[linear-gradient(135deg,#fbfffe_0%,#ffffff_54%,#eafffb_100%)]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:56px_56px]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.42),rgba(255,255,255,0.92))]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1.12fr_0.88fr] lg:py-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.68, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center rounded-full border border-[#62bfb9]/30 bg-white/82 px-4 py-2 text-sm font-semibold text-[#217a74] shadow-[0_12px_28px_rgba(15,23,42,0.06)] backdrop-blur">
              <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
              Perfil oficial del fundador
            </div>

            <h1 className="mt-7 max-w-4xl text-5xl font-semibold leading-[0.98] tracking-[-0.06em] text-slate-950 sm:text-7xl lg:text-[88px]">
              Roger Núñez
            </h1>
            <p className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[#217a74] sm:text-3xl">
              Fundador de ManosYA
            </p>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              Construyendo la plataforma tecnológica que conecta trabajadores y clientes en tiempo real en Paraguay.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <PremiumButton href="/" icon={ArrowRight}>
                Conocer ManosYA
              </PremiumButton>
              <PremiumButton href={founder.linkedin} variant="light" icon={Linkedin}>
                LinkedIn
              </PremiumButton>
              <PremiumButton href={founder.contact} variant="light" icon={Mail}>
                Contacto
              </PremiumButton>
            </div>

            <dl className="mt-9 grid max-w-2xl grid-cols-3 gap-2 sm:gap-3">
              {[
                ['País', 'Paraguay'],
                ['Compañía', 'ManosYA'],
                ['Rol', 'Founder'],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-white/70 bg-white/72 p-3 shadow-[0_10px_28px_rgba(15,23,42,0.05)] backdrop-blur sm:p-4"
                >
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-xs">
                    {label}
                  </dt>
                  <dd className="mt-2 text-xs font-semibold text-slate-950 sm:text-base">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </motion.div>

          <FounderPortrait />
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:py-24" id="historia">
        <article className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <div className="lg:sticky lg:top-8">
            <SectionHeading
              eyebrow="Historia oficial"
              title="La historia que explica por qué existe ManosYA."
              text="Un relato familiar, laboral y tecnológico desde Ciudad del Este. Esta es la base pública de la visión de Roger Núñez como fundador de ManosYA."
              align="left"
            />

            <motion.blockquote
              {...fadeUp}
              className="mt-8 rounded-lg border border-[#62bfb9]/28 bg-[#62bfb9]/10 p-5 text-2xl font-semibold leading-tight tracking-[-0.04em] text-slate-950 shadow-[0_16px_46px_rgba(15,23,42,0.06)] sm:text-3xl"
            >
              “¿Y si el trabajo pudiera estar en la palma de la mano?”
            </motion.blockquote>
          </div>

          <motion.div
            {...fadeUp}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.07)] sm:p-8 lg:p-10"
          >
            <div className="space-y-5 text-[16px] leading-8 text-slate-700 sm:text-lg sm:leading-9">
              {storyParagraphs.map((paragraph, index) => (
                <p
                  key={paragraph}
                  className={index === 0 ? 'text-xl font-medium leading-9 text-slate-950 sm:text-2xl sm:leading-10' : ''}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </motion.div>
        </article>
      </section>

      <section
        className="border-y border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f1fffc_100%)] px-5 py-16 sm:px-8 lg:py-24"
        id="vision"
      >
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow="Visión"
            title="Tecnología paraguaya para la nueva economía de servicios."
            text="La visión de ManosYA une inteligencia artificial, ubicación, confianza digital y oportunidades económicas para que más trabajadores entren a la economía digital desde Paraguay."
          />

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {vision.map((item) => (
              <FeatureCard key={item.title} item={item} />
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:py-24" id="logros">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow="Logros"
            title="Infraestructura para conectar trabajo real."
            text="Cada módulo de ManosYA está diseñado para crear más confianza, más velocidad y más oportunidades para clientes, trabajadores y proveedores."
          />

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {achievements.map((item) => (
              <AchievementCard key={item.label} item={item} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-950 px-5 py-16 text-white sm:px-8 lg:py-24" id="prensa">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow="Prensa"
            title="Recursos oficiales para medios y entrevistas."
            text="Un espacio preparado para documentar la evolución pública de ManosYA, su fundador y el impacto de la tecnología en el trabajo independiente paraguayo."
            align="left"
            light
          />

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {pressItems.map((item) => (
              <PressCard key={item.title} item={item} />
            ))}
          </div>

          <motion.div
            {...fadeUp}
            className="mt-12 flex flex-col items-start justify-between gap-6 rounded-lg border border-white/10 bg-white/[0.04] p-6 sm:flex-row sm:items-center"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#62bfb9]">
                Contacto institucional
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                ManosYA Founder Office
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
                Para entrevistas, alianzas o cobertura editorial sobre ManosYA y Roger Núñez.
              </p>
            </div>
            <PremiumButton href={founder.contact} icon={Mail}>
              Escribir contacto
            </PremiumButton>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
