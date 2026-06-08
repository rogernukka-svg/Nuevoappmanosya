import { NextRequest, NextResponse } from 'next/server';

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

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('META WEBHOOK ERROR:', error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
