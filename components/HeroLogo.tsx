"use client";

import { useLayoutEffect, useState } from "react";
import ChromaKeyVideo from "./ChromaKeyVideo";

// Plays the Eddie run-in/wave intro once, then crossfades (with a slight
// zoom-out, since the video ends more zoomed-in on Eddie than the full
// logo graphic) into the static logo. "Once" means once per browser tab
// page load, not once per mount — navigating to /impressum and back to / is
// a fresh mount of this component, so without a module-level flag it would
// replay every time.
// Merker nur im Arbeitsspeicher (kein Browser-Speicher, daher ohne Einwilligung nach § 25 TDDDG): gilt bis zum Neuladen.
let played = false;

export default function HeroLogo() {
  const [showIntro, setShowIntro] = useState(true);
  const [videoEnded, setVideoEnded] = useState(false);

  // useLayoutEffect (not useEffect) so this resolves before the browser
  // paints — on a repeat visit within the session the intro video never
  // becomes visible for even a frame, it just skips straight to the logo.
  useLayoutEffect(() => {
    if (played) {
      setShowIntro(false);
      setVideoEnded(true);
    }
  }, []);

  function handleEnded() {
    setVideoEnded(true);
    played = true;
  }

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
      {showIntro && (
        <ChromaKeyVideo
          src="/eddie-intro.mp4"
          play={!videoEnded}
          onEnded={handleEnded}
          className={`header-logo header-logo-video${videoEnded ? " is-hidden" : ""}`}
        />
      )}
    </div>
  );
}
