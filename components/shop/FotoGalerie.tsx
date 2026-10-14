"use client";
import { useEffect, useRef, useState } from "react";
import type { Form } from "@/lib/shop/produkte";
import { TAG_FOTO, UMFAERBEN, type Foto } from "@/lib/shop/fotos";
import { bereiten, umfaerben, zielFarben, type UmfaerbModus, type Vorbereitet } from "@/lib/shop/umfaerben";
import { LiveProductImage, useVorschauWerte } from "./Vorschau";
import NamensschildAufdruck from "./NamensschildAufdruck";

const GROESSE = 720; // Arbeitsauflösung des Umfärbens (Anzeige ca. 480 CSS-Pixel)
// Je Foto ca. 10-16 MB (RGBA, Maske, Klassengewichte): nur die zuletzt benutzten Fotos behalten (Handy-Speicher).
const CACHE_MAX = 3;
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
  if (p) { cache.delete(key); cache.set(key, p); return p; } // zuletzt benutzt nach hinten
  p = Promise.all([ladeBild(src), ladeBild(src.replace(/\.webp$/, ".m.webp"))])
    .then(([f, m]) => bereiten(modus, pixel(f), pixel(m), GROESSE, GROESSE))
    .catch(() => null)
    .then((v) => { if (v === null) cache.delete(key); return v; }); // Fehler nicht dauerhaft merken
  cache.set(key, p);
  while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
  return p;
}

// Galerie-Hauptbild: echte Fotos als Blättergalerie, dazu die Live-Vorschau ("Deine Wahl").
// Ändert der Kunde die Farbe, wird das Foto in dieser Farbe gezeigt (Licht und Struktur bleiben).
// Ändert er den Wunschtext, springt die Anzeige auf die Live-Vorschau (Text lässt sich nicht ins Foto setzen).
export default function FotoGalerie({ slug, form, grundfarbe, fotos, name }: { slug: string; form: Form; grundfarbe: string; fotos: Foto[]; name: string }) {
  const w = useVorschauWerte();
  const [idx, setIdx] = useState(0); // -1 = Live-Vorschau
  // Namensschild: Foto 1 = Blanko-Schild (ganzes Objekt in der Schildfarbe, Text kommt als Aufdruck), die übrigen = Beispielfotos mit Schrift
  const modus: UmfaerbModus | undefined = slug === "namensschild" ? (idx === 0 ? "farbe" : "schild") : UMFAERBEN[slug];
  const canvas = useRef<HTMLCanvasElement>(null);
  const [gefaerbtFuer, setGefaerbtFuer] = useState<string | null>(null); // Foto, dessen umgefärbte Pixel im Canvas stehen

  // Wunschtext: Der Standardtext (z. B. "Eddie Pixldrop") zählt nicht. Hat der Kunde den Text geändert und eine Weile nicht getippt,
  // springt die Anzeige EINMAL auf die Live-Vorschau; danach nie wieder von selbst. Wer die Fotos ansehen will, wird nicht zurückgeworfen,
  // und der Knopf unter dem Bild bringt jederzeit zur Live-Vorschau.
  const startText = useRef<string | undefined>(undefined);
  const einmalUmgeschaltet = useRef(false);
  const [textGeaendert, setTextGeaendert] = useState(false);
  useEffect(() => {
    if (slug === "namensschild" || w.preisText === undefined) return; // preisText fehlt, solange der Kaufbereich noch nichts gemeldet hat
    const text = w.text ?? "";
    if (startText.current === undefined) { startText.current = text; return; } // Standardtext (auch leer) = Ausgangswert
    if (text === startText.current) { setTextGeaendert(false); return; }
    setTextGeaendert(true);
    if (einmalUmgeschaltet.current) return;
    const t = setTimeout(() => { einmalUmgeschaltet.current = true; setIdx(-1); }, 1500);
    return () => clearTimeout(t);
  }, [w.text, w.preisText, slug]);

  // Einzel-Untersetzer: gewählter Wochentag zeigt das passende Foto.
  useEffect(() => {
    if (slug !== "wochentags-untersetzer-einzeln" || !w.tag) return;
    const i = TAG_FOTO[w.tag];
    if (i !== undefined && i < fotos.length) setIdx(i);
  }, [slug, w.tag, fotos.length]);

  // Farbwahl: Das Foto zeigt zuerst das echte Stück; erst wenn der Kunde die Farbe ändert, wird umgefärbt.
  const farbKey = modus === "kombi" ? (w.farben ?? []).join() : modus === "schild" ? `${w.farbe ?? ""}|${w.textfarbe ?? ""}` : (w.farbe ?? "");
  const startFarbe = useRef<Record<string, string>>({});
  useEffect(() => {
    if (modus && startFarbe.current[modus] === undefined && farbKey.replace(/\|/g, "")) startFarbe.current[modus] = farbKey;
  }, [farbKey, modus]);
  // Namensschild: Foto 1 ist das Blanko-Schild, auf das Farbe und Text live gelegt werden (immer umgefärbt, mit Aufdruck).
  const mitAufdruck = slug === "namensschild" && idx === 0;
  const aktiv = !!modus && (mitAufdruck || (startFarbe.current[modus] !== undefined && farbKey !== startFarbe.current[modus]));

  const foto = idx >= 0 ? fotos[idx] : null;
  const fotoSrc = foto?.src;
  const farbeSchluessel = `${w.farbe}|${w.textfarbe}|${(w.farben ?? []).join()}`;
  useEffect(() => {
    let abgebrochen = false;
    if (!aktiv || !fotoSrc || !modus) { setGefaerbtFuer(null); return; }
    vorbereiten(fotoSrc, modus).then((v) => {
      const c = canvas.current;
      if (abgebrochen || !v || !c) return;
      const ziele = zielFarben(modus, { farbe: w.farbe, farben: w.farben, textfarbe: w.textfarbe });
      if (ziele.every((z) => z === null)) { setGefaerbtFuer(null); return; }
      const ctx = c.getContext("2d");
      if (!ctx) return;
      const bild = ctx.createImageData(v.w, v.h);
      umfaerben(v, ziele, bild.data);
      ctx.putImageData(bild, 0, 0);
      setGefaerbtFuer(fotoSrc);
    });
    return () => { abgebrochen = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktiv, fotoSrc, modus, farbeSchluessel]);
  const zeigeCanvas = !!foto && aktiv && gefaerbtFuer === fotoSrc;

  return (
    <div>
      {foto ? (
        <div className="shop-img">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="shop-foto" src={foto.src} alt={foto.alt} width={1100} height={1100} decoding="async" style={zeigeCanvas ? { visibility: "hidden" } : undefined} />
          {aktiv && (
            <canvas ref={canvas} className="shop-foto" width={GROESSE} height={GROESSE} role="img" aria-label={`${foto.alt}, in deiner gewählten Farbe`} style={zeigeCanvas ? undefined : { visibility: "hidden" }} />
          )}
          {mitAufdruck && <NamensschildAufdruck w={w} />}
        </div>
      ) : (
        <LiveProductImage form={form} grundfarbe={grundfarbe} />
      )}
      <div
        className="shop-fotoleiste" role="group" aria-label={`Bilder von ${name}`}
        onKeyDown={(e) => {
          // Pfeiltasten wechseln das Bild (Fokus folgt); Tab/Enter wie bisher
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          const n = fotos.length;
          const naechst = e.key === "ArrowRight" ? Math.min(n - 1, idx + 1) : Math.max(0, idx <= 0 ? 0 : idx - 1);
          if (naechst === idx && idx >= 0) return;
          e.preventDefault();
          setIdx(naechst);
          (e.currentTarget.querySelectorAll("button")[naechst] as HTMLButtonElement | undefined)?.focus();
        }}
      >
        {fotos.map((f, i) => (
          <button key={f.src} type="button" aria-pressed={idx === i} aria-label={`Bild ${i + 1}: ${f.alt}`} onClick={() => setIdx(i)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.src} alt="" width={96} height={96} loading="lazy" decoding="async" />
          </button>
        ))}
        {slug !== "namensschild" && <button type="button" className="shop-fotoleiste-live" aria-pressed={idx === -1} onClick={() => setIdx(-1)}>Deine Wahl<br />Live</button>}
      </div>
      {foto && textGeaendert && (
        <p className="shop-fotohinweis">Dein Text steht nur in der Live-Vorschau. <button type="button" className="shop-link" style={{ minHeight: 0, background: "none", border: 0, padding: 0, cursor: "pointer", font: "inherit" }} onClick={() => { einmalUmgeschaltet.current = true; setIdx(-1); }}>Mit deinem Text ansehen</button></p>
      )}
      {foto && (
        <p className="shop-fotohinweis">
          {mitAufdruck
            ? "Vorschau: Dein Text und deine Farben auf dem Foto des Blanko-Schilds (bearbeitet). Echte Farben können am Bildschirm leicht abweichen."
            : zeigeCanvas ? "Foto in deiner Farbe (bearbeitet). Echte Farben können am Bildschirm leicht abweichen." : "Foto: Beispielstück. Ändere die Farbe, dann zeigt das Bild deine Wahl."}
        </p>
      )}
    </div>
  );
}
