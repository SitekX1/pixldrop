"use client";
import { useId, useRef, useState } from "react";
import { SCHRIFTEN } from "@/lib/shop/schriften";
import { TEXTE } from "@/lib/shop/config";

/** Ausklappbare Schriftwahl: eingeklappt die gewählte Schrift (Name + Vorschau mit dem eigenen Text), ausgeklappt das Raster. Nach der Wahl klappt sie zu. */
export default function SchriftWahl({ legend, schriftId, onChange, beispiel, radioName, hinweis = true }: {
  legend: string; schriftId: string; onChange: (id: string) => void; beispiel: string; radioName: string; hinweis?: boolean;
}) {
  const [offen, setOffen] = useState(false);
  const knopf = useRef<HTMLButtonElement>(null);
  const bereich = useId();
  const aktuell = SCHRIFTEN.find((s) => s.id === schriftId);
  return (
    <div className="shop-step shop-schriften">
      <div className="shop-schrift-kopf">
        <span className="shop-schriften-titel" id={`${bereich}-t`}>{legend}</span>
        <div className="shop-schrift-aktuell">
          <span className="shop-schrift-bsp" style={{ fontFamily: aktuell?.family }} aria-hidden="true">{beispiel}</span>
          <span className="shop-schrift-name">{aktuell?.name}</span>
        </div>
        <button ref={knopf} type="button" className="shop-btn shop-btn--small shop-btn--ghost" aria-expanded={offen} aria-controls={bereich} onClick={() => setOffen(!offen)}>
          {offen ? "Schließen" : "Schrift ändern"}
        </button>
      </div>
      {offen && (
        <fieldset id={bereich} className="shop-schriften-feld" aria-labelledby={`${bereich}-t`} style={{ border: 0, padding: 0, margin: "10px 0 0" }}>
          <div className="shop-schriften-raster">
            {SCHRIFTEN.map((sf) => (
              <label key={sf.id} className="shop-schrift">
                <input type="radio" name={radioName} value={sf.id} checked={schriftId === sf.id}
                  onChange={() => { onChange(sf.id); setOffen(false); requestAnimationFrame(() => knopf.current?.focus()); }} />
                <span className="shop-schrift-bsp" style={{ fontFamily: sf.family }} aria-hidden="true">{beispiel}</span>
                <span className="shop-schrift-name">{sf.name}{sf.fehlendeZeichen.includes("ä") || sf.fehlendeZeichen.includes("ß") ? <small className="shop-schrift-ohne"> · {sf.fehlendeZeichen.includes("ä") ? "ohne Umlaute" : "ohne ß"}</small> : null}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {hinweis && <p className="muted shop-schrifthinweis" style={{ margin: "8px 0 0" }}>{TEXTE.schriftHinweis}</p>}
    </div>
  );
}
