"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

// Platz für das Intro im Hero der Startseite (PrintIntro, Props className/onDone). Per dynamischem Import geladen (ssr: false),
// startet erst nach der Hydration, blockiert also keinen Inhalt. Bei prefers-reduced-motion und nach einmaligem Ansehen
// pro Sitzung (sessionStorage, in try/catch) erscheint es nicht; nach onDone blendet es aus und wird entfernt.
// Das Intro enthält eine eigene Überschrift: der Slot ist für Screenreader ausgeblendet (die Seite hat ihre eigene h1).
const PrintIntro = dynamic(() => import("./PrintIntro"), { ssr: false });
const KEY = "shop-intro-gesehen-v1";

export default function HeroIntro() {
  const [phase, setPhase] = useState<"aus" | "an" | "weg">("aus");
  useEffect(() => {
    let reduziert = false;
    let gesehen = false;
    try { reduziert = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { /* ignorieren */ }
    try { gesehen = window.sessionStorage.getItem(KEY) === "1"; } catch { /* gesperrt */ }
    if (!reduziert && !gesehen) setPhase("an");
  }, []);
  const fertig = useCallback(() => {
    try { window.sessionStorage.setItem(KEY, "1"); } catch { /* gesperrt */ }
    setPhase("weg");
  }, []);
  // Zum Überspringen: Tippen oder Escape
  useEffect(() => {
    if (phase !== "an") return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") fertig(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [phase, fertig]);
  useEffect(() => {
    if (phase !== "weg") return;
    const t = window.setTimeout(() => setPhase("aus"), 320); // nach dem Ausblenden (CSS 240 ms) entfernen
    return () => window.clearTimeout(t);
  }, [phase]);
  if (phase === "aus") return null;
  return (
    <div className="sx-intro" data-phase={phase} aria-hidden="true" onClick={fertig}>
      <PrintIntro className="sx-intro-in" onDone={fertig} />
    </div>
  );
}
