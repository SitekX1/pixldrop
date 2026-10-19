"use client";
import { useId } from "react";
import type { VorschauWerte } from "./Vorschau";
import { RundText, textfarbeFuer } from "./ProductImage";
import { FLAECHE_BECHER } from "@/lib/shop/umbruch";

// Mitte des Namensfelds im Foto (public/shop/fotos/stiftebecher-tasse/8.webp, Frontsicht mit leerem Feld, 1100-px-Bild).
// Maßstab: das Namensfeld (ca. 145 x 87 px im Foto) entspricht der Textfläche von 44 x 26 mm, also ca. 3,3 px je mm; Einheit der Textfläche (FLAECHE_BECHER) = 1 mm.
const CX = 388, CY = 622, PX_JE_MM = 3.3;
// Sichtbare Grenze: Namensfeld im Foto; langer Text wird hier abgeschnitten (die Passt-Prüfung meldet ihn trotzdem).
const FELD_B = 44, FELD_H = 26;

/** Legt den Wunschtext des Kunden (Schrift, Farbe, Fett/Kursiv, Größe wie in der Passt-Prüfung) in das Namensfeld des Becher-Fotos. */
export default function BecherAufdruck({ w }: { w: VorschauWerte }) {
  const schrift = w.textfarbe ?? textfarbeFuer(w.farbe ?? "#1c1c1c");
  const text = (w.text ?? "").trim();
  const clipId = `${useId().replace(/:/g, "")}-clip`;
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {text !== "" && (
        <svg viewBox="0 0 1100 1100" width="100%" height="100%" style={{ display: "block" }}>
          <defs><clipPath id={clipId}><rect x={50 - FELD_B / 2} y={50 - FELD_H / 2} width={FELD_B} height={FELD_H} /></clipPath></defs>
          <g transform={`translate(${CX} ${CY}) scale(${PX_JE_MM}) translate(-50 -50)`}>
            <g clipPath={`url(#${clipId})`}>
              <RundText text={text} family={w.family} format={w.format} tc={schrift} flaeche={FLAECHE_BECHER} />
            </g>
          </g>
        </svg>
      )}
    </div>
  );
}
