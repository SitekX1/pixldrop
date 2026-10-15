"use client";
import type { VorschauWerte } from "./Vorschau";
import { RundText, textfarbeFuer } from "./ProductImage";
import { FLAECHE_UNTERSETZER } from "@/lib/shop/umbruch";

// Lage des Untersetzers im Foto (public/shop/fotos/spruch-untersetzer/1.webp, Koordinaten im 1100-px-Bild): Mittelpunkt und
// Halbachsen der Ellipse (das Foto ist leicht von schräg oben aufgenommen, daher etwas flacher als breit), aus der Maske 1.m.webp gemessen.
const CX = 551.5, CY = 551, RX = 396.5, RY = 365;
const R_EINHEIT = 35; // in der 100er-Zeichnung (ProductImage) hat der Untersetzer den Radius 35, FLAECHE_RUND bezieht sich darauf

/** Legt den Wunschtext des Kunden (Schrift, Farbe, Format wie in der Live-Vorschau) mittig auf das Foto des Untersetzers. */
export default function UntersetzerAufdruck({ w }: { w: VorschauWerte }) {
  const schrift = w.textfarbe ?? textfarbeFuer(w.farbe ?? "#1c1c1c");
  const text = (w.text ?? "").trim();
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {text !== "" && (
        <svg viewBox="0 0 1100 1100" width="100%" height="100%" style={{ display: "block" }}>
          <g transform={`translate(${CX} ${CY}) scale(${RX / R_EINHEIT} ${RY / R_EINHEIT}) translate(-50 -50)`}>
            <RundText text={text} family={w.family} format={w.format} tc={schrift} flaeche={FLAECHE_UNTERSETZER} />
          </g>
        </svg>
      )}
    </div>
  );
}
