"use client";
import { useEffect, useRef, useState } from "react";
import { liveIdx, MIT_AUFDRUCK, ORIGINALFARBE, ORIGINAL_ABSTAND, ORIGINAL_LINIE, darfUmfaerben, UMFAERBEN } from "@/lib/shop/fotos";
import { umfaerben, zielFarben, type UmfaerbModus } from "@/lib/shop/umfaerben";
import { teelichtFaerben } from "./teelichtFaerben";
import { farbAbstand, vorbereiteFoto } from "./fotoFaerben";
import type { VorschauWerte } from "./Vorschau";
import NamensschildAufdruck from "./NamensschildAufdruck";
import UntersetzerAufdruck from "./UntersetzerAufdruck";
import BecherAufdruck from "./BecherAufdruck";

const GROESSE = 192; // kleine Auflösung genügt für die Miniatur (Handy-Speicher: ca. 0,5 MB je Foto)
const CACHE_MAX = 8;

/** Umfärbemodus von Foto 1: Namensschild/Untersetzer/Becher haben eigene Modi, sonst der Modus des Artikels. */
export function miniaturModus(slug: string, fotoNr: number): UmfaerbModus | undefined {
  if (!darfUmfaerben(slug, fotoNr)) return undefined;
  return slug === "namensschild" ? "becher" : UMFAERBEN[slug];
}

/** Foto der Warenkorb-/Bon-Position in der gewählten Farbe (kleine Auflösung), bei Wunschtext-Artikeln mit Aufdruck wie in der Galerie. */
export default function FotoMiniatur({ slug, src, alt, w, fotoNr = liveIdx(slug) }: { slug: string; src: string; alt: string; w: VorschauWerte & { linienfarbe?: string }; fotoNr?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const modus = miniaturModus(slug, fotoNr);
  const orig = ORIGINALFARBE[slug];
  const original = !!orig && !!w.farbe && farbAbstand(w.farbe, orig) < ORIGINAL_ABSTAND && (!ORIGINAL_LINIE[slug] || (!!w.linienfarbe && farbAbstand(w.linienfarbe, ORIGINAL_LINIE[slug]) < ORIGINAL_ABSTAND));
  const aktiv = !!modus && !original && (!!w.farbe || !!w.farben);
  const [fertig, setFertig] = useState<string | null>(null);
  const schluessel = `${w.farbe}|${w.textfarbe}|${w.linienfarbe}|${(w.farben ?? []).join()}`;
  useEffect(() => {
    let abgebrochen = false;
    if (!aktiv || !modus) { setFertig(null); return; }
    vorbereiteFoto(src, modus, GROESSE, CACHE_MAX).then((v) => {
      const c = canvas.current;
      if (abgebrochen || !v || !c) return;
      const ziele = zielFarben(modus, { farbe: w.farbe, farben: w.farben, textfarbe: w.textfarbe, linienfarbe: w.linienfarbe });
      if (ziele.every((z) => z === null)) { setFertig(null); return; }
      const ctx = c.getContext("2d");
      if (!ctx) return;
      const bild = ctx.createImageData(v.w, v.h);
      if (slug === "kuerbis-teelichthalter" && modus === "farbe") teelichtFaerben(v, ziele[0] ?? null, bild.data); else umfaerben(v, ziele, bild.data);
      ctx.putImageData(bild, 0, 0);
      setFertig(src);
    });
    return () => { abgebrochen = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktiv, src, modus, schluessel]);
  const zeigeCanvas = aktiv && fertig === src;
  return (
    <div className="shop-img" role="img" aria-label={alt}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="shop-foto" src={src} alt="" width={1100} height={1100} loading="lazy" decoding="async" style={zeigeCanvas ? { visibility: "hidden" } : undefined} />
      {aktiv && <canvas ref={canvas} className="shop-foto" width={GROESSE} height={GROESSE} aria-hidden="true" style={zeigeCanvas ? undefined : { visibility: "hidden" }} />}
      {fotoNr === liveIdx(slug) && MIT_AUFDRUCK.includes(slug) && (slug === "namensschild" ? <NamensschildAufdruck w={w} /> : slug === "stiftebecher-tasse" ? <BecherAufdruck w={w} /> : <UntersetzerAufdruck w={w} />)}
    </div>
  );
}
