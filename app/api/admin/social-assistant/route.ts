export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  localSocialAssistantFallback,
  SOCIAL_ASSISTANT_PROMPT,
} from '@/lib/social-assistant/prompt';
import type {
  SocialAssistantContext,
  SocialAssistantRequest,
  SocialAssistantResponse,
} from '@/lib/social-assistant/types';

type ServerSupabase = SupabaseClient<any, any, any>;

const VALID_CONTEXTS: SocialAssistantContext[] = [
  'private_message',
  'friend_request',
  'public_comment',
  'story_reply',
  'user',
  'worker',
  'supplier',
  'curious',
  'flirty',
  'support',
  'unknown',
];

function getServerSupabase(): ServerSupabase | null {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey || serviceRoleKey.includes('REEMPLAZA_')) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function normalizeContext(value: unknown): SocialAssistantContext {
  return VALID_CONTEXTS.includes(value as SocialAssistantContext)
    ? (value as SocialAssistantContext)
    : 'unknown';
}

async function assertAdmin(request: NextRequest, supabase: ServerSupabase) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : '';

  if (!token) {
    return { ok: false as const, status: 401, error: 'Missing session token' };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData?.user?.id) {
    return { ok: false as const, status: 401, error: 'Invalid session token' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, admin_role')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError) {
    return { ok: false as const, status: 500, error: 'Could not validate admin profile' };
  }

  const allowed =
    profile?.role === 'admin' || ['admin', 'superadmin'].includes(profile?.admin_role || '');

  if (!allowed) {
    return { ok: false as const, status: 403, error: 'Admin access required' };
  }

  return { ok: true as const, userId: userData.user.id };
}

function normalizeAIResponse(
  candidate: Partial<SocialAssistantResponse>,
  fallback: SocialAssistantResponse
): SocialAssistantResponse {
  const leadTypes = [
    'USER_LEAD',
    'WORKER_LEAD',
    'SUPPLIER_LEAD',
    'CURIOUS_LEAD',
    'FLIRTY_LEAD',
    'UNSAFE_LEAD',
  ];

  return {
    shortReply: String(candidate.shortReply || fallback.shortReply).trim(),
    naturalReply: String(candidate.naturalReply || fallback.naturalReply).trim(),
    warmReply: String(candidate.warmReply || fallback.warmReply).trim(),
    detectedLeadType: leadTypes.includes(candidate.detectedLeadType || '')
      ? (candidate.detectedLeadType as SocialAssistantResponse['detectedLeadType'])
      : fallback.detectedLeadType,
    suggestedNextStep: String(candidate.suggestedNextStep || fallback.suggestedNextStep).trim(),
  };
}

async function generateWithOpenAI(
  payload: SocialAssistantRequest,
  fallback: SocialAssistantResponse
): Promise<SocialAssistantResponse> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) return fallback;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_SOCIAL_MODEL || 'gpt-4o-mini',
        temperature: 0.48,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SOCIAL_ASSISTANT_PROMPT },
          {
            role: 'user',
            content: JSON.stringify({
              message: payload.message,
              context: payload.context,
              fallback,
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      console.warn('OpenAI social assistant failed:', response.status, await response.text());
      return fallback;
    }

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content;
    const parsed = JSON.parse(raw || '{}');

    return normalizeAIResponse(parsed, fallback);
  } catch (error) {
    console.warn('OpenAI social assistant error:', error);
    return fallback;
  }
}

export async function POST(request: NextRequest) {
  const supabase = getServerSupabase();

  if (!supabase) {
    return NextResponse.json({ error: 'Server Supabase client is not configured' }, { status: 500 });
  }

  const admin = await assertAdmin(request, supabase);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const body = (await request.json().catch(() => null)) as Partial<SocialAssistantRequest> | null;
  const message = String(body?.message || '').trim();
  const context = normalizeContext(body?.context);

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  if (message.length > 3000) {
    return NextResponse.json({ error: 'Message is too long' }, { status: 400 });
  }

  const payload = { message, context };
  const fallback = localSocialAssistantFallback(message, context);
  const result = await generateWithOpenAI(payload, fallback);

  return NextResponse.json(result, { status: 200 });
}
