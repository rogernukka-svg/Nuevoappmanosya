export async function sendFacebookMessage(recipientId: string, text: string): Promise<void> {
  const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;

  if (!pageAccessToken) {
    console.error('META SEND ERROR: META_PAGE_ACCESS_TOKEN is not configured');
    return;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text },
        }),
      }
    );

    if (!response.ok) {
      console.error('META SEND ERROR:', response.status, await response.text());
    }
  } catch (error) {
    console.error('META SEND ERROR:', error);
  }
}
