"use client";
import { useEffect, useRef } from "react";

export default function GlobalAudio() {
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 1;
      audioRef.current.play().catch(() => {});
    }
  }, []);

  return (
    <audio
      ref={audioRef}
      src="/audios/manosya_intro.mp3"
      autoPlay
      playsInline
      className="hidden"
    />
  );
}
