"use client";
import { useState } from "react";
import { VorschauZusammenfassung } from "./Vorschau";

// Live-Untersetzer: Desktop sticky links (Karte mit Preis und Chips), Handy sticky Mini-Vorschau (einklappbar).
export default function Galerie({ bild, preis, chips = [] }: { bild: React.ReactNode; preis?: string; chips?: string[] }) {
  const [zu, setZu] = useState(false);
  return (
    <div className="shop-gallery" role="region" aria-label="Produktbild und Live-Vorschau" data-zu={zu}>
      <div className="shop-gallery-track" id="shop-vorschau-bild">
        <div>{bild}</div>
      </div>
      <div className="shop-mini">
        <VorschauZusammenfassung />
        <button type="button" className="shop-mini-btn" aria-expanded={!zu} aria-controls="shop-vorschau-bild" onClick={() => setZu(!zu)}>
          {zu ? "Vorschau ausklappen" : "Vorschau einklappen"}
        </button>
      </div>
      {(preis || chips.length > 0) && (
        <div className="shop-gallery-info">
          {preis && <span className="shop-price-small">{preis}</span>}
          {chips.map((c) => <span key={c} className="shop-chipinfo">{c}</span>)}
        </div>
      )}
    </div>
  );
}
