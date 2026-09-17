"use client";

import { useState } from "react";

// Plays the Eddie run-in/wave intro once, then crossfades into the static
// logo. The video's own last frame is already close to the logo (same end
// pose), so the crossfade only needs to hide the video's slightly rough
// AI-rendered text and reveal the crisp static wordmark underneath.
export default function HeroLogo() {
  const [videoEnded, setVideoEnded] = useState(false);

  return (
    <div className="header-logo-wrap">
      <img
        src="/pixldrop-logo-transparent.png"
        alt="PixlDrop — Eddie's Welt"
        className={`header-logo header-logo-static${videoEnded ? " is-visible" : ""}`}
      />
      <video
        className={`header-logo header-logo-video${videoEnded ? " is-hidden" : ""}`}
        src="/eddie-intro.mp4"
        autoPlay
        muted
        playsInline
        onEnded={() => setVideoEnded(true)}
      />
    </div>
  );
}
