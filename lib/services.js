export const SERVICE_INTENT_KEY = 'manosya_service_intent';
export const LEGACY_SERVICE_INTENT_KEY = 'manosya_last_intent';

export const SERVICE_CATALOG = [
  { slug: 'plomeria', name: 'Plomería', badge: 'Urgente', related: ['construccion', 'albanileria', 'pintura'] },
  { slug: 'electricidad', name: 'Electricidad', badge: 'Urgente', related: ['refrigeracion', 'construccion'] },
  { slug: 'limpieza', name: 'Limpieza', badge: 'Por hora', related: ['jardineria', 'servicio-general'] },
  { slug: 'construccion', name: 'Construcción', badge: 'Obra', related: ['albanileria', 'pintura', 'plomeria', 'electricidad'] },
  { slug: 'albanileria', name: 'Albañilería', badge: 'Obra', related: ['construccion', 'pintura'] },
  { slug: 'pintura', name: 'Pintura', badge: 'Obra', related: ['construccion', 'albanileria'] },
  { slug: 'jardineria', name: 'Jardinería', badge: 'Agenda', related: ['limpieza'] },
  { slug: 'auxilio-vehicular', name: 'Auxilio vehicular', badge: 'Urgente', related: ['mecanica', 'taxi'] },
  { slug: 'mecanica', name: 'Mecánica', badge: 'Urgente', related: ['auxilio-vehicular'] },
  { slug: 'taxi', name: 'Chofer / Taxi', badge: 'Inmediato', related: ['chofer'] },
  { slug: 'chofer', name: 'Chofer / Taxi', badge: 'Inmediato', related: ['taxi'] },
  { slug: 'fletes', name: 'Fletes y mudanzas', badge: 'Cotización', related: ['chofer', 'taxi'] },
  { slug: 'refrigeracion', name: 'Refrigeración', badge: 'Agenda', related: ['electricidad'] },
  { slug: 'contador', name: 'Contador', badge: 'Consulta', related: ['servicio-general'] },
  { slug: 'abogado', name: 'Abogado', badge: 'Consulta', related: ['servicio-general'] },
  { slug: 'peluqueria', name: 'Peluquería', badge: 'Turnos', related: ['belleza'] },
  { slug: 'belleza', name: 'Belleza', badge: 'Turnos', related: ['peluqueria'] },
  { slug: 'parrillero', name: 'Parrillero', badge: 'Evento', related: ['eventos', 'cocina'] },
  { slug: 'servicio-general', name: 'Servicio general', badge: 'General', related: [] },
];

const SERVICE_ALIASES = {
  plomero: 'plomeria',
  plomería: 'plomeria',
  caneria: 'plomeria',
  cañeria: 'plomeria',
  caño: 'plomeria',
  cano: 'plomeria',
  electricidad: 'electricidad',
  electricista: 'electricidad',
  electrico: 'electricidad',
  eléctrico: 'electricidad',
  limpieza: 'limpieza',
  limpiadora: 'limpieza',
  construccion: 'construccion',
  construcción: 'construccion',
  obra: 'construccion',
  albanil: 'albanileria',
  albañil: 'albanileria',
  albanileria: 'albanileria',
  albañilería: 'albanileria',
  jardineria: 'jardineria',
  jardinería: 'jardineria',
  jardinero: 'jardineria',
  auxilio: 'auxilio-vehicular',
  'auxilio vehicular': 'auxilio-vehicular',
  'auxilio-vehicular': 'auxilio-vehicular',
  mecanico: 'mecanica',
  mecánico: 'mecanica',
  mecanica: 'mecanica',
  mecánica: 'mecanica',
  taxi: 'taxi',
  chofer: 'chofer',
  conductor: 'chofer',
  mudanza: 'fletes',
  mudanzas: 'fletes',
  flete: 'fletes',
  refrigeracion: 'refrigeracion',
  refrigeración: 'refrigeracion',
  aire: 'refrigeracion',
  'aire acondicionado': 'refrigeracion',
  contador: 'contador',
  contabilidad: 'contador',
  abogado: 'abogado',
  legal: 'abogado',
  peluqueria: 'peluqueria',
  peluquería: 'peluqueria',
  parrillero: 'parrillero',
  asado: 'parrillero',
  general: 'servicio-general',
  'servicio general': 'servicio-general',
};

export function normalizeServiceText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function normalizeServiceSlug(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const cleanText = normalizeServiceText(raw);
  const directAlias = SERVICE_ALIASES[raw.toLowerCase()] || SERVICE_ALIASES[cleanText];
  if (directAlias) return directAlias;

  const slug = cleanText
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (SERVICE_ALIASES[slug]) return SERVICE_ALIASES[slug];
  const exact = SERVICE_CATALOG.find((item) => item.slug === slug);
  if (exact) return exact.slug;

  const fuzzy = SERVICE_CATALOG.find((item) => {
    const serviceSlug = normalizeServiceText(item.slug);
    const serviceName = normalizeServiceText(item.name).replace(/\s+/g, '-');
    return slug.includes(serviceSlug) || serviceSlug.includes(slug) || slug.includes(serviceName);
  });

  return fuzzy?.slug || slug;
}

export function getServiceMeta(value) {
  const slug = normalizeServiceSlug(value);
  if (!slug) return null;
  return SERVICE_CATALOG.find((item) => item.slug === slug) || null;
}

export function getServiceLabel(value, fallback = 'Servicio general') {
  if (!value) return fallback;
  return getServiceMeta(value)?.name || String(value);
}

export function getServiceBadge(value) {
  return getServiceMeta(value)?.badge || 'General';
}

export function splitServiceValues(value) {
  if (Array.isArray(value)) return value.flatMap(splitServiceValues);
  if (value == null) return [];

  return String(value)
    .split(/[,\n|/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function workerServiceSlugs(worker = {}) {
  const raw = [
    ...splitServiceValues(worker.skills),
    ...splitServiceValues(worker.main_skill),
    ...splitServiceValues(worker.service_type),
    ...splitServiceValues(worker.skill_slug),
    ...splitServiceValues(worker.category),
  ];

  return [...new Set(raw.map(normalizeServiceSlug).filter(Boolean))];
}

export function serviceRelatedSlugs(serviceSlug) {
  const meta = getServiceMeta(serviceSlug);
  return meta?.related || [];
}

export function workerMatchesService(worker, serviceSlug) {
  const selected = normalizeServiceSlug(serviceSlug);
  if (!selected) return false;

  const slugs = workerServiceSlugs(worker);
  if (slugs.includes(selected)) return true;

  return slugs.some((slug) => slug.includes(selected) || selected.includes(slug));
}

export function workerRelatedToService(worker, serviceSlug) {
  const selected = normalizeServiceSlug(serviceSlug);
  if (!selected) return false;
  if (workerMatchesService(worker, selected)) return true;

  const related = serviceRelatedSlugs(selected);
  const slugs = workerServiceSlugs(worker);
  return slugs.some((slug) => related.includes(slug));
}

export function workerIntentSummary(worker, selectedService = '') {
  const selected = normalizeServiceSlug(selectedService);
  const selectedLabel = selected ? getServiceLabel(selected) : '';
  const slugs = workerServiceSlugs(worker);
  const labels = slugs.map((slug) => getServiceLabel(slug)).filter(Boolean);
  const fallbackLabel = labels[0] || selectedLabel || 'Servicio general';
  const matches = selected ? workerMatchesService(worker, selected) : false;

  if (selected && matches) {
    const others = labels.filter((label) => label !== selectedLabel).slice(0, 2);
    return {
      primarySlug: selected,
      primaryLabel: selectedLabel,
      badgeText: `Disponible en ${selectedLabel}`,
      detailText: others.length ? `${selectedLabel} · También ofrece ${others.join(', ')}` : `Trabajador disponible en ${selectedLabel}`,
      matchesIntent: true,
      serviceLabels: labels,
    };
  }

  if (selected) {
    return {
      primarySlug: slugs[0] || selected,
      primaryLabel: fallbackLabel,
      badgeText: `Relacionado con ${selectedLabel}`,
      detailText: labels.length ? `${fallbackLabel} · Alternativa para ${selectedLabel}` : `Alternativa para ${selectedLabel}`,
      matchesIntent: false,
      serviceLabels: labels,
    };
  }

  return {
    primarySlug: slugs[0] || '',
    primaryLabel: fallbackLabel,
    badgeText: fallbackLabel,
    detailText: labels.length > 1 ? labels.slice(0, 3).join(' · ') : fallbackLabel,
    matchesIntent: false,
    serviceLabels: labels,
  };
}

export function productMatchesService(product, serviceSlug) {
  const selected = normalizeServiceSlug(serviceSlug);
  if (!selected) return true;

  const rawText = [
    product?.service_slug,
    product?.title,
    product?.description,
    product?.need_keywords,
  ].join(' ');
  const normalizedProduct = normalizeServiceSlug(product?.service_slug || '');
  const normalizedText = normalizeServiceText(rawText);

  return (
    (normalizedProduct &&
      (normalizedProduct === selected ||
        normalizedProduct.includes(selected) ||
        selected.includes(normalizedProduct))) ||
    normalizedText.includes(normalizeServiceText(selected)) ||
    normalizedText.includes(normalizeServiceText(getServiceLabel(selected, selected)))
  );
}

export function saveServiceIntent(intent = {}) {
  if (typeof window === 'undefined') return;

  const serviceSlug = normalizeServiceSlug(intent.serviceSlug || intent.service || intent.slug || '');
  const payload = {
    role: intent.role || 'client',
    serviceSlug: serviceSlug || null,
    serviceName: intent.serviceName || (serviceSlug ? getServiceLabel(serviceSlug) : null),
    timing: intent.timing || null,
    source: intent.source || null,
    savedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(SERVICE_INTENT_KEY, JSON.stringify(payload));
    localStorage.setItem(LEGACY_SERVICE_INTENT_KEY, JSON.stringify(payload));
  } catch {}
}

export function readServiceIntent() {
  if (typeof window === 'undefined') return null;

  for (const key of [SERVICE_INTENT_KEY, LEGACY_SERVICE_INTENT_KEY]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const serviceSlug = normalizeServiceSlug(parsed?.serviceSlug || parsed?.service || parsed?.slug || '');
      if (!serviceSlug) continue;

      return {
        ...parsed,
        serviceSlug,
        serviceName: parsed?.serviceName || getServiceLabel(serviceSlug),
      };
    } catch {}
  }

  return null;
}

export function clearServiceIntent() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SERVICE_INTENT_KEY);
    localStorage.removeItem(LEGACY_SERVICE_INTENT_KEY);
  } catch {}
}

export function serviceIntentFromSearchParams(searchParams) {
  const readParam = (key) => {
    if (!searchParams) return '';
    if (typeof searchParams.get === 'function') return searchParams.get(key) || '';
    return searchParams[key] || '';
  };

  const serviceSlug = normalizeServiceSlug(
    readParam('service') ||
    readParam('serviceSlug') ||
    readParam('skill') ||
    readParam('skill_slug')
  );

  if (!serviceSlug) return null;

  return {
    role: 'client',
    serviceSlug,
    serviceName: getServiceLabel(serviceSlug),
    timing: readParam('timing') || null,
    source: 'url',
  };
}
