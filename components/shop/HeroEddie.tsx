"use client";

import { useLayoutEffect, useState } from "react";
import ChromaKeyVideo from "@/components/ChromaKeyVideo";

// Eddie (Mütze "Eddie's Cafe") groß im Hero-Hintergrund, wie auf der PixlDrop-Startseite:
// dasselbe Intro-Video (public/eddie-intro.mp4) per Chroma-Key, danach bleibt er als Standbild stehen.
// Ohne Bewegung (prefers-reduced-motion), bei erneutem Besuch in derselben Sitzung, ohne JS oder
// wenn das Video nicht startet, steht sofort das Standbild (public/shop/eddie-stand.webp, aus dem
// letzten Videobild freigestellt, gleiche Position wie das Videoende).
const PLAYED_KEY = "shop-eddie-played";

type Mode = "pending" | "video" | "done" | "still";

export default function HeroEddie() {
  const [mode, setMode] = useState<Mode>("pending");

  useLayoutEffect(() => {
    let still = false;
    try {
      still = window.matchMedia("(prefers-reduced-motion: reduce)").matches || sessionStorage.getItem(PLAYED_KEY) === "1";
    } catch {
      // sessionStorage kann in strengen Datenschutzmodi werfen: dann abspielen.
    }
    setMode(still ? "still" : "video");
  }, []);

  function handleEnded() {
    setMode("done");
    try {
      sessionStorage.setItem(PLAYED_KEY, "1");
    } catch {}
  }

  return (
    <div className="shop-hero-eddie" data-mode={mode} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="shop-eddie-still"
        src="/shop/eddie-stand.webp"
        alt=""
        width={720}
        height={720}
        fetchPriority="high"
        decoding="async"
      />
      {(mode === "video" || mode === "done") && (
        <ChromaKeyVideo src="/eddie-intro.mp4" play onEnded={handleEnded} className="shop-eddie-canvas" />
      )}
      <noscript>
        <style>{`.shop-eddie-still{opacity:1 !important}`}</style>
      </noscript>
    </div>
  );
}
