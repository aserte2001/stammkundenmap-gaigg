"use client";

import { useEffect, useRef } from "react";

type Props = {
  enabled: boolean;
};

const TRACK_URL = "/audio/ambient-poestlingberg.ogg";

export function AmbientAudio({ enabled }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!audioRef.current) {
      const audio = new Audio(TRACK_URL);
      audio.loop = true;
      audio.volume = 0;
      audio.preload = "metadata";
      audioRef.current = audio;
    }
    const audio = audioRef.current;
    if (!audio) return;
    if (enabled) {
      audio
        .play()
        .then(() => {
          // Fade in
          const start = audio.volume;
          const target = 0.35;
          const steps = 30;
          let i = 0;
          const id = setInterval(() => {
            i += 1;
            audio.volume = start + ((target - start) * i) / steps;
            if (i >= steps) clearInterval(id);
          }, 33);
        })
        .catch(() => {
          // Audio file may be missing in dev — silently degrade.
        });
    } else {
      const start = audio.volume;
      const steps = 18;
      let i = 0;
      const id = setInterval(() => {
        i += 1;
        audio.volume = start - (start * i) / steps;
        if (i >= steps) {
          clearInterval(id);
          audio.pause();
        }
      }, 33);
    }
    return () => {
      audio.pause();
    };
  }, [enabled]);

  return null;
}
