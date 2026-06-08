import { generateLocalFallback } from './fallback';
import { PROMPT_MANOSYA_SOCIAL } from './prompt';
import type { GenerateSocialReplyInput } from './types';

const PRIMARY_MODEL = 'gpt-4.1-mini';
const FALLBACK_MODEL = 'gpt-4o-mini';
const REQUEST_TIMEOUT_MS = 12000;

function extractResponseText(data: any): string {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const output = Array.isArray(data?.output) ? data.output : [];

  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];

    for (const part of content) {
      if (typeof part?.text === 'string' && part.text.trim()) {
        return part.text.trim();
      }
    }
  }

  return '';
}

function isModelFallbackError(status: number, bodyText: string) {
  const clean = bodyText.toLowerCase();
  return status === 404 || clean.includes('model') || clean.includes('does not exist');
}

function buildUserPayload(input: GenerateSocialReplyInput) {
  return JSON.stringify({
    messageText: input.messageText,
    detectedIntent: input.intent || 'unknown',
    detectedLeadType: input.leadType || 'CURIOUS_LEAD',
    recentMessages: (input.recentMessages || []).slice(-10).map((message) => ({
      role: message.role,
      content: message.content,
    })),
    instruction:
      'Respondé solo el texto final para Messenger. Mantené una sola pregunta por vez y evitá sonar vendedor.',
  });
}

async function callResponsesAPI(
  apiKey: string,
  model: string,
  input: GenerateSocialReplyInput
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: 'system',
            content: PROMPT_MANOSYA_SOCIAL,
          },
          {
            role: 'user',
            content: buildUserPayload(input),
          },
        ],
      }),
    });

    const bodyText = await response.text();

    if (!response.ok) {
      return {
        ok: false as const,
        status: response.status,
        bodyText,
        model,
      };
    }

    const parsed = JSON.parse(bodyText || '{}');
    const text = extractResponseText(parsed);

    return {
      ok: true as const,
      text,
      model,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function generateSocialReply(input: GenerateSocialReplyInput): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return generateLocalFallback(input.messageText);
  }

  try {
    const primary = await callResponsesAPI(apiKey, PRIMARY_MODEL, input);

    if (primary.ok && primary.text) {
      return primary.text;
    }

    if (!primary.ok && isModelFallbackError(primary.status, primary.bodyText)) {
      const fallbackModel = await callResponsesAPI(apiKey, FALLBACK_MODEL, input);

      if (fallbackModel.ok && fallbackModel.text) {
        return fallbackModel.text;
      }

      if (!fallbackModel.ok) {
        console.error('OPENAI SOCIAL ERROR:', fallbackModel.status, fallbackModel.bodyText);
      }
    } else if (!primary.ok) {
      console.error('OPENAI SOCIAL ERROR:', primary.status, primary.bodyText);
    }

    return generateLocalFallback(input.messageText);
  } catch (error) {
    console.error('OPENAI SOCIAL ERROR:', error);
    return generateLocalFallback(input.messageText);
  }
}
