// lib/onboard.js
import { supabase } from '@/lib/supabase';

/** Crea (si falta) y garantiza el perfil del trabajador. Devuelve worker_id. */
export async function ensureWorker() {
  const { data, error } = await supabase.rpc('ensure_worker_profile');
  if (error) throw error;
  return data; // worker_id
}

/** Reemplaza skills por slugs, ej: ['limpieza','plomeria'] */
export async function saveSkills(slugs) {
  const { error } = await supabase.rpc('set_my_worker_skills', {
    p_skill_slugs: slugs
  });
  if (error) throw error;
}

/** Actualiza datos del perfil. Los nulls conservan lo existente. */
export async function saveProfile({ radiusKm, years, active, lat, lon, bio }) {
  const { error } = await supabase.rpc('update_my_worker_profile', {
    p_radius_km: radiusKm ?? null,
    p_years_experience: years ?? null,
    p_active: typeof active === 'boolean' ? active : null,
    p_last_lat: lat ?? null,
    p_last_lon: lon ?? null,
    p_bio: bio ?? null
  });
  if (error) throw error;
}

/** Todo-en-uno (opcional): asegura perfil, setea skills y actualiza datos. */
export async function onboardAll({ slugs, radiusKm, years, active, lat, lon, bio }) {
  const { data, error } = await supabase.rpc('onboard_worker', {
    p_skill_slugs: slugs ?? null,
    p_radius_km: radiusKm ?? null,
    p_years_experience: years ?? null,
    p_active: typeof active === 'boolean' ? active : null,
    p_last_lat: lat ?? null,
    p_last_lon: lon ?? null,
    p_bio: bio ?? null
  });
  if (error) throw error;
  return data; // worker_id
}

/** Upload de documentos al bucket worker-docs/<uid>/... */
export async function uploadDoc(side, file) { // side: 'front' | 'back'
  const { data: { user } } = await supabase.auth.getUser();
  const path = `${user.id}/${side}-${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from('worker-docs').upload(path, file, {
    cacheControl: '3600', upsert: false
  });
  if (error) throw error;
  return path;
}
