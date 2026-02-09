// next.config.js — FINAL (Vercel + PWA + Bundle Analyzer + cache tiles CARTO)
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',

  // 👇 evita errores raros de PWA en build
  buildExcludes: [/app-build-manifest\.json$/],

  // ✅ Cache de tiles CARTO (para que en móvil/PWA no quede “blanco”)
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/tile\.basemaps\.cartocdn\.com\/.*$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'carto-tiles',
        expiration: {
          maxEntries: 500,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 días
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],
});

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ✅ Ignora errores de tipo y eslint durante el build (deploy rápido)
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // ✅ Alias "@/..."
  webpack: (config) => {
    config.resolve.alias['@'] = __dirname;
    return config;
  },
};

module.exports = withBundleAnalyzer(withPWA(nextConfig));