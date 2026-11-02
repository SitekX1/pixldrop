"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Bühne des Weihnachts-Heros: echter Santa (freigestellte Bilder) fliegt von rechts ein, landet und bleibt stehen.
// Phasen (data-phase): "warte" (SSR/ohne Bilder: Gespann unsichtbar) -> "flug" (CSS-Einflug, ca. 3,9 s) -> "idle" (gelandet, ruhig).
// Ohne JS zeigt <noscript> das gelandete Bild; mit prefers-reduced-motion sofort "idle" ohne Bewegung (CSS schaltet Animationen ab).
// Merker "gesehen": sessionStorage (alles in try/catch), Rückfall Modulvariable (Datenschutz-Einordnung § 25 TDDDG: Justus).
// Debug: ?schlitten=0.3 friert die Szene bei 30 % des Einflugs ein (zum Prüfen per Screenshot; danach entfernen oder behalten, dokumentiert).
const KEY = "shop-schlitten-gesehen";
const FLUG_MS = 3900;
let gesehenModul = false;

function leseGesehen(): boolean {
  let s = gesehenModul;
  try { s = s || window.sessionStorage.getItem(KEY) === "1"; } catch { /* gesperrt */ }
  return s;
}
function setzeGesehen() {
  gesehenModul = true;
  try { window.sessionStorage.setItem(KEY, "1"); } catch { /* Privatmodus */ }
}

export default function Landung({ hinten, vorn }: { hinten: React.ReactNode; vorn: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"warte" | "flug" | "idle">("warte");
  const [wiederkehr, setWiederkehr] = useState(false);
  const [ruhe, setRuhe] = useState(false);
  const gesehenBeiStart = useRef<boolean | null>(null); // Merker nur beim ersten Lauf lesen (React Strict Mode führt Effekte in Dev doppelt aus)

  // Start: Merker, Reduced Motion, Bilder abwarten (sonst läuft der Einflug unsichtbar ab)
  useLayoutEffect(() => {
    let reduziert = false;
    try { reduziert = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { /* ignorieren */ }
    if (reduziert) { setPhase("idle"); return; }
    if (gesehenBeiStart.current === null) gesehenBeiStart.current = leseGesehen();
    if (gesehenBeiStart.current) { setWiederkehr(true); setPhase("idle"); return; }
    const imgs = Array.from(ref.current?.querySelectorAll<HTMLImageElement>(".wn-sf, .wn-sg") ?? []);
    let fertig = false;
    const los = () => { if (fertig) return; fertig = true; setzeGesehen(); setPhase("flug"); };
    const offen = imgs.filter((i) => !i.complete);
    if (offen.length === 0) { los(); return; }
    let n = offen.length;
    const einer = () => { if (--n <= 0) los(); };
    offen.forEach((i) => { i.addEventListener("load", einer, { once: true }); i.addEventListener("error", einer, { once: true }); });
    const sicher = window.setTimeout(los, 2500);
    return () => window.clearTimeout(sicher);
  }, []);

  // Flug beenden: nach 3,9 s, bei Tab-Wechsel, per Esc
  useEffect(() => {
    if (phase !== "flug") return;
    const frei = new URLSearchParams(window.location.search).get("schlitten");
    if (frei !== null) {
      const p = Math.min(1, Math.max(0, parseFloat(frei) || 0));
      const id = requestAnimationFrame(() => ref.current?.getAnimations({ subtree: true }).forEach((a) => { a.pause(); a.currentTime = p * FLUG_MS; }));
      return () => cancelAnimationFrame(id);
    }
    const t = window.setTimeout(() => setPhase("idle"), FLUG_MS);
    const sichtbar = () => { if (document.hidden) setPhase("idle"); };
    const taste = (e: KeyboardEvent) => { if (e.key === "Escape") setPhase("idle"); };
    document.addEventListener("visibilitychange", sichtbar);
    document.addEventListener("keydown", taste);
    return () => { window.clearTimeout(t); document.removeEventListener("visibilitychange", sichtbar); document.removeEventListener("keydown", taste); };
  }, [phase]);

  // "Bewegung anhalten" gilt für die ganze Seite (Schnee-Canvas liest data-ruhe am .shop-Wrapper)
  useEffect(() => {
    const shop = ref.current?.closest(".shop");
    if (!shop) return;
    if (ruhe) shop.setAttribute("data-ruhe", "an"); else shop.removeAttribute("data-ruhe");
    return () => shop.removeAttribute("data-ruhe");
  }, [ruhe]);

  const flug = phase === "flug";
  return (
    <div ref={ref} className="wn-buehne" data-phase={phase} data-wiederkehr={wiederkehr ? "ja" : undefined} data-ruhe={ruhe ? "an" : undefined}>
      <div className="wn-bild" aria-hidden="true">
        {hinten}
        <div className="wn-gespann">
          <div className="wn-flug-y">
            <div className="wn-wippen">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="wn-sf" src="/shop/weihnachten/santa-flug.webp" alt="" width={950} height={268} decoding="async" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="wn-sg" src="/shop/weihnachten/santa-gelandet.webp" alt="" width={950} height={268} decoding="async" />
              <span className="wn-nase-glow" />
              <span className="wn-dampf wn-dampf-1" /><span className="wn-dampf wn-dampf-2" /><span className="wn-dampf wn-dampf-3" />
              <span className="wn-fk wn-fk-1" /><span className="wn-fk wn-fk-2" /><span className="wn-fk wn-fk-3" /><span className="wn-fk wn-fk-4" />
            </div>
          </div>
          <div className="wn-aufwirbeln">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="wn-bokeh" src="/shop/weihnachten/bokeh.webp" alt="" width={640} height={349} loading="lazy" decoding="async" />
            {Array.from({ length: 12 }, (_, i) => <i key={i} className="wn-spritz" style={{ "--i": i } as React.CSSProperties} />)}
          </div>
        </div>
        {vorn}
      </div>
      <button
        type="button"
        className="wn-steuer"
        hidden={phase === "warte"}
        aria-pressed={flug ? undefined : ruhe}
        onClick={() => { if (flug) setPhase("idle"); else setRuhe((r) => !r); }}
      >
        {flug ? "Landung überspringen" : ruhe ? "Bewegung starten" : "Bewegung anhalten"}
      </button>
      <noscript><style>{".wn-gespann{opacity:1 !important}.wn-sg{opacity:1 !important}.wn-sf{opacity:0 !important}"}</style></noscript>
    </div>
  );
}
