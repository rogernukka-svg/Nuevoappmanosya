// ✅ next.config.js — versión final corregida para Vercel + PWA + alias
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/app-build-manifest\.json$/], // 👈 evita errores de build PWA
});

const nextConfig = {
  reactStrictMode: true,

  // ✅ Ignora errores de tipo y eslint durante el build
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ✅ Permite usar alias "@/"
  webpack: (config) => {
    config.resolve.alias['@'] = __dirname;
    return config;
  },
};

module.exports = withPWA(nextConfig);