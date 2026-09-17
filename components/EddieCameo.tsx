"use client";

import { useEffect, useState } from "react";
import ChromaKeyVideo from "./ChromaKeyVideo";

// Eddie pops in at the screen edge (mirrored on the left) the first time the
// linked section scrolls into view, plays the wave once, then freezes on
// the last frame and just stays there (fading with the section's own
// visibility) rather than looping — desktop only, see the .eddie-cameo
// min-width media query (no spare side margin on mobile).
export default function EddieCameo({
  side,
  targetId,
}: {
  side: "left" | "right";
  targetId: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.6,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [targetId]);

  return (
    <div className={`eddie-cameo eddie-cameo-${side}${visible ? " is-visible" : ""}`} aria-hidden="true">
      <ChromaKeyVideo src="/eddie-intro.mp4" play={visible} className="eddie-cameo-canvas" />
    </div>
  );
}
