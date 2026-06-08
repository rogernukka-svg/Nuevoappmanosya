import type { ClassificationResult, Intent, LeadType } from './types';

const GREETINGS = [
  'hola',
  'holaa',
  'holaaa',
  'buenas',
  'buen dia',
  'buenos dias',
  'buenas tardes',
  'buenas noches',
  'que tal',
  'como estas',
  'saludos',
  'hey',
  'ei',
  'ola',
  'holi',
  'hello',
];

const WORKER_WORDS = [
  'electricista',
  'plomero',
  'fontanero',
  'albanil',
  'pintor',
  'jardinero',
  'limpieza',
  'limpiadora',
  'limpiador',
  'ninera',
  'cuidadora',
  'enfermera',
  'cocinera',
  'cocinero',
  'mecanico',
  'chapista',
  'soldador',
  'carpintero',
  'herrero',
  'tecnico',
  'refrigeracion',
  'aire acondicionado',
  'instalador',
  'cerrajero',
  'delivery',
  'repartidor',
  'chofer',
  'conductor',
  'taxista',
  'mototaxi',
  'flete',
  'mudanza',
  'mudanzas',
  'construccion',
  'mantenimiento',
  'seguridad',
  'guardia',
  'peluquera',
  'peluquero',
  'barberia',
  'maquillaje',
  'unas',
  'manicura',
  'masajista',
  'profesor',
  'particular',
  'contador',
  'abogado',
  'gestor',
  'disenador',
  'programador',
  'informatico',
  'tecnico de celular',
  'reparacion',
  'lavar auto',
  'detailing',
  'fumigacion',
];

const SERVICE_NEED_WORDS = [
  'servicio',
  'servicios',
  'buscar ayuda',
  'busco ayuda',
  'quiero ayuda',
  'necesito',
  'busco',
  'quiero contratar',
  'me hace falta',
  'preciso',
  'necesito ayuda',
  'quien hace',
  'tenes alguien',
  'conoces alguien',
  'necesito un plomero',
  'necesito electricista',
  'necesito limpieza',
  'necesito chofer',
  'necesito flete',
  'necesito jardinero',
  'cuanto cuesta',
  'precio',
  'presupuesto',
  'urgente',
  'emergencia',
  'ahora',
  'hoy',
  'manana',
];

const SERVICE_GENERIC_WORDS = [
  'servicio',
  'servicios',
  'ayuda',
  'buscar ayuda',
  'necesito servicio',
  'necesito servicios',
];

const SUPPLIER_WORDS = [
  'tengo negocio',
  'tengo local',
  'comercio',
  'proveedor',
  'vendo',
  'ventas',
  'ferreteria',
  'almacen',
  'despensa',
  'supermercado',
  'tienda',
  'boutique',
  'roperia',
  'repuestos',
  'lubricantes',
  'materiales',
  'construccion',
  'distribuidora',
  'fabrica',
  'panaderia',
  'restaurante',
  'comedor',
  'lomiteria',
  'rotiseria',
  'farmacia',
  'veterinaria',
  'agropecuaria',
  'bazar',
  'importadora',
  'mayorista',
  'minorista',
  'productos',
  'catalogo',
  'stock',
];

const DRIVER_WORDS = [
  'chofer',
  'taxi',
  'taxista',
  'conductor',
  'movilidad',
  'viaje',
  'viajes',
  'bolt',
  'uber',
  'pasajero',
  'traslado',
  'llevar',
  'traer',
  'aeropuerto',
  'terminal',
  'michofer',
  'mi chofer',
  'auto',
  'vehiculo',
  'moto',
  'remis',
];

const FLIRTY_WORDS = [
  'sos lindo',
  'sos linda',
  'que lindo sos',
  'que linda',
  'me gustas',
  'me encantas',
  'sos soltero',
  'sos soltera',
  'tenes novia',
  'tenes novio',
  'estas soltero',
  'amor',
  'bebe',
  'bb',
  'lindo',
  'linda',
  'hermoso',
  'hermosa',
  'guapo',
  'preciosa',
  'precioso',
];

const SEXUAL_WORDS = [
  'sexo',
  'desnudo',
  'desnuda',
  'manda foto',
  'foto intima',
  'cama',
  'caliente',
  'coger',
  'follar',
  'nudes',
  'pack',
  'contenido sexual',
];

const AGGRESSIVE_WORDS = [
  'puta',
  'mierda',
  'idiota',
  'amenaza',
  'te voy a',
  'estafa',
  'estafador',
  'spam',
  'ganar dinero rapido',
  'crypto',
  'bitcoin',
  'apuestas',
  'casino',
];

const SUPPORT_WORDS = [
  'no funciona',
  'error',
  'problema',
  'no puedo entrar',
  'no me deja',
  'no carga',
  'no aparece',
  'no recibo',
  'no puedo registrarme',
  'ayuda',
  'soporte',
  'reclamo',
  'queja',
  'me cobraron',
  'no me responde',
  'se trabo',
  'fallo',
  'bug',
];

const CITIES = [
  'ciudad del este',
  'cde',
  'alto parana',
  'asuncion',
  'luque',
  'san lorenzo',
  'fernando de la mora',
  'lambare',
  'mariano roque alonso',
  'encarnacion',
  'caaguazu',
  'coronel oviedo',
  'hernandarias',
  'presidente franco',
  'pdte franco',
  'minga guazu',
  'salto del guaira',
  'villarrica',
  'caazapa',
  'pilar',
  'concepcion',
  'pedro juan caballero',
  'itaugua',
  'limpio',
  'capiata',
  'aregua',
  'ypane',
  'villa elisa',
  'san antonio',
  'nemby',
  'villa hayes',
  'benjamin aceval',
  'filadelfia',
  'loma plata',
  'mariscal estigarribia',
  'san juan bautista',
  'ayolas',
  'santa rosa',
  'san ignacio',
  'santa rita',
  'naranjal',
  'santa rosa del monday',
  'santa fe del parana',
  'ypacarai',
  'caacupe',
  'piribebuy',
  'ita',
  'yaguaron',
  'paraguari',
  'carapegua',
  'quiindy',
  'ybycui',
  'san bernardino',
  'altos',
  'eusebio ayala',
  'tobati',
  'itaipu',
  'santa elena',
  'san estanislao',
  'santaní',
  'santani',
  'curuguaty',
  'salto del guaira',
  'yby yau',
  'horqueta',
  'bella vista norte',
  'capitan bado',
  'bella vista',
  'hohenau',
  'obligado',
  'carmen del parana',
  'fram',
  'natalio',
  'san pedro del parana',
  'san cosme',
  'san damian',
  'yuty',
  'abaí',
  'abai',
  'san juan nepomuceno',
  'tavaí',
  'tavai',
  'juan leon mallorquin',
  'doctor juan leon mallorquin',
  'mallorquin',
  'ita kyry',
  'itakyry',
  'domingo martinez de irala',
  'los cedrales',
  'san alberto',
  'mbaracayu',
  'yguazu',
  'raúl peña',
  'raul pena',
  'cedrales',
  'pirapo',
  'capitan miranda',
  'cambyreta',
  'trinidad',
  'jesus',
  'jesus de tavarangue',
  'san patricio',
  'santiago',
  'humaita',
  'villa florida',
  'alberdi',
  'nanawa',
  'puerto falcon',
  'pozo colorado',
  'fuerte olimpo',
  'bahia negra',
  'puerto casado',
  'katuete',
  'corpus christi',
  'la paloma',
  'nueva esperanza',
  'yasy cany',
  'yasy kani',
  'itapua',
  'misiones',
  'cordillera',
  'central',
  'guaira',
  'caazapa',
  'canindeyu',
  'amambay',
  'concepcion',
  'san pedro',
  'boqueron',
  'presidente hayes',
  'alto paraguay',
  'paraguari',
  'ñeembucu',
  'neembucu',
];

const NEIGHBORHOODS = [
  'microcentro',
  'centro',
  'barrio obrero',
  'boqueron',
  'san jose',
  'san josé',
  'san alfredo',
  'san miguel',
  'san roque',
  'san rafael',
  'san antonio',
  'san blas',
  'san lucas',
  'san isidro',
  'san vicente',
  'san pablo',
  'santa ana',
  'santa maria',
  'santa librada',
  'la blanca',
  'la victoria',
  'ciudad nueva',
  'area 1',
  'area 2',
  'area 3',
  'area 4',
  'km 4',
  'km 5',
  'km 6',
  'km 7',
  'km 8',
  'km 9',
  'km 10',
  'km 11',
  'km 12',
  'km 14',
  'km 16',
  'km 18',
  'monday',
  'remansito',
  'acaray',
  'che la reina',
  'pablo rojas',
  'juan e oleary',
  'villa morra',
  'recoleta',
  'las lomas',
  'mburucuya',
  'mburucuyá',
  'trinidad',
  'sajonia',
  'san cristobal',
  'san cristóbal',
  'santísima trinidad',
  'santisima trinidad',
  'los laureles',
  'mariscal lopez',
  'mariscal lópez',
  'villa aurelia',
  'terminal',
  'republicano',
  'roberto l petit',
  'tacumbu',
  'tacumbú',
  'loma pyta',
  'zeballos cue',
  'zeballos cué',
  'botanico',
  'botánico',
  'santa teresa',
  'ykua sati',
  'ycuá satí',
  'villa elisa centro',
  '4 mojones',
  'cuatro mojones',
  'reduto',
  'pa i ñu',
  'pai nu',
  'laurelty',
  'laurelty luque',
  'marambure',
  'costa sosa',
  'loma merlo',
  'mora cue',
  'mora cué',
  'tarumandy',
  'capilla del monte',
  'san miguel san lorenzo',
  'barcequillo',
  'villa industrial',
  'sagrada familia',
  'lucerito',
  'rincón',
  'rincon',
  'zona norte',
  'zona sur',
  'zona centro',
];

export function normalizeSocialText(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function includesAny(clean: string, words: string[]) {
  return words.some((word) => clean.includes(normalizeSocialText(word)));
}

function firstMatch(clean: string, words: string[]) {
  return words.find((word) => clean.includes(normalizeSocialText(word))) || null;
}

function looksLikeGreeting(clean: string) {
  return GREETINGS.includes(clean) || includesAny(clean, GREETINGS);
}

function getConfidence(intent: Intent) {
  if (['sexual', 'aggressive', 'support', 'flirty'].includes(intent)) return 0.94;
  if (['user_needs_service', 'worker_has_skill', 'supplier_has_business', 'driver_interest'].includes(intent)) {
    return 0.88;
  }
  if (['greeting', 'ask_about_manosya', 'ask_about_roger'].includes(intent)) return 0.78;
  return 0.45;
}

export function classifyMessage(messageText: string): ClassificationResult {
  const clean = normalizeSocialText(messageText);
  const detectedCity = firstMatch(clean, [...CITIES, ...NEIGHBORHOODS]);
  const detectedProfession = firstMatch(clean, WORKER_WORDS);
  const detectedInterests = [
    detectedProfession,
    firstMatch(clean, DRIVER_WORDS),
    firstMatch(clean, SUPPLIER_WORDS),
  ].filter(Boolean) as string[];

  let intent: Intent = 'unknown';
  let leadType: LeadType = 'CURIOUS_LEAD';
  let needsHuman = false;
  let shouldSendLink = false;

  if (includesAny(clean, SEXUAL_WORDS)) {
    intent = 'sexual';
    leadType = 'UNSAFE_LEAD';
    needsHuman = true;
  } else if (includesAny(clean, AGGRESSIVE_WORDS)) {
    intent = includesAny(clean, ['spam', 'crypto', 'bitcoin', 'apuestas', 'casino']) ? 'spam' : 'aggressive';
    leadType = 'UNSAFE_LEAD';
    needsHuman = true;
  } else if (includesAny(clean, SUPPORT_WORDS)) {
    intent = 'support';
    leadType = 'SUPPORT_LEAD';
    needsHuman = true;
  } else if (includesAny(clean, FLIRTY_WORDS)) {
    intent = 'flirty';
    leadType = 'FLIRTY_LEAD';
  } else if (includesAny(clean, ['roger', 'fundador', 'dueno', 'creador'])) {
    intent = 'ask_about_roger';
    leadType = 'CURIOUS_LEAD';
  } else if (includesAny(clean, ['manosya', 'manos ya', 'que es', 'de que trata'])) {
    intent = 'ask_about_manosya';
    leadType = 'CURIOUS_LEAD';
  } else if (includesAny(clean, ['registrarme', 'registro', 'inscribirme', 'crear cuenta', 'quiero entrar'])) {
    intent = 'registration_interest';
    leadType = 'CURIOUS_LEAD';
  } else if (includesAny(clean, ['trabajo', 'trabajar', 'empleo', 'quiero laburar', 'laburo'])) {
    intent = 'job_interest';
    leadType = detectedProfession ? 'WORKER_LEAD' : 'CURIOUS_LEAD';
  } else if (includesAny(clean, ['cuanto cuesta', 'precio', 'costo', 'comision', 'gratis'])) {
    intent = 'price_question';
    leadType = 'CURIOUS_LEAD';
  } else if (includesAny(clean, ['donde', 'ubicacion', 'ciudad', 'zona'])) {
    intent = 'location_question';
    leadType = 'CURIOUS_LEAD';
  } else if (includesAny(clean, SERVICE_GENERIC_WORDS)) {
    intent = 'user_needs_service';
    leadType = 'USER_LEAD';
  } else if (includesAny(clean, SERVICE_NEED_WORDS)) {
    intent = 'user_needs_service';
    leadType = 'USER_LEAD';
  } else if (includesAny(clean, SUPPLIER_WORDS)) {
    intent = 'supplier_has_business';
    leadType = 'SUPPLIER_LEAD';
  } else if (includesAny(clean, DRIVER_WORDS)) {
    intent = 'driver_interest';
    leadType = 'DRIVER_LEAD';
  } else if (detectedProfession) {
    intent = 'worker_has_skill';
    leadType = 'WORKER_LEAD';
  } else if (looksLikeGreeting(clean)) {
    intent = 'greeting';
    leadType = 'CURIOUS_LEAD';
  }

  if (['registration_interest', 'ask_about_manosya'].includes(intent)) {
    shouldSendLink = false;
  }

  return {
    intent,
    leadType,
    confidence: getConfidence(intent),
    needsHuman,
    shouldSendLink,
    detectedCity,
    detectedProfession,
    detectedInterests,
  };
}
