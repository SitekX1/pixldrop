"use client";
import { useRef, useState } from "react";

// Scroll-Snap-Galerie: Bild + Platz für den späteren 3D-Viewer (Three.js, per dynamic import nach Tipp).
export default function Galerie({ bild }: { bild: React.ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const [aktiv, setAktiv] = useState(0);
  const gehe = (i: number) => {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    setAktiv(i);
  };
  return (
    <div className="shop-gallery" role="region" aria-roledescription="Galerie" aria-label="Produktbilder">
      <div
        className="shop-gallery-track"
        ref={track}
        onScroll={(e) => {
          const el = e.currentTarget;
          setAktiv(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        <div>{bild}</div>
        <div data-viewer>
          <div className="shop-viewer">
            <strong>3D-Vorschau folgt</strong>
            <p className="muted">Hier lässt sich das Stück später drehen, mit deiner Farbe und deinem Text.</p>
            <button type="button" className="shop-btn shop-btn--small" disabled>3D ansehen</button>
          </div>
        </div>
      </div>
      <div className="shop-gallery-nav">
        {["Produktbild", "3D-Vorschau"].map((l, i) => (
          <button key={l} type="button" aria-label={`${l} anzeigen`} aria-current={aktiv === i} onClick={() => gehe(i)}>
            <i />
          </button>
        ))}
      </div>
    </div>
  );
}
