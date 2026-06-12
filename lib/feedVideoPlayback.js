export const FEED_VIDEO_ATTR = 'data-manosya-feed-video';
export const FEED_VIDEO_SELECTOR = `[${FEED_VIDEO_ATTR}="true"]`;
export const FEED_VIDEO_MANUAL_PAUSE_EVENT = 'manosya-feed-video-manual-pause';
export const FEED_VIDEO_PLAY_REQUEST_EVENT = 'manosya-feed-video-play-request';
export const FEED_VIDEO_USER_PLAY_UNTIL_ATTR = 'data-manosya-feed-user-play-until';

function protectFromAutoPause(video, ms = 1400) {
  if (!video) return;

  try {
    video.setAttribute(FEED_VIDEO_USER_PLAY_UNTIL_ATTR, String(Date.now() + ms));
  } catch {}
}

function clearAutoPauseProtection(video) {
  try {
    video?.removeAttribute?.(FEED_VIDEO_USER_PLAY_UNTIL_ATTR);
  } catch {}
}

function isAutoPauseProtected(video) {
  if (!video) return false;

  const protectedUntil = Number(video.getAttribute(FEED_VIDEO_USER_PLAY_UNTIL_ATTR) || 0);
  return Number.isFinite(protectedUntil) && protectedUntil > Date.now();
}

function emitFeedVideoEvent(video, eventName) {
  try {
    video?.dispatchEvent?.(new CustomEvent(eventName));
  } catch {}
}

export function pauseFeedVideo(video, { reset = false, manual = true } = {}) {
  if (!video) return;

  try {
    if (!manual && isAutoPauseProtected(video)) return;

    clearAutoPauseProtection(video);
    video.pause();
    if (reset) video.currentTime = 0;
    if (manual) emitFeedVideoEvent(video, FEED_VIDEO_MANUAL_PAUSE_EVENT);
  } catch {}
}

export function pauseOtherFeedVideos(activeVideo, { reset = false } = {}) {
  if (typeof document === 'undefined') return;
  if (!activeVideo) return;

  document.querySelectorAll(FEED_VIDEO_SELECTOR).forEach((video) => {
    if (video === activeVideo) return;
    if (isAutoPauseProtected(video)) return;
    pauseFeedVideo(video, { reset, manual: false });
  });
}

export async function playFeedVideo(
  video,
  { withSound = false, isCurrent = () => true, protect = false } = {}
) {
  if (!video) return false;

  if (protect) protectFromAutoPause(video);
  pauseOtherFeedVideos(video);
  emitFeedVideoEvent(video, FEED_VIDEO_PLAY_REQUEST_EVENT);

  try {
    video.playsInline = true;
    video.preload = 'auto';
    video.muted = !withSound;
    video.volume = 1;
    await video.play();

    if (!isCurrent()) {
      pauseFeedVideo(video, { manual: false });
      return false;
    }

    if (protect) protectFromAutoPause(video);
    return true;
  } catch {
    if (!isCurrent()) {
      pauseFeedVideo(video, { manual: false });
      return false;
    }

    try {
      video.muted = true;
      await video.play();

      if (!isCurrent()) {
        pauseFeedVideo(video, { manual: false });
        return false;
      }

      if (protect) protectFromAutoPause(video);
      return true;
    } catch {
      return false;
    }
  }
}
