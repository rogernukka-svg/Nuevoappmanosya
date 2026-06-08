import { classifyMessage, normalizeSocialText } from './intent';

export function generateLocalFallback(messageText: string): string {
  const clean = normalizeSocialText(messageText);
  const classification = classifyMessage(clean);

  if (classification.intent === 'flirty') {
    return 'Jajaja, gracias por la buena onda 😊 Ahora estoy bastante concentrado en ManosYA. Contame algo de vos, ¿a qué te dedicás?';
  }

  if (classification.intent === 'sexual' || classification.intent === 'aggressive' || classification.intent === 'spam') {
    return 'Prefiero mantener esta conversación con respeto 😊 Estoy acá para conversar sobre ManosYA y conocer un poco más sobre vos.';
  }

  if (classification.intent === 'worker_has_skill') {
    return 'Qué interesante. ¿Trabajás por tu cuenta o para alguna empresa?';
  }

  if (classification.intent === 'supplier_has_business') {
    return 'Interesante. ¿Qué tipo de productos o servicios ofrecés?';
  }

  if (classification.intent === 'user_needs_service') {
    return 'Claro, eso conecta mucho con lo que estoy construyendo en ManosYA. ¿De qué ciudad sos?';
  }

  if (classification.intent === 'driver_interest') {
    return 'Interesante. También estoy trabajando una línea relacionada a movilidad y choferes. ¿Vos manejás o querés usar el servicio como pasajero?';
  }

  if (classification.intent === 'support') {
    return 'Entiendo. Para revisar bien eso necesito tu ciudad y un resumen cortito del problema. Así puedo ordenarlo mejor.';
  }

  if (classification.intent === 'ask_about_roger') {
    return 'Roger es el fundador de ManosYA. Está trabajando en una visión grande: usar tecnología e IA para conectar personas, trabajadores y comercios en Paraguay. Pero contame algo de vos, ¿a qué te dedicás?';
  }

  if (classification.intent === 'ask_about_manosya') {
    return 'Te cuento. ManosYA conecta personas que necesitan ayuda con trabajadores, oficios, comercios y proveedores. ¿Vos querés usarlo para buscar ayuda o para ofrecer algún servicio?';
  }

  if (classification.intent === 'registration_interest') {
    return 'Buenísimo. Para guiarte mejor, ¿querés registrarte para ofrecer un servicio, buscar ayuda o mostrar un negocio?';
  }

  if (classification.intent === 'price_question') {
    return 'Depende de lo que quieras hacer dentro de ManosYA. Para orientarte mejor, ¿querés usarlo como cliente, trabajador o proveedor?';
  }

  if (classification.intent === 'job_interest') {
    return 'Buenísimo. Para entenderte mejor, ¿tenés algún oficio o servicio que la gente suele pedirte?';
  }

  if (classification.intent === 'greeting') {
    return '¡Hola! 😊 Qué gusto leerte. Estoy trabajando en ManosYA, un proyecto que me tiene muy entusiasmado. Pero antes me gustaría conocerte un poco, ¿a qué te dedicás?';
  }

  return 'Te leo 😊 Para entenderte mejor, contame una cosa: ¿querés usar ManosYA para buscar ayuda, ofrecer un servicio o tenés un negocio?';
}
