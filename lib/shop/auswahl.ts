// Warenkorb (Artikel, Farbe, Text, Menge) nur im sessionStorage dieses Tabs.
// Technisch erforderlich, wird nirgendwohin übertragen. Keine Kundendaten (Adresse, Mail).
export interface Auswahl {
  slug: string;
  farbeId: string | null;
  /** Mehrteilige Artikel: teilId -> farbeId. Fehlt das Feld (alte Warenkörbe), gilt die Standardfarbe. */
  teilFarben?: Record<string, string>;
  optionen: Record<string, string>;
  text: string;
  schriftId: string | null;
  menge: number;
}
export type Korb = Auswahl[];

// Spiegelt MAX_MENGE / MAX_POSITIONEN aus lib/shop/server/preise.ts (der Server prüft verbindlich).
export const MAX_MENGE_POS = 20;
export const MAX_POSITIONEN_KORB = 10;

const KEY = "shop-korb-v1";
const ALT_KEY = "shop-auswahl-v1"; // früher: genau ein Stück

export function gleichePosition(a: Auswahl, b: Auswahl): boolean {
  return a.slug === b.slug && a.farbeId === b.farbeId && a.text === b.text && a.schriftId === b.schriftId
    && JSON.stringify(Object.entries(a.teilFarben ?? {}).sort()) === JSON.stringify(Object.entries(b.teilFarben ?? {}).sort())
    && JSON.stringify(Object.entries(a.optionen).sort()) === JSON.stringify(Object.entries(b.optionen).sort());
}

/** Gleiche Konfiguration erhöht die Menge, sonst neue Position. ok:false, wenn der Korb voll ist. */
export function fuegeHinzu(korb: Korb, neu: Auswahl): { korb: Korb; ok: boolean } {
  const i = korb.findIndex((p) => gleichePosition(p, neu));
  if (i >= 0) {
    const k = korb.slice();
    k[i] = { ...k[i], menge: Math.min(MAX_MENGE_POS, k[i].menge + neu.menge) };
    return { korb: k, ok: true };
  }
  if (korb.length >= MAX_POSITIONEN_KORB) return { korb, ok: false };
  return { korb: [...korb, { ...neu, menge: Math.min(MAX_MENGE_POS, Math.max(1, neu.menge)) }], ok: true };
}
export function aendereMenge(korb: Korb, index: number, menge: number): Korb {
  return korb.map((p, i) => (i === index ? { ...p, menge: Math.min(MAX_MENGE_POS, Math.max(1, Math.floor(menge) || 1)) } : p));
}
export function entferne(korb: Korb, index: number): Korb {
  return korb.filter((_, i) => i !== index);
}
export function anzahlStuecke(korb: Korb): number {
  return korb.reduce((s, p) => s + p.menge, 0);
}

function pruefe(x: unknown): Korb {
  if (!Array.isArray(x)) return [];
  return x.filter((p): p is Auswahl => !!p && typeof p === "object" && typeof (p as Auswahl).slug === "string" && typeof (p as Auswahl).menge === "number").slice(0, MAX_POSITIONEN_KORB);
}

export function ladeKorb(): Korb {
  try {
    const r = sessionStorage.getItem(KEY);
    if (r) return pruefe(JSON.parse(r));
    const alt = sessionStorage.getItem(ALT_KEY);
    return alt ? pruefe([JSON.parse(alt)]) : [];
  } catch {
    return [];
  }
}
export function speichereKorb(korb: Korb) {
  try {
    if (korb.length) sessionStorage.setItem(KEY, JSON.stringify(korb));
    else sessionStorage.removeItem(KEY);
    sessionStorage.removeItem(ALT_KEY);
    window.dispatchEvent(new Event("shop-auswahl"));
  } catch {
    /* Speicher gesperrt: Warenkorb bleibt nur im Tab-Zustand */
  }
}
export const leereKorb = () => speichereKorb([]);

// Gewählte Versandart (nur die Art, nie ein Betrag), ebenfalls nur im sessionStorage dieses Tabs.
const VERSAND_KEY = "shop-versandart-v1";
export function ladeVersandart(): string | null {
  try { return sessionStorage.getItem(VERSAND_KEY); } catch { return null; }
}
export function speichereVersandart(art: string | null) {
  try {
    if (art) sessionStorage.setItem(VERSAND_KEY, art);
    else sessionStorage.removeItem(VERSAND_KEY);
  } catch { /* Speicher gesperrt: Auswahl bleibt im Tab-Zustand */ }
}
/**
 * Gültige Versandart: Bei genau einer Option (Brief) ist sie fest zugewiesen. Bei mehreren Optionen (Hermes/DHL)
 * zählt nur die gespeicherte Art, wenn sie noch zulässig ist, sonst null. Es gibt bewusst keine Vorauswahl
 * (z. B. die günstigste): Der Kunde muss aktiv wählen.
 */
export function gueltigeVersandart<T extends { art: string; cent: number }>(optionen: readonly T[], gespeichert: string | null): T | null {
  if (optionen.length === 0) return null;
  if (optionen.length === 1) return optionen[0];
  return (gespeichert ? optionen.find((o) => o.art === gespeichert) : undefined) ?? null;
}

/** Zwischensumme in Cent; null, wenn ein Preis noch nicht feststeht. */
export function zwischensummeCent(korb: Korb, preisVon: (slug: string, a: Auswahl) => number | null | undefined): number | null {
  let s = 0;
  for (const p of korb) {
    const e = preisVon(p.slug, p);
    if (e == null) return null;
    s += e * p.menge;
  }
  return s;
}
