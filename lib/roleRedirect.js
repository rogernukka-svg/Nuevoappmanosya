'use client';

export const APP_ROLE_KEY = 'app_role';

export function normalizeAppRole(role) {
  const clean = String(role || '').trim().toLowerCase();
  if (clean === 'provider') return 'supplier';
  if (['client', 'worker', 'supplier', 'admin', 'cashier'].includes(clean)) return clean;
  return '';
}

export function pathForRole(role) {
  const clean = normalizeAppRole(role);
  if (clean === 'worker') return '/worker/feed';
  if (clean === 'supplier') return '/supplier';
  if (clean === 'client') return '/client';
  if (clean === 'admin' || clean === 'cashier') return '/admin/workers';
  return '/role-selector';
}

export async function getProfileRole(supabase, userId) {
  if (!supabase || !userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, role, full_name, avatar_url')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export function rememberRole(role) {
  if (typeof window === 'undefined') return;
  const clean = normalizeAppRole(role);
  if (clean) localStorage.setItem(APP_ROLE_KEY, clean);
}

export function forgetRole() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(APP_ROLE_KEY);
}

export async function redirectToRole({ supabase, router, userId, fallbackRole = '' }) {
  const profile = await getProfileRole(supabase, userId);
  const role = normalizeAppRole(profile?.role || fallbackRole);

  if (role) rememberRole(role);
  if (profile?.email && typeof window !== 'undefined') {
    localStorage.setItem('last_login_email', String(profile.email).trim().toLowerCase());
  }

  router.replace(pathForRole(role));
  return { profile, role };
}

export async function requireRole({ supabase, router, allowedRoles = [], fallbackPath = '/role-selector' }) {
  const { data, error } = await supabase.auth.getUser();
  const user = data?.user || null;

  if (error || !user) {
    router.replace('/auth/login');
    return { user: null, profile: null, role: '' };
  }

  const profile = await getProfileRole(supabase, user.id);
  const role = normalizeAppRole(profile?.role);
  const allowed = allowedRoles.map(normalizeAppRole);

  if (role) rememberRole(role);

  if (allowed.length && !allowed.includes(role)) {
    router.replace(fallbackPath || pathForRole(role));
    return { user: null, profile, role };
  }

  return { user, profile, role };
}
