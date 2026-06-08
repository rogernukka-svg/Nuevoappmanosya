import { classifyMessage, normalizeSocialText } from './intent';
import type { ConversationMessage, GenerateSocialReplyInput } from './types';

const MANOSYA_LINK = 'https://www.manosya.app';

const SERVICE_AREAS = [
  {
    keys: ['electricidad', 'electricista', 'instalacion electrica', 'cableado'],
    label: 'electricidad',
    worker: 'electricista',
    humor: 'Ese rubro tiene chispa de verdad ⚡',
    clientHumor: 'Vamos a ordenar eso antes de que los cables empiecen una reunión secreta.',
  },
  {
    keys: ['plomeria', 'plomero', 'fontanero', 'caneria', 'destape'],
    label: 'plomería',
    worker: 'plomero',
    humor: 'Rubro vital, porque cuando el agua se enoja, nadie duerme tranquilo.',
    clientHumor: 'Cuando el agua decide hacer turismo por la casa, conviene actuar rápido.',
  },
  {
    keys: ['limpieza', 'limpiar', 'limpiadora', 'limpiador', 'domestica'],
    label: 'limpieza',
    worker: 'personal de limpieza',
    humor: 'Modo brillo activado.',
    clientHumor: 'Donde entra limpieza, hasta el ambiente respira distinto.',
  },
  {
    keys: ['pintura', 'pintor', 'pintar'],
    label: 'pintura',
    worker: 'pintor',
    humor: 'Una pared bien pintada cambia hasta el ánimo del lugar.',
    clientHumor: 'Vamos a ponerle color al asunto sin enchastrar la conversación.',
  },
  {
    keys: ['jardineria', 'jardinero', 'jardin', 'pasto', 'podar'],
    label: 'jardinería',
    worker: 'jardinero',
    humor: 'Modo verde activado. El pasto no se corta solo, aunque algunos sueñen con eso.',
    clientHumor: 'El jardín ya entró en el radar verde de ManosYA.',
  },
  {
    keys: ['albanileria', 'albañileria', 'albanil', 'obra', 'construccion'],
    label: 'construcción',
    worker: 'albañil',
    humor: 'Ahí se levantan paredes y también oportunidades.',
    clientHumor: 'La ciudad no se construye con pensamientos positivos solamente.',
  },
  {
    keys: ['mecanica', 'mecanico', 'auto', 'moto', 'chapista'],
    label: 'mecánica',
    worker: 'mecánico',
    humor: 'Modo motor activado.',
    clientHumor: 'Vamos a evitar que el vehículo hable en idioma ruido raro.',
  },
  {
    keys: ['refrigeracion', 'aire acondicionado', 'split', 'heladera', 'freezer'],
    label: 'refrigeración',
    worker: 'técnico de refrigeración',
    humor: 'Rubro fresco, literalmente.',
    clientHumor: 'Cuando el aire no enfría, la paciencia también se recalienta.',
  },
  {
    keys: ['cerrajeria', 'cerrajero', 'cerradura', 'llave'],
    label: 'cerrajería',
    worker: 'cerrajero',
    humor: 'Rubro clave. Y esta vez el chiste venía servido.',
    clientHumor: 'Puerta complicada detectada. Modo llave mental activado.',
  },
  {
    keys: ['flete', 'fletes', 'mudanza', 'mudanzas'],
    label: 'flete',
    worker: 'fletero',
    humor: 'Siempre hay una heladera, una cama o una caja misteriosa que necesita moverse.',
    clientHumor: 'Modo mudanza con dignidad activado.',
  },
  {
    keys: ['delivery', 'repartidor', 'entrega'],
    label: 'delivery',
    worker: 'repartidor',
    humor: 'Velocidad, paciencia y memoria de calles: combo poderoso.',
    clientHumor: 'Modo entrega activado.',
  },
  {
    keys: ['chofer', 'taxi', 'taxista', 'conductor', 'movilidad', 'michofer', 'mi chofer'],
    label: 'movilidad',
    worker: 'chofer',
    humor: 'La ciudad se mueve, y alguien tiene que manejar el caos.',
    clientHumor: 'Radar urbano encendido.',
  },
  {
    keys: ['tecnico', 'reparacion', 'pc', 'computadora', 'celular', 'internet', 'wifi', 'cctv', 'camara'],
    label: 'servicio técnico',
    worker: 'técnico',
    humor: 'Modo solución técnica activado.',
    clientHumor: 'La tecnología a veces pide auxilio en clave de pitido raro.',
  },
  {
    keys: ['enfermeria', 'enfermera', 'cuidador', 'cuidadora', 'niñera', 'ninera'],
    label: 'cuidado',
    worker: 'cuidador',
    humor: 'Rubro sensible, donde la confianza vale muchísimo.',
    clientHumor: 'Acá conviene ubicar bien a la persona correcta.',
  },
  {
    keys: ['cocina', 'cocinera', 'cocinero', 'eventos', 'parrillero'],
    label: 'cocina/eventos',
    worker: 'cocinero',
    humor: 'Cuando el servicio sale bien, hasta la reunión cambia de energía.',
    clientHumor: 'Modo evento sin caos activado.',
  },
  {
    keys: ['ferreteria', 'ferretería', 'herramientas', 'materiales', 'repuestos'],
    label: 'ferretería',
    worker: 'proveedor',
    humor: 'Ferretería detectada. Base de operaciones de todo trabajador serio.',
    clientHumor: 'Sin ferretería, media ciudad queda mirando tornillos con tristeza.',
  },
];

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

function findServiceArea(clean: string, exact = false) {
  return SERVICE_AREAS.find((area) =>
    area.keys.some((key) => {
      const normalized = normalizeSocialText(key);
      return exact ? clean === normalized : clean.includes(normalized);
    })
  );
}

function formatPlace(value?: string | null) {
  if (!value) return 'esa zona';
  return value
    .split(' ')
    .map((part) => (part.length <= 2 ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(' ');
}

function isGreeting(clean: string) {
  return ['hola', 'holaa', 'holaaa', 'buenas', 'buen dia', 'buenos dias', 'buenas tardes', 'buenas noches', 'hey', 'holi'].includes(clean);
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
    clean.includes('esta bueno') ||
    clean.includes('esta buenisimo')
  );
}

function wantsLink(clean: string) {
  return (
    clean.includes('link') ||
    clean.includes('enlace') ||
    clean.includes('pagina') ||
    clean.includes('web') ||
    clean.includes('app') ||
    clean.includes('pasame') ||
    clean.includes('mandame')
  );
}

function detectMode(clean: string, recentMessages: ConversationMessage[]) {
  const all = `${recentText(recentMessages)} ${clean}`;

  if (
    clean.includes('busco') ||
    clean.includes('necesito') ||
    clean.includes('quiero alguien') ||
    clean.includes('se rompio') ||
    clean.includes('se rompió') ||
    clean.includes('para mi casa') ||
    clean.includes('para mi local') ||
    clean.includes('urgente') ||
    clean.includes('estoy buscando') ||
    clean.includes('busco nomas') ||
    clean.includes('busco nomás')
  ) {
    return 'client';
  }

  if (
    clean.includes('soy') ||
    clean.includes('hago') ||
    clean.includes('ofrezco') ||
    clean.includes('me dedico') ||
    clean.includes('trabajo de') ||
    clean.includes('tengo experiencia') ||
    clean.includes('busco clientes') ||
    clean.includes('trabajo solo') ||
    clean === 'solo' ||
    clean.includes('con equipo') ||
    clean.includes('por mi cuenta') ||
    clean.includes('cuenta propia')
  ) {
    return 'worker';
  }

  if (
    clean.includes('tengo negocio') ||
    clean.includes('tengo local') ||
    clean.includes('vendo') ||
    clean.includes('ferreteria') ||
    clean.includes('proveedor') ||
    clean.includes('distribuyo')
  ) {
    return 'supplier';
  }

  if (all.includes('modo trabajador activado') || all.includes('trabajas por tu cuenta') || all.includes('con equipo')) {
    return 'worker';
  }

  if (all.includes('modo cliente activado') || all.includes('estas buscando') || all.includes('buscando a alguien')) {
    return 'client';
  }

  return 'unknown';
}

function isCorrection(clean: string) {
  return (
    clean.includes('ya dije') ||
    clean.includes('te dije') ||
    clean.includes('no soy') ||
    clean.includes('no busco') ||
    clean.includes('no ofrezco') ||
    clean.includes('corrijo') ||
    clean.includes('entendiste mal')
  );
}

function linkReply() {
  return `Claro. Te dejo la entrada al sistema ManosYA:
${MANOSYA_LINK}

Cargás tus datos básicos y ya quedás dentro del radar. Después podés mejorar tu perfil con foto, rubros y más detalles.
Sin presión, pero con futuro.`;
}

function answerKnownQuestion(clean: string, messageText: string) {
  if (clean.includes('que es manosya') || clean.includes('que es manos ya') || clean.includes('de que trata')) {
    return 'Te cuento simple: ManosYA conecta personas que necesitan ayuda con trabajadores, oficios, comercios y proveedores cercanos. ¿Vos entrarías como trabajador, cliente o proveedor?';
  }

  if (clean.includes('quien es roger') || clean.includes('quien sos') || clean.includes('sos roger')) {
    return 'Soy JARVIS, el secretario digital de ManosYA. Ayudo a Roger y al equipo a ordenar el mapa de servicios de la ciudad. ¿Vos a qué te dedicás?';
  }

  if (clean.includes('como funciona')) {
    return 'Funciona como un puente: alguien necesita ayuda, alguien sabe resolver, y ManosYA busca acercarlos. ¿Vos querés buscar ayuda u ofrecer algo?';
  }

  if (clean.includes('cuanto cuesta') || clean.includes('precio') || clean.includes('costo') || clean.includes('comision') || clean.includes('gratis')) {
    return 'Te cuento claro: podés entrar y cargar tus datos básicos para quedar en el radar ManosYA. Primero quiero ubicarte bien: ¿venís como cliente, trabajador o proveedor?';
  }

  if (clean.includes('quiero registrarme') || clean.includes('registrarme') || clean.includes('registro')) {
    return 'Buenísimo. Para guiarte mejor, ¿querés registrarte para ofrecer un servicio, buscar ayuda o mostrar un negocio?';
  }

  if (wantsLink(clean)) return linkReply();

  if (isCompliment(clean)) {
    return pick(messageText, [
      'Gracias, de verdad 😊 Sistema de buena onda estable. Estoy ayudando a poner en el mapa a la gente que resuelve. ¿Vos ofrecés algún servicio o buscás ayuda?',
      'Gracias por la buena onda 😊 Mi radar dice que acá hay interés real. Contame, ¿venís como trabajador, cliente o proveedor?',
      'Qué lindo leer eso 😊 ManosYA quiere conectar talento local con necesidades reales. ¿Qué fue lo que más te llamó la atención?',
    ]);
  }

  if (isThanks(clean)) {
    return pick(messageText, [
      'Con gusto 😊 ¿Querés que te guíe como trabajador, cliente o proveedor?',
      'Dale 😊 Ya voy entendiendo el mapa. ¿Qué necesitás hacer ahora?',
      'Perfecto 😊 Mi radar sigue atento. ¿Querés que te pase el link o seguimos ubicando tu caso?',
    ]);
  }

  return null;
}

export async function generateSocialReply(input: GenerateSocialReplyInput): Promise<string> {
  const messageText = String(input.messageText || '').trim();
  const clean = normalizeSocialText(messageText);
  const classification = classifyMessage(messageText);
  const recentMessages = input.recentMessages || [];
  const exactArea = findServiceArea(clean, true);
  const mentionedArea = findServiceArea(clean);
  const mode = detectMode(clean, recentMessages);

  if (
    (clean.includes('pasame') || clean.includes('mandame') || clean === 'si' || clean === 'sí' || clean === 'dale') &&
    hasRecent(recentMessages, ['te puedo pasar el link', 'queres que te pase el link', 'te dejo el link', 'entrada al sistema'])
  ) {
    return linkReply();
  }

  if (isCorrection(clean)) {
    if (mode === 'client') {
      return 'Tenés razón, mi radar se adelantó como moto en semáforo. Corrijo: modo cliente activado. ¿Qué servicio estás buscando?';
    }
    if (mode === 'worker') {
      return 'Perfecto, corrijo. Mi algoritmo se puso creativo de más. Modo trabajador activado ahora sí. ¿En qué rubro trabajás?';
    }
    return 'Anotado, gracias por la paciencia. Ajusto el radar ManosYA. ¿Venís buscando ayuda, ofreciendo un servicio o con un negocio?';
  }

  if (
    classification.detectedCity &&
    (clean === normalizeSocialText(classification.detectedCity) ||
      hasRecent(recentMessages, ['de que ciudad sos', 'que ciudad', 'desde que ciudad', 'zona', 'trabajas mas']))
  ) {
    if (hasRecent(recentMessages, ['modo trabajador activado', 'trabajas por tu cuenta', 'con equipo', 'ofreces ese servicio'])) {
      return `Anotado: ${formatPlace(classification.detectedCity)} en el radar. Ahí la ciudad se mueve rápido, casi con turbo escondido. Te puedo pasar el link para que cargues tu perfil y quedes dentro del mapa ManosYA.`;
    }
    if (hasRecent(recentMessages, ['modo cliente activado', 'buscando a alguien', 'necesitas exactamente'])) {
      return `Perfecto, ${formatPlace(classification.detectedCity)}. Ahora sí, radar ubicado. ¿Qué servicio necesitás resolver primero?`;
    }
    return `Perfecto, ${formatPlace(classification.detectedCity)}. ¿Qué necesitás hacer ahora: buscar un servicio, ofrecer un trabajo o mostrar un negocio?`;
  }

  const knownAnswer = answerKnownQuestion(clean, messageText);
  if (knownAnswer) return knownAnswer;

  if (classification.intent === 'flirty') {
    return 'Jajaja, gracias por la buena onda 😊 Por ahora estoy bastante concentrado en ManosYA. Contame algo de vos, ¿a qué te dedicás?';
  }

  if (['sexual', 'aggressive', 'spam'].includes(classification.intent)) {
    return 'Prefiero mantener esta conversación con respeto 😊 Estoy acá para conversar sobre ManosYA y conocer un poco más sobre vos.';
  }

  if (classification.intent === 'support') {
    return 'Entiendo. Para revisar bien eso necesito tu ciudad y un resumen cortito de lo que te aparece. Así lo ordeno mejor.';
  }

  if (clean === 'solo' || clean.includes('trabajo solo') || clean.includes('por mi cuenta') || clean.includes('cuenta propia')) {
    return 'Perfecto. Trabajador independiente detectado. ManosYA está pensado para que personas como vos puedan aparecer en el mapa cuando alguien necesite ese servicio. ¿En qué ciudad o zona trabajás más?';
  }

  if (clean.includes('con equipo') || clean.includes('tengo equipo')) {
    return 'Excelente. Equipo detectado, mapa de talentos actualizándose. ¿En qué ciudad o zona trabajan más?';
  }

  if (clean.includes('trabajo en una empresa') || clean.includes('trabajo en empresa') || clean.includes('soy empleado')) {
    return 'Buenísimo. Y fuera de tu trabajo, ¿tenés alguna habilidad o servicio que la gente suele pedirte?';
  }

  if (clean.includes('no tengo oficio') || clean.includes('no se hacer') || clean.includes('no tengo servicio')) {
    return 'Perfecto. Entonces probablemente te interese más como usuario. La idea es que cuando necesites ayuda puedas encontrar personas capacitadas para resolver lo que necesitás. ¿De qué ciudad sos?';
  }

  if (exactArea) {
    return `${exactArea.label.charAt(0).toUpperCase() + exactArea.label.slice(1)}, excelente. ${exactArea.humor}
Mi radar ve dos caminos: ¿vos ofrecés ese servicio o estás buscando a alguien que lo haga?`;
  }

  if (mentionedArea && mode === 'client') {
    return `Modo cliente activado. ${mentionedArea.clientHumor} ¿Es para casa, local o algo urgente?`;
  }

  if (mentionedArea && mode === 'worker') {
    return `Modo trabajador activado. ${mentionedArea.worker} detectado: la ciudad acaba de ganar un punto en el mapa. ¿Trabajás por tu cuenta o con equipo?`;
  }

  if (classification.intent === 'supplier_has_business') {
    if (mentionedArea?.label === 'ferretería') {
      return 'Proveedor detectado. Ferretería es base de operaciones para media ciudad. ¿Vendés más construcción, electricidad, herramientas o de todo un poco?';
    }
    return 'Proveedor detectado. Eso entra perfecto en el universo ManosYA. ¿Qué tipo de productos o servicios ofrecés?';
  }

  if (classification.intent === 'worker_has_skill') {
    return 'Modo trabajador activado. Oficio detectado, respeto activado. ¿Trabajás por tu cuenta o con equipo?';
  }

  if (classification.intent === 'driver_interest') {
    return 'Modo movilidad activado. La ciudad se mueve, y alguien tiene que manejar el caos. ¿Vos manejás o querés usar el servicio como pasajero?';
  }

  if (classification.intent === 'user_needs_service') {
    if (classification.detectedCity) {
      return `Buenísimo, ${formatPlace(classification.detectedCity)} me sirve para ubicarte mejor. ¿Qué tipo de servicio necesitás exactamente?`;
    }
    return 'Modo cliente activado. Vamos a ordenar eso sin humo digital. ¿Es para casa, local o algo urgente?';
  }

  if (classification.intent === 'job_interest') {
    return 'Buenísimo. Modo trabajador activado. ManosYA está armando un mapa de personas que saben hacer trabajos reales. ¿En qué rubro querés aparecer?';
  }

  if (classification.intent === 'ask_about_manosya') {
    return 'Te cuento simple: ManosYA conecta personas que necesitan ayuda con trabajadores, oficios, comercios y proveedores cercanos. ¿Vos entrarías como trabajador, cliente o proveedor?';
  }

  if (classification.intent === 'ask_about_roger') {
    return 'Roger es el fundador de ManosYA. Está armando una plataforma paraguaya para conectar personas, trabajadores y comercios. Pero contame algo de vos, ¿a qué te dedicás?';
  }

  if (classification.intent === 'registration_interest') {
    return 'Buenísimo. Para guiarte mejor, ¿querés registrarte para ofrecer un servicio, buscar ayuda o mostrar un negocio?';
  }

  if (classification.intent === 'price_question') {
    return 'Te cuento claro: primero queremos conocer trabajadores, clientes y proveedores de la ciudad. ¿Querés usarlo como cliente, trabajador o proveedor?';
  }

  if (classification.intent === 'location_question') {
    return 'Estoy enfocándolo en Paraguay y por zonas donde ya hay movimiento real. ¿De qué ciudad sos vos?';
  }

  if (isGreeting(clean) || classification.intent === 'greeting') {
    return pick(messageText, [
      '¡Hola! Soy JARVIS, el secretario digital del equipo ManosYA. Sistema activo, radar de servicios encendido y café virtual haciendo guardia. ¿Vos ofrecés algún servicio, buscás ayuda o tenés un negocio?',
      '¡Hola! Soy JARVIS, copiloto digital de ManosYA. Estoy ayudando a Roger y al equipo a ordenar el mapa de servicios de la ciudad. Contame, ¿vos a qué te dedicás o qué necesitás?',
      '¡Buenas! JARVIS ManosYA en línea. Radar de talentos locales encendido. ¿Venís como trabajador, cliente o proveedor?',
    ]);
  }

  if (clean.length <= 3) {
    return 'Te leo 😊 Decime un poquito más así mi radar no inventa película.';
  }

  return pick(messageText, [
    'Mi radar quedó girando un poco. ¿Me decís si ofrecés un servicio, buscás ayuda o tenés un negocio?',
    'Creo que mi chip paraguayo necesita una pista más. ¿Vos querés trabajar con ManosYA o necesitás encontrar a alguien?',
    'Ya voy entendiendo, pero necesito una pista más: ¿venís como trabajador, cliente o proveedor?',
  ]);
}
