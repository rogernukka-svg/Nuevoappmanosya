import { BadgeCheck } from 'lucide-react';

function sameUrl(a, b) {
  const left = String(a || '').trim();
  const right = String(b || '').trim();
  return Boolean(left && right && left === right);
}

export function isProfileOnlyMedia(entity) {
  const mediaType = String(entity?.media_type || '').toLowerCase();
  if (mediaType === 'video') return false;

  const avatarUrl = entity?.avatar_url || entity?.profile_photo_url || entity?.logo_url || '';
  if (!avatarUrl) return false;

  const mediaUrl = entity?.media_url || '';
  const coverUrl = entity?.cover_url || '';
  const thumbUrl = entity?.video_thumb_url || entity?.thumbnail_url || '';
  const postText = String(entity?.post_description || entity?.caption || entity?.text_overlay || '').trim();

  const hasDistinctPostMedia = Boolean(mediaUrl && !sameUrl(mediaUrl, avatarUrl));
  const hasDistinctCover = Boolean(coverUrl && !sameUrl(coverUrl, avatarUrl));
  const hasDistinctThumb = Boolean(thumbUrl && !sameUrl(thumbUrl, avatarUrl));
  const mediaLooksLikeAvatar =
    sameUrl(mediaUrl, avatarUrl) ||
    sameUrl(coverUrl, avatarUrl) ||
    sameUrl(thumbUrl, avatarUrl);
  const isGeneratedProfileCard = String(entity?.post_id || entity?.id || '').startsWith('profile-');

  if (isGeneratedProfileCard) return true;
  if (!mediaUrl && !coverUrl && !thumbUrl) return true;
  if (mediaLooksLikeAvatar && !hasDistinctPostMedia && !hasDistinctCover && !hasDistinctThumb) {
    return !postText || !entity?.media_url || sameUrl(entity.media_url, avatarUrl);
  }

  return false;
}

export default function ProfileOnlyFeedVisual({
  entity,
  entityName,
  primaryService,
  isOnline,
  entityType = 'profile',
}) {
  const avatarUrl =
    entity?.avatar_url ||
    entity?.profile_photo_url ||
    entity?.logo_url ||
    '/avatar-fallback.png';
  const name = entityName || entity?.store_name || entity?.business_name || entity?.full_name || 'Perfil ManosYA';
  const verified = Boolean(entity?.is_verified || entity?.verified);
  const service = primaryService || entity?.category || entity?.service_type || 'ManosYA';
  const copy =
    entityType === 'worker'
      ? {
          title: `${service} de ManosYA`,
          body: 'Disponible para trabajos cerca de tu zona.',
        }
      : entityType === 'supplier'
        ? {
            title: 'Proveedor de ManosYA',
            body: 'Productos y servicios disponibles para la comunidad.',
          }
        : {
            title: 'Perfil ManosYA',
            body: 'Conectando oportunidades cerca de tu zona.',
          };

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#02090d]">
      <img
        src={avatarUrl}
        onError={(event) => {
          event.currentTarget.src = '/avatar-fallback.png';
        }}
        alt=""
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2 scale-110 object-cover opacity-28 blur-3xl"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(98,191,185,0.34),transparent_34%),linear-gradient(160deg,rgba(2,9,13,0.96)_0%,rgba(12,107,112,0.72)_48%,rgba(0,0,0,0.96)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black/72 to-transparent" />

      <div className="absolute inset-0 flex items-center justify-center px-5 pb-28 pt-24">
        <div className="w-full max-w-[330px] rounded-[36px] border border-white/20 bg-black/35 p-5 text-center text-white shadow-[0_30px_90px_rgba(0,0,0,0.48)] backdrop-blur-2xl">
          <div className="mx-auto mb-4 flex w-max items-center gap-2 rounded-full border border-white/14 bg-white/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#9ee5df]">
            <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-white/55'}`} />
            {isOnline ? 'Activo ahora' : 'Disponible'}
          </div>

          <div className="relative mx-auto h-32 w-32">
            <div className="absolute -inset-2 rounded-full bg-[conic-gradient(from_180deg,#62bfb9,#ffffff,#0c6b70,#62bfb9)] opacity-90 blur-[1px]" />
            <img
              src={avatarUrl}
              onError={(event) => {
                event.currentTarget.src = '/avatar-fallback.png';
              }}
              alt={name}
              className="relative h-32 w-32 rounded-full border-4 border-white object-cover shadow-[0_18px_45px_rgba(0,0,0,0.44)]"
            />
            {verified && (
              <span className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-sky-500 text-white shadow-[0_10px_24px_rgba(14,165,233,0.38)]">
                <BadgeCheck size={20} strokeWidth={3} />
              </span>
            )}
          </div>

          <div className="mt-5 flex items-center justify-center gap-2">
            <h3 className="max-w-full truncate text-[25px] font-black leading-tight">{name}</h3>
            {verified && <BadgeCheck size={20} className="shrink-0 text-sky-300" strokeWidth={3} />}
          </div>

          <div className="mx-auto mt-3 inline-flex max-w-full items-center rounded-full border border-[#9ee5df]/25 bg-[#62bfb9]/16 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-[#bdf7f2]">
            <span className="truncate">{service}</span>
          </div>

          <div className="mt-4 rounded-[24px] border border-white/12 bg-white/10 px-4 py-4">
            <div className="text-[15px] font-black">{copy.title}</div>
            <p className="mt-2 text-[13px] font-semibold leading-5 text-white/76">{copy.body}</p>
          </div>

          <div className="mt-4 text-[11px] font-black uppercase tracking-[0.14em] text-white/48">
            Perfil profesional
          </div>
        </div>
      </div>
    </div>
  );
}
