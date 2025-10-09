// lib/supabase/server.js
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

/**
 * Cliente de Supabase para layouts y server components (Next.js 13/14)
 */
export function createClient() {
  return createServerComponentClient({ cookies });
}
