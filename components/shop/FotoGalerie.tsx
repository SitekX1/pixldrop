"use client";
import { useEffect, useRef, useState } from "react";
import type { Form } from "@/lib/shop/produkte";
import { MIT_AUFDRUCK, ORIGINALFARBE, ORIGINAL_ABSTAND, ORIGINAL_LINIE, darfUmfaerben, TAG_FOTO, UMFAERBEN, type Foto } from "@/lib/shop/fotos";
import { umfaerben, zielFarben, type UmfaerbModus } from "@/lib/shop/umfaerben";
import { vorbereiteFoto, farbAbstand } from "./fotoFaerben";
import { LiveProductImage, useVorschauWerte } from "./Vorschau";
import NamensschildAufdruck from "./NamensschildAufdruck";
import UntersetzerAufdruck from "./UntersetzerAufdruck";
import BecherAufdruck from "./BecherAufdruck";
import { TEXTE } from "@/lib/shop/config";

const GROESSE = 720; // Arbeitsauflösung des Umfärbens (Anzeige ca. 480 CSS-Pixel)
const CACHE_MAX = 3;
const vorbereiten = (src: string, modus: UmfaerbModus) => vorbereiteFoto(src, modus, GROESSE, CACHE_MAX);

// Galerie-Hauptbild: echte Fotos als Blättergalerie, dazu die Live-Vorschau ("Deine Wahl").
// Ändert der Kunde die Farbe, wird das Foto in dieser Farbe gezeigt (Licht und Struktur bleiben).
// Ändert er den Wunschtext, springt die Anzeige auf die Live-Vorschau (Text lässt sich nicht ins Foto setzen).
export default function FotoGalerie({ slug, form, grundfarbe, fotos, name, vorText }: { /** Standardtext: erscheint sofort als Aufdruck, bevor der Kaufbereich geladen ist (Handy, langsames Netz) */ vorText?: string; slug: string; form: Form; grundfarbe: string; fotos: Foto[]; name: string }) {
  const wRoh = useVorschauWerte();
  const w = wRoh.text === undefined && vorText ? { ...wRoh, text: vorText, family: wRoh.family ?? "var(--font-sf-montserrat), sans-serif" } : wRoh;
  const [idx, setIdx] = useState(0); // -1 = Live-Vorschau
  // Namensschild: Foto 1 = Blanko-Schild (ganzes Objekt in der Schildfarbe, Text kommt als Aufdruck), die übrigen = Beispielfotos mit Schrift
  const ohneUmfaerben = !darfUmfaerben(slug, idx); // z. B. Kork-Rückseite: Foto bleibt, wie es ist
  const modus: UmfaerbModus | undefined = ohneUmfaerben ? undefined : slug === "namensschild" ? "becher" : UMFAERBEN[slug];
  const liveAufFoto = MIT_AUFDRUCK.includes(slug); // Foto 1 ist die Live-Vorschau
  const canvas = useRef<HTMLCanvasElement>(null);
  const [gefaerbtFuer, setGefaerbtFuer] = useState<string | null>(null); // Foto, dessen umgefärbte Pixel im Canvas stehen

  // Wunschtext: Der Standardtext (z. B. "Eddie Pixldrop") zählt nicht. Hat der Kunde den Text geändert und eine Weile nicht getippt,
  // springt die Anzeige EINMAL auf die Live-Vorschau; danach nie wieder von selbst. Wer die Fotos ansehen will, wird nicht zurückgeworfen,
  // und der Knopf unter dem Bild bringt jederzeit zur Live-Vorschau.
  const startText = useRef<string | undefined>(undefined);
  const einmalUmgeschaltet = useRef(false);
  const [textGeaendert, setTextGeaendert] = useState(false);
  useEffect(() => {
    if (liveAufFoto || w.preisText === undefined) return; // preisText fehlt, solange der Kaufbereich noch nichts gemeldet hat
    const text = w.text ?? "";
    if (startText.current === undefined) { startText.current = text; return; } // Standardtext (auch leer) = Ausgangswert
    if (text === startText.current) { setTextGeaendert(false); return; }
    setTextGeaendert(true);
    if (einmalUmgeschaltet.current) return;
    const t = setTimeout(() => { einmalUmgeschaltet.current = true; setIdx(-1); }, 1500);
    return () => clearTimeout(t);
  }, [w.text, w.preisText, liveAufFoto]);

  // Einzel-Untersetzer: gewählter Wochentag zeigt das passende Foto.
  useEffect(() => {
    if (slug !== "wochentags-untersetzer-einzeln" || !w.tag) return;
    const i = TAG_FOTO[w.tag];
    if (i !== undefined && i < fotos.length) setIdx(i);
  }, [slug, w.tag, fotos.length]);

  // Farbwahl: Das Foto wird in der gewählten Farbe gezeigt (Licht und Struktur bleiben).
  const farbKey = modus === "kombi" ? (w.farben ?? []).join() : modus === "schild" ? `${w.farbe ?? ""}|${w.textfarbe ?? ""}` : modus === "untersetzer" ? `${w.farbe ?? ""}|${w.linienfarbe ?? ""}` : (w.farbe ?? "");
  // Namensschild: Foto 1 ist das Blanko-Schild, auf das Farbe und Text live gelegt werden (immer umgefärbt, mit Aufdruck).
  const mitAufdruck = liveAufFoto && idx === 0;
  // Das Foto wird von Anfang an in der gewählten Farbe gezeigt (auch in der Vorauswahl), sobald der Kaufbereich eine Farbe gemeldet hat.
  const orig = ORIGINALFARBE[slug];
  const istOriginalfarbe = !!orig && idx === 0 && !!w.farbe && farbAbstand(w.farbe, orig) < ORIGINAL_ABSTAND && (!ORIGINAL_LINIE[slug] || (!!w.linienfarbe && farbAbstand(w.linienfarbe, ORIGINAL_LINIE[slug]) < ORIGINAL_ABSTAND));
  const aktiv = !!modus && !istOriginalfarbe && (mitAufdruck || farbKey.replace(/\|/g, "") !== "");

  const foto = idx >= 0 ? fotos[idx] : null;
  const fotoSrc = foto?.src;
  const farbeSchluessel = `${w.farbe}|${w.textfarbe}|${w.linienfarbe}|${(w.farben ?? []).join()}`;
  useEffect(() => {
    let abgebrochen = false;
    if (!aktiv || !fotoSrc || !modus) { setGefaerbtFuer(null); return; }
    vorbereiten(fotoSrc, modus).then((v) => {
      const c = canvas.current;
      if (abgebrochen || !v || !c) return;
      const ziele = zielFarben(modus, { farbe: w.farbe, farben: w.farben, textfarbe: w.textfarbe, linienfarbe: w.linienfarbe });
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
          {mitAufdruck && (slug === "namensschild" ? <NamensschildAufdruck w={w} /> : slug === "stiftebecher-tasse" ? <BecherAufdruck w={w} /> : <UntersetzerAufdruck w={w} />)}
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
        {!liveAufFoto && <button type="button" className="shop-fotoleiste-live" aria-pressed={idx === -1} onClick={() => setIdx(-1)}>Deine Wahl<br />Live</button>}
      </div>
      {foto && textGeaendert && (
        <p className="shop-fotohinweis">Dein Text steht nur in der Live-Vorschau. <button type="button" className="shop-link" style={{ minHeight: 0, background: "none", border: 0, padding: 0, cursor: "pointer", font: "inherit" }} onClick={() => { einmalUmgeschaltet.current = true; setIdx(-1); }}>Mit deinem Text ansehen</button></p>
      )}
      <p className="shop-fotohinweis">
        {foto
          ? (mitAufdruck
            ? (slug === "namensschild" ? "Vorschau: Dein Text und deine Farben auf dem Foto des Blanko-Schilds (bearbeitet). " : slug === "stiftebecher-tasse" ? "Vorschau: Dein Text und deine Farben auf dem Foto des Bechers (bearbeitet). " : "Vorschau: Dein Text und deine Farben auf dem Foto des Untersetzers (bearbeitet). ")
            : ohneUmfaerben ? (foto.alt.includes("Kork") ? "Foto: Beispielstück mit Kork (Option, siehe Auswahl). " : "Foto: Beispielstück. ")
            : zeigeCanvas ? "Foto in deiner Farbe (bearbeitet). " : "Foto: Beispielstück. ")
          : "Vorschau (gezeichnet, kein Foto). "}
        <strong>Wichtig:</strong> {TEXTE.bildHinweis}
      </p>
    </div>
  );
}
