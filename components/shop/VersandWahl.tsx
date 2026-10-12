"use client";
import type { VersandOption, VersandArt } from "@/lib/shop/versand";
import { formatPreis } from "@/lib/shop/config";

const KURZTEXT: Record<VersandArt, string> = {
  hermes: "mit Sendungsverfolgung",
  dhl: "mit Sendungsverfolgung",
  brief: "ohne Sendungsverfolgung",
};

// Versandart im Warenkorb: Radiokarten (Hermes/DHL), bei Brief nur eine feste Zeile ohne Auswahl.
export default function VersandWahl({ optionen, gewaehlt, onWahl, fehler }: { optionen: VersandOption[]; gewaehlt: VersandArt | null; onWahl: (a: VersandArt) => void; fehler?: string }) {
  if (optionen.length === 0) return null;
  if (optionen.length === 1) {
    const o = optionen[0];
    return (
      <div className="shop-versand-fest">
        <strong>Versand als Brief (Deutsche Post)</strong>
        <span className="muted">{o.label}, {formatPreis(o.cent)}, {KURZTEXT.brief}</span>
      </div>
    );
  }
  return (
    <fieldset className="shop-versand" aria-describedby={fehler ? "versand-fehler" : undefined}>
      <legend>{gewaehlt ? "Versand" : "Versand: bitte wählen"} <span className="opt">(Pflichtangabe)</span></legend>
      {fehler && <p id="versand-fehler" className="shop-alert" role="alert">{fehler}</p>}
      <div className="shop-kombis">
        {optionen.map((o) => (
          <label key={o.art} className="shop-kombi">
            <input type="radio" name="versandart" value={o.art} checked={gewaehlt === o.art} onChange={() => onWahl(o.art)} />
            <span className="shop-kombi-karte shop-versand-karte">
              <span className="shop-versand-text">
                <span className="shop-kombi-label">{o.label}</span>
                <span className="muted">{KURZTEXT[o.art]}</span>
              </span>
              <span className="shop-versand-preis">{formatPreis(o.cent)}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
