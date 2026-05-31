export const FEED_VIDEO_ATTR = 'data-manosya-feed-video';
export const FEED_VIDEO_SELECTOR = `[${FEED_VIDEO_ATTR}="true"]`;

export function pauseFeedVideo(video, { reset = false } = {}) {
  if (!video) return;

  try {
    video.pause();
    if (reset) video.currentTime = 0;
  } catch {}
}

export function pauseOtherFeedVideos(activeVideo, { reset = false } = {}) {
  if (typeof document === 'undefined') return;

  document.querySelectorAll(FEED_VIDEO_SELECTOR).forEach((video) => {
    if (video === activeVideo) return;
    pauseFeedVideo(video, { reset });
  });
}

export async function playFeedVideo(video, { withSound = false, isCurrent = () => true } = {}) {
  if (!video) return false;

  pauseOtherFeedVideos(video);

  try {
    video.playsInline = true;
    video.preload = 'auto';
    video.muted = !withSound;
    video.volume = 1;
    await video.play();

    if (!isCurrent()) {
      pauseFeedVideo(video);
      return false;
    }

    return true;
  } catch {
    if (!isCurrent()) {
      pauseFeedVideo(video);
      return false;
    }

    try {
      video.muted = true;
      await video.play();

      if (!isCurrent()) {
        pauseFeedVideo(video);
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }
}
