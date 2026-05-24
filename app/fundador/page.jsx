import FounderPageClient from './FounderPageClient';

const siteUrl = 'https://www.manosya.app';
const pageUrl = `${siteUrl}/fundador`;
const founderImage = `${siteUrl}/founder-roger-nunez.png`;
const directorImage = `${siteUrl}/ivan-armoa-director-general.jpeg`;
const title = 'Roger Núñez | Fundador de ManosYA';
const description =
  'Perfil oficial de Roger Núñez, fundador de ManosYA, la startup tecnológica paraguaya que conecta trabajadores y clientes en tiempo real mediante geolocalización, inteligencia artificial y confianza digital.';

export const metadata = {
  title,
  description,
  keywords: [
    'Roger Núñez',
    'Roger Nunez',
    'Roger Núñez fundador',
    'Roger Núñez ManosYA',
    'Fundador de ManosYA',
    'Iván Armoa',
    'Iván Armoa ManosYA',
    'Director General de ManosYA',
    'ManosYA founder',
    'ManosYA Paraguay',
    'startup paraguaya',
    'tecnología paraguaya',
    'inteligencia artificial Paraguay',
    'geolocalización Paraguay',
    'economía digital Paraguay',
    'plataforma de servicios Paraguay',
    'trabajadores Paraguay',
    'Ciudad del Este startup',
  ],
  alternates: {
    canonical: '/fundador',
  },
  authors: [{ name: 'Roger Núñez', url: pageUrl }],
  creator: 'Roger Núñez',
  publisher: 'ManosYA',
  category: 'Technology',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    title: 'Roger Núñez, Fundador de ManosYA',
    description,
    url: pageUrl,
    siteName: 'ManosYA',
    locale: 'es_PY',
    type: 'profile',
    images: [
      {
        url: '/founder-roger-nunez.png',
        width: 1200,
        height: 1200,
        alt: 'Roger Núñez, fundador de ManosYA',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Roger Núñez, Fundador de ManosYA',
    description,
    images: ['/founder-roger-nunez.png'],
    creator: '@manosya',
  },
};

const personSchema = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': `${pageUrl}#roger-nunez`,
  name: 'Roger Núñez',
  alternateName: ['Roger Nunez', 'Roger Núñez Arzamendia'],
  jobTitle: 'Founder',
  url: pageUrl,
  image: founderImage,
  description:
    'Roger Núñez es el fundador de ManosYA, una plataforma tecnológica paraguaya creada para conectar trabajadores y clientes en tiempo real.',
  nationality: {
    '@type': 'Country',
    name: 'Paraguay',
  },
  homeLocation: {
    '@type': 'Place',
    name: 'Ciudad del Este, Paraguay',
  },
  worksFor: {
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: 'ManosYA',
    url: siteUrl,
  },
  founderOf: {
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: 'ManosYA',
    url: siteUrl,
  },
  sameAs: [
    'https://wa.me/message/PRXLIIJV27NVD1',
    'https://www.instagram.com/manosya.py?igsh=MTdobXp2dzlvNHJ3Zw==',
    'https://www.facebook.com/profile.php?id=61583934836185',
  ],
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${siteUrl}/#organization`,
  name: 'ManosYA',
  url: siteUrl,
  logo: `${siteUrl}/logo-manosya.png`,
  description:
    'ManosYA es una plataforma tecnológica paraguaya que conecta trabajadores, clientes y proveedores mediante geolocalización, comunicación instantánea e inteligencia artificial.',
  founder: {
    '@type': 'Person',
    '@id': `${pageUrl}#roger-nunez`,
    name: 'Roger Núñez',
  },
  employee: [
    {
      '@type': 'Person',
      '@id': `${pageUrl}#ivan-armoa`,
      name: 'Iván Armoa',
      jobTitle: 'Director General',
    },
  ],
  foundingLocation: {
    '@type': 'Place',
    name: 'Ciudad del Este, Paraguay',
  },
};

const directorSchema = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': `${pageUrl}#ivan-armoa`,
  name: 'Iván Armoa',
  jobTitle: 'Director General',
  url: `${pageUrl}#direccion`,
  image: directorImage,
  description:
    'Iván Armoa es Director General de ManosYA, con experiencia en publicidad, diseño, comunicación, campañas políticas, empresas y construcción de marcas.',
  worksFor: {
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: 'ManosYA',
    url: siteUrl,
  },
};

const profilePageSchema = {
  '@context': 'https://schema.org',
  '@type': 'ProfilePage',
  '@id': `${pageUrl}#profile-page`,
  url: pageUrl,
  name: 'Roger Núñez - Fundador de ManosYA',
  headline: 'Perfil oficial del fundador de ManosYA',
  description,
  inLanguage: 'es-PY',
  mainEntity: {
    '@id': `${pageUrl}#roger-nunez`,
  },
  about: {
    '@id': `${siteUrl}/#organization`,
  },
};

const founderStorySchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  '@id': `${pageUrl}#historia-oficial`,
  url: `${pageUrl}#historia`,
  headline: 'La historia oficial de Roger Núñez, fundador de ManosYA',
  name: 'Historia oficial del fundador de ManosYA',
  description:
    'ManosYA nació en una conversación familiar entre Roger Núñez y su padre, Rogelio Núñez Arzamendia, sobre trabajo digno, oportunidades y tecnología paraguaya.',
  inLanguage: 'es-PY',
  image: founderImage,
  author: {
    '@type': 'Person',
    '@id': `${pageUrl}#roger-nunez`,
    name: 'Roger Núñez',
  },
  publisher: {
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: 'ManosYA',
    logo: {
      '@type': 'ImageObject',
      url: `${siteUrl}/logo-manosya.png`,
    },
  },
  about: [
    {
      '@type': 'Person',
      '@id': `${pageUrl}#roger-nunez`,
      name: 'Roger Núñez',
      jobTitle: 'Founder',
    },
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: 'ManosYA',
    },
    {
      '@type': 'Person',
      '@id': `${pageUrl}#ivan-armoa`,
      name: 'Iván Armoa',
      jobTitle: 'Director General',
    },
  ],
  articleSection: 'Founder Story',
  keywords:
    'Roger Núñez, fundador de ManosYA, historia de ManosYA, tecnología paraguaya, Ciudad del Este, trabajo digno, geolocalización, inteligencia artificial',
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'ManosYA',
      item: siteUrl,
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Fundador',
      item: pageUrl,
    },
  ],
};

export default function FounderPage() {
  const structuredData = [
    personSchema,
    directorSchema,
    organizationSchema,
    profilePageSchema,
    founderStorySchema,
    breadcrumbSchema,
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <FounderPageClient />
    </>
  );
}
