"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Steuerung der Hero-Szene "Landung" (Phasen, Skip, Pause). Das Markup (Himmel, Schlitten, Hügel) kommt als children vom Server.
// Ohne JS und mit prefers-reduced-motion zeigt das CSS (weihnachten.css) den gelandeten Endzustand bzw. spielt den Einflug rein per CSS.
// data-phase: "flug" (SSR-Standard, CSS spielt den Einflug) | "idle" (gelandet, ruhiges Dauerbild).
// Merker "gesehen": sessionStorage (alles in try/catch), Rückfall Modulvariable. Datenschutz-Einordnung (§ 25 TDDDG): Justus.
const KEY = "shop-schlitten-gesehen";
const FLUG_MS = 3900;
let gesehenModul = false;

function leseGesehen(): boolean {
  let s = gesehenModul;
  try { s = s || window.sessionStorage.getItem(KEY) === "1"; } catch { /* Speicher gesperrt */ }
  return s;
}
function setzeGesehen() {
  gesehenModul = true;
  try { window.sessionStorage.setItem(KEY, "1"); } catch { /* Privatmodus: nur Modulvariable */ }
}

export default function Schlitten({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"flug" | "idle">("flug");
  const [wiederkehr, setWiederkehr] = useState(false);
  const [ruhe, setRuhe] = useState(false);
  const [bereit, setBereit] = useState(false);

  useLayoutEffect(() => {
    let reduziert = false;
    try { reduziert = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { /* ignorieren */ }
    if (reduziert) { setPhase("idle"); return; }
    if (leseGesehen()) { setWiederkehr(true); setPhase("idle"); setBereit(true); return; }
    setzeGesehen();
    setBereit(true);
  }, []);

  // Flugphase beenden: nach der Landung (Zeit seit Seitenstart), bei Tab-Wechsel sofort, per Esc.
  useEffect(() => {
    if (phase !== "flug") return;
    const rest = Math.max(400, FLUG_MS - (typeof performance !== "undefined" ? performance.now() : 0));
    const t = window.setTimeout(() => setPhase("idle"), rest);
    const sichtbar = () => { if (document.hidden) setPhase("idle"); };
    const taste = (e: KeyboardEvent) => { if (e.key === "Escape") setPhase("idle"); };
    document.addEventListener("visibilitychange", sichtbar);
    document.addEventListener("keydown", taste);
    return () => { window.clearTimeout(t); document.removeEventListener("visibilitychange", sichtbar); document.removeEventListener("keydown", taste); };
  }, [phase]);

  // "Bewegung anhalten" gilt für die ganze Seite (Schnee liegt außerhalb der Szene): Attribut am .shop-Wrapper.
  useEffect(() => {
    const shop = ref.current?.closest(".shop");
    if (!shop) return;
    if (ruhe) shop.setAttribute("data-ruhe", "an"); else shop.removeAttribute("data-ruhe");
    return () => shop.removeAttribute("data-ruhe");
  }, [ruhe]);

  const flug = phase === "flug";
  return (
    <div ref={ref} className="wn-band" data-phase={phase} data-wiederkehr={wiederkehr ? "ja" : undefined} data-ruhe={ruhe ? "an" : undefined}>
      {children}
      <button
        type="button"
        className="wn-steuer"
        hidden={!bereit}
        aria-pressed={flug ? undefined : ruhe}
        onClick={() => { if (flug) setPhase("idle"); else setRuhe((r) => !r); }}
      >
        {flug ? "Landung überspringen" : ruhe ? "Bewegung starten" : "Bewegung anhalten"}
      </button>
    </div>
  );
}
