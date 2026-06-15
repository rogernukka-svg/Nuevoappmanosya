export function userFriendlyError(error, fallback = 'No pudimos completar la accion. Proba de nuevo.') {
  const raw = [
    error?.message,
    error?.details,
    error?.hint,
    error?.code,
    typeof error === 'string' ? error : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (
    raw.includes('duplicate key') ||
    raw.includes('23505') ||
    raw.includes('unique constraint') ||
    raw.includes('chats_job_id_key')
  ) {
    return 'Abrimos la conversacion que ya tenias con esta persona.';
  }

  if (raw.includes('network') || raw.includes('fetch') || raw.includes('timeout')) {
    return 'La conexion esta lenta. Estamos reintentando.';
  }

  if (raw.includes('not authenticated') || raw.includes('jwt') || raw.includes('session')) {
    return 'Tu sesion necesita actualizarse. Volve a entrar para continuar.';
  }

  if (raw.includes('permission') || raw.includes('policy') || raw.includes('rls')) {
    return 'No pudimos confirmar el permiso ahora. Actualiza y proba otra vez.';
  }

  return fallback;
}
