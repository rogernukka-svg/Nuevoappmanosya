import { NextRequest, NextResponse } from 'next/server';
import { sendFacebookMessage } from '@/lib/social/meta';
import { generateSocialReply } from '@/lib/social/openai';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.META_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log('META WEBHOOK EVENT:', JSON.stringify(body, null, 2));

    const entries = Array.isArray(body?.entry) ? body.entry : [];

    for (const entry of entries) {
      const messagingEvents = Array.isArray(entry?.messaging) ? entry.messaging : [];

      for (const event of messagingEvents) {
        const senderId = event?.sender?.id;
        const text = String(event?.message?.text || '').trim();
        const mid = event?.message?.mid;

        if (!senderId) continue;
        if (!event?.message) continue;
        if (!text) continue;

        console.log('Message received:', text);
        if (mid) console.log('Message mid:', mid);

        try {
          const reply = await generateSocialReply(text);
          await sendFacebookMessage(senderId, reply);
          console.log('Reply sent:', reply);
        } catch (error) {
          console.error('META WEBHOOK MESSAGE ERROR:', error);
        }
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('META WEBHOOK ERROR:', error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
