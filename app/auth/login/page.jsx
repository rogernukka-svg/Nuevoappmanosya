'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getSupabase } from '@/lib/supabase';
import { toast } from 'sonner';

const supabase = getSupabase();

const LS_LAST_EMAIL = 'last_login_email';
const LS_APP_ROLE = 'app_role';
const LS_LAST_INTENT = 'manosya_last_intent';

const ALL_SERVICES = [
  { slug: 'abogado', name: 'Abogado', keywords: ['abogado', 'juicio', 'demanda', 'divorcio', 'herencia', 'legal'] },
  { slug: 'albanileria', name: 'Albañilería', keywords: ['albañil', 'pared', 'obra', 'cemento', 'techo', 'piso'] },
  { slug: 'auxilio-vehicular', name: 'Auxilio vehicular', keywords: ['grua', 'grúa', 'auxilio', 'bateria', 'batería', 'pinchazo', 'rueda', 'no arranca'] },
  { slug: 'barman', name: 'Barman', keywords: ['barman', 'bartender', 'barra', 'tragos', 'cocteles', 'cócteles'] },
  { slug: 'carpinteria', name: 'Carpintería', keywords: ['carpintero', 'madera', 'puerta', 'mueble', 'placard', 'ropero'] },
  { slug: 'cerrajeria', name: 'Cerrajería / Copia de llave', keywords: ['cerrajero', 'cerradura', 'llave', 'abrir puerta', 'me quede afuera', 'me quedé afuera'] },
  { slug: 'chofer', name: 'Chofer', keywords: ['chofer', 'conductor', 'manejar mi auto', 'maneja por mi', 'manejá por mí'] },
  { slug: 'consejero-matrimonial', name: 'Consejero matrimonial', keywords: ['pareja', 'matrimonio', 'terapia de pareja', 'crisis', 'relación'] },
  { slug: 'contador', name: 'Contador', keywords: ['contador', 'impuestos', 'iva', 'ruc', 'factura', 'set'] },
  { slug: 'delivery', name: 'Delivery', keywords: ['delivery', 'mandado', 'reparto', 'paquete', 'entrega', 'mensajeria'] },
  { slug: 'diseno-grafico', name: 'Diseñador gráfico', keywords: ['logo', 'flyer', 'diseño', 'diseno', 'instagram', 'grafico'] },
  { slug: 'electricidad', name: 'Electricidad', keywords: ['electricista', 'luz', 'enchufe', 'termica', 'térmica', 'cable'] },
  { slug: 'enfermeria', name: 'Enfermería', keywords: ['enfermera', 'enfermero', 'inyeccion', 'inyección', 'curacion', 'curación'] },
  { slug: 'entrenador', name: 'Entrenador', keywords: ['entrenador', 'gym', 'ejercicio', 'fitness', 'personal trainer'] },
  { slug: 'escolta', name: 'Escolta', keywords: ['seguridad', 'escolta', 'custodia', 'guardia', 'protección'] },
  { slug: 'escolta-privado', name: 'Escolta privado', keywords: ['guardaespaldas', 'seguridad privada', 'custodia privada', 'escolta privado'] },
  { slug: 'extension-pestanas', name: 'Extensión de pestañas', keywords: ['pestañas', 'pestanas', 'lifting', 'pestañista'] },
  { slug: 'fisioterapeuta', name: 'Fisioterapeuta', keywords: ['fisioterapia', 'kinesiologia', 'kinesiología', 'rehabilitacion', 'rehabilitación'] },
  { slug: 'fletes', name: 'Fletes y mudanzas', keywords: ['flete', 'mudanza', 'camion', 'camión', 'me mudo', 'mover muebles'] },
  { slug: 'fotografo', name: 'Fotógrafo', keywords: ['fotografo', 'fotógrafo', 'fotos', 'sesion', 'sesión', 'evento'] },
  { slug: 'fumigacion', name: 'Fumigación', keywords: ['fumigar', 'plaga', 'cucarachas', 'hormigas', 'ratas'] },
  { slug: 'gestiones-documentos', name: 'Gestiones de documentos', keywords: ['tramite', 'trámite', 'papeles', 'gestor', 'documentos'] },
  { slug: 'informatica', name: 'Informática', keywords: ['pc', 'computadora', 'notebook', 'wifi', 'impresora', 'compu'] },
  { slug: 'instalacion-aires', name: 'Instalación de aires acondicionados', keywords: ['aire', 'split', 'aire acondicionado', 'instalar aire', 'gotea'] },
  { slug: 'jardineria', name: 'Jardinería / Césped', keywords: ['jardin', 'jardín', 'pasto', 'césped', 'jardinero', 'patio'] },
  { slug: 'limpieza', name: 'Limpieza', keywords: ['limpieza', 'limpiar', 'mucama', 'sucio', 'casa', 'oficina'] },
  { slug: 'limpieza-piscinas', name: 'Limpieza de piscinas', keywords: ['piscina', 'pileta', 'piletero', 'agua verde', 'cloro'] },
  { slug: 'manicurista', name: 'Manicurista', keywords: ['uñas', 'unas', 'manicure', 'manicura', 'manicurista'] },
  { slug: 'mantenimientos-electronicos', name: 'Mantenimientos electrónicos', keywords: ['mantenimiento electronico', 'placa', 'sensores', 'equipo electronico'] },
  { slug: 'masaje-estetico', name: 'Masaje estético', keywords: ['masaje', 'relajacion', 'relajación', 'masajista', 'spa'] },
  { slug: 'metalurgica', name: 'Metalúrgica', keywords: ['metal', 'herrería', 'herreria', 'soldadura', 'reja', 'porton'] },
  { slug: 'modista', name: 'Modista', keywords: ['costura', 'modista', 'ropa', 'vestido', 'achicar pantalon', 'achicar pantalón'] },
  { slug: 'mozo', name: 'Mozo', keywords: ['mozo', 'camarero', 'evento', 'servicio de mesa'] },
  { slug: 'musico', name: 'Músico / artista en general', keywords: ['musico', 'músico', 'show', 'banda', 'artista'] },
  { slug: 'parrillero', name: 'Parrillero', keywords: ['parrilla', 'asado', 'parrillero', 'brasas'] },
  { slug: 'payaso', name: 'Payaso', keywords: ['payaso', 'animacion', 'animación', 'cumpleaños', 'globos'] },
  { slug: 'peluquero', name: 'Peluquero', keywords: ['peluquero', 'barbero', 'barberia', 'barbería', 'barba'] },
  { slug: 'peluqueria', name: 'Peluquería masculino / femenino', keywords: ['peluqueria', 'peluquería', 'cabello', 'corte', 'peinado'] },
  { slug: 'personal-shopper', name: 'Personal shopper', keywords: ['personal shopper', 'compras', 'ropa', 'shopping', 'look'] },
  { slug: 'pintor', name: 'Pintor', keywords: ['pintor', 'pintura', 'pintar', 'pared', 'techo'] },
  { slug: 'pizzero', name: 'Pizzero', keywords: ['pizza', 'pizzero', 'masa', 'horno'] },
  { slug: 'plomeria', name: 'Plomería', keywords: ['plomeria', 'plomería', 'plomero', 'caño', 'cano', 'canilla', 'agua', 'pileta'] },
  { slug: 'podador', name: 'Podador', keywords: ['podar', 'podador', 'árbol', 'arbol', 'ramas'] },
  { slug: 'profesor-particular', name: 'Profesor particular', keywords: ['profesor', 'tarea', 'apoyo escolar', 'clases'] },
  { slug: 'profesor-tenis', name: 'Profesor de tenis', keywords: ['tenis', 'raqueta', 'cancha', 'profe de tenis'] },
  { slug: 'servicio-tragos', name: 'Servicio de tragos', keywords: ['tragos', 'barra', 'cocteleria', 'coctelería', 'bebidas'] },
  { slug: 'mecanica', name: 'Taller mecánico', keywords: ['mecanico', 'mecánico', 'motor', 'freno', 'taller', 'service'] },
  { slug: 'taxi', name: 'Taxi', keywords: ['taxi', 'traslado', 'llevarme', 'buscarme', 'uber', 'bolt'] },
  { slug: 'electronica', name: 'Técnico en electrónica', keywords: ['electronica', 'electrónica', 'placa', 'tv', 'circuito'] },
  { slug: 'refrigeracion', name: 'Técnico en refrigeración', keywords: ['heladera', 'freezer', 'refrigeracion', 'refrigeración', 'no enfria', 'no enfría'] },
];
const SERVICE_ALIASES = {
  abogado: [
    'abogado', 'abogada', 'legal', 'juicio', 'demanda', 'denuncia', 'contrato',
    'divorcio', 'herencia', 'despido', 'problema legal', 'defensa', 'fiscal',
    'juez', 'audiencia', 'poder', 'embargo', 'sucesion', 'sucesión',
    'cuota alimentaria', 'abogado laboral', 'abogado penal', 'abogado civil',
    'estafa', 'problema judicial', 'carta documento', 'caso legal'
  ],
  albanileria: [
    'albañil', 'albanil', 'obra', 'pared', 'techo', 'piso', 'revoque',
    'contrapiso', 'ladrillo', 'cemento', 'rajadura', 'grieta', 'humedad',
    'ceramica', 'cerámica', 'porcelanato', 'reforma', 'construccion', 'construcción',
    'levantar pared', 'revocar', 'hacer pieza', 'hacer muralla'
  ],
  'auxilio-vehicular': [
    'auxilio', 'grua', 'grúa', 'remolque', 'no arranca', 'se paro mi auto',
    'se paró mi auto', 'me quede en la calle', 'me quedé en la calle',
    'bateria', 'batería', 'pinchazo', 'rueda pinchada', 'puente', 'cables',
    'auto parado', 'socorro vehicular', 'quede tirado', 'me dejo el auto',
    'me dejó el auto', 'necesito grua', 'necesito grúa'
  ],
  barman: [
    'barman', 'bartender', 'barra', 'tragos', 'cocteles', 'cócteles',
    'barra movil', 'barra móvil', 'fiesta', 'evento', 'bebidas', 'cocktails',
    'barra libre', 'show de tragos', 'trago', 'barra para evento'
  ],
  carpinteria: [
    'carpintero', 'carpinteria', 'carpintería', 'madera', 'mueble', 'placard',
    'ropero', 'puerta', 'ventana', 'estante', 'mesa', 'silla', 'melamina',
    'mdf', 'bajo mesada', 'alacena', 'arreglo de muebles', 'mueble a medida',
    'hacer mueble', 'reparar mueble'
  ],
  cerrajeria: [
    'cerrajero', 'cerradura', 'llave', 'copia de llave', 'duplicado llave',
    'abrir puerta', 'me quede afuera', 'me quedé afuera', 'puerta trabada',
    'candado', 'cerrojo', 'cambio cerradura', 'llave perdida', 'se tranco la puerta',
    'se trancó la puerta', 'no abre la puerta'
  ],
  chofer: [
    'chofer', 'conductor', 'manejar mi auto', 'maneja por mi', 'manejá por mí',
    'chofer privado', 'conductor designado', 'llevar mi auto', 'manejo',
    'traslado personal', 'chofer para evento', 'manejarme', 'manejar vehículo ajeno'
  ],
  'consejero-matrimonial': [
    'pareja', 'matrimonio', 'terapia de pareja', 'crisis de pareja',
    'relacion', 'relación', 'separacion', 'separación', 'consejero',
    'problemas de pareja', 'mediacion familiar', 'mediación familiar',
    'pelea con mi pareja', 'problema matrimonial'
  ],
  contador: [
    'contador', 'contable', 'impuestos', 'iva', 'ruc', 'factura', 'set',
    'declaracion jurada', 'declaración jurada', 'balance', 'monotributo',
    'liquidacion', 'liquidación', 'sueldos', 'auditoria', 'auditoría',
    'tributario', 'hacer factura', 'tema impositivo'
  ],
  delivery: [
    'delivery', 'mandado', 'reparto', 'cadete', 'mensajeria', 'mensajería',
    'llevar paquete', 'buscar paquete', 'entrega', 'envio', 'envío',
    'moto delivery', 'repartidor', 'mandadito', 'llevar algo', 'traer algo',
    'hacer mandado'
  ],
  'diseno-grafico': [
    'diseño', 'diseno', 'diseñador grafico', 'diseñador gráfico', 'logo',
    'flyer', 'banner', 'instagram', 'post', 'branding', 'tarjeta',
    'afiche', 'imagen de marca', 'publicidad', 'arte para redes',
    'diseño de logo', 'hacer flyer'
  ],
  electricidad: [
    'electricista', 'luz', 'enchufe', 'termica', 'térmica', 'cable',
    'disyuntor', 'tablero', 'corto', 'se fue la luz', 'no hay luz',
    'instalacion electrica', 'instalación eléctrica', 'tomacorriente',
    'interruptor', 'olor a quemado', 'salta la termica', 'salta la térmica',
    'chispa', 'corto circuito'
  ],
  enfermeria: [
    'enfermera', 'enfermero', 'inyeccion', 'inyección', 'curacion', 'curación',
    'suero', 'presion', 'presión', 'control signos vitales', 'herida',
    'postoperatorio', 'vacuna', 'nebulizacion', 'nebulización', 'cuidados',
    'cambiar vendaje', 'inyectable'
  ],
  entrenador: [
    'entrenador', 'personal trainer', 'gym', 'ejercicio', 'rutina',
    'fitness', 'bajar de peso', 'ganar masa', 'musculacion', 'musculación',
    'entrenamiento', 'cardio', 'pesas', 'profe gym', 'entrenamiento personal'
  ],
  escolta: [
    'escolta', 'seguridad', 'custodia', 'guardia', 'vigilancia',
    'seguridad para evento', 'proteccion', 'protección', 'acompañamiento',
    'seguridad privada', 'guardia de seguridad'
  ],
  'escolta-privado': [
    'escolta privado', 'guardaespaldas', 'seguridad privada', 'custodia personal',
    'proteccion vip', 'protección vip', 'seguridad ejecutiva', 'custodia vip'
  ],
  'extension-pestanas': [
    'pestañas', 'pestanas', 'extensiones', 'lifting', 'pestañista',
    'volumen ruso', 'pelo a pelo', 'cejas y pestañas', 'lashes'
  ],
  fisioterapeuta: [
    'fisioterapia', 'fisioterapeuta', 'kinesiologia', 'kinesiología',
    'rehabilitacion', 'rehabilitación', 'dolor muscular', 'espalda',
    'rodilla', 'cuello', 'masaje terapeutico', 'masaje terapéutico',
    'kine', 'dolor lumbar'
  ],
  fletes: [
    'flete', 'mudanza', 'camion', 'camión', 'camioneta', 'mover muebles',
    'traslado de cosas', 'me mudo', 'llevar heladera', 'llevar sofa',
    'llevar sofá', 'acarreo', 'mudarme', 'mudarme'
  ],
  fotografo: [
    'fotografo', 'fotógrafo', 'fotos', 'sesion', 'sesión', 'evento',
    'casamiento', 'quince', 'cumple', 'book', 'cobertura', 'retrato',
    'sacar fotos', 'fotito'
  ],
  fumigacion: [
    'fumigar', 'fumigacion', 'fumigación', 'plaga', 'cucarachas',
    'hormigas', 'ratas', 'chinches', 'mosquitos', 'termitas',
    'desinfeccion', 'desinfección', 'bichos', 'control de plaga'
  ],
  'gestiones-documentos': [
    'tramite', 'trámite', 'papeles', 'gestor', 'documentos', 'certificado',
    'legalizacion', 'legalización', 'apostilla', 'registro', 'firma',
    'turno', 'gestiones', 'hacer papeles', 'tramitar documento'
  ],
  informatica: [
    'compu', 'computadora', 'pc', 'notebook', 'wifi', 'internet',
    'impresora', 'formateo', 'windows', 'virus', 'router', 'red',
    'soporte tecnico', 'soporte técnico', 'no anda mi compu',
    'se cuelga la pc', 'se tilda la compu', 'arreglar notebook'
  ],
  'instalacion-aires': [
    'aire', 'split', 'aire acondicionado', 'instalar aire', 'gotea',
    'no enfria el aire', 'no enfría el aire', 'carga gas', 'service de aire',
    'mantenimiento split', 'instalador de aire'
  ],
  jardineria: [
    'jardin', 'jardín', 'pasto', 'césped', 'cesped', 'jardinero',
    'patio', 'cortar pasto', 'desmalezar', 'podar plantas', 'riego',
    'cantero', 'huerta', 'limpiar patio'
  ],
  limpieza: [
    'limpieza', 'limpiar', 'mucama', 'ordenar', 'sucio', 'casa',
    'oficina', 'lavar', 'planchar', 'limpieza profunda', 'limpieza de casa',
    'limpieza de oficina', 'que limpie', 'limpiar mi casa'
  ],
  'limpieza-piscinas': [
    'piscina', 'pileta', 'piletero', 'agua verde', 'cloro',
    'limpiar piscina', 'barrefondo', 'ph', 'filtro piscina', 'limpiar pileta'
  ],
  manicurista: [
    'uñas', 'unas', 'manicure', 'manicura', 'manicurista',
    'pedicure', 'pedicura', 'semipermanente', 'acrilicas', 'acrílicas',
    'kapping', 'nail art', 'hacer uñas'
  ],
  'mantenimientos-electronicos': [
    'mantenimiento electronico', 'mantenimiento electrónico',
    'placa', 'sensores', 'equipo electronico', 'equipo electrónico',
    'automatizacion', 'automatización', 'tablero', 'control',
    'mantenimiento de equipo'
  ],
  'masaje-estetico': [
    'masaje', 'masajista', 'relajacion', 'relajación', 'spa',
    'masaje relajante', 'masaje reductor', 'masaje corporal',
    'drenaje linfatico', 'drenaje linfático', 'masaje estetico', 'masaje estético'
  ],
  metalurgica: [
    'metalurgica', 'metalúrgica', 'herrería', 'herreria', 'soldadura',
    'reja', 'porton', 'portón', 'hierro', 'baranda', 'escalera metalica',
    'escalera metálica', 'estructura metalica', 'hacer reja'
  ],
  modista: [
    'modista', 'costura', 'ropa', 'vestido', 'achicar pantalon',
    'achicar pantalón', 'arreglo ropa', 'cierre', 'dobladillo',
    'confeccion', 'confección', 'sastre', 'arreglar ropa'
  ],
  mozo: [
    'mozo', 'camarero', 'evento', 'servicio de mesa', 'garzon',
    'garzón', 'atencion mesa', 'atención mesa', 'banquete', 'catering',
    'mesero'
  ],
  musico: [
    'musico', 'músico', 'show', 'banda', 'artista', 'dj',
    'animacion', 'animación', 'guitarra', 'teclado', 'cantante',
    'grupo musical', 'musica para evento', 'música para evento'
  ],
  parrillero: [
    'parrillero', 'parrilla', 'asado', 'brasas', 'carne', 'fuego',
    'costillar', 'achuras', 'chorizo', 'morcilla', 'asador',
    'hacer asado', 'maestro parrillero', 'asado a domicilio',
    'asadacho', 'parrilla para evento'
  ],
  payaso: [
    'payaso', 'animacion infantil', 'animación infantil', 'cumpleaños',
    'globos', 'magia', 'show infantil', 'juegos', 'niños', 'cumple',
    'animador infantil'
  ],
  peluquero: [
    'peluquero', 'barbero', 'barberia', 'barbería', 'barba',
    'corte hombre', 'afeitado', 'degradado', 'fade', 'corte masculino',
    'barber'
  ],
  peluqueria: [
    'peluqueria', 'peluquería', 'cabello', 'corte', 'peinado',
    'tintura', 'alisado', 'brushing', 'balayage', 'reflejos',
    'salon de belleza', 'salón de belleza', 'hacer cabello'
  ],
  'personal-shopper': [
    'personal shopper', 'compras', 'shopping', 'ropa', 'look',
    'asesoria imagen', 'asesoría imagen', 'acompañar compras', 'outfit',
    'ayuda para comprar ropa'
  ],
  pintor: [
    'pintor', 'pintura', 'pintar', 'pared', 'techo', 'latex',
    'látex', 'rodillo', 'humedad pared', 'fachada', 'enduido',
    'pintar casa'
  ],
  pizzero: [
    'pizzero', 'pizza', 'masa', 'horno', 'pizza party',
    'horno de barro', 'prepizza', 'evento pizza', 'hacer pizza'
  ],
  plomeria: [
    'plomeria', 'plomería', 'plomero', 'caño', 'cano', 'canilla',
    'agua', 'pileta', 'lavamanos', 'lavatorio', 'ducha', 'inodoro',
    'mochila baño', 'destape', 'pierde agua', 'gotea',
    'se rompio el caño', 'se rompió el caño', 'fuga de agua'
  ],
  podador: [
    'podador', 'podar', 'árbol', 'arbol', 'ramas', 'motosierra',
    'poda altura', 'sacar ramas', 'cortar árbol', 'cortar arbol',
    'podar arbol'
  ],
  'profesor-particular': [
    'profesor', 'clases', 'apoyo escolar', 'tarea', 'particular',
    'matematica', 'matemática', 'ingles', 'inglés', 'fisica', 'física',
    'quimica', 'química', 'lecciones', 'profe particular'
  ],
  'profesor-tenis': [
    'profesor tenis', 'profe de tenis', 'tenis', 'raqueta', 'cancha',
    'saque', 'drive', 'reves', 'revés', 'clases de tenis'
  ],
  'servicio-tragos': [
    'tragos', 'barra', 'cocteleria', 'coctelería', 'bebidas',
    'barra de tragos', 'trago para evento', 'cocktail', 'coctel',
    'servicio de barra'
  ],
  mecanica: [
    'mecanico', 'mecánico', 'motor', 'freno', 'taller', 'service',
    'auto', 'vehiculo', 'vehículo', 'suspension', 'suspensión',
    'amortiguador', 'radiador', 'embrague', 'arreglar auto'
  ],
  taxi: [
    'taxi', 'traslado', 'llevarme', 'buscarme', 'uber', 'bolt',
    'remis', 'movilidad', 'venime a buscar', 'llevame', 'llévame',
    'pasame a buscar', 'ir hasta', 'llevarme hasta'
  ],
  electronica: [
    'electronica', 'electrónica', 'placa', 'tv', 'circuito', 'smart tv',
    'audio', 'parlante', 'microondas', 'soldadura', 'fuente', 'chip',
    'arreglar tv'
  ],
  refrigeracion: [
    'refrigeracion', 'refrigeración', 'heladera', 'freezer',
    'no enfria', 'no enfría', 'congelador', 'frio', 'frío',
    'service heladera', 'carga de gas', 'compresor', 'heladera no enfria',
    'heladera no enfría'
  ]
};
const TIMING_OPTIONS = [
  { id: 'hoy', label: 'hoy' },
  { id: 'otro-dia', label: 'otro día' },
];

const SUPPLIER_ALIASES = {
  plomeria_insumos: {
    name: 'Plomería - caños, canillas y conexiones',
    keywords: [
      'caño', 'cano', 'cañoo', 'kaño', 'tubo', 'tubos', 'tubo pvc', 'pvc', 'pbc',
      'caño pvc', 'cano pvc', 'termofusion', 'termofusión', 'polipropileno',
      'canilla', 'griferia', 'grifería', 'mezcladora', 'ducha', 'flexible',
      'codo', 'tee', 'union', 'unión', 'reduccion', 'reducción', 'acople',
      'llave de paso', 'flotante', 'sifon', 'sifón', 'pileta', 'valvula',
      'válvula', 'registro', 'teflon', 'teflón', 'pegamento pvc', 'vendo caños',
      'vendo canos', 'vendo pvc'
    ],
  },
  electricidad_insumos: {
    name: 'Electricidad - cables, focos y tableros',
    keywords: [
      'cable', 'cables', 'cavle', 'kable', 'cable tipo taller', 'cable canal',
      'foco', 'focos', 'foko', 'lampara', 'lámpara', 'lampra', 'led', 'focos led',
      'llave', 'interruptor', 'tomacorriente', 'enchufe', 'zapatilla',
      'disyuntor', 'termica', 'térmica', 'tablero', 'breaker', 'fusible',
      'portalámpara', 'portalampra', 'tubo led', 'cinta aisladora', 'conector',
      'tengo cables', 'vendo focos led'
    ],
  },
  construccion_materiales: {
    name: 'Construcción - cemento, arena y obra',
    keywords: [
      'cemento', 'semento', 'siminto', 'arena', 'piedra', 'cal', 'varilla',
      'hierro', 'ladrillo', 'ladrillos', 'bloque', 'bloques', 'cemento cp',
      'pegamento ceramico', 'pegamento cerámico', 'porcelanato', 'ceramica',
      'cerámica', 'teja', 'chapa', 'aislante', 'yeso', 'masilla', 'obra',
      'materiales de construccion', 'materiales de construcción',
      'vendo cemento', 'vendo arena', 'vendo materiales de construcción'
    ],
  },
  ferreteria_general: {
    name: 'Ferretería - herramientas y fijaciones',
    keywords: [
      'tornillo', 'tornillos', 'torniyo', 'tuerca', 'tuercas', 'arandela',
      'arandelas', 'clavo', 'clavos', 'tarugo', 'tarugos', 'mecha', 'broca',
      'martillo', 'pinza', 'alicate', 'destornillador', 'llave inglesa',
      'taladro', 'amoladora', 'sierra', 'herramienta', 'herramientas',
      'cinta metrica', 'cinta métrica', 'silicona', 'sellador',
      'vendo herramientas', 'vendo tornillos'
    ],
  },
  automotor_repuestos: {
    name: 'Automotor - repuestos, baterías y aceite',
    keywords: [
      'repuesto', 'repuestos', 'respuesto', 'repueso', 'repuestoo',
      'repuesto toyota', 'toyota', 'nissan', 'hyundai', 'kia', 'chevrolet',
      'volkswagen', 'vw', 'ford', 'fiat', 'bateria', 'batería', 'batria',
      'bateri', 'cubierta', 'cubierta usada', 'rueda', 'llanta', 'llantas',
      'aceite', 'aseite', 'lubricante', 'filtro', 'pastilla de freno',
      'amortiguador', 'radiador', 'embrague', 'correa', 'bujia', 'bujía',
      'vendo repuestos toyota'
    ],
  },
  motos_repuestos: {
    name: 'Motos - repuestos y accesorios',
    keywords: [
      'moto', 'motos', 'repuesto de moto', 'repuestos de moto', 'cubierta moto',
      'cadena', 'piñon', 'piñón', 'corona', 'camara', 'cámara', 'casco',
      'aceite moto', 'bateria moto', 'batería moto', 'pastilla moto',
      'manija', 'espejo moto', 'faro moto', 'yamaha', 'honda', 'kentón',
      'kenton', 'taiga', 'star', 'vendo repuesto de moto'
    ],
  },
  refrigeracion_insumos: {
    name: 'Refrigeración - gas, cobre y repuestos',
    keywords: [
      'gas aire', 'gas para aire', 'gas refrigerante', 'r410', 'r410a', 'r22',
      'r134', 'r134a', 'cobre', 'caño de cobre', 'cano de cobre', 'aislante',
      'manguera aire', 'capacitor', 'compresor', 'control aire', 'filtro aire',
      'manifold', 'vacío', 'vacio', 'refrigerante', 'vendo gas para aire'
    ],
  },
  informatica_tecnologia: {
    name: 'Informática y tecnología',
    keywords: [
      'notebook', 'noutbuk', 'laptop', 'pc', 'computadora', 'mouse', 'teclado',
      'monitor', 'ssd', 'disco', 'memoria ram', 'ram', 'router', 'wifi',
      'impresora', 'cartucho', 'toner', 'tóner', 'celular', 'iphone', 'samsung',
      'xiaomi', 'motorola', 'cargador', 'cable usb', 'auricular', 'parlante'
    ],
  },
  gastronomia_insumos: {
    name: 'Gastronomía - alimentos y bebidas',
    keywords: [
      'pollo', 'carne', 'harina', 'queso', 'bebidas', 'gaseosa', 'agua mineral',
      'aceite cocina', 'arroz', 'azucar', 'azúcar', 'sal', 'condimento',
      'pan', 'huevo', 'huevos', 'leche', 'crema', 'jamon', 'jamón',
      'mozzarella', 'salsa', 'embutido', 'insumos gastronomicos',
      'insumos gastronómicos'
    ],
  },
  limpieza_insumos: {
    name: 'Limpieza - químicos y descartables',
    keywords: [
      'detergente', 'lavandina', 'desinfectante', 'desengrasante', 'jabon',
      'jabón', 'suavizante', 'trapo', 'rejilla', 'escoba', 'secador',
      'mopa', 'balde', 'guante', 'guantes', 'bolsa basura', 'papel higienico',
      'papel higiénico', 'toalla papel', 'alcohol', 'cloro',
      'vendo insumos de limpieza'
    ],
  },
  belleza_insumos: {
    name: 'Belleza - peluquería, uñas y estética',
    keywords: [
      'shampoo', 'shampu', 'acondicionador', 'tintura', 'decolorante',
      'oxidante', 'uñas', 'unas', 'gel', 'kapping', 'esmalte', 'cabello',
      'barberia', 'barbería', 'maquina de cortar', 'máquina de cortar',
      'secador pelo', 'plancha pelo', 'cera', 'crema', 'pestañas', 'pestanas',
      'vendo productos de peluqueria', 'vendo productos de peluquería'
    ],
  },
  carpinteria_maderas: {
    name: 'Carpintería - maderas y herrajes',
    keywords: [
      'madera', 'melamina', 'mdf', 'placa', 'placa mdf', 'fenolico',
      'fenólico', 'terciada', 'bisagra', 'corredera', 'tirador', 'tapacanto',
      'cola vinilica', 'cola vinílica', 'barniz', 'lija', 'tornillo madera',
      'liston', 'listón', 'machimbre', 'enchapado'
    ],
  },
  pintura_insumos: {
    name: 'Pintura - látex, enduido y accesorios',
    keywords: [
      'pintura', 'pinturas', 'pintura suvinil', 'suvinil', 'sherwin',
      'sherwin williams', 'enduido', 'latex', 'látex', 'esmalte sintetico',
      'esmalte sintético', 'rodillo', 'pincel', 'bandeja pintura', 'lija',
      'sellador', 'fijador', 'thinner', 'aguarras', 'aguarrás',
      'vendo pinturas'
    ],
  },
  jardineria_insumos: {
    name: 'Jardinería - herramientas, tierra y plantas',
    keywords: [
      'tierra', 'abono', 'fertilizante', 'semilla', 'semillas', 'maceta',
      'manguera', 'regadera', 'pala', 'rastrillo', 'tijera poda',
      'motosierra', 'desmalezadora', 'césped', 'cesped', 'veneno planta',
      'insecticida jardin', 'insecticida jardín'
    ],
  },
  seguridad_epp: {
    name: 'Seguridad y EPP',
    keywords: [
      'epp', 'casco', 'guante seguridad', 'guantes seguridad', 'lente seguridad',
      'antiparra', 'botin', 'botín', 'zapato seguridad', 'chaleco reflectivo',
      'arnes', 'arnés', 'barbijo', 'mascara', 'máscara', 'protector auditivo',
      'matafuego', 'extintor'
    ],
  },
  agro_veterinaria: {
    name: 'Agro y veterinaria',
    keywords: [
      'balanceado', 'alimento perro', 'alimento gato', 'forraje', 'maiz',
      'maíz', 'semilla agro', 'fertilizante agro', 'herbicida', 'insecticida',
      'veterinario', 'veterinaria', 'vacuna animal', 'antipulgas',
      'desparasitante', 'productos veterinarios', 'vendo balanceado',
      'vendo productos veterinarios'
    ],
  },
  packaging_descartables: {
    name: 'Packaging y descartables',
    keywords: [
      'descartable', 'descartables', 'vaso descartable', 'plato descartable',
      'bandeja', 'bandejas', 'bolsa', 'bolsas', 'film', 'papel aluminio',
      'servilleta', 'caja pizza', 'caja hamburguesa', 'envase', 'envases',
      'delivery', 'packaging', 'sorbete', 'cubierto descartable',
      'vendo descartables', 'vendo insumos para delivery'
    ],
  },
};

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function firstNameOf(name) {
  return String(name || '').trim().split(' ')[0] || '';
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getDisplayNameFromEmail(email) {
  const left = normalizeEmail(email).split('@')[0] || 'amigo';
  return left.charAt(0).toUpperCase() + left.slice(1);
}

function saveLastIntent(intent) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(
    LS_LAST_INTENT,
    JSON.stringify({
      role: intent?.role || null,
      serviceSlug: intent?.serviceSlug || null,
      serviceName: intent?.serviceName || null,
      timing: intent?.timing || null,
      savedAt: new Date().toISOString(),
    })
  );
}

function readLastIntent() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LS_LAST_INTENT);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearLastIntent() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LS_LAST_INTENT);
}

function fuzzyIncludes(text, keyword) {
  if (!text || !keyword) return false;

  const t = normalizeText(text);
  const k = normalizeText(keyword);

  if (!t || !k) return false;
  if (t.includes(k)) return true;

  const strip = (str) => str.replace(/[aeiou]/g, '');
  const ts = strip(t);
  const ks = strip(k);

  if (ts.includes(ks)) return true;

  if (k.length >= 5 && t.includes(k.slice(0, 5))) return true;
  if (k.length >= 6 && t.includes(k.slice(0, 6))) return true;

  const words = t.split(' ');
  for (const word of words) {
    if (word === k) return true;
    if (word.startsWith(k) || k.startsWith(word)) {
      if (Math.min(word.length, k.length) >= 4) return true;
    }

    const ws = strip(word);
    if (ws && ks && (ws === ks || ws.startsWith(ks) || ks.startsWith(ws))) {
      if (Math.min(ws.length, ks.length) >= 4) return true;
    }
  }

  return false;
}

function scoreServiceMatch(service, text) {
  let score = 0;

  const cleanText = normalizeText(text);
  const name = normalizeText(service.name);
  const slug = normalizeText(service.slug).replace(/-/g, ' ');
  const aliases = SERVICE_ALIASES[service.slug] || [];

  if (fuzzyIncludes(cleanText, name)) score += 24;
  if (fuzzyIncludes(cleanText, slug)) score += 20;

  const allKeywords = [...new Set([...(service.keywords || []), ...aliases])];

  for (const keyword of allKeywords) {
    const k = normalizeText(keyword);
    if (!k) continue;

    if (fuzzyIncludes(cleanText, k)) {
      if (k.includes(' ')) score += 12;
      else if (k.length >= 10) score += 8;
      else if (k.length >= 7) score += 6;
      else if (k.length >= 5) score += 4;
      else score += 2;
    }
  }

  if (service.slug === 'taxi') {
    if (
      cleanText.includes('llevarme') ||
      cleanText.includes('buscarme') ||
      cleanText.includes('pasame a buscar') ||
      cleanText.includes('venime a buscar') ||
      cleanText.includes('veni a buscarme') ||
      cleanText.includes('llévame') ||
      cleanText.includes('llevame') ||
      cleanText.includes('ir hasta')
    ) {
      score += 16;
    }
  }

  if (service.slug === 'chofer') {
    if (
      cleanText.includes('manejar mi auto') ||
      cleanText.includes('maneja por mi') ||
      cleanText.includes('manejá por mí') ||
      cleanText.includes('chofer privado') ||
      cleanText.includes('conductor designado')
    ) {
      score += 16;
    }
  }

  if (service.slug === 'auxilio-vehicular') {
    if (
      cleanText.includes('me quede en la calle') ||
      cleanText.includes('me quedé en la calle') ||
      cleanText.includes('grua') ||
      cleanText.includes('grúa') ||
      cleanText.includes('remolque') ||
      cleanText.includes('rueda pinchada') ||
      cleanText.includes('no arranca') ||
      cleanText.includes('quede tirado') ||
      cleanText.includes('quedé tirado')
    ) {
      score += 18;
    }
  }

  if (service.slug === 'mecanica') {
    if (
      cleanText.includes('motor') ||
      cleanText.includes('ruido') ||
      cleanText.includes('freno') ||
      cleanText.includes('taller') ||
      cleanText.includes('service') ||
      cleanText.includes('radiador') ||
      cleanText.includes('embrague')
    ) {
      score += 14;
    }
  }

  if (service.slug === 'refrigeracion') {
    if (
      cleanText.includes('heladera') ||
      cleanText.includes('freezer') ||
      cleanText.includes('congelador') ||
      cleanText.includes('no enfria') ||
      cleanText.includes('no enfría') ||
      cleanText.includes('frio') ||
      cleanText.includes('frío')
    ) {
      score += 16;
    }
  }

  if (service.slug === 'instalacion-aires') {
    if (
      cleanText.includes('split') ||
      cleanText.includes('aire acondicionado') ||
      cleanText.includes('instalar aire') ||
      cleanText.includes('el split gotea') ||
      cleanText.includes('no enfria el aire') ||
      cleanText.includes('no enfría el aire')
    ) {
      score += 16;
    }
  }

  if (service.slug === 'plomeria') {
    if (
      cleanText.includes('agua') ||
      cleanText.includes('caño') ||
      cleanText.includes('cano') ||
      cleanText.includes('canilla') ||
      cleanText.includes('pileta') ||
      cleanText.includes('gotea') ||
      cleanText.includes('pierde agua') ||
      cleanText.includes('fuga')
    ) {
      score += 16;
    }
  }

  if (service.slug === 'electricidad') {
    if (
      cleanText.includes('luz') ||
      cleanText.includes('enchufe') ||
      cleanText.includes('termica') ||
      cleanText.includes('térmica') ||
      cleanText.includes('disyuntor') ||
      cleanText.includes('tablero') ||
      cleanText.includes('corto')
    ) {
      score += 16;
    }
  }

  return score;
}

function detectServiceCandidates(message) {
  const text = normalizeText(message)
    .replace(/[.,!?¿?¡!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return [];

  const SERVICE_INTENTS = {
    'se fue la luz': 'electricidad',
    'no hay luz': 'electricidad',
    'no prende nada': 'electricidad',
    'salta la termica': 'electricidad',
    'salta la térmica': 'electricidad',
    'se corto la luz': 'electricidad',
    'se cortó la luz': 'electricidad',

    'se rompio el caño': 'plomeria',
    'se rompió el caño': 'plomeria',
    'pierde agua': 'plomeria',
    'gotea la canilla': 'plomeria',
    'se inunda': 'plomeria',
    'fuga de agua': 'plomeria',

    'me quede afuera': 'cerrajeria',
    'me quedé afuera': 'cerrajeria',
    'no puedo entrar': 'cerrajeria',
    'puerta trabada': 'cerrajeria',
    'se tranco la puerta': 'cerrajeria',
    'se trancó la puerta': 'cerrajeria',

    'me quede en la calle': 'auxilio-vehicular',
    'me quedé en la calle': 'auxilio-vehicular',
    'no arranca mi auto': 'auxilio-vehicular',
    'se paro mi auto': 'auxilio-vehicular',
    'se paró mi auto': 'auxilio-vehicular',
    'quede tirado': 'auxilio-vehicular',
    'quedé tirado': 'auxilio-vehicular',

    'quiero asado': 'parrillero',
    'necesito parrillero': 'parrillero',
    'alguien que haga asado': 'parrillero',
    'quiero alguien para asado': 'parrillero',

    'me mudo': 'fletes',
    'quiero mudanza': 'fletes',

    'mi heladera no enfria': 'refrigeracion',
    'mi heladera no enfría': 'refrigeracion',
    'no enfria la heladera': 'refrigeracion',
    'no enfría la heladera': 'refrigeracion',
    'no enfria mi freezer': 'refrigeracion',
    'no enfría mi freezer': 'refrigeracion',

    'el split gotea': 'instalacion-aires',
    'instalar aire': 'instalacion-aires',
    'no enfria el aire': 'instalacion-aires',
    'no enfría el aire': 'instalacion-aires',

    'mi compu no anda': 'informatica',
    'no funciona wifi': 'informatica',
    'se corto el internet': 'informatica',
    'se cortó el internet': 'informatica',
    'se tilda la compu': 'informatica',

    'quiero alguien que limpie': 'limpieza',
    'mi casa esta sucia': 'limpieza',
    'mi casa está sucia': 'limpieza',
    'necesito limpieza': 'limpieza',

    'venime a buscar': 'taxi',
    'pasame a buscar': 'taxi',
    'llevame': 'taxi',
    'llévame': 'taxi',
    'llevame hasta': 'taxi',
    'llévame hasta': 'taxi'
  };

  for (const phrase in SERVICE_INTENTS) {
    if (text.includes(normalizeText(phrase))) {
      const direct = ALL_SERVICES.find((s) => s.slug === SERVICE_INTENTS[phrase]);
      return direct ? [{ ...direct, score: 999 }] : [];
    }
  }

  return ALL_SERVICES
    .map((service) => ({
      ...service,
      score: scoreServiceMatch(service, text),
    }))
    .filter((service) => service.score >= 10)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

function scoreSupplierMatch(slug, category, text) {
  let score = 0;
  const cleanText = normalizeText(text);
  const categoryName = normalizeText(category.name);
  const slugText = normalizeText(slug).replace(/_/g, ' ');
  const keywords = category.keywords || [];

  if (fuzzyIncludes(cleanText, categoryName)) score += 26;
  if (fuzzyIncludes(cleanText, slugText)) score += 18;

  const supplierSignals = [
    'vendo',
    'tengo',
    'proveedor',
    'distribuyo',
    'distribuidor',
    'insumos',
    'materiales',
    'repuestos',
    'mayorista',
    'minorista',
  ];

  if (supplierSignals.some((signal) => fuzzyIncludes(cleanText, signal))) {
    score += 8;
  }

  for (const keyword of keywords) {
    const k = normalizeText(keyword);
    if (!k) continue;

    if (fuzzyIncludes(cleanText, k)) {
      if (k.includes(' ')) score += 14;
      else if (k.length >= 10) score += 9;
      else if (k.length >= 7) score += 7;
      else if (k.length >= 5) score += 5;
      else score += 3;
    }
  }

  if (slug === 'plomeria_insumos') {
    if (
      cleanText.includes('pvc') ||
      cleanText.includes('pbc') ||
      cleanText.includes('kaño') ||
      cleanText.includes('cano') ||
      cleanText.includes('caño') ||
      cleanText.includes('canilla')
    ) {
      score += 18;
    }
  }

  if (slug === 'electricidad_insumos') {
    if (
      cleanText.includes('kable') ||
      cleanText.includes('cavle') ||
      cleanText.includes('cable') ||
      cleanText.includes('foko') ||
      cleanText.includes('foco') ||
      cleanText.includes('lampra') ||
      cleanText.includes('lampara')
    ) {
      score += 18;
    }
  }

  if (slug === 'automotor_repuestos' || slug === 'motos_repuestos') {
    if (
      cleanText.includes('respuesto') ||
      cleanText.includes('repueso') ||
      cleanText.includes('repuestoo') ||
      cleanText.includes('batria') ||
      cleanText.includes('bateri') ||
      cleanText.includes('cubierta') ||
      cleanText.includes('aseite')
    ) {
      score += 16;
    }
  }

  if (slug === 'refrigeracion_insumos') {
    if (
      cleanText.includes('gas aire') ||
      cleanText.includes('gas para aire') ||
      cleanText.includes('r410') ||
      cleanText.includes('r22')
    ) {
      score += 18;
    }
  }

  if (slug === 'construccion_materiales') {
    if (
      cleanText.includes('semento') ||
      cleanText.includes('siminto') ||
      cleanText.includes('cemento') ||
      cleanText.includes('arena')
    ) {
      score += 16;
    }
  }

  return score;
}

function detectSupplierCandidates(message) {
  const text = normalizeText(message)
    .replace(/[.,!?¿?¡!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return [];

  const SUPPLIER_INTENTS = {
    'vendo caños': 'plomeria_insumos',
    'vendo canos': 'plomeria_insumos',
    'vendo pvc': 'plomeria_insumos',
    'tengo cables': 'electricidad_insumos',
    'vendo focos led': 'electricidad_insumos',
    'vendo cemento': 'construccion_materiales',
    'vendo arena': 'construccion_materiales',
    'vendo repuestos toyota': 'automotor_repuestos',
    'vendo repuesto de moto': 'motos_repuestos',
    'vendo gas para aire': 'refrigeracion_insumos',
    'vendo insumos de limpieza': 'limpieza_insumos',
    'vendo productos de peluqueria': 'belleza_insumos',
    'vendo productos de peluquería': 'belleza_insumos',
    'vendo materiales de construcción': 'construccion_materiales',
    'vendo materiales de construccion': 'construccion_materiales',
    'vendo herramientas': 'ferreteria_general',
    'vendo tornillos': 'ferreteria_general',
    'vendo pinturas': 'pintura_insumos',
    'vendo descartables': 'packaging_descartables',
    'vendo insumos para delivery': 'packaging_descartables',
    'vendo balanceado': 'agro_veterinaria',
    'vendo productos veterinarios': 'agro_veterinaria',
  };

  for (const phrase in SUPPLIER_INTENTS) {
    if (text.includes(normalizeText(phrase))) {
      const slug = SUPPLIER_INTENTS[phrase];
      const category = SUPPLIER_ALIASES[slug];
      return category
        ? [{ slug, name: category.name, keywords: category.keywords, score: 999 }]
        : [];
    }
  }

  return Object.entries(SUPPLIER_ALIASES)
    .map(([slug, category]) => ({
      slug,
      name: category.name,
      keywords: category.keywords,
      score: scoreSupplierMatch(slug, category, text),
    }))
    .filter((category) => category.score >= 10)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

function guessFlowFromMessage(text) {
  const supplierHints = [
    'vendo',
    'proveedor',
    'ferreteria',
    'ferretería',
    'insumos',
    'materiales',
    'repuestos',
    'tengo productos',
  ];

  const workerHints = [
    'ofrezco',
    'trabajo de',
    'soy',
    'hago',
    'me dedico',
    'quiero trabajar',
    'brindo',
    'ofresco',
    'ofrezco servicios',
  ];

  const normalized = normalizeText(text);
  if (supplierHints.some((hint) => normalized.includes(hint))) return 'supplier';
  return workerHints.some((hint) => normalized.includes(hint)) ? 'worker' : 'client';
}

function getRedirectPathFromRole(role) {
  const normalizedRole = String(role || '').trim().toLowerCase();
  if (normalizedRole === 'worker') return '/worker';
  if (normalizedRole === 'client') return '/client';
  if (normalizedRole === 'supplier') return '/supplier';
  return '/role-selector';
}

function ArrowDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-9 w-9"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 4V18" />
      <path d="M6 12L12 18L18 12" />
    </svg>
  );
}

function PromptBubble({ title, subtitle }) {
  return (
    <motion.div
      key={`${title}-${subtitle}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="mx-auto w-full max-w-[760px] text-center"
    >
      <h1 className="text-[35px] sm:text-[58px] font-extrabold leading-[1.12] tracking-[-0.035em] text-white drop-shadow-[0_8px_18px_rgba(0,0,0,0.12)]">
        {title}
      </h1>

      {subtitle ? (
        <h2 className="mt-5 text-[35px] sm:text-[58px] font-extrabold leading-[1.12] tracking-[-0.035em] text-white drop-shadow-[0_8px_18px_rgba(0,0,0,0.12)]">
          {subtitle}
        </h2>
      ) : null}
    </motion.div>
  );
}
function ChoicePill({ active, label, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      whileHover={{ scale: 1.04, y: -3 }}
      animate={{
        y: active ? 0 : [0, -4, 0],
      }}
      transition={{
        y: {
          duration: 3.2,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      }}
      className={[
        'relative flex h-[118px] w-[118px] items-center justify-center overflow-hidden rounded-full px-4 text-center transition-all duration-300 sm:h-[158px] sm:w-[158px] sm:px-5',
        active
          ? 'scale-[1.03] bg-[#06182a] text-white shadow-[0_20px_48px_rgba(6,24,42,0.26)]'
          : 'bg-white/96 text-[#071a27] shadow-[0_20px_46px_rgba(8,15,52,0.14)] hover:bg-white',
      ].join(' ')}
    >
      <span className="pointer-events-none absolute inset-[10px] rounded-full border border-white/70" />
      <span className="pointer-events-none absolute left-6 top-5 h-10 w-16 rounded-full bg-white/45 blur-xl" />

      <span className="relative whitespace-pre-line text-[14px] font-black leading-[1.18] tracking-[-0.03em] sm:text-[17px]">
        {label}
      </span>
    </motion.button>
  );
}
function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16v12H4z" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <path d="M12 14v3" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
 function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7 rotate-[8deg]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.45"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  );
}

function MainInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  inputRef,
  disabled = false,
  showSend = true,
  onSubmit,
  icon = null,
  rightIcon = null,
  showPassword = false,
}) {
  const autoCompleteValue =
    type === 'password' ? 'new-password' : type === 'email' ? 'off' : 'off';

  return (
    <div className="flex min-h-[88px] w-full items-center rounded-full border-2 border-white/45 bg-[#111111]/14 px-6 text-white shadow-[0_24px_55px_rgba(0,0,0,0.15)] backdrop-blur-xl">
      {icon ? <div className="mr-5 flex shrink-0 text-white">{icon}</div> : null}

      <input
  ref={inputRef}
  type={type === 'password' ? (showPassword ? 'text' : 'password') : type}
  value={value}
  onChange={(e) => {
    onChange(e.target.value);
  }}
        onKeyDown={(e) => {
  if (e.key === 'Enter') {
    onSubmit?.(e.currentTarget.value);
  }
}}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoCompleteValue}
        spellCheck={false}
        className="
          min-w-0 flex-1
          appearance-none
          border-0
          bg-transparent
          text-[25px] font-black
          tracking-[-0.035em]
          text-white
          outline-none
          placeholder:text-white/48
          disabled:opacity-70
        "
      />

      {rightIcon ? <div className="ml-4 flex shrink-0 text-white">{rightIcon}</div> : null}

      {showSend ? (
  <button
    type="button"
    onClick={() => {
      const latestValue = inputRef?.current?.value ?? value;
      onChange?.(latestValue);
      onSubmit?.(latestValue);
    }}
    className="
      ml-4 flex h-[60px] w-[60px] shrink-0
      items-center justify-center rounded-full
      bg-[#62bfb9]
      text-white
      shadow-[0_12px_26px_rgba(98,191,185,0.38)]
      transition-all duration-200
      hover:scale-[1.03]
      active:scale-95
      disabled:opacity-45
    "
    aria-label="Continuar"
  >
    <SendIcon />
  </button>
) : null}
    </div>
  );
}
function DownActionButton({ onClick, disabled, busy }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className="
        mx-auto
        flex h-[86px] w-[86px]
        items-center justify-center
        rounded-full
        bg-[#62bfb9]
        text-white
        shadow-[0_18px_38px_rgba(98,191,185,0.48)]
        ring-1 ring-white/60
        transition-all
        duration-200
        hover:scale-[1.05]
        active:scale-95
        disabled:cursor-not-allowed
        disabled:opacity-45
      "
      aria-label="Continuar"
    >
      {busy ? (
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-white border-t-transparent" />
      ) : (
        <ArrowDownIcon />
      )}
    </button>
  );
}

function RecognizedCard({ name, email, avatarUrl, onContinue, onReset, busy }) {
  return (
    <div className="mx-auto w-full max-w-[760px] rounded-[34px] bg-white/88 p-6 text-center shadow-[0_18px_40px_rgba(8,15,52,0.10)]">
      <div className="mx-auto h-[96px] w-[96px] overflow-hidden rounded-full border-4 border-white shadow-[0_10px_24px_rgba(8,15,52,0.12)]">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#06182a] text-3xl font-black text-white">
            {(name || 'U').charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="mt-4 text-[28px] font-black text-[#08233a]">
        Hola {name}, volvimos 🔥
      </div>

      <div className="mt-2 text-[16px] text-[#5e7486]">
        Te reconocí con {email}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onContinue}
          disabled={busy}
          className="rounded-[22px] bg-[#06182a] px-5 py-4 text-base font-black text-white disabled:opacity-50"
        >
          Entrar como {name}
        </button>

        <button
          type="button"
          onClick={onReset}
          disabled={busy}
          className="rounded-[22px] bg-[#eef5f7] px-5 py-4 text-base font-black text-[#4f6978] disabled:opacity-50"
        >
          No soy yo
        </button>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
const inputRef = useRef(null);
const flowRef = useRef(null);
const [checkingSession, setCheckingSession] = useState(true);
const [busy, setBusy] = useState(false);

const [authMode, setAuthMode] = useState('signup');
const [draftStage, setDraftStage] = useState('name');

const [fullName, setFullName] = useState('');
const [flow, setFlow] = useState(null);
const [selectedNeed, setSelectedNeed] = useState(null);
const [selectedTiming, setSelectedTiming] = useState('');
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [showPassword, setShowPassword] = useState(false);

const [assistantInput, setAssistantInput] = useState('');
const [serviceSuggestions, setServiceSuggestions] = useState([]);

const [savedSessionEmail, setSavedSessionEmail] = useState('');
const [recognizedName, setRecognizedName] = useState('');
const [recognizedAvatar, setRecognizedAvatar] = useState('');
const [showRecognizedCard, setShowRecognizedCard] = useState(false);

const [rememberedIntent, setRememberedIntent] = useState(null);

const [photoFile, setPhotoFile] = useState(null);


const [currentPrompt, setCurrentPrompt] = useState({
  id: makeId(),
  title: '¡Hola!',
  subtitle: 'Bienvenido a ManosYA',
  mergeSubtitle: false,
});
const videoRef = useRef(null);
const canvasRef = useRef(null);
const streamRef = useRef(null);

const [capturedPreview, setCapturedPreview] = useState('');
const [cameraOpen, setCameraOpen] = useState(false);
const [cameraError, setCameraError] = useState('');
const [cameraReady, setCameraReady] = useState(false);
  const displayAvatar = useMemo(() => {
    if (showRecognizedCard) return '/ROGER SALUDANDO.png';
    if (draftStage === 'name') return '/ROGER SALUDANDO.png';
    if (draftStage === 'flow') return '/ROGER DEFINITIVO pensativo.png';
    if (draftStage === 'need') return '/ROGER DEFINITIVO pensativo.png';
    if (draftStage === 'timing') return '/ROGER DEFINITIVO pensativo.png';
    if (draftStage === 'email') return '/ROGER OK.png';
    if (draftStage === 'password' || draftStage === 'login-password') return '/ROGER OK.png';
    if (draftStage === 'photo') return '/ROGER OK.png';
    return '/ROGER SALUDANDO.png';
  }, [draftStage, showRecognizedCard]);

  async function getProfileByUserId(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, avatar_url')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  async function getProfileByEmail(emailValue) {
    const cleanEmail = normalizeEmail(emailValue);
    if (!cleanEmail) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, avatar_url')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (error) {
      console.warn('No se pudo buscar el perfil por email:', error.message);
      return null;
    }

    return data || null;
  }

  async function uploadAvatar(userId) {
    if (!photoFile) return null;

    const ext = photoFile.name.split('.').pop() || 'jpg';
    const path = `avatars/${userId}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, photoFile, {
        upsert: true,
        contentType: photoFile.type || 'image/jpeg',
      });

    if (uploadError) {
      console.warn(uploadError);
      return null;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data?.publicUrl || null;
  }

  async function redirectByRealProfile(userId) {
    const profile = await getProfileByUserId(userId);
    const role = profile?.role || flow || null;
    const basePath = getRedirectPathFromRole(role);

    if (typeof window !== 'undefined') {
      if (role) localStorage.setItem(LS_APP_ROLE, String(role));
      if (profile?.email) localStorage.setItem(LS_LAST_EMAIL, normalizeEmail(profile.email));
    }

    let finalPath = basePath;

    if (role === 'client') {
      const params = new URLSearchParams();
      const serviceSlug = selectedNeed?.slug || rememberedIntent?.serviceSlug || '';
      const timing = selectedTiming || rememberedIntent?.timing || '';

      if (serviceSlug) params.set('service', serviceSlug);
      if (timing) params.set('timing', timing);

      const query = params.toString();
      finalPath = query ? `${basePath}?${query}` : basePath;
    }

    await router.replace(finalPath);
  }

  function appendPrompt(title, subtitle = '', options = {}) {
  setCurrentPrompt({
    id: makeId(),
    title,
    subtitle,
    mergeSubtitle: !!options.mergeSubtitle,
  });
}

  function resetConversationForSignup() {
    flowRef.current = null;
  setAuthMode('signup');
  setDraftStage('name');
  setFlow(null);
  setSelectedNeed(null);
  setSelectedTiming('');
  setAssistantInput('');
  setServiceSuggestions([]);
  setEmail('');
  setPassword('');
  setPhotoFile(null);
  setCapturedPreview('');
  setCameraError('');
  setShowRecognizedCard(false);
  appendPrompt('¡Hola!', 'Bienvenido a ManosYA');


}

 function handleNotMe() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LS_LAST_EMAIL);
  }

  if (streamRef.current) {
    streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  setCameraOpen(false);
  setCameraReady(false);
  clearLastIntent();
  setSavedSessionEmail('');
  setRecognizedName('');
  setRecognizedAvatar('');
  setRememberedIntent(null);
  resetConversationForSignup();
}

  function handleContinueAsRecognized() {
  setShowRecognizedCard(false);
  setAuthMode('recognized-login');
  setDraftStage('login-password');

  appendPrompt(
    recognizedName ? `Mba'éichapa, ${recognizedName}.` : 'Entrá con tu contraseña.',
    'Poné tu contraseña nomás y seguimos.'
  );

  setTimeout(() => inputRef.current?.focus(), 120);
}
function handleAlreadyHaveAccount() {
  setShowRecognizedCard(false);
  setAuthMode('existing-login');
  setDraftStage('login-direct');

  setFullName('');
  setFlow(null);
  setSelectedNeed(null);
  setSelectedTiming('');
  setAssistantInput('');
  setServiceSuggestions([]);
  setEmail('');
  setPassword('');
  setPhotoFile(null);
  setCapturedPreview('');
  setCameraError('');

  appendPrompt(
  'Dale, entramos 👌',
  'Poné tu correo y contraseña.'
);

  setTimeout(() => inputRef.current?.focus(), 120);
}
function getLockedFlow() {
  if (flowRef.current === 'client' || flowRef.current === 'worker' || flowRef.current === 'supplier') {
    return flowRef.current;
  }

  if (flow === 'client' || flow === 'worker' || flow === 'supplier') {
    return flow;
  }

  return 'client';
}

function startClientFlow() {
  flowRef.current = 'client';
  setFlow('client');

  setSelectedTiming('');
  setSelectedNeed(null);
  setServiceSuggestions([]);
  setAssistantInput('');

  setDraftStage('need');

  appendPrompt('¿QUÉ NECESITÁS HOY?', '');
}

function startWorkerFlow() {
  flowRef.current = 'worker';
  setFlow('worker');

  setSelectedTiming('');
  setSelectedNeed(null);
  setServiceSuggestions([]);
  setAssistantInput('');

  setDraftStage('need');

  appendPrompt('¿QUÉ SERVICIO HACÉS?', '');
}

function startSupplierFlow() {
  flowRef.current = 'supplier';
  setFlow('supplier');

  setSelectedTiming('');
  setSelectedNeed(null);
  setServiceSuggestions([]);
  setAssistantInput('');

  setDraftStage('need');

  appendPrompt('¿QUÉ INSUMOS VENDÉS?', '');
}
 function handleNeedDetection(raw) {
  const clean = String(raw || '').trim();

  if (!clean) {
    toast.error('Escribí nomás qué necesitás o qué servicio hacés');
    return;
  }

  setAssistantInput(clean);

  const lockedFlow = getLockedFlow();

  const candidates = lockedFlow === 'supplier'
    ? detectSupplierCandidates(clean)
    : detectServiceCandidates(clean);
  setServiceSuggestions(candidates);

  const top = candidates[0] || null;

  if (!top) {
    toast.error('No caché bien todavía 😅 Probá con otra frase más clara.');
    return;
  }

  setSelectedNeed(top);

  saveLastIntent({
    role: lockedFlow,
    serviceSlug: top.slug,
    serviceName: top.name,
    timing: selectedTiming || null,
  });

  if (lockedFlow === 'worker' || lockedFlow === 'supplier') {
    setDraftStage('email');
    appendPrompt(
      lockedFlow === 'supplier' ? `Perfecto. Vas a vender para ${top.name}.` : `Genial. Te ubico en ${top.name}.`,
      lockedFlow === 'supplier' ? 'Pasame tu correo y activamos tu tienda.' : 'Pasame tu correo y activamos tu perfil.'
    );
    return;
  }

    setDraftStage('timing');
  appendPrompt(
    `Perfecto. Necesitás ${top.name}.`,
    '¿Lo necesitás hoy o para otro día?'
  );
}

  function handleTimingSelect(timing) {
  setSelectedTiming(timing);

  saveLastIntent({
    role: 'client',
    serviceSlug: selectedNeed?.slug || null,
    serviceName: selectedNeed?.name || null,
    timing,
  });

  setTimeout(() => {
    setDraftStage('email');
    appendPrompt(
      'Jaha entonces.',
      'Pasame tu correo y te sigo guiando.'
    );
  }, 180);
}

  async function handleEmailStep() {
    const cleanEmail = normalizeEmail(email);

    if (!cleanEmail || !cleanEmail.includes('@')) {
      toast.error('Poné un correo válido');
      return;
    }

    setBusy(true);

    try {
      const existingProfile = await getProfileByEmail(cleanEmail);

      if (existingProfile) {
        setAuthMode('existing-login');
        setDraftStage('login-password');
        setRecognizedName(firstNameOf(existingProfile.full_name) || getDisplayNameFromEmail(cleanEmail));
        setRecognizedAvatar(existingProfile.avatar_url || '');
        appendPrompt(
          'Ese correo ya tiene cuenta.',
          'Poné tu contraseña nomás para entrar.'
        );
      } else {
        setAuthMode('signup');
        setDraftStage('password');
        appendPrompt('Ahora creá tu contraseña.', 'Mínimo 6 caracteres.');
      }
    } catch (err) {
      console.error(err);
      toast.error('No pude revisar ese correo');
    } finally {
      setBusy(false);
    }
  }

  async function handleLoginWithPassword() {
    const cleanEmail = normalizeEmail(email);

    if (!cleanEmail || !password || password.length < 6) {
      toast.error('Completá correo y contraseña');
      return;
    }

    setBusy(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) throw error;

      if (typeof window !== 'undefined') {
        localStorage.setItem(LS_LAST_EMAIL, cleanEmail);
      }

      toast.success('Entrando...');
router.replace('/role-selector');
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'No se pudo iniciar sesión');
    } finally {
      setBusy(false);
    }
  }

 function handlePasswordStep() {
  if (!password || password.length < 6) {
    toast.error('La contraseña debe tener mínimo 6 caracteres');
    return;
  }

  setDraftStage('photo');

  appendPrompt(
    'Último paso: tu foto 📸',
    'Así tu perfil inspira más confianza dentro de ManosYA.'
  );
}
async function openCamera() {
  try {
    setCameraError('');
    setCapturedPreview('');
    setCameraReady(false);

    if (!navigator?.mediaDevices?.getUserMedia) {
      toast.error('Este navegador no permite usar la cámara');
      setCameraError('Este navegador no permite usar la cámara');
      return;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setCameraOpen(true);

    let stream;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 720 },
          height: { ideal: 960 },
        },
        audio: false,
      });
    } catch {
      stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
    }

    streamRef.current = stream;

    requestAnimationFrame(async () => {
      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;

      try {
        await video.play();

        const waitUntilReady = () => {
          if (
            video.readyState >= 2 &&
            video.videoWidth > 0 &&
            video.videoHeight > 0
          ) {
            setCameraReady(true);
            setCameraError('');
            return;
          }

          setTimeout(waitUntilReady, 120);
        };

        waitUntilReady();
      } catch (err) {
        console.warn(err);
        setCameraReady(false);
        setCameraError('No pude iniciar la cámara');
        toast.error('No pude iniciar la cámara');
      }
    });
  } catch (err) {
    console.error(err);
    setCameraOpen(false);
    setCameraReady(false);
    setCameraError('No pude abrir la cámara');
    toast.error('No pude abrir la cámara');
  }
}

function closeCamera() {
  if (streamRef.current) {
    streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  if (videoRef.current) {
    videoRef.current.srcObject = null;
  }

  setCameraOpen(false);
  setCameraReady(false);
}

function capturePhoto() {
  try {
    if (!videoRef.current || !canvasRef.current) {
      toast.error('La cámara no está lista');
      return;
    }

    const video = videoRef.current;

    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error('Esperá un segundo y probá otra vez');
      return;
    }

    const canvas = canvasRef.current;
    const width = video.videoWidth;
    const height = video.videoHeight;

    canvas.width = width;
    canvas.height = height;

   const ctx = canvas.getContext('2d');

if (!ctx) {
  toast.error('No pude capturar la foto');
  return;
}

ctx.setTransform(1, 0, 0, 1, 0, 0);
ctx.clearRect(0, 0, width, height);

    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error('No pude generar la foto');
          return;
        }

        const file = new File([blob], `manosya-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });

        setPhotoFile(file);
        setCapturedPreview(URL.createObjectURL(blob));
        setCameraReady(false);
        closeCamera();
        toast.success('Foto capturada');
      },
      'image/jpeg',
      0.95
    );
  } catch (err) {
    console.error(err);
    toast.error('No pude sacar la foto');
  }
}
  async function handleFinishSignup() {
    const cleanEmail = normalizeEmail(email);

    if (!fullName.trim()) {
      toast.error('Falta tu nombre');
      return;
    }

    if (!flow) {
      toast.error('Elegí cómo querés entrar');
      return;
    }

    if (!selectedNeed) {
      toast.error('Falta el servicio');
      return;
    }

    if (flow === 'client' && !selectedTiming) {
      toast.error('Elegí cuándo lo necesitás');
      return;
    }

    if (!cleanEmail || !password || password.length < 6) {
  toast.error('Revisá correo y contraseña');
  return;
}

if (!photoFile || !capturedPreview) {
  toast.error('Primero sacá tu foto');
  return;
}

    setBusy(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });

      if (error) throw error;

      const userId = data.user?.id;
      if (!userId) throw new Error('No se pudo crear el usuario');

      const avatarUrl = await uploadAvatar(userId);

     const finalFlow = getLockedFlow();
const roleToSave = finalFlow === 'worker' ? 'worker' : finalFlow === 'supplier' ? 'supplier' : 'client';

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([
          {
            id: userId,
            full_name: fullName.trim(),
            email: cleanEmail,
            role: roleToSave,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          },
        ]);

      if (profileError) throw profileError;

      if (typeof window !== 'undefined') {
        localStorage.setItem(LS_LAST_EMAIL, cleanEmail);
        localStorage.setItem(LS_APP_ROLE, roleToSave);
      }

      saveLastIntent({
        role: finalFlow,
        serviceSlug: selectedNeed.slug,
        serviceName: selectedNeed.name,
        timing: finalFlow === 'client' ? selectedTiming : null,
      });

      toast.success('Cuenta creada correctamente');
      await redirectByRealProfile(userId);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'No se pudo crear la cuenta');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        const rememberedEmail =
          typeof window !== 'undefined'
            ? normalizeEmail(localStorage.getItem(LS_LAST_EMAIL) || '')
            : '';

        const remembered = readLastIntent();
        if (mounted) setRememberedIntent(remembered || null);

       if (user?.email) {
  if (mounted) setSavedSessionEmail(normalizeEmail(user.email));
  router.replace('/role-selector');
  return;
}

        if (!user && rememberedEmail) {
          const profile = await getProfileByEmail(rememberedEmail);
          const rememberedName =
            firstNameOf(profile?.full_name || '') || getDisplayNameFromEmail(rememberedEmail);

          if (!mounted) return;

          setSavedSessionEmail(rememberedEmail);
          setEmail(rememberedEmail);
          setRecognizedName(rememberedName);
          setRecognizedAvatar(profile?.avatar_url || '');
          setShowRecognizedCard(true);
          setAuthMode('recognized-login');
          setDraftStage('login-password');
          appendPrompt(
  `Hola ${rememberedName}. Te reconocí ko.`,
  'Elegí si querés entrar o si no sos vos.'
);
        } else {
  appendPrompt('¡Hola!', 'Bienvenido a ManosYA');
}
      } catch (err) {
        console.error(err);
        appendPrompt('¡Hola!', 'Bienvenido a ManosYA');
      } finally {
        if (mounted) setCheckingSession(false);
      }
    };

    checkSession();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      inputRef.current?.focus();
    }, 120);
    return () => clearTimeout(t);
  }, [draftStage, showRecognizedCard]);

 const canContinue = useMemo(() => {
  if (busy) return false;

  switch (draftStage) {
    case 'name':
      return fullName.trim().length >= 3;

    case 'flow':
      return false;

    case 'need':
      return assistantInput.trim().length >= 2;

    case 'timing':
      return !!selectedTiming;

    case 'email':
      return normalizeEmail(email).includes('@');

    case 'password':
      return password.trim().length >= 6;

    case 'photo':
      return !!capturedPreview && !!photoFile;

    case 'login-password':
      return password.trim().length >= 6;

    case 'login-direct':
      return normalizeEmail(email).includes('@') && password.trim().length >= 6;

    default:
      return false;
  }
}, [
  busy,
  draftStage,
  fullName,
  assistantInput,
  selectedTiming,
  email,
  password,
  capturedPreview,
  photoFile,
]);

function handleMainContinue(latestValue = '') {
  const liveValue = String(latestValue || '').trim();

  if (draftStage === 'name') {
    const nameToUse = liveValue || fullName.trim();

    if (nameToUse.length < 3) {
      toast.error('Poné tu nombre completo');
      return;
    }

    setFullName(nameToUse);
    flowRef.current = null;
    setFlow(null);
    setSelectedNeed(null);
    setSelectedTiming('');
    setAssistantInput('');
    setServiceSuggestions([]);

    appendPrompt(
      `Un gusto, ${firstNameOf(nameToUse)} 👌`,
      '¿Venís a pedir ayuda, ofrecer tu trabajo o vender insumos?',
      { mergeSubtitle: false }
    );

    setDraftStage('flow');
    return;
  }

  if (draftStage === 'need') {
    handleNeedDetection(liveValue || assistantInput);
    return;
  }

  if (draftStage === 'timing') {
    if (!selectedTiming) {
      toast.error('Elegí cuándo lo necesitás');
      return;
    }

    handleTimingSelect(selectedTiming);
    return;
  }

  if (draftStage === 'email') {
    if (liveValue) setEmail(liveValue);
    handleEmailStep();
    return;
  }

  if (draftStage === 'password') {
    const passwordToUse = liveValue || password;

    if (!passwordToUse || passwordToUse.length < 6) {
      toast.error('La contraseña debe tener mínimo 6 caracteres');
      return;
    }

    setPassword(passwordToUse);
    setDraftStage('photo');

    appendPrompt(
      'Último paso: tu foto 📸',
      'Así tu perfil inspira más confianza dentro de ManosYA.'
    );
    return;
  }

  if (draftStage === 'photo') {
    handleFinishSignup();
    return;
  }

  if (draftStage === 'login-password' || draftStage === 'login-direct') {
    if (liveValue) setPassword(liveValue);
    handleLoginWithPassword();
  }
}

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#69c4c0] px-6">
        <div className="text-center">
          <img
            src="/ROGER OK.png"
            alt="ManosYA"
            className="mx-auto h-[260px] w-auto object-contain"
          />
          <div className="mt-6 text-2xl font-black text-white">Cargando ManosYA...</div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#69c4c0] px-6 pb-10 pt-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[980px] flex-col items-center justify-between">
        <div className="w-full">
          <motion.img
            key={displayAvatar}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.28 }}
            src={displayAvatar}
            alt="Roger ManosYA"
            className="mx-auto h-[360px] w-auto object-contain sm:h-[500px]"
          />

          <div className="mt-3 sm:mt-5">
            <AnimatePresence mode="wait">
             <PromptBubble
  key={`${currentPrompt.id}-${draftStage}-${getLockedFlow()}`}
  title={
    draftStage === 'need'
      ? getLockedFlow() === 'supplier' ? '¿QUÉ INSUMOS VENDÉS?' : getLockedFlow() === 'worker'
        ? '¿QUÉ SERVICIO HACÉS?'
        : '¿QUÉ NECESITÁS HOY?'
      : currentPrompt.title
  }
  subtitle={currentPrompt.subtitle}
/>
            </AnimatePresence>
          </div>

          <div className="mt-10">
            {showRecognizedCard ? (
              <RecognizedCard
                name={recognizedName}
                email={savedSessionEmail || email}
                avatarUrl={recognizedAvatar}
                onContinue={handleContinueAsRecognized}
                onReset={handleNotMe}
                busy={busy}
              />
            ) : (
              <>
               {draftStage === 'name' && (
  <div className="mx-auto flex w-full max-w-[820px] flex-wrap items-center justify-center gap-5 sm:gap-8">
   <ChoicePill
  active={false}
  label={'Sí, ya\ntengo cuenta'}
  onClick={handleAlreadyHaveAccount}
/>

    <ChoicePill
  active={false}
  label={'Soy nuevo\npor acá'}
  onClick={() => {
    flowRef.current = null;
    setFlow(null);
    setSelectedNeed(null);
    setSelectedTiming('');
    setAssistantInput('');
    setServiceSuggestions([]);

    appendPrompt('Buenísimo 👌', 'Primero decime tu nombre completo.');
    setDraftStage('real-name');
  }}
/>
  </div>
)}

{draftStage === 'real-name' && (
  <MainInput
    inputRef={inputRef}
    value={fullName}
    onChange={setFullName}
    placeholder="Tu nombre completo"
    showSend
    onSubmit={(latestValue) => {
      const nameToUse = String(latestValue || fullName || '').trim();

      if (nameToUse.length < 3) {
        toast.error('Poné tu nombre completo');
        return;
      }

      setFullName(nameToUse);
      flowRef.current = null;
      setFlow(null);
      setSelectedNeed(null);
      setSelectedTiming('');
      setAssistantInput('');
      setServiceSuggestions([]);

      appendPrompt(
        `Un gusto, ${firstNameOf(nameToUse)} 👌`,
        '¿Venís a pedir ayuda, ofrecer tu trabajo o vender insumos?',
        { mergeSubtitle: false }
      );

      setDraftStage('flow');
    }}
  />
)}

              {draftStage === 'flow' && (
  <div className="mx-auto flex w-full max-w-[760px] flex-wrap items-center justify-center gap-3 sm:gap-8">
    <ChoicePill
      active={false}
      label={'Necesito\nayuda'}
      onClick={startClientFlow}
    />

    <ChoicePill
      active={false}
      label={'Quiero ofrecer\nmi trabajo'}
      onClick={startWorkerFlow}
    />

    <ChoicePill
      active={false}
      label={'Vendo\ninsumos'}
      onClick={startSupplierFlow}
    />
  </div>
)}

                {draftStage === 'need' && (
  <div className="mx-auto w-full max-w-[760px]">
    <MainInput
      inputRef={inputRef}
      value={assistantInput}
      onChange={setAssistantInput}
      placeholder={
        getLockedFlow() === 'supplier' ? 'Ej: vendo caños, cables, ferretería...' : getLockedFlow() === 'worker'
          ? 'Ej: hago plomería, electricidad, parrilla...'
          : 'Ej: necesito plomero, electricista, chofer...'
      }
      showSend
      onSubmit={handleMainContinue}
    />

    {!!serviceSuggestions.length && (
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {serviceSuggestions.slice(0, 6).map((service) => (
          <button
            key={service.slug}
            type="button"
            onClick={() => {
              const lockedFlow = getLockedFlow();

              setSelectedNeed(service);
              setAssistantInput(service.name);

              saveLastIntent({
                role: lockedFlow,
                serviceSlug: service.slug,
                serviceName: service.name,
                timing: selectedTiming || null,
              });

              if (lockedFlow === 'worker' || lockedFlow === 'supplier') {
                setDraftStage('email');
                appendPrompt(
                  lockedFlow === 'supplier' ? `Perfecto. Insumos para ${service.name}.` : `Perfecto. ${service.name}.`,
                  lockedFlow === 'supplier' ? 'Ahora pasame tu correo para activar tu tienda.' : 'Ahora pasame tu correo.'
                );
                return;
              }

              setDraftStage('timing');
              appendPrompt(
  `Perfecto. Necesitás ${service.name}.`,
  '¿Lo necesitás hoy o para otro día?'
);
            }}
            className="rounded-full bg-white/90 px-5 py-3 text-sm font-black text-[#08233a] shadow-[0_10px_24px_rgba(8,15,52,0.08)]"
          >
            {service.name}
          </button>
        ))}
      </div>
    )}
  </div>
)}

                                {draftStage === 'timing' && (
  <div className="mx-auto flex w-full max-w-[760px] items-center justify-center gap-4">
    {TIMING_OPTIONS.map((item) => (
      <button
        key={item.id}
        type="button"
        onClick={() => handleTimingSelect(item.id)}
        className={[
          'rounded-full px-8 py-4 text-lg font-black shadow-[0_10px_24px_rgba(8,15,52,0.08)] transition',
          selectedTiming === item.id
            ? 'bg-[#06182a] text-white'
            : 'bg-white text-[#08233a]',
        ].join(' ')}
      >
        {item.label}
      </button>
    ))}
  </div>
)}
{draftStage === 'login-direct' && (
  <div className="mx-auto mt-8 w-full max-w-[760px] space-y-5">
    <MainInput
      inputRef={inputRef}
      value={email}
      onChange={setEmail}
      type="email"
      placeholder="Correo electrónico"
      disabled={busy}
      showSend={false}
      onSubmit={() => {}}
      icon={<MailIcon />}
    />

    <MainInput
  value={password}
  onChange={setPassword}
  placeholder="Contraseña"
  type="password"
  inputRef={inputRef}
  icon={<LockIcon />}
  showPassword={showPassword}
  rightIcon={
    <button
      type="button"
      onClick={() => setShowPassword((prev) => !prev)}
      className="transition-opacity hover:opacity-70"
    >
      <EyeIcon />
    </button>
  }
/>

    <button
      type="button"
      onClick={handleLoginWithPassword}
      disabled={busy}
      className="
        mx-auto flex h-[70px] w-[220px]
        items-center justify-center rounded-full
        bg-[#06182a]
        text-[22px] font-black text-white
        shadow-[0_18px_38px_rgba(6,24,42,0.24)]
        transition-all duration-200
        hover:scale-[1.02]
        active:scale-95
        disabled:opacity-45
      "
    >
      {busy ? 'Entrando...' : 'Entrar'}
    </button>
  </div>
)}

{['email', 'password', 'login-password'].includes(draftStage) && (
  <div className="mx-auto mt-8 w-full max-w-[760px]">
    <MainInput
      inputRef={inputRef}
      value={draftStage === 'email' ? email : password}
      onChange={(v) => {
        if (draftStage === 'email') {
          setEmail(v);
        } else {
          setPassword(v);
        }
      }}
      type={draftStage === 'email' ? 'email' : 'password'}
      placeholder={
        draftStage === 'email'
          ? 'Tu correo electrónico'
          : 'Tu contraseña'
      }
      disabled={busy}
      showSend
      onSubmit={handleMainContinue}
      icon={draftStage === 'email' ? <MailIcon /> : <LockIcon />}
      rightIcon={
        draftStage === 'password' || draftStage === 'login-password'
          ? <EyeIcon />
          : null
      }
    />
  </div>
)}

{draftStage === 'photo' && (
  <div className="mx-auto mt-8 flex w-full max-w-[760px] flex-col items-center">
    {!capturedPreview ? (
      <button
        type="button"
        onClick={openCamera}
        className="
          rounded-full bg-[#06182a] px-10 py-5
          text-[22px] font-black text-white
          shadow-[0_16px_34px_rgba(6,24,42,0.28)]
        "
      >
        Abrir cámara
      </button>
    ) : (
      <>
        <img
          src={capturedPreview}
          alt="preview"
          className="h-[170px] w-[170px] rounded-full border-4 border-white object-cover shadow-xl"
        />

        <button
          type="button"
          onClick={handleMainContinue}
          className="
            mt-6 rounded-full bg-[#06182a] px-10 py-5
            text-[22px] font-black text-white
            shadow-[0_16px_34px_rgba(6,24,42,0.28)]
          "
        >
          Finalizar registro
        </button>
      </>
    )}
  </div>
)}

                                                              {!['name', 'real-name', 'flow', 'need', 'timing', 'email', 'password', 'login-password', 'login-direct', 'photo'].includes(draftStage) && (
  <DownActionButton
    onClick={handleMainContinue}
    disabled={!canContinue}
    busy={busy}
  />
)}
              </>
            )}
          </div>
        </div>

        <div className="mt-8 w-full text-center">
          <img
            src="/logo-manosya.png"
            alt="ManosYA"
            className="mx-auto h-[56px] w-auto object-contain"
          />
          <p className="mt-4 text-[14px] font-medium text-white/95 sm:text-[18px]">
            Al continuar, aceptás nuestras condiciones de uso y política de privacidad.
          </p>
        </div>
      </div>
      <AnimatePresence>
  {cameraOpen && (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#06182a]/72 px-5 backdrop-blur-md">
    <div className="w-full max-w-[430px] overflow-hidden rounded-[34px] bg-white p-5 shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
      <div className="mb-4 text-center">
        <div className="text-[24px] font-black tracking-[-0.04em] text-[#08233a]">
          Sacar foto
        </div>
        <div className="mt-1 text-sm font-bold text-[#6b7f8d]">
          Centrá tu rostro y mirá a la cámara
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[28px] bg-[#06182a] shadow-inner">
        <video
  ref={videoRef}
  autoPlay
  playsInline
  muted
  className="h-[430px] w-full scale-x-[-1] object-cover"
/>

<canvas ref={canvasRef} className="hidden" />

        {!cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#06182a]/70 text-center text-white">
            <div>
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-[3px] border-white border-t-transparent" />
              <div className="mt-3 text-sm font-black">Preparando cámara...</div>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-5 rounded-[24px] border-2 border-white/65" />
      </div>

    {cameraError && !cameraReady ? (
  <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
    {cameraError}
  </div>
) : null}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={closeCamera}
          className="rounded-[20px] bg-[#eef3f5] px-5 py-4 text-base font-black text-[#405766]"
        >
          Cancelar
        </button>

        <button
  type="button"
  onClick={() => {
    setCameraError('');
    capturePhoto();
  }}
  className="
    rounded-[22px]
    bg-[#06182a]
    px-8 py-4
    text-[18px] font-black text-white
    shadow-[0_14px_30px_rgba(6,24,42,0.24)]
  "
>
  Sacar foto
</button>
      </div>
    </div>
  </div>
)}
</AnimatePresence>
    </main>
  );
}
