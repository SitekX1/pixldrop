"use client";
import { useEffect, useRef, useState } from "react";
import type { Form } from "@/lib/shop/produkte";
import { TAG_FOTO, UMFAERBEN, type Foto } from "@/lib/shop/fotos";
import { bereiten, umfaerben, zielFarben, type UmfaerbModus, type Vorbereitet } from "@/lib/shop/umfaerben";
import { LiveProductImage, useVorschauWerte } from "./Vorschau";

const GROESSE = 720; // Arbeitsauflösung des Umfärbens (Anzeige ca. 480 CSS-Pixel)
const cache = new Map<string, Promise<Vorbereitet | null>>();

function ladeBild(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, fehler) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fehler; i.src = src; });
}
function pixel(i: HTMLImageElement) {
  const c = document.createElement("canvas"); c.width = c.height = GROESSE;
  const x = c.getContext("2d", { willReadFrequently: true });
  if (!x) throw new Error("kein Canvas");
  x.drawImage(i, 0, 0, GROESSE, GROESSE);
  return x.getImageData(0, 0, GROESSE, GROESSE).data;
}
/** Foto + Maske laden und für das Umfärben vorbereiten (einmal je Foto, danach aus dem Cache). */
function vorbereiten(src: string, modus: UmfaerbModus): Promise<Vorbereitet | null> {
  const key = `${modus}|${src}`;
  let p = cache.get(key);
  if (!p) {
    p = Promise.all([ladeBild(src), ladeBild(src.replace(/\.webp$/, ".m.webp"))])
      .then(([f, m]) => bereiten(modus, pixel(f), pixel(m), GROESSE, GROESSE))
      .catch(() => null);
    cache.set(key, p);
  }
  return p;
}

// Galerie-Hauptbild: echte Fotos als Blättergalerie, dazu die Live-Vorschau ("Deine Wahl").
// Ändert der Kunde die Farbe, wird das Foto in dieser Farbe gezeigt (Licht und Struktur bleiben).
// Ändert er den Wunschtext, springt die Anzeige auf die Live-Vorschau (Text lässt sich nicht ins Foto setzen).
export default function FotoGalerie({ slug, form, grundfarbe, fotos, name }: { slug: string; form: Form; grundfarbe: string; fotos: Foto[]; name: string }) {
  const w = useVorschauWerte();
  const modus = UMFAERBEN[slug];
  const [idx, setIdx] = useState(0); // -1 = Live-Vorschau
  const canvas = useRef<HTMLCanvasElement>(null);
  const [gefaerbt, setGefaerbt] = useState(false); // Canvas zeigt gerade das umgefärbte Foto

  // Der Standardtext (z. B. "Eddie Pixldrop") zählt nicht: erst eine Änderung durch den Kunden schaltet um.
  const startText = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!w.text) return;
    if (startText.current === undefined) { startText.current = w.text; return; }
    if (w.text !== startText.current) setIdx(-1);
  }, [w.text]);

  // Einzel-Untersetzer: gewählter Wochentag zeigt das passende Foto.
  useEffect(() => {
    if (slug !== "wochentags-untersetzer-einzeln" || !w.tag) return;
    const i = TAG_FOTO[w.tag];
    if (i !== undefined && i < fotos.length) setIdx(i);
  }, [slug, w.tag, fotos.length]);

  // Farbwahl: Das Foto zeigt zuerst das echte Stück; erst wenn der Kunde die Farbe ändert, wird umgefärbt.
  const farbKey = modus === "kombi" ? (w.farben ?? []).join() : modus === "schild" ? `${w.farbe ?? ""}|${w.textfarbe ?? ""}` : (w.farbe ?? "");
  const startFarbe = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (startFarbe.current === undefined && farbKey.replace(/\|/g, "")) startFarbe.current = farbKey;
  }, [farbKey]);
  const aktiv = !!modus && startFarbe.current !== undefined && farbKey !== startFarbe.current;

  const foto = idx >= 0 ? fotos[idx] : null;
  const fotoSrc = foto?.src;
  const farbeSchluessel = `${w.farbe}|${w.textfarbe}|${(w.farben ?? []).join()}`;
  useEffect(() => {
    let abgebrochen = false;
    if (!aktiv || !fotoSrc || !modus) { setGefaerbt(false); return; }
    vorbereiten(fotoSrc, modus).then((v) => {
      const c = canvas.current;
      if (abgebrochen || !v || !c) return;
      const ziele = zielFarben(modus, { farbe: w.farbe, farben: w.farben, textfarbe: w.textfarbe });
      if (ziele.every((z) => z === null)) { setGefaerbt(false); return; }
      const ctx = c.getContext("2d");
      if (!ctx) return;
      const bild = ctx.createImageData(v.w, v.h);
      umfaerben(v, ziele, bild.data);
      ctx.putImageData(bild, 0, 0);
      setGefaerbt(true);
    });
    return () => { abgebrochen = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktiv, fotoSrc, modus, farbeSchluessel]);
  const zeigeCanvas = !!foto && aktiv && gefaerbt;

  return (
    <div>
      {foto ? (
        <div className="shop-img">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="shop-foto" src={foto.src} alt={foto.alt} width={1100} height={1100} decoding="async" style={zeigeCanvas ? { visibility: "hidden" } : undefined} />
          {aktiv && (
            <canvas ref={canvas} className="shop-foto" width={GROESSE} height={GROESSE} role="img" aria-label={`${foto.alt}, in deiner gewählten Farbe`} style={zeigeCanvas ? undefined : { visibility: "hidden" }} />
          )}
        </div>
      ) : (
        <LiveProductImage form={form} grundfarbe={grundfarbe} />
      )}
      <div className="shop-fotoleiste" role="group" aria-label={`Bilder von ${name}`}>
        {fotos.map((f, i) => (
          <button key={f.src} type="button" aria-pressed={idx === i} aria-label={`Bild ${i + 1}: ${f.alt}`} onClick={() => setIdx(i)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.src} alt="" width={96} height={96} loading="lazy" decoding="async" />
          </button>
        ))}
        <button type="button" className="shop-fotoleiste-live" aria-pressed={idx === -1} onClick={() => setIdx(-1)}>Deine Wahl<br />Live</button>
      </div>
      {foto && (
        <p className="shop-fotohinweis">
          {zeigeCanvas ? "Foto in deiner Farbe (bearbeitet). Echte Farben können am Bildschirm leicht abweichen." : "Foto: Beispielstück. Ändere die Farbe, dann zeigt das Bild deine Wahl."}
        </p>
      )}
    </div>
  );
}
