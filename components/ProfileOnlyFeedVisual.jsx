import { motion } from 'framer-motion';
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
}) {
  const avatarUrl =
    entity?.avatar_url ||
    entity?.profile_photo_url ||
    entity?.logo_url ||
    '/avatar-fallback.png';
  const name = entityName || entity?.store_name || entity?.business_name || entity?.full_name || 'Perfil ManosYA';
  const visualKey = String(entity?.user_id || entity?.worker_id || entity?.id || avatarUrl);
  const isVerified = Boolean(entity?.is_verified || entity?.verified || entity?.manosya_verified);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#62bfb9]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.28)_0%,rgba(255,255,255,0.13)_24%,rgba(12,107,112,0.20)_52%,rgba(7,24,39,0.40)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(98,191,185,0.92)_0%,rgba(24,184,170,0.88)_48%,rgba(12,107,112,0.92)_100%)]" />

      <div className="absolute inset-0 flex items-center justify-center px-5 pb-28 pt-24">
        <motion.div
          key={`halo-${visualKey}`}
          initial={{ opacity: 0, scale: 0.92, filter: 'blur(8px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ type: 'spring', stiffness: 150, damping: 20, mass: 0.8 }}
          className="relative flex h-[246px] w-[246px] items-center justify-center rounded-full sm:h-[286px] sm:w-[286px]"
        >
          <div className="absolute inset-[-26px] rounded-full bg-white/14 blur-2xl" />
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-[conic-gradient(from_130deg,rgba(255,255,255,0.94),rgba(158,229,223,0.34),rgba(12,107,112,0.72),rgba(255,255,255,0.92),rgba(98,191,185,0.36),rgba(255,255,255,0.94))] shadow-[0_30px_86px_rgba(7,24,39,0.34)]"
            animate={{ rotate: 360 }}
            transition={{ duration: 18, ease: 'linear', repeat: Infinity }}
          />
          <div className="absolute inset-[8px] rounded-full border border-white/50 bg-[#62bfb9]/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.55),inset_0_-18px_44px_rgba(7,24,39,0.16)] backdrop-blur-md" />
          <div className="absolute inset-[22px] rounded-full bg-white/88 shadow-[0_18px_48px_rgba(7,24,39,0.22)]" />
          <div className="absolute left-[23%] top-[18%] h-[42px] w-[64px] rotate-[-28deg] rounded-full bg-white/38 blur-[1px]" />
          <motion.img
            key={`avatar-${visualKey}`}
            src={avatarUrl}
            onError={(event) => {
              event.currentTarget.src = '/avatar-fallback.png';
            }}
            alt={name}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 h-[186px] w-[186px] rounded-full border-[7px] border-white/95 object-cover shadow-[0_22px_54px_rgba(7,24,39,0.34)] sm:h-[218px] sm:w-[218px]"
          />
          {isVerified && (
            <motion.div
              key={`verified-${visualKey}`}
              initial={{ opacity: 0, scale: 0.72, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.12, type: 'spring', stiffness: 360, damping: 20 }}
              className="absolute bottom-[31px] right-[31px] z-20 flex h-10 w-10 items-center justify-center rounded-full border-[4px] border-white bg-sky-500 text-white shadow-[0_12px_30px_rgba(14,165,233,0.42)] sm:bottom-[35px] sm:right-[35px] sm:h-11 sm:w-11"
              title="Verificado por ManosYA"
              aria-label="Verificado por ManosYA"
            >
              <BadgeCheck size={21} strokeWidth={3.2} />
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
