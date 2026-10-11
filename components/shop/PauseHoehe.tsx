"use client";
import { useEffect, useRef } from "react";

// Misst die echte Hoehe der Pausenleiste (ein-/zweizeilig) und setzt sie als --shop-pause-h auf .shop.
// SSR: kein Inline-Wert, CSS-Fallback (76 px Handy / 60 px Desktop) gilt bis zur Messung.
export default function PauseHoehe() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const bar = ref.current?.closest<HTMLElement>(".shop-pause-bar");
    const shop = bar?.closest<HTMLElement>(".shop");
    if (!bar || !shop) return;
    const setze = () => shop.style.setProperty("--shop-pause-h", `${Math.ceil(bar.getBoundingClientRect().height)}px`);
    setze();
    const ro = new ResizeObserver(setze);
    ro.observe(bar);
    return () => { ro.disconnect(); shop.style.removeProperty("--shop-pause-h"); };
  }, []);
  return <span ref={ref} hidden />;
}
