const DEFAULT_MEDIA_LIMIT = 12;
const DEFAULT_MIN_IMAGES = 3;
const DEFAULT_MIN_VIDEOS = 3;

function getConnection() {
  if (typeof navigator === 'undefined') return null;
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
}

function isSlowConnection(connection = getConnection()) {
  if (!connection) return false;
  const effectiveType = String(connection.effectiveType || '').toLowerCase();
  const downlink = Number(connection.downlink || 0);

  return (
    connection.saveData ||
    effectiveType === 'slow-2g' ||
    effectiveType === '2g' ||
    (downlink > 0 && downlink < 1.2)
  );
}

function isVideoUrl(url) {
  return /\.(?:mp4|webm|mov|m4v|3gp|3gpp)(?:\?.*)?$/i.test(String(url || ''));
}

function canCacheMediaUrl(url) {
  const connection = getConnection();
  if (isSlowConnection(connection)) return false;
  if (!isVideoUrl(url)) return true;

  const effectiveType = String(connection?.effectiveType || '').toLowerCase();
  const downlink = Number(connection?.downlink || 0);

  return !['3g', 'slow-2g', '2g'].includes(effectiveType) && (!downlink || downlink >= 4);
}

function cleanMediaUrl(url) {
  const value = String(url || '').trim();
  if (!value || value.startsWith('blob:') || value.startsWith('data:')) return '';
  return value;
}

export function collectWorkerMediaUrls(workers = [], options = DEFAULT_MEDIA_LIMIT) {
  const limit =
    typeof options === 'number' ? options : Number(options?.limit || DEFAULT_MEDIA_LIMIT);
  const minImages =
    typeof options === 'number' ? DEFAULT_MIN_IMAGES : Number(options?.minImages || DEFAULT_MIN_IMAGES);
  const minVideos =
    typeof options === 'number' ? DEFAULT_MIN_VIDEOS : Number(options?.minVideos || DEFAULT_MIN_VIDEOS);
  const videos = [];
  const images = [];
  const others = [];
  const seen = new Set();

  const addUrl = (url, mediaType = '') => {
    const clean = cleanMediaUrl(url);
    if (!clean || seen.has(clean)) return;
    seen.add(clean);

    const type = String(mediaType || '').toLowerCase();
    if (type === 'video') {
      videos.push(clean);
      return;
    }

    if (type === 'image' || /\.(?:png|jpg|jpeg|webp|gif|ico)(?:\?.*)?$/i.test(clean)) {
      images.push(clean);
      return;
    }

    others.push(clean);
  };

  for (const worker of workers || []) {
    addUrl(worker?.media_url, worker?.media_type);
    addUrl(worker?.thumbnail_url, 'image');
    addUrl(worker?.cover_url, 'image');
    addUrl(worker?.video_thumb_url, 'image');
    addUrl(worker?.avatar_url, 'image');

    if (Array.isArray(worker?.profile_media)) {
      for (const item of worker.profile_media) {
        addUrl(item?.media_url, item?.media_type);
        addUrl(item?.thumbnail_url, 'image');
      }
    }

    if (videos.length + images.length + others.length >= limit * 2) break;
  }

  return [
    ...videos.slice(0, minVideos),
    ...images.slice(0, minImages),
    ...videos.slice(minVideos),
    ...images.slice(minImages),
    ...others,
  ].slice(0, limit);
}

export async function cacheMediaUrls(urls = [], cacheName = 'manosya-feed-media-v1') {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  if (isSlowConnection()) return;

  const cleanUrls = [...new Set((urls || []).map(cleanMediaUrl).filter(Boolean))]
    .filter(canCacheMediaUrl);
  if (!cleanUrls.length) return;

  try {
    const cache = await caches.open(cacheName);

    await Promise.allSettled(
      cleanUrls.map(async (url) => {
        const cached = await cache.match(url);
        if (cached) return;

        const response = await fetch(url, {
          mode: 'no-cors',
          credentials: 'omit',
          cache: 'force-cache',
        });

        if (response) await cache.put(url, response);
      })
    );
  } catch (error) {
    console.warn('No se pudo guardar media para uso rapido:', error);
  }
}
