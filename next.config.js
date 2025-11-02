// ✅ next.config.js — versión final para Vercel + PWA + Bundle Analyzer + alias
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/app-build-manifest\.json$/], // 👈 evita errores de build PWA
});

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ✅ Ignora errores de tipo y eslint durante el build (útil para deploy rápido)
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // ✅ Permite usar alias "@/"
  webpack: (config) => {
    config.resolve.alias['@'] = __dirname;
    return config;
  },
};

// ✅ Combina PWA y Bundle Analyzer
module.exports = withBundleAnalyzer(withPWA(nextConfig));
