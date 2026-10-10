// Schriftfarbe der Wunschtext-Artikel: nur Lagerfarben, nie gleich/zu ähnlich wie die Grundfarbe.
// Reine Funktionen, werden im Browser (ProductBuy) UND auf dem Server (server/preise.ts) gleich verwendet.
// Speicherung in `optionen` der Position: textfarbe: <Farb-ID>. Die Wahl ändert weder Preis noch Widerrufsrecht
// (Variantenwahl wie Größe/Fett), siehe istIndividuell() in produkte.ts (wertet optionen nicht aus).
import type { Farbe } from "./farben";

export const TEXTFARBE_KEY = "textfarbe";
/** Mindestkontrast (WCAG-Verhältnis) zwischen Schrift- und Grundfarbe; darunter ist die Schrift schlecht lesbar. */
export const MIN_KONTRAST = 2;
export const TEXTFARBE_HINWEIS = "Schrift muss sich von der Grundfarbe abheben";

function leuchtdichte(hex: string): number {
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const k = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2];
}

export function kontrast(hexA: string, hexB: string): number {
  const a = leuchtdichte(hexA), b = leuchtdichte(hexB);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Darf `text` als Schriftfarbe auf `grund` verwendet werden? (nicht dieselbe Farbe, genug Kontrast) */
export function textfarbeErlaubt(grund: Farbe | undefined, text: Farbe): boolean {
  if (!grund) return true;
  if (grund.id === text.id) return false;
  return kontrast(grund.hex, text.hex) >= MIN_KONTRAST;
}

/** Automatische Voreinstellung: die erlaubte Lagerfarbe mit dem höchsten Kontrast zur Grundfarbe (null, wenn keine erlaubt ist). */
export function automatischeTextfarbe(grund: Farbe | undefined, farben: Farbe[]): Farbe | null {
  let best: Farbe | null = null, bestK = 0;
  for (const f of farben) {
    if (!textfarbeErlaubt(grund, f)) continue;
    const k = grund ? kontrast(grund.hex, f.hex) : 21;
    if (k > bestK) { best = f; bestK = k; }
  }
  return best;
}
