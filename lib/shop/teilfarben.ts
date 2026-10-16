// Mehrteilige Artikel (z. B. Kürbis: Körper + Stiel): Standardfarben je Teil und Anzeige-Helfer.
// Reine Funktionen für Browser (ProductBuy, Warenkorb, Bon). Die Prüfung der Wahl macht allein der Server (server/preise.ts).
import type { Farbe } from "./farben";
import type { Auswahl } from "./auswahl";
import type { Produkt } from "./produkte";

/** Referenzfarben je Teil-ID, nach denen die Standardfarbe gewählt wird (nächste vorrätige Lagerfarbe). */
const REFERENZ: Record<string, string> = { koerper: "#ff8a1f", stiel: "#1c1c1c" };

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Farbabstand (gewichtet, "redmean"-Näherung), kleiner = ähnlicher. */
export function farbAbstand(a: string, b: string): number {
  const [r1, g1, b1] = rgb(a), [r2, g2, b2] = rgb(b);
  const rm = (r1 + r2) / 2;
  return Math.sqrt((2 + rm / 256) * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + (2 + (255 - rm) / 256) * (b1 - b2) ** 2);
}

/** Standardfarbe eines Teils: ähnlichste Lagerfarbe zur Referenzfarbe, sonst die erste. */
export function standardTeilFarbe(teilId: string, farben: Farbe[]): Farbe | undefined {
  const ref = REFERENZ[teilId];
  if (!ref) return farben[0];
  return farben.reduce<Farbe | undefined>((best, f) => (!best || farbAbstand(f.hex, ref) < farbAbstand(best.hex, ref) ? f : best), undefined);
}

export function standardTeilFarben(teile: NonNullable<Produkt["teile"]>, farben: Farbe[]): Record<string, string> {
  const r: Record<string, string> = {};
  for (const t of teile) { const f = standardTeilFarbe(t.id, farben); if (f) r[t.id] = f.id; }
  return r;
}

/** Aufgelöste Teilfarben einer Position (fehlt eine Wahl, gilt die Standardfarbe). */
export function teilFarbenVon(p: Produkt, a: Pick<Auswahl, "teilFarben">, farben: Farbe[]): { id: string; label: string; farbe?: Farbe }[] {
  return (p.teile ?? []).map((t) => ({
    id: t.id, label: t.label,
    farbe: farben.find((f) => f.id === a.teilFarben?.[t.id]) ?? (a.teilFarben?.[t.id] ? undefined : standardTeilFarbe(t.id, farben)),
  }));
}

/** Kurztext für Warenkorb/Bon: „Kürbis: Orange · Stiel: Schwarz“. */
export function teilFarbenText(p: Produkt, a: Pick<Auswahl, "teilFarben">, farben: Farbe[]): string {
  return teilFarbenVon(p, a, farben).map((t) => `${t.label}: ${t.farbe?.name ?? "nicht mehr vorrätig"}`).join(" · ");
}

/** teilId -> Hex für die Vorschau. */
export function teilHexe(p: Produkt, a: Pick<Auswahl, "teilFarben">, farben: Farbe[]): Record<string, string> | undefined {
  if (!p.teile) return undefined;
  const r: Record<string, string> = {};
  for (const t of teilFarbenVon(p, a, farben)) if (t.farbe) r[t.id] = t.farbe.hex;
  return r;
}
