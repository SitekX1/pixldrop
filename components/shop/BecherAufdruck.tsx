"use client";
import type { VorschauWerte } from "./Vorschau";
import { RundText, textfarbeFuer } from "./ProductImage";
import { FLAECHE_BECHER } from "@/lib/shop/umbruch";

// Mitte des Namensfelds im Foto (public/shop/fotos/stiftebecher-tasse/1.webp, 1100-px-Bild); das Feld ist ca. 260 x 135 px groß.
// 1 Einheit der Textfläche (FLAECHE_BECHER) = 5 px im Foto.
const CX = 551, CY = 601, PX_JE_EINHEIT = 5;

/** Legt den Wunschtext des Kunden (Schrift, Farbe, Fett/Kursiv, Größe wie in der Passt-Prüfung) in das Namensfeld des Becher-Fotos. */
export default function BecherAufdruck({ w }: { w: VorschauWerte }) {
  const schrift = w.textfarbe ?? textfarbeFuer(w.farbe ?? "#1c1c1c");
  const text = (w.text ?? "").trim();
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {text !== "" && (
        <svg viewBox="0 0 1100 1100" width="100%" height="100%" style={{ display: "block" }}>
          <g transform={`translate(${CX} ${CY}) scale(${PX_JE_EINHEIT}) translate(-50 -50)`}>
            <RundText text={text} family={w.family} format={w.format} tc={schrift} flaeche={FLAECHE_BECHER} />
          </g>
        </svg>
      )}
    </div>
  );
}
