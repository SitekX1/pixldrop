"use client";
import { useCallback, useEffect, useState, type ComponentType } from "react";
import "./print-intro.css";

// Vollbild-3D-Intro vor der Startseite (PrintIntro, reines three.js). Das Modul wird erst nach der Hydration per import()
// geladen (Fehler werden abgefangen, nie ein Error-Boundary). Nicht gezeigt bei prefers-reduced-motion und nach einmaligem
// Ansehen pro Sitzung (sessionStorage in try/catch). Ablauf: init -> laden -> an (Seite gesperrt) -> ende (Hinweis, Scrollen frei)
// -> weg (Ausblenden) -> aus. Eine Abdeckung in Wandfarbe verhindert, dass die Startseite vorher aufblitzt; ein Inline-Skript
// entfernt sie vor dem ersten Paint, wenn das Intro nicht läuft; ein CSS-Timeout (5 s) räumt sie im Notfall ab.
const KEY = "shop-intro-gesehen-v1";
const SKRIPT =
  "try{var c=document.getElementById('pi-cover');if(c&&(matchMedia('(prefers-reduced-motion: reduce)').matches||sessionStorage.getItem('" +
  KEY + "')==='1'))c.setAttribute('data-aus','1')}catch(e){}";

type Phase = "init" | "laden" | "an" | "ende" | "weg" | "aus";
type IntroProps = { onEnde?: () => void; onFehler?: () => void; onSkip?: () => void };

export default function HeroIntro() {
  const [phase, setPhase] = useState<Phase>("init");
  const [Intro, setIntro] = useState<ComponentType<IntroProps> | null>(null);

  const fertig = useCallback(() => {
    try { window.sessionStorage.setItem(KEY, "1"); } catch { /* gesperrt */ }
    setPhase((p) => (p === "aus" || p === "weg" ? p : "weg"));
  }, []);
  const abbruch = useCallback(() => setPhase("aus"), []);

  // Entscheidung nach der Hydration
  useEffect(() => {
    let reduziert = false, gesehen = false, debug = false;
    try { reduziert = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { /* ignorieren */ }
    try { gesehen = window.sessionStorage.getItem(KEY) === "1"; } catch { /* gesperrt */ }
    // Debug nur in der Entwicklung: ?introT=<Sekunden> zeigt das Intro immer und friert es ein
    if (process.env.NODE_ENV !== "production") debug = new URLSearchParams(window.location.search).has("introT");
    if (reduziert || (gesehen && !debug)) { setPhase("aus"); return; }
    setPhase("laden");
    let tot = false;
    const notfall = window.setTimeout(() => { if (!tot) setPhase("aus"); }, 4500);
    import("./PrintIntro")
      .then((m) => { if (tot) return; window.clearTimeout(notfall); setIntro(() => m.default); setPhase("an"); })
      .catch(() => { window.clearTimeout(notfall); if (!tot) setPhase("aus"); });
    return () => { tot = true; window.clearTimeout(notfall); };
  }, []);

  // Seite während des Intros nicht scrollbar
  useEffect(() => {
    if (phase !== "an") return;
    const h = document.documentElement, b = document.body;
    const alt = [h.style.overflow, b.style.overflow];
    h.style.overflow = "hidden"; b.style.overflow = "hidden";
    return () => { h.style.overflow = alt[0]; b.style.overflow = alt[1]; };
  }, [phase]);

  // Escape überspringt; im Endzustand blendet jede Scroll-/Tasten-Geste das Intro aus
  useEffect(() => {
    if (phase !== "an" && phase !== "ende") return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") fertig(); };
    window.addEventListener("keydown", esc);
    if (phase !== "ende") return () => window.removeEventListener("keydown", esc);
    const gesten = ["wheel", "touchmove", "scroll"] as const;
    const los = () => fertig();
    const keys = (e: KeyboardEvent) => { if (["ArrowDown", "PageDown", " ", "End", "Enter"].includes(e.key)) fertig(); };
    gesten.forEach((g) => window.addEventListener(g, los, { passive: true }));
    window.addEventListener("keydown", keys);
    const auto = new URLSearchParams(window.location.search).has("introT") ? 0 : window.setTimeout(fertig, 6000);
    return () => {
      window.removeEventListener("keydown", esc);
      window.removeEventListener("keydown", keys);
      gesten.forEach((g) => window.removeEventListener(g, los));
      if (auto) window.clearTimeout(auto);
    };
  }, [phase, fertig]);

  useEffect(() => {
    if (phase !== "weg") return;
    const t = window.setTimeout(() => setPhase("aus"), 450);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (phase === "aus") return null;
  if (phase === "init" || phase === "laden" || !Intro) {
    return (
      <>
        <div id="pi-cover" className="pi-cover" aria-hidden="true" suppressHydrationWarning />
        <script dangerouslySetInnerHTML={{ __html: SKRIPT }} />
        <noscript><style>{".pi-cover{display:none}"}</style></noscript>
      </>
    );
  }
  return (
    <div className="pi-overlay" data-phase={phase} role="presentation">
      <Intro onEnde={() => setPhase((p) => (p === "an" ? "ende" : p))} onFehler={abbruch} onSkip={fertig} />
    </div>
  );
}
