"use client";
import type { VorschauWerte } from "./Vorschau";
import { RundText, textfarbeFuer } from "./ProductImage";
import { FLAECHE_BECHER } from "@/lib/shop/umbruch";

// Mitte des Namensfelds im Foto (public/shop/fotos/stiftebecher-tasse/1.webp, 1100-px-Bild).
// Maßstab: Außen-Ø 85 mm entspricht im Foto ca. 513 px (Becherrand oben) = ca. 6 px je mm; Einheit der Textfläche (FLAECHE_BECHER) = 1 mm.
const CX = 551, CY = 601, PX_JE_MM = 6;
// Sichtbare Grenze: Namensfeld im Foto (ca. 262 x 135 px = 44 x 22,5 mm); langer Text wird hier abgeschnitten (die Passt-Prüfung meldet ihn trotzdem).
const FELD_B = 44, FELD_H = 22.5;

/** Legt den Wunschtext des Kunden (Schrift, Farbe, Fett/Kursiv, Größe wie in der Passt-Prüfung) in das Namensfeld des Becher-Fotos. */
export default function BecherAufdruck({ w }: { w: VorschauWerte }) {
  const schrift = w.textfarbe ?? textfarbeFuer(w.farbe ?? "#1c1c1c");
  const text = (w.text ?? "").trim();
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {text !== "" && (
        <svg viewBox="0 0 1100 1100" width="100%" height="100%" style={{ display: "block" }}>
          <defs><clipPath id="becher-feld"><rect x={50 - FELD_B / 2} y={50 - FELD_H / 2} width={FELD_B} height={FELD_H} /></clipPath></defs>
          <g transform={`translate(${CX} ${CY}) scale(${PX_JE_MM}) translate(-50 -50)`}>
            <g clipPath="url(#becher-feld)">
              <RundText text={text} family={w.family} format={w.format} tc={schrift} flaeche={FLAECHE_BECHER} />
            </g>
          </g>
        </svg>
      )}
    </div>
  );
}
