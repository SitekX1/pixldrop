"use client";

import { useState } from "react";
import ChromaKeyVideo from "./ChromaKeyVideo";

// Plays the Eddie run-in/wave intro once, then crossfades (with a slight
// zoom-out, since the video ends more zoomed-in on Eddie than the full
// logo graphic) into the static logo.
export default function HeroLogo() {
  const [videoEnded, setVideoEnded] = useState(false);

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
      <ChromaKeyVideo
        src="/eddie-intro.mp4"
        play={!videoEnded}
        onEnded={() => setVideoEnded(true)}
        className={`header-logo header-logo-video${videoEnded ? " is-hidden" : ""}`}
      />
    </div>
  );
}
