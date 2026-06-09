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
  const supportText =
    entityType === 'worker'
      ? 'Disponible para trabajos cerca de tu zona.'
      : entityType === 'supplier'
        ? 'Productos y servicios disponibles en ManosYA.'
        : 'Conectando oportunidades cerca de tu zona.';

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#070d10]">
      <img
        src={avatarUrl}
        onError={(event) => {
          event.currentTarget.src = '/avatar-fallback.png';
        }}
        alt=""
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-[118%] w-[118%] -translate-x-1/2 -translate-y-1/2 scale-105 object-cover opacity-[0.11] blur-3xl grayscale"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(98,191,185,0.10),transparent_35%),linear-gradient(180deg,rgba(10,15,18,0.96)_0%,rgba(3,7,10,0.98)_100%)]" />

      <div className="absolute inset-0 flex items-center justify-center px-5 pb-28 pt-24">
        <div className="w-full max-w-[318px] rounded-[32px] border border-white/10 bg-white/[0.075] px-6 py-7 text-center text-white shadow-[0_22px_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-3 py-1.5 text-[11px] font-semibold text-white/72">
            <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-[#62bfb9]' : 'bg-white/42'}`} />
            {isOnline ? 'Activo ahora' : 'Disponible'}
          </div>

          <div className="relative mx-auto h-28 w-28">
            <img
              src={avatarUrl}
              onError={(event) => {
                event.currentTarget.src = '/avatar-fallback.png';
              }}
              alt={name}
              className="h-28 w-28 rounded-full border border-white/80 object-cover shadow-[0_16px_42px_rgba(0,0,0,0.30)] ring-2 ring-[#62bfb9]/35"
            />
            {verified && (
              <span className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full border border-white/85 bg-[#0f172a] text-[#62bfb9] shadow-[0_8px_20px_rgba(0,0,0,0.28)]">
                <BadgeCheck size={18} strokeWidth={2.8} />
              </span>
            )}
          </div>

          <h3 className="mx-auto mt-5 max-w-full truncate text-[26px] font-black leading-tight text-white">
            {name}
          </h3>

          <div className="mx-auto mt-3 inline-flex max-w-full items-center rounded-full border border-white/10 bg-white/[0.08] px-3.5 py-1.5 text-[12px] font-bold text-white/82">
            <span className="truncate">{service}</span>
          </div>

          <p className="mx-auto mt-4 max-w-[245px] text-[14px] font-medium leading-6 text-white/68">
            {supportText}
          </p>

          <div className="mt-5 text-[11px] font-semibold text-white/38">
            Perfil profesional
          </div>
        </div>
      </div>
    </div>
  );
}
