'use client';

const CONTROL_CHARS_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const DANGEROUS_TEXT_RE = /(?:javascript:|data:text\/html|vbscript:|<\s*\/?\s*(script|iframe|object|embed|link|meta|style)\b|\bon\w+\s*=)/i;
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const DANGEROUS_EXT_RE = /\.(?:exe|msi|bat|cmd|com|scr|ps1|vbs|js|jar|apk|ipa|html?|svg|php)(?:$|\?)/i;
const SHORTENER_HOSTS = new Set([
  'bit.ly',
  'tinyurl.com',
  't.co',
  'cutt.ly',
  'is.gd',
  'rebrand.ly',
  'shorturl.at',
  'goo.gl',
]);

const actionBuckets = new Map();

export function cleanSecurityText(value, maxLength = 1200) {
  return String(value || '')
    .normalize('NFKC')
    .replace(CONTROL_CHARS_RE, '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, maxLength);
}

export function inspectTextSafety(value, options = {}) {
  const text = cleanSecurityText(value, options.maxLength || 1200);
  if (!text) return { ok: false, text: '', error: 'Mensaje vacio' };
  if (DANGEROUS_TEXT_RE.test(text)) {
    return {
      ok: false,
      text,
      error: 'Ese mensaje parece contener codigo o un link inseguro.',
    };
  }

  const links = extractLinks(text);
  const suspiciousLinks = links.filter((link) => isSuspiciousUrl(link));

  return {
    ok: true,
    text,
    links,
    suspiciousLinks,
    warning: suspiciousLinks.length ? 'Revisa el link antes de enviarlo.' : '',
  };
}

export function extractLinks(value) {
  return cleanSecurityText(value, 4000).match(URL_RE) || [];
}

export function safeExternalUrl(rawUrl, options = {}) {
  const value = cleanSecurityText(rawUrl, 1200);
  if (!value || DANGEROUS_EXT_RE.test(value)) return null;

  try {
    const url = new URL(value.startsWith('www.') ? `https://${value}` : value);
    if (!['https:', 'http:'].includes(url.protocol)) return null;
    if (options.httpsOnly !== false && url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;

    const allowedHosts = options.allowedHosts || null;
    if (allowedHosts?.length) {
      const host = url.hostname.replace(/^www\./, '').toLowerCase();
      const allowed = allowedHosts.some((allowedHost) => {
        const cleanHost = String(allowedHost).replace(/^www\./, '').toLowerCase();
        return host === cleanHost || host.endsWith(`.${cleanHost}`);
      });
      if (!allowed) return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function isSuspiciousUrl(rawUrl) {
  const normalized = safeExternalUrl(rawUrl, { httpsOnly: false });
  if (!normalized) return true;

  try {
    const url = new URL(normalized);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    return (
      url.protocol !== 'https:' ||
      host.includes('xn--') ||
      SHORTENER_HOSTS.has(host) ||
      DANGEROUS_EXT_RE.test(url.pathname)
    );
  } catch {
    return true;
  }
}

export function canAttemptAction(key, options = {}) {
  const limit = options.limit || 6;
  const windowMs = options.windowMs || 60_000;
  const now = Date.now();
  const bucketKey = String(key || 'global');
  const previous = actionBuckets.get(bucketKey) || [];
  const recent = previous.filter((time) => now - time < windowMs);

  if (recent.length >= limit) {
    return {
      allowed: false,
      retryAfterMs: Math.max(0, windowMs - (now - recent[0])),
    };
  }

  recent.push(now);
  actionBuckets.set(bucketKey, recent);
  return { allowed: true, retryAfterMs: 0 };
}

export function validateMediaFile(file, options = {}) {
  if (!file) return { ok: false, error: 'Archivo no seleccionado' };

  const allowedTypes = options.allowedTypes || [
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/webm',
  ];
  const maxBytes = options.maxBytes || 250 * 1024 * 1024;
  const name = cleanSecurityText(file.name || '', 240).toLowerCase();
  const type = String(file.type || '').toLowerCase();

  if (DANGEROUS_EXT_RE.test(name)) {
    return { ok: false, error: 'Ese tipo de archivo no esta permitido.' };
  }

  if (!allowedTypes.includes(type)) {
    return { ok: false, error: 'Formato no permitido. Usa foto o video comun.' };
  }

  if (file.size > maxBytes) {
    return { ok: false, error: 'El archivo es demasiado pesado.' };
  }

  return { ok: true };
}
