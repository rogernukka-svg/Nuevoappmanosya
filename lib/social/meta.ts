export type MetaSendResult =
  | { ok: true; messageId?: string }
  | { ok: false; error: string; status?: number };

export async function sendFacebookMessage(recipientId: string, text: string): Promise<MetaSendResult> {
  const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;

  if (!pageAccessToken) {
    return { ok: false, error: 'META_PAGE_ACCESS_TOKEN is not configured' };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text },
        }),
      }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: data?.error?.message || 'Meta Send API request failed',
      };
    }

    return { ok: true, messageId: data?.message_id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown Meta Send API error',
    };
  }
}
