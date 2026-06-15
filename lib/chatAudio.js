export const CHAT_AUDIO_BUCKET = 'chat-audios';
export const CHAT_MEDIA_BUCKET = 'chat-media';
export const MAX_CHAT_AUDIO_BYTES = 10 * 1024 * 1024;
export const MAX_CHAT_MEDIA_BYTES = 25 * 1024 * 1024;
export const CHAT_AUDIO_SIGNED_URL_SECONDS = 60 * 60 * 24 * 7;

export function getSupportedAudioMimeType() {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return '';

  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

export function audioExtensionFromMime(mimeType = '') {
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4')) return 'm4a';
  if (mimeType.includes('mpeg')) return 'mp3';
  return 'webm';
}

export function normalizeAudioMessage(message) {
  if (!message) return null;

  return {
    ...message,
    text: String(message.text || message.content || message.body || ''),
    message_type: message.message_type || 'text',
    media_url: message.media_url || '',
    media_path: message.media_path || '',
    metadata: message.metadata || {},
  };
}

function bucketForMessageType(type) {
  if (type === 'image' || type === 'video') return CHAT_MEDIA_BUCKET;
  return CHAT_AUDIO_BUCKET;
}

export async function signChatAudioUrl({ supabase, path, messageType = 'audio' }) {
  if (!supabase || !path) return '';

  const { data, error } = await supabase.storage
    .from(bucketForMessageType(messageType))
    .createSignedUrl(path, CHAT_AUDIO_SIGNED_URL_SECONDS);

  if (error) {
    console.warn('No se pudo firmar el archivo del chat:', error.message);
    return '';
  }

  return data?.signedUrl || '';
}

export async function hydrateAudioMessage({ supabase, message }) {
  const normalized = normalizeAudioMessage(message);
  if (!normalized) return null;

  if (!['audio', 'image', 'video'].includes(normalized.message_type) || !normalized.media_path) {
    return normalized;
  }

  const signedUrl = await signChatAudioUrl({
    supabase,
    path: normalized.media_path,
    messageType: normalized.message_type,
  });
  return {
    ...normalized,
    media_url: signedUrl || normalized.media_url || '',
  };
}

function mediaExtensionFromMime(mimeType = '') {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('gif')) return 'gif';
  if (mimeType.includes('quicktime')) return 'mov';
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('mp4')) return 'mp4';
  return 'jpg';
}

export function chatMediaTypeFromFile(file) {
  const type = String(file?.type || '').toLowerCase();
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  return '';
}

export async function uploadChatMedia({ supabase, chatId, userId, file }) {
  if (!supabase || !chatId || !userId || !file) {
    throw new Error('Faltan datos para subir el archivo');
  }

  const messageType = chatMediaTypeFromFile(file);
  if (!messageType) {
    throw new Error('Solo se pueden enviar fotos o videos');
  }

  if (file.size > MAX_CHAT_MEDIA_BYTES) {
    throw new Error('El archivo es muy pesado. Proba con una foto o video mas corto.');
  }

  const mimeType = file.type || (messageType === 'image' ? 'image/jpeg' : 'video/mp4');
  const extension = mediaExtensionFromMime(mimeType);
  const path = `${chatId}/${userId}-${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from(CHAT_MEDIA_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      contentType: mimeType,
      upsert: false,
    });

  if (error) throw error;

  const signedUrl = await signChatAudioUrl({ supabase, path, messageType });

  return {
    messageType,
    mediaPath: path,
    mediaUrl: signedUrl,
    metadata: {
      mime_type: mimeType,
      size: file.size,
      name: file.name || '',
    },
  };
}

export async function hydrateAudioMessages({ supabase, messages }) {
  return Promise.all(
    (messages || []).map((message) => hydrateAudioMessage({ supabase, message }))
  ).then((items) => items.filter(Boolean));
}

export async function uploadChatAudio({ supabase, chatId, userId, blob, durationMs = 0 }) {
  if (!supabase || !chatId || !userId || !blob) {
    throw new Error('Faltan datos para subir el audio');
  }

  if (blob.size > MAX_CHAT_AUDIO_BYTES) {
    throw new Error('El audio es muy pesado. Probá con uno más corto.');
  }

  const mimeType = blob.type || getSupportedAudioMimeType() || 'audio/webm';
  const extension = audioExtensionFromMime(mimeType);
  const path = `${chatId}/${userId}-${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from(CHAT_AUDIO_BUCKET)
    .upload(path, blob, {
      cacheControl: '3600',
      contentType: mimeType,
      upsert: false,
    });

  if (error) throw error;

  const signedUrl = await signChatAudioUrl({ supabase, path });

  return {
    mediaPath: path,
    mediaUrl: signedUrl,
    metadata: {
      mime_type: mimeType,
      size: blob.size,
      duration_ms: Math.max(0, Math.round(durationMs || 0)),
    },
  };
}
