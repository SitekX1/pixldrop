"use client";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import ProductImage from "./ProductImage";
import type { Form } from "@/lib/shop/produkte";

// Gemeinsamer Zustand für die Live-Vorschau: Eingaben im Kaufbereich (Text, Farbe, Schrift)
// erscheinen sofort im großen Galerie-Hauptbild und in der kleinen Vorschau im Kaufbereich.
export interface VorschauWerte { farbe?: string; text?: string; family?: string }

const Ctx = createContext<{ werte: VorschauWerte; setze: (w: VorschauWerte) => void } | null>(null);

export function VorschauProvider({ children }: { children: React.ReactNode }) {
  const [werte, setWerte] = useState<VorschauWerte>({});
  const setze = useCallback((w: VorschauWerte) => setWerte((alt) => (alt.farbe === w.farbe && alt.text === w.text && alt.family === w.family ? alt : w)), []);
  const wert = useMemo(() => ({ werte, setze }), [werte, setze]);
  return <Ctx.Provider value={wert}>{children}</Ctx.Provider>;
}

export function useVorschauSetzen() {
  const c = useContext(Ctx);
  return c ? c.setze : () => {};
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
      typ={w.text ? "Live-Vorschau" : undefined}
    />
  );
}
