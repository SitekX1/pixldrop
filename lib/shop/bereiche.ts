// Bereiche der Shop-Startseite (Reihenfolge = Reihenfolge auf der Seite). Alles Umstellbare steht hier, nicht im Markup.
import type { Produkt } from "./produkte";

export type BereichId = "bubble" | "wand" | "technik" | "weihnachten" | "lieblinge";

/**
 * Technik hat noch keine Artikel: "bald" = Kachel "Bald", "aus" = Bereich und Navigation ausgeblendet,
 * "aktiv" = Artikel anzeigen (sobald es welche gibt, Zuordnung in bereichFuer()).
 */
export const TECHNIK_ANZEIGE: "bald" | "aus" | "aktiv" = "bald";

/** Inspirationsfotos der Wandbuchstaben: Dateien von Alex unter public/shop/inspiration/ ablegen und hier eintragen (vorgesehen 4-5). */
export const WAND_INSPIRATION: { src: string; alt: string }[] = [
  { src: "/shop/inspiration/wohnzimmer.webp", alt: "Wohnzimmer mit dem Wort Zuhause in schwarzen Wandbuchstaben über dem Sideboard" },
  { src: "/shop/inspiration/flur.webp", alt: "Flur mit dem Wort Willkommen in weißen Wandbuchstaben" },
  { src: "/shop/inspiration/buero.webp", alt: "Homeoffice mit Create Daily in schwarzen Wandbuchstaben über dem Schreibtisch" },
  { src: "/shop/inspiration/schlafzimmer.webp", alt: "Schlafzimmer mit dem Wort Dream in schwarzen Wandbuchstaben über dem Bett" },
];

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
  if (p.slug === "wandbuchstaben") return "wand";
  if (p.gruppe === "weihnachten") return "weihnachten";
  return "lieblinge";
}
