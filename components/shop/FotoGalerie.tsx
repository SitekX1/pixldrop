"use client";
import { useEffect, useRef, useState } from "react";
import type { Form } from "@/lib/shop/produkte";
import { liveIdx, MIT_AUFDRUCK, ORIGINALFARBE, ORIGINAL_ABSTAND, ORIGINAL_LINIE, istOriginalTeile, darfUmfaerben, TAG_FOTO, UMFAERBEN, type Foto } from "@/lib/shop/fotos";
import { umfaerben, zielFarben, type UmfaerbModus } from "@/lib/shop/umfaerben";
import { teelichtFaerben } from "./teelichtFaerben";
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
// Artikel mit Wunschtext (MIT_AUFDRUCK) zeigen Text und Farben direkt auf dem Foto; ein extra "Deine Wahl Live"-Knopf entfällt überall.
export default function FotoGalerie({ slug, form, grundfarbe, fotos, name, vorText }: { /** Standardtext: erscheint sofort als Aufdruck, bevor der Kaufbereich geladen ist (Handy, langsames Netz) */ vorText?: string; slug: string; form: Form; grundfarbe: string; fotos: Foto[]; name: string }) {
  const wRoh = useVorschauWerte();
  const w = wRoh.text === undefined && vorText ? { ...wRoh, text: vorText, family: wRoh.family ?? "var(--font-sf-montserrat), sans-serif" } : wRoh;
  const [idx, setIdx] = useState(0); // -1 = Live-Vorschau
  // Namensschild: Foto 1 = Blanko-Schild (ganzes Objekt in der Schildfarbe, Text kommt als Aufdruck), die übrigen = Beispielfotos mit Schrift
  const ohneUmfaerben = !darfUmfaerben(slug, idx); // z. B. Kork-Rückseite: Foto bleibt, wie es ist
  const modus: UmfaerbModus | undefined = ohneUmfaerben ? undefined : slug === "namensschild" ? "becher" : UMFAERBEN[slug];
  const liveAufFoto = MIT_AUFDRUCK.includes(slug); // Foto 1 ist die Live-Vorschau
  // Titelbild ist ein Beispielfoto (Stiftebecher): ändert der Kunde Text oder Farbe, springt die Anzeige EINMAL auf die Live-Vorschau
  const startWahl = useRef<string | undefined>(undefined);
  const einmalLive = useRef(false);
  const wahlKey = `${wRoh.text}|${wRoh.farbe}|${wRoh.textfarbe}|${wRoh.schriftName}|${wRoh.formatKey}`;
  useEffect(() => {
    if (liveIdx(slug) === 0 || wRoh.preisText === undefined) return;
    if (startWahl.current === undefined) { startWahl.current = wahlKey; return; }
    if (wahlKey === startWahl.current || einmalLive.current) return;
    const t = setTimeout(() => { einmalLive.current = true; setIdx(liveIdx(slug)); }, 700);
    return () => clearTimeout(t);
  }, [wahlKey, wRoh.preisText, slug]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [gefaerbtFuer, setGefaerbtFuer] = useState<string | null>(null); // Foto, dessen umgefärbte Pixel im Canvas stehen

  // Einzel-Untersetzer: gewählter Wochentag zeigt das passende Foto.
  useEffect(() => {
    if (slug !== "wochentags-untersetzer-einzeln" || !w.tag) return;
    const i = TAG_FOTO[w.tag];
    if (i !== undefined && i < fotos.length) setIdx(i);
  }, [slug, w.tag, fotos.length]);

  // Farbwahl: Das Foto wird in der gewählten Farbe gezeigt (Licht und Struktur bleiben).
  const farbKey = modus === "kombi" ? (w.farben ?? []).join() : modus === "schild" ? `${w.farbe ?? ""}|${w.textfarbe ?? ""}` : modus === "untersetzer" ? `${w.farbe ?? ""}|${w.linienfarbe ?? ""}` : (modus === "teile" ? JSON.stringify(w.teileFarben ?? {}) : (w.farbe ?? ""));
  // Namensschild: Foto 1 ist das Blanko-Schild, auf das Farbe und Text live gelegt werden (immer umgefärbt, mit Aufdruck).
  const mitAufdruck = liveAufFoto && idx === liveIdx(slug);
  // Das Foto wird von Anfang an in der gewählten Farbe gezeigt (auch in der Vorauswahl), sobald der Kaufbereich eine Farbe gemeldet hat.
  const orig = ORIGINALFARBE[slug];
  const istOriginalfarbe = modus === "teile" ? istOriginalTeile(slug, w.teileFarben) : !!orig && idx === liveIdx(slug) && !!w.farbe && farbAbstand(w.farbe, orig) < ORIGINAL_ABSTAND && (!ORIGINAL_LINIE[slug] || (!!w.linienfarbe && farbAbstand(w.linienfarbe, ORIGINAL_LINIE[slug]) < ORIGINAL_ABSTAND));
  const aktiv = !!modus && !istOriginalfarbe && (mitAufdruck || farbKey.replace(/\|/g, "") !== "");

  const foto = idx >= 0 ? fotos[idx] : null;
  const fotoSrc = foto?.src;
  const farbeSchluessel = `${JSON.stringify(w.teileFarben ?? {})}|${w.farbe}|${w.textfarbe}|${w.linienfarbe}|${(w.farben ?? []).join()}`;
  useEffect(() => {
    let abgebrochen = false;
    if (!aktiv || !fotoSrc || !modus) { setGefaerbtFuer(null); return; }
    vorbereiten(fotoSrc, modus).then((v) => {
      const c = canvas.current;
      if (abgebrochen || !v || !c) return;
      const ziele = zielFarben(modus, { farbe: w.farbe, farben: w.farben, textfarbe: w.textfarbe, linienfarbe: w.linienfarbe, teile: w.teileFarben });
      if (ziele.every((z) => z === null)) { setGefaerbtFuer(null); return; }
      const ctx = c.getContext("2d");
      if (!ctx) return;
      const bild = ctx.createImageData(v.w, v.h);
      if (slug === "kuerbis-teelichthalter" && modus === "farbe") teelichtFaerben(v, ziele[0] ?? null, bild.data); else umfaerben(v, ziele, bild.data);
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
      </div>
      <p className="shop-fotohinweis">
        {foto
          ? (mitAufdruck
            ? (slug === "namensschild" ? "Vorschau: Dein Text und deine Farben auf dem Foto des Blanko-Schilds (bearbeitet). " : slug === "stiftebecher-tasse" ? "Vorschau: Dein Text und deine Farben auf dem Foto des Bechers (bearbeitet). " : "Vorschau: Dein Text und deine Farben auf dem Foto des Untersetzers (bearbeitet). ")
            : ohneUmfaerben && liveIdx(slug) !== 0 && idx !== liveIdx(slug) && !foto.alt.includes("Kork") && idx === 0 ? "Titelbild: Beispielstück, nicht in deiner Farbe. Dein Text und deine Farben erscheinen im 2. Bild (Vorschau). "
            : ohneUmfaerben && slug === "kuerbis-laterne" ? "Foto in Original-Farben (orange mit schwarzem Stiel, mit LED-Teelicht), nicht in deiner Farbwahl. "
            : ohneUmfaerben ? (foto.alt.includes("Kork") ? "Foto: Beispielstück mit Kork (Option, siehe Auswahl). " : "Foto: Beispielstück. ")
            : zeigeCanvas ? "Foto in deiner Farbe (bearbeitet). " : "Foto: Beispielstück. ")
          : "Vorschau (gezeichnet, kein Foto). "}
        <strong>Wichtig:</strong> {TEXTE.bildHinweis}
      </p>
    </div>
  );
}
