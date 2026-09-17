"use client";

import { useEffect, useRef } from "react";

// Shared real-time chroma-key: eddie-intro.mp4 has a flat cream background
// (~rgb(251,244,231)) instead of true transparency (video codecs' alpha
// support is too browser-inconsistent to rely on). Draws each frame to a
// hidden canvas and keys out that background color in JS, which works
// identically in every browser and blends onto any page background behind
// it — used both for the homepage hero and the scroll-triggered cameos.
const KEY_COLOR = { r: 251, g: 244, b: 231 };
const KEY_LOW = 25;
const KEY_HIGH = 70;
const CANVAS_SIZE = 480;

export default function ChromaKeyVideo({
  src,
  play,
  loop = false,
  onEnded,
  className,
}: {
  src: string;
  play: boolean;
  loop?: boolean;
  onEnded?: () => void;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    function draw() {
      if (!video || !ctx || video.paused || video.ended) return;
      ctx.drawImage(video, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      const frame = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      const data = frame.data;
      for (let i = 0; i < data.length; i += 4) {
        const dr = data[i] - KEY_COLOR.r;
        const dg = data[i + 1] - KEY_COLOR.g;
        const db = data[i + 2] - KEY_COLOR.b;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);
        if (dist <= KEY_LOW) {
          data[i + 3] = 0;
        } else if (dist < KEY_HIGH) {
          data[i + 3] = Math.round((255 * (dist - KEY_LOW)) / (KEY_HIGH - KEY_LOW));
        }
      }
      ctx.putImageData(frame, 0, 0);
      rafRef.current = requestAnimationFrame(draw);
    }

    function handlePlaying() {
      if (rafRef.current === undefined) rafRef.current = requestAnimationFrame(draw);
    }
    function handleEnded() {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
      rafRef.current = undefined;
      onEnded?.();
    }

    video.addEventListener("playing", handlePlaying);
    video.addEventListener("ended", handleEnded);
    return () => {
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("ended", handleEnded);
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [onEnded]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (play) {
      // Once the clip has played through (and loop is off), leave it be —
      // this is what makes a cameo "play once, then Eddie stays standing"
      // instead of restarting every time it scrolls back into view.
      if (!video.ended) {
        // play() can reject if the browser interrupts it (seen after rapid
        // repeated hard-reloads) — without this fallback the hero would be
        // left with a blank spot forever, since onEnded would never fire.
        video.play().catch(() => onEnded?.());
      }
    } else {
      video.pause();
    }
  }, [play, onEnded]);

  return (
    <>
      <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className={className} />
      <video
        ref={videoRef}
        className="header-logo-source-video"
        src={src}
        autoPlay
        muted
        playsInline
        loop={loop}
      />
    </>
  );
}
