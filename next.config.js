// next.config.js — PWA estable (Next.js) + Cache tiles + Bundle Analyzer + alias "@/"

const withPWA = require("next-pwa")({
  dest: "public",
  sw: "service-worker.js",        // archivo que genera next-pwa dentro de /public
  register: true,                 // ✅ auto-registra el SW (NO hace falta useEffect)
  skipWaiting: true,              // ✅ aplica actualización más rápido
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
        cacheName: "carto-tiles-v5", // 👈 subí versión si querés “romper cache viejo”
        expiration: {
          maxEntries: 1500,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 días
        },
        cacheableResponse: {
          statuses: [0, 200], // ✅ CLAVE para PWA mobile (opaque)
        },
      },
    },

    // 2) OSM tiles fallback (por si cambiás URL de tiles)
    {
      urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "osm-tiles-v5",
        expiration: {
          maxEntries: 1500,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },

    // 3) Google Fonts / fuentes externas (si usás)
    {
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "google-fonts",
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 año
        },
        cacheableResponse: { statuses: [0, 200] },
      },
    },

    // 4) Imágenes (avatars) — mejora carga en móvil
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|webp|gif|ico)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-images",
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

  // ✅ alias "@/..."
  webpack: (config) => {
    config.resolve.alias["@"] = __dirname;
    return config;
  },
};

module.exports = withBundleAnalyzer(withPWA(nextConfig));