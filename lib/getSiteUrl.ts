export function getSiteUrl() {
  // Si existe NEXT_PUBLIC_SITE_URL, usala
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  // Si estamos en producción en Vercel
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Si estamos en local
  return "http://localhost:3000";
}
