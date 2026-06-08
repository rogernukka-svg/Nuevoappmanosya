import { classifySocialIntent } from './intent';
import {
  FALLBACK_REPLY,
  FLIRTY_REPLY,
  INITIAL_GREETING_REPLY,
  MANOSYA_URL,
  SOCIAL_ASSISTANT_SYSTEM_PROMPT,
  SUPPORT_REPLY,
  UNSAFE_REPLY,
} from './prompts';
import type { SocialIntent, SocialLeadType, SocialReply, SocialReplyInput } from './types';

const VALID_INTENTS: SocialIntent[] = [
  'greeting',
  'ask_about_manosya',
  'user_needs_service',
  'worker_has_skill',
  'supplier_has_business',
  'ask_registration',
  'ask_price',
  'ask_location',
  'support',
  'flirty',
  'unsafe',
  'spam',
  'unknown',
];

const VALID_LEAD_TYPES: SocialLeadType[] = [
  'USER_LEAD',
  'WORKER_LEAD',
  'SUPPLIER_LEAD',
  'CURIOUS_LEAD',
  'FLIRTY_LEAD',
  'UNSAFE_LEAD',
];

function coerceIntent(value: unknown, fallback: SocialIntent): SocialIntent {
  return VALID_INTENTS.includes(value as SocialIntent) ? (value as SocialIntent) : fallback;
}

function coerceLeadType(value: unknown, fallback: SocialLeadType): SocialLeadType {
  return VALID_LEAD_TYPES.includes(value as SocialLeadType) ? (value as SocialLeadType) : fallback;
}

function hasLinkBeenShared(previousMessages: SocialReplyInput['previousMessages']) {
  return (previousMessages || []).some((message) =>
    [message.message_text, message.ai_response].some((text) => String(text || '').includes(MANOSYA_URL))
  );
}

function normalizeReply(candidate: Partial<SocialReply>, fallback: SocialReply): SocialReply {
  const reply = String(candidate.reply || '').trim();

  return {
    reply: reply || fallback.reply,
    intent: coerceIntent(candidate.intent, fallback.intent),
    lead_type: coerceLeadType(candidate.lead_type, fallback.lead_type),
    city: typeof candidate.city === 'string' && candidate.city.trim() ? candidate.city.trim() : fallback.city,
    profession:
      typeof candidate.profession === 'string' && candidate.profession.trim()
        ? candidate.profession.trim()
        : fallback.profession,
    interests: Array.isArray(candidate.interests)
      ? candidate.interests.map((item) => String(item).trim()).filter(Boolean).slice(0, 8)
      : fallback.interests,
    needs_human: Boolean(candidate.needs_human ?? fallback.needs_human),
  };
}

export function generateLocalSocialReply(input: SocialReplyInput): SocialReply {
  const local = classifySocialIntent(input.messageText);
  const previous = input.previousMessages || [];
  const alreadyHasContext = previous.length > 0;

  if (local.intent === 'greeting' && !alreadyHasContext) {
    return { ...local, reply: INITIAL_GREETING_REPLY };
  }

  if (local.intent === 'flirty') {
    return { ...local, reply: FLIRTY_REPLY };
  }

  if (local.lead_type === 'UNSAFE_LEAD') {
    return { ...local, reply: UNSAFE_REPLY, needs_human: true };
  }

  if (local.intent === 'support') {
    return { ...local, reply: SUPPORT_REPLY, needs_human: true };
  }

  if (local.intent === 'worker_has_skill') {
    return {
      ...local,
      reply: `Qué interesante.

¿Trabajás por tu cuenta o para alguna empresa?`,
    };
  }

  if (local.intent === 'supplier_has_business') {
    return {
      ...local,
      reply: `Interesante.

¿Qué tipo de productos o servicios ofrecés?`,
    };
  }

  if (local.intent === 'user_needs_service') {
    return {
      ...local,
      reply: `Claro, eso conecta mucho con lo que estoy construyendo.

ManosYA busca que puedas encontrar personas capacitadas para resolver ese tipo de necesidad.

¿De qué ciudad sos?`,
    };
  }

  const clean = input.messageText.toLowerCase();

  if (clean.includes('cuenta propia') || clean.includes('independiente') || clean.includes('por mi cuenta')) {
    return {
      reply: `Justamente personas como vos pueden encontrar oportunidades dentro de ManosYA.

La idea es conectar personas que necesitan ayuda con personas que saben hacer el trabajo.

Te dejo el enlace por si querés conocerlo:

${MANOSYA_URL}`,
      intent: 'worker_has_skill',
      lead_type: 'WORKER_LEAD',
      city: local.city,
      profession: local.profession,
      interests: local.interests,
      needs_human: false,
    };
  }

  if (clean.includes('empresa')) {
    return {
      reply: `Buenísimo.

Y fuera de tu trabajo, ¿tenés alguna habilidad, oficio o servicio que la gente suele pedirte?`,
      intent: 'worker_has_skill',
      lead_type: 'WORKER_LEAD',
      city: local.city,
      profession: local.profession,
      interests: local.interests,
      needs_human: false,
    };
  }

  if (clean.includes('no tengo oficio')) {
    return {
      reply: `Perfecto, entonces probablemente te interese más como usuario.

La idea es que cuando necesites ayuda puedas encontrar personas capacitadas para resolver lo que necesitás.

Te dejo el enlace para que conozcas ManosYA:

${MANOSYA_URL}`,
      intent: 'user_needs_service',
      lead_type: 'USER_LEAD',
      city: local.city,
      profession: null,
      interests: [],
      needs_human: false,
    };
  }

  if (local.intent === 'ask_about_manosya' || local.intent === 'ask_registration') {
    const linkLine = hasLinkBeenShared(previous) ? '' : `\n\nTe dejo el enlace oficial:\n\n${MANOSYA_URL}`;
    return {
      ...local,
      reply: `Te cuento.

ManosYA conecta personas que necesitan ayuda con trabajadores, oficios, comercios y proveedores.${linkLine}

¿Vos querés buscar ayuda, ofrecer un servicio o tenés un negocio?`,
    };
  }

  return { ...local, reply: FALLBACK_REPLY };
}

function buildOpenAIMessages(input: SocialReplyInput, localFallback: SocialReply) {
  const context = (input.previousMessages || [])
    .slice(-8)
    .map((message) => ({
      user: message.message_text || '',
      assistant: message.ai_response || '',
      intent: message.intent || null,
      lead_type: message.lead_type || null,
    }));

  return [
    { role: 'system', content: SOCIAL_ASSISTANT_SYSTEM_PROMPT },
    {
      role: 'user',
      content: JSON.stringify({
        senderId: input.senderId,
        messageText: input.messageText,
        currentLeadType: input.currentLeadType || localFallback.lead_type,
        currentIntent: input.currentIntent || localFallback.intent,
        localClassification: {
          intent: localFallback.intent,
          lead_type: localFallback.lead_type,
          city: localFallback.city,
          profession: localFallback.profession,
          interests: localFallback.interests,
          needs_human: localFallback.needs_human,
        },
        previousMessages: context,
      }),
    },
  ];
}

export async function generateSocialReply(input: SocialReplyInput): Promise<SocialReply> {
  const fallback = generateLocalSocialReply(input);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallback;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_SOCIAL_MODEL || 'gpt-4o-mini',
        temperature: 0.45,
        response_format: { type: 'json_object' },
        messages: buildOpenAIMessages(input, fallback),
      }),
    });

    if (!response.ok) {
      console.warn('OpenAI social reply failed:', response.status, await response.text());
      return fallback;
    }

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content;
    const parsed = JSON.parse(raw || '{}');

    return normalizeReply(parsed, fallback);
  } catch (error) {
    console.warn('OpenAI social reply error:', error);
    return fallback;
  }
}
