// Aktionscodes (befristeter Prozent-Rabatt auf den Warenwert, nie auf den Versand).
// Reine Funktionen für Server UND Browser. Der Server rechnet verbindlich (server/preise.ts); der Browser zeigt nur die Vorschau.
// Der Rabatt wird auf jeden Einzelpreis angewendet und auf ganze Cent gerundet: Positionen, PayPal-Betrag, Bon und Panel
// rechnen dadurch alle mit denselben (reduzierten) Preisen, eine DB-Änderung ist nicht nötig.

export interface Aktion {
  code: string;
  prozent: number;
  /** Erster und letzter Tag (inklusive, deutsche Zeit) als ISO mit Offset. */
  von: string;
  bis: string;
  /** Text für die Anzeige im Warenkorb. */
  label: string;
}

// Zeitraum: 14 Tage ab 06.11.2026 (Alex 05.11.), letzter Tag 19.11.
export const AKTIONEN: Aktion[] = [
  { code: "WEIHNACHTEN10", prozent: 10, von: "2026-11-06T00:00:00+01:00", bis: "2026-11-19T23:59:59+01:00", label: "Weihnachts-Aktion" },
];

export const normalisiereCode = (roh: unknown): string => (typeof roh === "string" ? roh.trim().toUpperCase().replace(/\s+/g, "") : "");

export type AktionPruefung =
  | { ok: true; aktion: Aktion }
  | { ok: false; grund: "unbekannt" | "abgelaufen" | "noch_nicht" };

export function pruefeAktionscode(roh: unknown, jetzt: Date = new Date()): AktionPruefung {
  const code = normalisiereCode(roh);
  const a = AKTIONEN.find((x) => x.code === code);
  if (!a) return { ok: false, grund: "unbekannt" };
  const t = jetzt.getTime();
  // Vorschau-Deployments (Branch weihnachten) ignorieren den Starttermin, damit Alex vor dem Livegang testen kann; Production nie.
  const vorschau = typeof process !== "undefined" && process.env?.VERCEL_ENV === "preview";
  if (!vorschau && t < Date.parse(a.von)) return { ok: false, grund: "noch_nicht" };
  if (t > Date.parse(a.bis)) return { ok: false, grund: "abgelaufen" };
  return { ok: true, aktion: a };
}

export const AKTION_FEHLER: Record<"unbekannt" | "abgelaufen" | "noch_nicht", string> = {
  unbekannt: "Diesen Aktionscode kennen wir nicht.",
  abgelaufen: "Dieser Aktionscode ist abgelaufen.",
  noch_nicht: "Dieser Aktionscode gilt noch nicht.",
};

/** Einzelpreis nach Rabatt, auf ganze Cent gerundet (mindestens 1 Cent). */
export const rabattiereCent = (cent: number, prozent: number): number => Math.max(1, Math.round((cent * (100 - prozent)) / 100));
