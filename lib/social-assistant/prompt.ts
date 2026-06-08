import type {
  SocialAssistantContext,
  SocialAssistantLeadType,
  SocialAssistantResponse,
} from './types';

export const MANOSYA_LINK = 'https://www.manosya.app/';

export const SOCIAL_ASSISTANT_PROMPT = `
Eres el copiloto privado de Roger para responder mensajes de su perfil personal de Facebook.

No automatizas Facebook.
No envías mensajes.
Solo ayudas a escribir respuestas que Roger copiará manualmente.

Escribes como Roger o como alguien cercano a ManosYA:
- humano
- breve
- natural
- respetuoso
- curioso
- sin presión
- sin sonar vendedor
- sin sonar empresa

ManosYA conecta:
1. Personas que necesitan ayuda.
2. Trabajadores que ofrecen servicios.
3. Comercios y proveedores.

Objetivo:
Primero generar confianza.
Después conocer a la persona.
Después detectar si es usuario, trabajador o proveedor.
Luego presentar ManosYA naturalmente.
Compartir el enlace solo si corresponde.

Tipos de contenido manual que puede pegar Roger:
- private_message: mensaje privado.
- friend_request: solicitud de amistad o persona que agregó a Roger.
- public_comment: comentario en una publicación.
- story_reply: respuesta a una historia.
- user, worker, supplier, curious, flirty, support, unknown: contexto de intención.

Frases permitidas:
- Qué bueno leerte.
- Me interesa conocerte un poco.
- ¿A qué te dedicás?
- Te cuento algo.
- Estoy trabajando en ManosYA.
- La idea es conectar personas que necesitan ayuda con personas que saben hacer el trabajo.
- Si querés mirar, te dejo el enlace: ${MANOSYA_LINK}

No uses:
- Somos una empresa.
- Oferta.
- Promoción.
- Registrate ya.
- Comprá.
- Cliente potencial.
- Campaña comercial.

Reglas:
1. Devuelve solo JSON válido.
2. Genera tres variantes: shortReply, naturalReply y warmReply.
3. Haz una sola pregunta por respuesta.
4. No pidas datos sensibles.
5. Si hay coqueteo, usa humor suave y redirige.
6. Si hay agresión o sexual explícito, pon límite con respeto.
7. Si hay reclamo, pide ciudad y resumen corto.
8. No inventes precios, ganancias ni disponibilidad.
9. Para solicitud de amistad, no digas que aceptaste. Sugiere una respuesta amable para iniciar conversación.
10. Para comentario público, evita sonar demasiado íntimo y mantén una respuesta breve.

Formato exacto:
{
  "shortReply": "...",
  "naturalReply": "...",
  "warmReply": "...",
  "detectedLeadType": "USER_LEAD",
  "suggestedNextStep": "..."
}
`.trim();

export function contextToLeadType(context: SocialAssistantContext): SocialAssistantLeadType {
  switch (context) {
    case 'private_message':
    case 'friend_request':
    case 'public_comment':
    case 'story_reply':
      return 'CURIOUS_LEAD';
    case 'user':
      return 'USER_LEAD';
    case 'worker':
      return 'WORKER_LEAD';
    case 'supplier':
      return 'SUPPLIER_LEAD';
    case 'flirty':
      return 'FLIRTY_LEAD';
    case 'support':
      return 'CURIOUS_LEAD';
    case 'curious':
    case 'unknown':
    default:
      return 'CURIOUS_LEAD';
  }
}

export function localSocialAssistantFallback(
  message: string,
  context: SocialAssistantContext
): SocialAssistantResponse {
  const clean = String(message || '').toLowerCase();
  let detectedLeadType = contextToLeadType(context);

  const unsafe =
    /sexo|porno|desnud|puta|mierda|idiota|estafa|xxx/i.test(clean);
  const flirty =
    context === 'flirty' || /lind[oa]|solter[oa]|novi[ao]|me gust[aá]s|hermos[oa]/i.test(clean);
  const support =
    context === 'support' ||
    /problema|reclamo|no puedo entrar|no funciona|me cobraron|no aparece/i.test(clean);
  const friendRequest = context === 'friend_request';
  const publicComment = context === 'public_comment';
  const storyReply = context === 'story_reply';

  if (unsafe) detectedLeadType = 'UNSAFE_LEAD';
  else if (flirty) detectedLeadType = 'FLIRTY_LEAD';
  else if (/plomero|electricista|albañil|albanil|pintor|chofer|mec[aá]nico|limpieza/i.test(clean)) {
    detectedLeadType = context === 'user' ? 'USER_LEAD' : 'WORKER_LEAD';
  } else if (/negocio|ferreter[ií]a|comercio|local|vendo|proveedor|productos/i.test(clean)) {
    detectedLeadType = 'SUPPLIER_LEAD';
  } else if (/necesito|busco|contratar|me hace falta|preciso/i.test(clean)) {
    detectedLeadType = 'USER_LEAD';
  }

  if (unsafe) {
    return {
      shortReply: 'Prefiero mantener esta conversación con respeto 😊',
      naturalReply:
        'Prefiero mantener esta conversación con respeto 😊\n\nEstoy acá para conversar sobre ManosYA y conocer un poco más sobre vos.',
      warmReply:
        'Te respondo con buena onda, pero prefiero mantener esta charla en un tono respetuoso 😊\n\nSi querés, contame a qué te dedicás y seguimos bien.',
      detectedLeadType,
      suggestedNextStep: 'No insistir. Responder una vez con límite claro y mantener control humano.',
    };
  }

  if (support) {
    return {
      shortReply:
        'Entiendo. Pasame tu ciudad y un resumen cortito del problema, así lo veo mejor.',
      naturalReply:
        'Entiendo.\n\nPara revisar bien eso necesito un resumen cortito del problema y tu ciudad.\n\nAsí puedo ordenarlo mejor y verlo con calma.',
      warmReply:
        'Gracias por contarme.\n\nPara mirar eso con cuidado, pasame tu ciudad y un resumen cortito de lo que pasó.\n\nAsí puedo entenderlo mejor y ayudarte sin apuro.',
      detectedLeadType,
      suggestedNextStep: 'Pedir ciudad y resumen. Si el reclamo es serio, derivarlo manualmente.',
    };
  }

  if (flirty) {
    return {
      shortReply: 'Jajaja, gracias 😊 ¿A qué te dedicás?',
      naturalReply:
        'Jajaja, gracias 😊\n\nAhora estoy bastante concentrado en este proyecto.\n\nContame algo de vos, ¿a qué te dedicás?',
      warmReply:
        'Jajaja, me sacaste una sonrisa 😊\n\nEstoy bastante metido con ManosYA ahora.\n\nContame algo de vos, ¿a qué te dedicás?',
      detectedLeadType,
      suggestedNextStep: 'Mantener humor suave y redirigir a conocer a la persona.',
    };
  }

  if (friendRequest) {
    return {
      shortReply: 'Hola, gracias por agregarme 😊 ¿A qué te dedicás?',
      naturalReply:
        'Hola, gracias por agregarme 😊\n\nQué bueno conectar por acá.\n\nMe interesa conocerte un poco: ¿a qué te dedicás?',
      warmReply:
        'Hola, gracias por la solicitud 😊\n\nSiempre me gusta saber quién está del otro lado antes de conversar más.\n\nContame, ¿a qué te dedicás?',
      detectedLeadType,
      suggestedNextStep:
        'Si parece una persona real, Roger puede aceptar manualmente y enviar una de estas respuestas.',
    };
  }

  if (publicComment) {
    return {
      shortReply: 'Gracias por comentar 🙌 ¿Vos desde qué ciudad me leés?',
      naturalReply:
        'Gracias por comentar 🙌\n\nEstoy trabajando bastante en ManosYA y me interesa conocer mejor a la gente que se acerca.\n\n¿Desde qué ciudad me leés?',
      warmReply:
        'Qué bueno leerte por acá 🙌\n\nEstoy moviendo ManosYA con mucha energía y me sirve conocer a quienes se van sumando.\n\n¿Desde qué ciudad me leés?',
      detectedLeadType,
      suggestedNextStep:
        'Responder público breve. Si la persona muestra interés real, seguir por inbox manualmente.',
    };
  }

  if (storyReply) {
    return {
      shortReply: 'Gracias por responder la historia 😊 ¿Qué te llamó la atención?',
      naturalReply:
        'Gracias por responder la historia 😊\n\nEstoy compartiendo un poco del camino con ManosYA.\n\n¿Qué fue lo que más te llamó la atención?',
      warmReply:
        'Me alegra que hayas respondido 😊\n\nEstoy metido con ManosYA y me encanta cuando alguien se interesa de verdad.\n\n¿Qué te llamó la atención?',
      detectedLeadType,
      suggestedNextStep:
        'Mantener conversación ligera. Después preguntar si busca ayuda, ofrece un servicio o tiene negocio.',
    };
  }

  if (detectedLeadType === 'WORKER_LEAD') {
    return {
      shortReply: 'Qué interesante. ¿Trabajás por tu cuenta o para alguna empresa?',
      naturalReply:
        'Qué interesante.\n\nMe interesa conocerte un poco más.\n\n¿Trabajás por tu cuenta o para alguna empresa?',
      warmReply:
        'Qué bueno leerte.\n\nEso conecta bastante con algo que estoy trabajando en ManosYA.\n\nAntes de contarte más, ¿trabajás por tu cuenta o para alguna empresa?',
      detectedLeadType,
      suggestedNextStep: 'Si trabaja por cuenta propia, presentar ManosYA y compartir enlace.',
    };
  }

  if (detectedLeadType === 'SUPPLIER_LEAD') {
    return {
      shortReply: 'Interesante. ¿Qué tipo de productos o servicios ofrecés?',
      naturalReply:
        'Interesante.\n\nTambién estoy pensando mucho en comercios y proveedores dentro de ManosYA.\n\n¿Qué tipo de productos o servicios ofrecés?',
      warmReply:
        'Qué bueno eso.\n\nMe interesa conocer mejor el tipo de negocio, porque ManosYA también puede conectar comercios con personas que necesitan soluciones.\n\n¿Qué ofrecés principalmente?',
      detectedLeadType,
      suggestedNextStep: 'Conocer el rubro antes de mandar el enlace.',
    };
  }

  if (detectedLeadType === 'USER_LEAD') {
    return {
      shortReply: 'Claro. ¿De qué ciudad sos?',
      naturalReply:
        'Claro, eso conecta mucho con lo que estoy construyendo.\n\nManosYA busca que puedas encontrar personas capacitadas para resolver ese tipo de necesidad.\n\n¿De qué ciudad sos?',
      warmReply:
        'Te entiendo.\n\nJustamente estoy trabajando en ManosYA para conectar personas que necesitan ayuda con gente que sabe resolver ese trabajo.\n\n¿De qué ciudad sos?',
      detectedLeadType,
      suggestedNextStep: 'Preguntar ciudad. Luego compartir el enlace si la conversación lo permite.',
    };
  }

  return {
    shortReply: 'Qué bueno leerte. ¿A qué te dedicás?',
    naturalReply:
      'Qué bueno leerte.\n\nMe interesa conocerte un poco antes de contarte más.\n\n¿A qué te dedicás?',
    warmReply:
      'Qué gusto leerte 😊\n\nEstoy trabajando en ManosYA, un proyecto que me tiene muy entusiasmado.\n\nPero antes me gustaría conocerte un poco: ¿a qué te dedicás?',
    detectedLeadType,
    suggestedNextStep: 'Conocer primero a la persona antes de presentar ManosYA.',
  };
}
