"use client";

import { useEffect, useRef, useState } from "react";

// The intro video (public/eddie-intro.mp4) has a flat cream background
// (~rgb(251,244,231)) instead of true transparency — video codecs' alpha
// support (VP9-in-WebM) is too browser-inconsistent to rely on. Instead we
// draw each frame to a hidden canvas and key out that background color in
// real time, which works identically in every browser. Once the video ends,
// we crossfade the canvas into the static (genuinely transparent) logo PNG.
const KEY_COLOR = { r: 251, g: 244, b: 231 };
const KEY_LOW = 25;
const KEY_HIGH = 70;
const CANVAS_SIZE = 600;

export default function HeroLogo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const [videoEnded, setVideoEnded] = useState(false);

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
      setVideoEnded(true);
    }

    video.addEventListener("playing", handlePlaying);
    video.addEventListener("ended", handleEnded);
    return () => {
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("ended", handleEnded);
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="header-logo-wrap">
      {/* Fixed watermark behind the whole page — stays invisible while the
          intro video plays (it would otherwise show through the video's
          keyed-out background) and only fades in once the video has ended,
          at which point it's positioned directly behind the static logo and
          only becomes visible once the user scrolls past it. */}
      <img
        src="/pixldrop-logo-transparent.png"
        alt=""
        className={`bg-logo${videoEnded ? " is-visible" : ""}`}
      />
      <img
        src="/pixldrop-logo-transparent.png"
        alt="PixlDrop — Eddie's Welt"
        className={`header-logo header-logo-static${videoEnded ? " is-visible" : ""}`}
      />
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className={`header-logo header-logo-video${videoEnded ? " is-hidden" : ""}`}
      />
      <video
        ref={videoRef}
        className="header-logo-source-video"
        src="/eddie-intro.mp4"
        autoPlay
        muted
        playsInline
      />
    </div>
  );
}
