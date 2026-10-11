"use client";
import { useState } from "react";
import { MiniKaufKnopf, VorschauZusammenfassung } from "./Vorschau";

// Live-Untersetzer: Desktop sticky links (Karte mit Preis und Chips), Handy sticky Mini-Vorschau (einklappbar).
export default function Galerie({ bild, preis, chips = [] }: { bild: React.ReactNode; preis?: string; chips?: string[] }) {
  const [gross, setGross] = useState(false);
  return (
    <div className="shop-gallery" role="region" aria-label="Produktbild und Live-Vorschau" data-gross={gross}>
      <div className="shop-gallery-track" id="shop-vorschau-bild">
        <div>{bild}</div>
      </div>
      <div className="shop-mini">
        <VorschauZusammenfassung />
        <MiniKaufKnopf />
        <button type="button" className="shop-mini-btn" aria-expanded={gross} aria-controls="shop-vorschau-bild" aria-label={gross ? "Große Vorschau einklappen" : "Große Vorschau ausklappen"} onClick={() => setGross(!gross)}>
          <span aria-hidden="true">{gross ? "▴" : "▾"}</span>
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
