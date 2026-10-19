"use client";
import { useId } from "react";
import type { VorschauWerte } from "./Vorschau";
import { RundText, textfarbeFuer } from "./ProductImage";
import { FLAECHE_UNTERSETZER } from "@/lib/shop/umbruch";

// Lage des vorderen Untersetzers im Foto (public/shop/fotos/spruch-untersetzer/3.webp, gestaltetes Bild "stehend", Koordinaten im 1100-px-Bild):
// Mittelpunkt und Achsen der Ellipse (der Untersetzer steht schräg, die Fläche ist eine gekippte Ellipse), aus der Maske 3.m.webp angepasst.
const CX = 536.2, CY = 659.6, BR = 340.2, HO = 445.1, WINKEL = 22 * Math.PI / 180; // Breiten-/Höhenachse (volle Länge) und Drehung
const R_EINHEIT = 35; // in der 100er-Zeichnung (ProductImage) hat der Untersetzer den Radius 35, FLAECHE_RUND bezieht sich darauf
// Affine Abbildung der 100er-Zeichnung auf die Ellipse: Einheitsvektoren der beiden Achsen
const AX = (BR / 2) * Math.cos(WINKEL) / R_EINHEIT, AY = (BR / 2) * Math.sin(WINKEL) / R_EINHEIT;
const BX = -(HO / 2) * Math.sin(WINKEL) / R_EINHEIT, BY = (HO / 2) * Math.cos(WINKEL) / R_EINHEIT;

/** Legt den Wunschtext des Kunden (Schrift, Farbe, Format wie in der Live-Vorschau) mittig auf das Foto des Untersetzers. */
export default function UntersetzerAufdruck({ w }: { w: VorschauWerte }) {
  const schrift = w.textfarbe ?? textfarbeFuer(w.farbe ?? "#1c1c1c");
  const text = (w.text ?? "").trim();
  const clipId = `${useId().replace(/:/g, "")}-clip`;
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {text !== "" && (
        <svg viewBox="0 0 1100 1100" width="100%" height="100%" style={{ display: "block" }}>
          {/* zu langer Text wird an der Untersetzerkante abgeschnitten (die Passt-Prüfung meldet ihn trotzdem) */}
          <g transform={`translate(${CX} ${CY}) matrix(${AX} ${AY} ${BX} ${BY} 0 0) translate(-50 -50)`}>
            <defs><clipPath id={clipId}><circle cx={50} cy={50} r={R_EINHEIT * 0.92} /></clipPath></defs>
            <g clipPath={`url(#${clipId})`}><RundText text={text} family={w.family} format={w.format} tc={schrift} flaeche={FLAECHE_UNTERSETZER} /></g>
          </g>
        </svg>
      )}
    </div>
  );
}
