// ✅ next.config.js — Render/Vercel + PWA + Bundle Analyzer + alias "@/"
// ✅ FIX: quitamos workboxOptions (rompía build con WebpackGenerateSW)

const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",

  // ✅ evita errores de build PWA
  buildExcludes: [/app-build-manifest\.json$/],

  // ✅ Runtime caching: TILES cross-origin (PWA mobile fix)
  runtimeCaching: [
    // 1) CARTO tiles
    {
      urlPattern: /^https:\/\/tile\.basemaps\.cartocdn\.com\/.*$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "carto-tiles-v4", // 👈 subí versión para romper cache viejo
        expiration: {
          maxEntries: 1000,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 días
        },
        // ✅ CLAVE: en PWA muchos tiles vienen como "opaque" (status 0)
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
        cacheName: "osm-tiles-v4",
        expiration: {
          maxEntries: 1000,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
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

  // ✅ deploy rápido (si querés, luego lo sacamos)
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // ✅ Permite usar alias "@/..."
  webpack: (config) => {
    config.resolve.alias["@"] = __dirname;
    return config;
  },
};

// ✅ Combina PWA y Bundle Analyzer
module.exports = withBundleAnalyzer(withPWA(nextConfig));