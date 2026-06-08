import { PROMPT_MANOSYA_SOCIAL } from './prompt';

const FALLBACK_REPLY =
  '¡Hola! 😊 Te leo. Para entenderte mejor, contame una cosa: ¿querés usar ManosYA para buscar ayuda, ofrecer un servicio o tenés un negocio?';

function extractResponseText(data: any): string {
  if (typeof data?.output_text === 'string') {
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

export async function generateSocialReply(messageText: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return FALLBACK_REPLY;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: [
          {
            role: 'system',
            content: PROMPT_MANOSYA_SOCIAL,
          },
          {
            role: 'user',
            content: messageText,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('OPENAI SOCIAL ERROR:', response.status, await response.text());
      return FALLBACK_REPLY;
    }

    const data = await response.json();
    const reply = extractResponseText(data);

    return reply || FALLBACK_REPLY;
  } catch (error) {
    console.error('OPENAI SOCIAL ERROR:', error);
    return FALLBACK_REPLY;
  }
}
