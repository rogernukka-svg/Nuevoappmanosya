// next.config.js — FINAL (Render/Vercel + PWA + Bundle Analyzer + FIX CARTO tiles)

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",

  // evita conflictos con manifests generados por Next
  buildExcludes: [/app-build-manifest\.json$/],

  // ❌ NO usar workboxOpts acá (en tu build rompe con GenerateSW)
  // ✅ Todo lo necesario se maneja con register/skipWaiting y runtimeCaching

  // ✅ Runtime caching: CARTO tiles cross-origin (PWA mobile fix)
  runtimeCaching: [
    // 1) CARTO tiles
    {
      urlPattern: /^https:\/\/tile\.basemaps\.cartocdn\.com\/.*$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "carto-tiles-v3", // 🔥 subí versión para romper cache viejo
        expiration: {
          maxEntries: 1000,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 días
        },
        cacheableResponse: { statuses: [0, 200] }, // 0 = opaque
        fetchOptions: {
          mode: "no-cors",
          credentials: "omit",
        },
      },
    },

    // 2) fallback: imágenes externas
    {
      urlPattern: /^https?:\/\/.*\.(?:png|jpg|jpeg|svg|webp)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "external-images-v1",
        expiration: {
          maxEntries: 300,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  webpack: (config) => {
    config.resolve.alias["@"] = __dirname;
    return config;
  },
};

module.exports = withBundleAnalyzer(withPWA(nextConfig));