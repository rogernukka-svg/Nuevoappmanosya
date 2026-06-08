import type { LocalIntentResult, SocialIntent, SocialLeadType } from './types';

const WORKER_SKILLS = [
  'plomero',
  'plomeria',
  'electricista',
  'albanil',
  'albañil',
  'pintor',
  'jardinero',
  'jardineria',
  'limpieza',
  'chofer',
  'taxi',
  'mecanico',
  'mecánico',
  'cerrajero',
  'carpintero',
  'herrero',
  'soldador',
  'tecnico',
  'técnico',
  'niñera',
  'cuidador',
  'cocinero',
  'delivery',
  'mudanza',
  'flete',
];

const SUPPLIER_WORDS = [
  'tengo negocio',
  'vendo',
  'ferreteria',
  'ferretería',
  'local',
  'comercio',
  'proveedor',
  'productos',
  'tienda',
  'almacen',
  'almacén',
  'distribuidora',
];

const USER_NEED_WORDS = [
  'necesito',
  'busco',
  'quiero contratar',
  'me hace falta',
  'preciso',
  'urgente',
  'me arreglan',
  'alguien que',
];

const FLIRTY_WORDS = [
  'lindo',
  'linda',
  'soltero',
  'soltera',
  'novia',
  'novio',
  'me gustas',
  'me gustás',
  'hermoso',
  'hermosa',
  'guapo',
  'guapa',
];

const SUPPORT_WORDS = [
  'problema',
  'no puedo entrar',
  'no me funciona',
  'reclamo',
  'me cobraron',
  'cobraron mal',
  'no aparece mi perfil',
  'soporte',
  'ayuda con mi cuenta',
];

const UNSAFE_WORDS = [
  'puta',
  'mierda',
  'idiota',
  'estafa',
  'sexo',
  'desnudo',
  'desnuda',
  'porno',
  'xxx',
  'promo gratis',
  'bitcoin',
  'cripto',
];

function normalize(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function includesAny(text: string, words: string[]) {
  const clean = normalize(text);
  return words.some((word) => clean.includes(normalize(word)));
}

function findProfession(text: string) {
  const clean = normalize(text);
  return WORKER_SKILLS.find((skill) => clean.includes(normalize(skill))) || null;
}

function looksLikeGreeting(text: string) {
  const clean = normalize(text).replace(/[!¡?¿.,]/g, '').trim();
  return ['hola', 'buenas', 'buen dia', 'buenos dias', 'buenas tardes', 'buenas noches', 'hey'].includes(clean);
}

function extractCity(text: string) {
  const match = String(text || '').match(/\b(?:soy de|estoy en|vivo en|ciudad)\s+([a-záéíóúñ\s]{3,40})/i);
  return match?.[1]?.trim() || null;
}

export function classifySocialIntent(messageText: string): LocalIntentResult {
  const text = String(messageText || '');
  const profession = findProfession(text);

  let intent: SocialIntent = 'unknown';
  let lead_type: SocialLeadType = 'CURIOUS_LEAD';
  let needs_human = false;

  if (includesAny(text, UNSAFE_WORDS)) {
    intent = includesAny(text, ['promo gratis', 'bitcoin', 'cripto']) ? 'spam' : 'unsafe';
    lead_type = 'UNSAFE_LEAD';
  } else if (includesAny(text, SUPPORT_WORDS)) {
    intent = 'support';
    lead_type = 'CURIOUS_LEAD';
    needs_human = true;
  } else if (includesAny(text, FLIRTY_WORDS)) {
    intent = 'flirty';
    lead_type = 'FLIRTY_LEAD';
  } else if (includesAny(text, SUPPLIER_WORDS)) {
    intent = 'supplier_has_business';
    lead_type = 'SUPPLIER_LEAD';
  } else if (includesAny(text, USER_NEED_WORDS)) {
    intent = 'user_needs_service';
    lead_type = 'USER_LEAD';
  } else if (profession) {
    intent = 'worker_has_skill';
    lead_type = 'WORKER_LEAD';
  } else if (includesAny(text, ['registr', 'inscrib', 'crear cuenta'])) {
    intent = 'ask_registration';
  } else if (includesAny(text, ['precio', 'cuesta', 'costo', 'gratis'])) {
    intent = 'ask_price';
  } else if (includesAny(text, ['donde', 'dónde', 'ciudad', 'ubicacion', 'ubicación'])) {
    intent = 'ask_location';
  } else if (includesAny(text, ['manosya', 'que es', 'qué es', 'de que trata', 'de qué trata'])) {
    intent = 'ask_about_manosya';
  } else if (looksLikeGreeting(text)) {
    intent = 'greeting';
  }

  return {
    intent,
    lead_type,
    city: extractCity(text),
    profession,
    interests: profession ? [profession] : [],
    needs_human,
  };
}
