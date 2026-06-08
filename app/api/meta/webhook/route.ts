import { NextRequest, NextResponse } from 'next/server';
import { sendFacebookMessage } from '@/lib/social/meta';
import { generateSocialReply } from '@/lib/social/local';
import { classifyMessage } from '@/lib/social/intent';
import { addMessage, getRecentMessages } from '@/lib/social/conversation';

type MetaWebhookGlobal = typeof globalThis & {
  __processedMessageIds?: Set<string>;
};

const metaGlobal = globalThis as MetaWebhookGlobal;
const processedMessageIds = metaGlobal.__processedMessageIds || new Set<string>();
metaGlobal.__processedMessageIds = processedMessageIds;

function markMessageProcessed(mid: string) {
  if (!mid) return false;

  if (processedMessageIds.has(mid)) {
    return true;
  }

  if (processedMessageIds.size > 1000) {
    processedMessageIds.clear();
  }

  processedMessageIds.add(mid);
  return false;
}

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

    console.log('META WEBHOOK EVENT:', {
      object: body?.object,
      entries: Array.isArray(body?.entry) ? body.entry.length : 0,
    });

    const entries = Array.isArray(body?.entry) ? body.entry : [];

    for (const entry of entries) {
      const messagingEvents = Array.isArray(entry?.messaging) ? entry.messaging : [];

      for (const event of messagingEvents) {
        const senderId = event?.sender?.id;
        const recipientId = event?.recipient?.id;
        const text = String(event?.message?.text || '').trim();
        const mid = event?.message?.mid;
        const timestamp = event?.timestamp;

        if (!senderId) continue;
        if (!event?.message) continue;
        if (event?.message?.is_echo === true) continue;
        if (!text) continue;
        if (mid && markMessageProcessed(String(mid))) continue;

        console.log('Message received:', text);
        if (mid) console.log('Message mid:', mid);
        if (recipientId) console.log('Recipient:', recipientId);
        if (timestamp) console.log('Timestamp:', timestamp);

        try {
          const classification = classifyMessage(text);
          const recentMessages = getRecentMessages(senderId);
          const reply = await generateSocialReply({
            messageText: text,
            recentMessages,
            intent: classification.intent,
            leadType: classification.leadType,
          });

          addMessage(senderId, 'user', text);
          await sendFacebookMessage(senderId, reply);
          addMessage(senderId, 'assistant', reply);

          console.log('Intent:', classification.intent);
          console.log('Lead type:', classification.leadType);
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
