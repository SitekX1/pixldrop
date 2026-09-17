"use client";

import { useEffect, useState } from "react";
import ChromaKeyVideo from "./ChromaKeyVideo";

// Eddie pops in at the screen edge (mirrored on the left) and waves on loop
// for as long as the linked section is in view — desktop only, see the
// .eddie-cameo min-width media query (no spare side margin on mobile).
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
      <ChromaKeyVideo src="/eddie-intro.mp4" play={visible} loop className="eddie-cameo-canvas" />
    </div>
  );
}
