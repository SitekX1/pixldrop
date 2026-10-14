"use client";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import NamensschildSvg from "./NamensschildSvg";
import { homographie, matrix3d, type Punkt } from "@/lib/shop/homographie";
import { NS_UMRISS } from "@/lib/shop/namensschild";
import type { VorschauWerte } from "./Vorschau";
import { textfarbeFuer } from "./ProductImage";

// Ecken der Platte im Blanko-Foto (public/shop/fotos/namensschild/1.webp, Koordinaten im 1100-px-Bild),
// ausgemessen: links oben, rechts oben, links unten, rechts unten (dort sitzt der Ständer).
const FOTO: Punkt[] = [[174, 394.6], [915, 395], [141.5, 593], [909, 591]];
// Dieselben Ecken im Schildmaß (mm, y nach unten wie in NamensschildSvg): Umriss [[0,0],[12,48],[186,48],[196.5,34],[188,0]]
const SCHILD: Punkt[] = [[NS_UMRISS[1][0], 0], [NS_UMRISS[2][0], 0], [NS_UMRISS[0][0], 48], [NS_UMRISS[4][0], 48]];
const H = homographie(SCHILD, FOTO);
const BREITE = 196.5, HOEHE = 48;

/** Legt Name und Titel des Kunden (Schrift, Farbe, Format wie in der Live-Vorschau) perspektivisch auf das Blanko-Foto. */
export default function NamensschildAufdruck({ w }: { w: VorschauWerte }) {
  const box = useRef<HTMLDivElement>(null);
  const [breite, setBreite] = useState(0);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const messen = () => setBreite(el.getBoundingClientRect().width);
    messen();
    const ro = new ResizeObserver(messen);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [name, titel] = useMemo(() => (w.text ?? "Eddie Pixldrop\nContent Creator").split("\n"), [w.text]);
  const fm = w.format?.fmt;
  const schrift = w.textfarbe ?? textfarbeFuer(w.farbe ?? "#1c1c1c");
  return (
    <div ref={box} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {breite > 0 && (
        <div style={{ position: "absolute", left: 0, top: 0, width: BREITE, height: HOEHE, transformOrigin: "0 0", transform: matrix3d(H, breite / 1100) }}>
          <svg viewBox={`0 0 ${BREITE} ${HOEHE}`} width={BREITE} height={HOEHE} style={{ overflow: "visible", display: "block" }}>
            <NamensschildSvg
              nurSchrift
              name={name ?? ""} titel={titel ?? ""} schriftId={w.format?.schriftId ?? "montserrat"} family={w.family ?? "sans-serif"}
              platte={w.farbe ?? "#1c1c1c"} schrift={schrift} breiteEm={w.format?.breite ?? 0.6}
              fmtName={{ fett: fm?.fett[0] === true, kursiv: fm?.kursiv[0] === true }}
              fmtTitel={{ fett: fm?.fett[1] === true, kursiv: fm?.kursiv[1] === true }}
            />
          </svg>
        </div>
      )}
    </div>
  );
}
