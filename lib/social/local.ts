import { classifyMessage, normalizeSocialText } from './intent';
import type { ConversationMessage, GenerateSocialReplyInput } from './types';

function hashText(value: string) {
  return [...String(value || '')].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function pick(messageText: string, options: string[]) {
  return options[Math.abs(hashText(messageText)) % options.length];
}

function recentText(recentMessages: ConversationMessage[] = []) {
  return recentMessages.map((message) => normalizeSocialText(message.content)).join(' ');
}

function hasRecent(recentMessages: ConversationMessage[] | undefined, words: string[]) {
  const text = recentText(recentMessages || []);
  return words.some((word) => text.includes(normalizeSocialText(word)));
}

function isThanks(clean: string) {
  return /\b(gracias|genial|excelente|buenisimo|buenisima|ok|dale|perfecto)\b/.test(clean);
}

function isCompliment(clean: string) {
  return (
    clean.includes('buen trabajo') ||
    clean.includes('muy bueno') ||
    clean.includes('excelente trabajo') ||
    clean.includes('felicitaciones') ||
    clean.includes('me gusta el proyecto') ||
    clean.includes('esta bueno') ||
    clean.includes('esta buenisimo')
  );
}

function isCompanyWork(clean: string) {
  return (
    clean.includes('trabajo en una empresa') ||
    clean.includes('trabajo en empresa') ||
    clean.includes('soy empleado') ||
    clean.includes('empleado') ||
    clean.includes('para una empresa')
  );
}

function isSelfEmployed(clean: string) {
  return (
    clean.includes('por mi cuenta') ||
    clean.includes('cuenta propia') ||
    clean.includes('independiente') ||
    clean.includes('particular') ||
    clean.includes('freelance')
  );
}

function wantsLink(clean: string) {
  return (
    clean.includes('link') ||
    clean.includes('enlace') ||
    clean.includes('pagina') ||
    clean.includes('web') ||
    clean.includes('app') ||
    clean.includes('mandame')
  );
}

function isServiceGeneric(clean: string) {
  return ['servicio', 'servicios', 'ayuda', 'buscar ayuda', 'necesito ayuda'].includes(clean);
}

const AMBIGUOUS_SERVICE_AREAS = [
  'electricidad',
  'plomeria',
  'limpieza',
  'pintura',
  'jardineria',
  'albanileria',
  'mecanica',
  'refrigeracion',
  'cerrajeria',
  'carpinteria',
  'herreria',
  'flete',
  'fletes',
  'mudanza',
  'delivery',
  'chofer',
  'seguridad',
  'cocina',
  'enfermeria',
  'niñera',
  'ninera',
  'tecnico',
  'reparacion',
  'fumigacion',
  'internet',
  'cctv',
  'costura',
  'tapiceria',
  'vidrieria',
  'eventos',
  'fotografia',
  'veterinaria',
  'mascotas',
];

function getAmbiguousServiceArea(clean: string) {
  return AMBIGUOUS_SERVICE_AREAS.find((area) => clean === normalizeSocialText(area)) || null;
}

function formatServiceArea(area: string) {
  return area
    .replace('plomeria', 'plomería')
    .replace('jardineria', 'jardinería')
    .replace('albanileria', 'albañilería')
    .replace('mecanica', 'mecánica')
    .replace('refrigeracion', 'refrigeración')
    .replace('cerrajeria', 'cerrajería')
    .replace('carpinteria', 'carpintería')
    .replace('herreria', 'herrería')
    .replace('reparacion', 'reparación')
    .replace('fumigacion', 'fumigación')
    .replace('fotografia', 'fotografía');
}

function formatPlace(value?: string | null) {
  if (!value) return 'esa zona';
  return value
    .split(' ')
    .map((part) => (part.length <= 2 ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(' ');
}

function linkReply() {
  return 'Te dejo el enlace para que mires tranquilo: https://www.manosya.app/ Si querés, después te guío según lo que necesites hacer.';
}

function answerKnownQuestion(clean: string, messageText: string) {
  if (clean.includes('que es manosya') || clean.includes('que es manos ya') || clean.includes('de que trata')) {
    return 'Te cuento. ManosYA conecta personas que necesitan ayuda con trabajadores, oficios, comercios y proveedores. ¿Vos querés usarlo para buscar ayuda o para ofrecer algún servicio?';
  }

  if (clean.includes('quien es roger') || clean.includes('quien sos') || clean.includes('sos roger')) {
    return 'Soy el asistente de Roger para ManosYA. Roger está construyendo este proyecto para conectar personas, trabajadores y comercios de una forma más directa. ¿Vos a qué te dedicás?';
  }

  if (clean.includes('como funciona')) {
    return 'Funciona como un puente: alguien necesita ayuda, un trabajador o comercio puede resolverlo, y ManosYA busca acercarlos. ¿Vos querés buscar ayuda u ofrecer algo?';
  }

  if (clean.includes('donde funciona') || clean.includes('que ciudad') || clean.includes('en que zona')) {
    return 'Estoy enfocándolo primero en Paraguay y especialmente en zonas donde ya hay movimiento real. ¿De qué ciudad sos vos?';
  }

  if (clean.includes('cuanto cuesta') || clean.includes('precio') || clean.includes('costo') || clean.includes('comision')) {
    return 'Depende de lo que quieras hacer dentro de ManosYA. Para orientarte mejor, ¿querés usarlo como cliente, trabajador o proveedor?';
  }

  if (clean.includes('quiero registrarme') || clean.includes('registrarme') || clean.includes('registro')) {
    return 'Buenísimo. Para guiarte mejor, ¿querés registrarte para ofrecer un servicio, buscar ayuda o mostrar un negocio?';
  }

  if (wantsLink(clean)) {
    return linkReply();
  }

  if (isCompliment(clean)) {
    return pick(messageText, [
      'Gracias, de verdad 😊 Me alegra que te guste. Estoy trabajando fuerte en ManosYA para que conecte personas con soluciones reales. ¿Vos a qué te dedicás?',
      'Gracias por la buena onda 😊 Me motiva mucho leer eso. Contame algo de vos, ¿trabajás en algún oficio o tenés negocio?',
      'Qué lindo leer eso, gracias 😊 Estoy metido de lleno con ManosYA. ¿Qué fue lo que más te llamó la atención?',
    ]);
  }

  if (isThanks(clean)) {
    return pick(messageText, [
      'Con gusto 😊 Contame, ¿vos querés usar ManosYA para buscar ayuda o para ofrecer algo?',
      'Dale 😊 Para orientarte mejor, ¿vos a qué te dedicás?',
      'Perfecto 😊 ¿Querés que te cuente cómo entrar según tu caso?',
    ]);
  }

  return null;
}

export async function generateSocialReply(input: GenerateSocialReplyInput): Promise<string> {
  const messageText = String(input.messageText || '').trim();
  const clean = normalizeSocialText(messageText);
  const classification = classifyMessage(messageText);
  const recentMessages = input.recentMessages || [];
  const ambiguousServiceArea = getAmbiguousServiceArea(clean);

  if (
    classification.detectedCity &&
    (clean === classification.detectedCity ||
      hasRecent(recentMessages, ['de que ciudad sos', 'que ciudad', 'desde que ciudad', 'zona']))
  ) {
    return `Perfecto, ${formatPlace(classification.detectedCity)}. ¿Qué necesitás hacer ahora: buscar un servicio, ofrecer un trabajo o mostrar un negocio?`;
  }

  const knownAnswer = answerKnownQuestion(clean, messageText);
  if (knownAnswer) return knownAnswer;

  if (ambiguousServiceArea) {
    const area = formatServiceArea(ambiguousServiceArea);

    if (hasRecent(recentMessages, ['a que te dedicas', 'que haces', 'ofreces algun servicio'])) {
      return `Buenísimo, ${area}. ¿Vos ofrecés ese servicio o estás buscando a alguien que lo haga?`;
    }

    return `Te entiendo, ${area}. Para orientarte bien: ¿vos ofrecés ese servicio o lo estás necesitando?`;
  }

  if (classification.intent === 'flirty') {
    return 'Jajaja, gracias por la buena onda 😊 Por ahora estoy bastante concentrado en ManosYA. Contame algo de vos, ¿a qué te dedicás?';
  }

  if (['sexual', 'aggressive', 'spam'].includes(classification.intent)) {
    return 'Prefiero mantener esta conversación con respeto 😊 Estoy acá para conversar sobre ManosYA y conocer un poco más sobre vos.';
  }

  if (classification.intent === 'support') {
    return 'Entiendo. Para revisar bien eso necesito tu ciudad y un resumen cortito de lo que te aparece. Así lo ordeno mejor.';
  }

  if (isCompanyWork(clean)) {
    return 'Buenísimo. Y fuera de tu trabajo, ¿tenés alguna habilidad o servicio que la gente suele pedirte?';
  }

  if (isSelfEmployed(clean)) {
    return 'Justamente personas como vos pueden encontrar oportunidades dentro de ManosYA. La idea es conectar personas que necesitan ayuda con personas que saben hacer el trabajo. Te dejo el enlace por si querés conocerlo: https://www.manosya.app/';
  }

  if (clean.includes('no tengo oficio') || clean.includes('no se hacer') || clean.includes('no tengo servicio')) {
    return 'Perfecto. Entonces probablemente te interese más como usuario. La idea es que cuando necesites ayuda puedas encontrar personas capacitadas para resolver lo que necesitás. ¿De qué ciudad sos?';
  }

  if (classification.intent === 'worker_has_skill') {
    return 'Qué interesante. ¿Trabajás por tu cuenta o para alguna empresa?';
  }

  if (classification.intent === 'supplier_has_business') {
    return 'Interesante. ¿Qué tipo de productos o servicios ofrecés?';
  }

  if (classification.intent === 'driver_interest') {
    return 'Interesante. También estoy trabajando una línea relacionada a movilidad y choferes. ¿Vos manejás o querés usar el servicio como pasajero?';
  }

  if (classification.intent === 'user_needs_service') {
    if (classification.detectedCity) {
      return `Buenísimo, ${classification.detectedCity} me sirve para ubicarte mejor. ¿Qué tipo de servicio necesitás exactamente?`;
    }

    if (isServiceGeneric(clean)) {
      return 'Buenísimo. ¿Querés buscar ayuda para algo puntual o vos ofrecés algún servicio?';
    }

    return 'Claro, eso conecta mucho con lo que estoy construyendo en ManosYA. ¿De qué ciudad sos?';
  }

  if (classification.intent === 'job_interest') {
    return 'Buenísimo. Para entenderte mejor, ¿tenés algún oficio o servicio que la gente suele pedirte?';
  }

  if (classification.intent === 'ask_about_manosya') {
    return 'Te cuento. ManosYA conecta personas que necesitan ayuda con trabajadores, oficios, comercios y proveedores. ¿Vos querés usarlo para buscar ayuda o para ofrecer algún servicio?';
  }

  if (classification.intent === 'ask_about_roger') {
    return 'Roger es el fundador de ManosYA. Está trabajando en una visión grande: usar tecnología para conectar personas, trabajadores y comercios en Paraguay. Pero contame algo de vos, ¿a qué te dedicás?';
  }

  if (classification.intent === 'registration_interest') {
    return 'Buenísimo. Para guiarte mejor, ¿querés registrarte para ofrecer un servicio, buscar ayuda o mostrar un negocio?';
  }

  if (classification.intent === 'price_question') {
    return 'Depende de lo que quieras hacer dentro de ManosYA. Para orientarte mejor, ¿querés usarlo como cliente, trabajador o proveedor?';
  }

  if (classification.intent === 'location_question') {
    return 'Estoy enfocándolo en Paraguay y por zonas donde ya hay movimiento real. ¿De qué ciudad sos vos?';
  }

  if (classification.intent === 'greeting') {
    if (hasRecent(recentMessages, ['a que te dedicas', 'que queres usar', 'buscar ayuda'])) {
      return 'Te leo 😊 Contame un poquito de vos: ¿buscás ayuda, ofrecés algún servicio o tenés un negocio?';
    }

    return pick(messageText, [
      '¡Hola! 😊 Qué gusto leerte. Estoy trabajando en ManosYA, un proyecto que me tiene muy entusiasmado. Pero antes me gustaría conocerte un poco, ¿a qué te dedicás?',
      '¡Hola! 😊 Qué bueno leerte. Estoy con ManosYA, un proyecto para conectar personas con soluciones reales. Contame, ¿a qué te dedicás?',
      '¡Buenas! 😊 Gracias por escribir. Antes de hablarte de ManosYA me gustaría conocerte un poco, ¿a qué te dedicás?',
    ]);
  }

  if (clean.length <= 3) {
    return 'Te leo 😊 Decime un poquito más así te respondo mejor.';
  }

  return pick(messageText, [
    'Te entiendo. Para responderte mejor, contame una cosa: ¿querés buscar ayuda, ofrecer un servicio o mostrar un negocio?',
    'Quiero entenderte bien. ¿Lo que necesitás va más por buscar un servicio, ofrecer un trabajo o conectar un comercio?',
    'Dale, te sigo. Para orientarte mejor, ¿me hablás como cliente, trabajador o proveedor?',
  ]);
}
