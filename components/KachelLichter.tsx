"use client";

import { useLayoutEffect, useRef } from "react";

// Lichterkette der Weihnachtskachel: Standard (SSR, ohne JS, Reduced Motion) = alle Birnen AN.
// Mit JS und erlaubter Bewegung werden sie vor dem Paint gedimmt (data-aus) und gehen beim ersten Sichtbarwerden nacheinander an (einmalig).
export default function KachelLichter({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let reduziert = false;
    try { reduziert = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { /* ignorieren */ }
    if (reduziert || typeof IntersectionObserver === "undefined") return;
    el.setAttribute("data-aus", "");
    const io = new IntersectionObserver((eintraege) => {
      if (eintraege.some((e) => e.isIntersecting)) {
        requestAnimationFrame(() => requestAnimationFrame(() => el.removeAttribute("data-aus")));
        io.disconnect();
      }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className="spc-lichter" aria-hidden="true">{children}</div>;
}
