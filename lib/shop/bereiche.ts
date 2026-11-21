// Bereiche der Shop-Startseite (Reihenfolge = Reihenfolge auf der Seite). Alles Umstellbare steht hier, nicht im Markup.
import type { Produkt } from "./produkte";

export type BereichId = "bubble" | "wand" | "technik" | "weihnachten" | "lieblinge";

/**
 * Technik hat noch keine Artikel: "bald" = Kachel "Bald", "aus" = Bereich und Navigation ausgeblendet,
 * "aktiv" = Artikel anzeigen (sobald es welche gibt, Zuordnung in bereichFuer()).
 */
export const TECHNIK_ANZEIGE: "bald" | "aus" | "aktiv" = "bald";

/** Inspirationsfotos der Wandbuchstaben: Dateien von Alex unter public/shop/inspiration/ ablegen und hier eintragen (vorgesehen 4-5). */
export const WAND_INSPIRATION: { src: string; alt: string }[] = [];

export const BEREICH_NAME: Record<BereichId, string> = {
  bubble: "Bubble Buchstaben",
  wand: "Moderne Wandbuchstaben",
  technik: "Technik",
  weihnachten: "Weihnachten",
  lieblinge: "Lieblingsstücke",
};

/** Zuordnung Artikel → Bereich. Weihnachtsartikel im Weihnachtsbereich, alles Verspielte/Besondere hinten in den Lieblingsstücken. */
export function bereichFuer(p: Produkt): BereichId {
  if (p.slug === "bubble-buchstabe") return "bubble";
  if (p.gruppe === "weihnachten") return "weihnachten";
  return "lieblinge";
}
