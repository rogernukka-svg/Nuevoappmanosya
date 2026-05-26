export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const hasRealServiceKey =
    serviceRoleKey &&
    !serviceRoleKey.includes('REEMPLAZA_') &&
    serviceRoleKey.split('.').length === 3;
  const key = hasRealServiceKey ? serviceRoleKey : anonKey;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function GET() {
  const supabase = getServerSupabase();

  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase no disponible en el servidor.' },
      { status: 200 }
    );
  }

  const { data, error } = await supabase
    .from('map_workers_view')
    .select('*')
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || [], { status: 200 });
}
