"use client";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type MutableRefObject } from "react";
import ProductImage, { type VorschauFormat } from "./ProductImage";
import type { Form } from "@/lib/shop/produkte";

// Gemeinsamer Zustand für die Live-Vorschau: Eingaben im Kaufbereich (Text, Farbe, Schrift)
// erscheinen sofort im großen Galerie-Hauptbild und in der kleinen Vorschau im Kaufbereich.
export interface VorschauWerte { farbe?: string; text?: string; family?: string; schriftName?: string; farbeName?: string; format?: VorschauFormat; formatKey?: string; textfarbe?: string; textfarbeName?: string; preisText?: string; farben?: string[]; tag?: string; teileFarben?: Record<string, string> }

// Zustand des Warenkorb-Knopfs in der Handy-Leiste; die Aktion selbst liegt in einer Ref (keine Render-Schleifen).
export interface KaufZustand { art: "pause" | "ja" | "nein"; gesperrt: boolean; bestaetigt: boolean }

type CtxWert = { werte: VorschauWerte; setze: (w: VorschauWerte) => void; kauf: KaufZustand | null; setzeKauf: (k: KaufZustand) => void; aktion: MutableRefObject<(() => void) | null> };
const Ctx = createContext<CtxWert | null>(null);

export function VorschauProvider({ children }: { children: React.ReactNode }) {
  const [werte, setWerte] = useState<VorschauWerte>({});
  const setze = useCallback((w: VorschauWerte) => setWerte((alt) => (alt.farbe === w.farbe && alt.text === w.text && alt.family === w.family && alt.schriftName === w.schriftName && alt.farbeName === w.farbeName && alt.formatKey === w.formatKey && alt.textfarbe === w.textfarbe && alt.textfarbeName === w.textfarbeName && alt.preisText === w.preisText && alt.tag === w.tag && (alt.farben ?? []).join() === (w.farben ?? []).join() && JSON.stringify(alt.teileFarben ?? {}) === JSON.stringify(w.teileFarben ?? {}) ? alt : w)), []);
  const [kauf, setKauf] = useState<KaufZustand | null>(null);
  const setzeKauf = useCallback((k: KaufZustand) => setKauf((alt) => (alt && alt.art === k.art && alt.gesperrt === k.gesperrt && alt.bestaetigt === k.bestaetigt ? alt : k)), []);
  const aktion = useRef<(() => void) | null>(null);
  const wert = useMemo(() => ({ werte, setze, kauf, setzeKauf, aktion }), [werte, setze, kauf, setzeKauf]);
  return <Ctx.Provider value={wert}>{children}</Ctx.Provider>;
}

export function useVorschauWerte() {
  return useContext(Ctx)?.werte ?? {};
}

export function useVorschauSetzen() {
  const c = useContext(Ctx);
  return c ? c.setze : () => {};
}

/** Für ProductBuy: Knopfzustand melden und Klick-Aktion (Ref, immer die aktuelle) bereitstellen. */
export function useKaufRegistrieren() {
  const c = useContext(Ctx);
  return c ? { setzeKauf: c.setzeKauf, aktion: c.aktion } : null;
}

/** Warenkorb-Knopf der Handy-Leiste: gleicher Zustand und gleiche Aktion wie in ProductBuy. */
export function MiniKaufKnopf() {
  const c = useContext(Ctx);
  const k = c?.kauf;
  if (!c || !k) return null;
  if (k.art === "pause") return <button type="button" className="shop-btn shop-mini-cta" aria-disabled="true" aria-describedby="wunsch-pause">Vorübergehend nicht bestellbar</button>;
  if (k.art === "nein") return <button type="button" className="shop-btn shop-mini-cta" aria-disabled="true">Kommt zum Verkauf</button>;
  return (
    <button type="button" className="shop-btn shop-mini-cta" aria-disabled={k.gesperrt || undefined} data-ok={k.bestaetigt || undefined} onClick={() => c.aktion.current?.()}>
      {k.bestaetigt ? "Hinzugefügt ✓" : "In den Warenkorb"}
    </button>
  );
}

/** Galerie-Hauptbild: zeigt Farbe und Text live, ohne Eingabe die Standardansicht. */
export function LiveProductImage({ form, grundfarbe }: { form: Form; grundfarbe: string }) {
  const w = useContext(Ctx)?.werte ?? {};
  return (
    <ProductImage
      form={form}
      farbe={w.farbe ?? grundfarbe}
      text={w.text}
      family={w.family}
      format={w.format}
      textfarbe={w.textfarbe}
      farben={w.farben}
      tag={w.tag}
      teileFarben={w.teileFarben}
      typ={w.text ? "Live-Vorschau" : undefined}
    />
  );
}

/** Zusammenfassung für die Mini-Leiste (Handy): Wunschtext bzw. Farbname, Preis fett, Schrift/Farbe. */
export function VorschauZusammenfassung() {
  const w = useContext(Ctx)?.werte ?? {};
  const teile = [w.schriftName, w.text ? w.farbeName : undefined, w.textfarbeName && `Schrift ${w.textfarbeName}`].filter(Boolean).join(" · ");
  const txt = (w.text ?? "").split("\n").join(" / ");
  return (
    <span className="shop-mini-text" aria-live="polite">
      <strong>{txt || w.farbeName || "Deine Vorschau"}</strong>
      <span className="shop-mini-preis">{w.preisText && <b>{w.preisText}</b>}{teile && <small>{teile}</small>}</span>
    </span>
  );
}
