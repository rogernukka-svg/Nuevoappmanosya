// next.config.js — PWA estable (Next.js) + Cache tiles + Bundle Analyzer + alias "@/" + redirect www

const path = require("path");

const withPWA = require("next-pwa")({
  dest: "public",
  sw: "service-worker.js",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",

  // ✅ evita errores de build PWA (algunos entornos fallan con este manifest)
  buildExcludes: [/app-build-manifest\.json$/],

  // ✅ caching fuerte para MAPA (tiles cross-origin, status 0/opaque en PWA)
  runtimeCaching: [
    // 1) CARTO tiles (tu mapa actual)
    {
      urlPattern: /^https:\/\/tile\.basemaps\.cartocdn\.com\/.*$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "carto-tiles-v6", // 👈 bump versión para romper cache viejo
        expiration: {
          maxEntries: 1500,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 días
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },

    // 2) OSM tiles fallback
    {
      urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "osm-tiles-v6",
        expiration: {
          maxEntries: 1500,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },

    // 3) Google Fonts
    {
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "google-fonts",
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 60 * 60 * 24 * 365,
        },
        cacheableResponse: { statuses: [0, 200] },
      },
    },

    // 4) Imágenes (avatars)
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|webp|gif|ico)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-images-v2",
        expiration: {
          maxEntries: 400,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
  ],
});

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ✅ si estás en etapa de pruebas (luego lo apagamos)
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // ✅ dominio único para que PWA + GPS no se rompa (manosya.app -> www.manosya.app)
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "manosya.app" }],
        destination: "https://www.manosya.app/:path*",
        permanent: true,
      },
    ];
  },

  // ✅ headers útiles (manifest + cache control)
  async headers() {
    return [
      {
        source: "/manifest.json",
        headers: [
          { key: "Content-Type", value: "application/manifest+json" },
          // ⚠️ si estás cambiando mucho el manifest, conviene NO cachearlo fuerte
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      {
        source: "/service-worker.js",
        headers: [
          // ✅ SW nunca debe quedar cacheado por el navegador
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },

  // ✅ si en algún punto usás next/image con imágenes remotas, esto evita bloqueos
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },

  // ✅ alias "@/..."
  webpack: (config) => {
    config.resolve.alias["@"] = path.resolve(__dirname);
    return config;
  },
};

module.exports = withBundleAnalyzer(withPWA(nextConfig));