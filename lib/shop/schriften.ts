// 8 freie Schriften für den Wunschtext (Namen aus RECHERCHE-MARKT.md, dort OFL bzw. Apache 2.0).
// Lizenz je Datei vor Livegang belegen (Screenshot der Lizenzseite), Druckbarkeit
// (Strichstärke >= 1,2 mm) prüft Alex. Die Schriften werden über next/font beim Build
// selbst gehostet (app/3d-druck/fonts.ts), kein Request an Google zur Laufzeit.
export interface Schrift {
  id: string;
  name: string;
  lizenz: "OFL" | "Apache 2.0";
  hinweis?: string;
  family: string; // CSS font-family (Variable aus fonts.ts)
  /** Echter fetter Schnitt vorhanden, der sich vom Standardschnitt (700) unterscheidet (geladen: 900). */
  hatFett: boolean;
  /** Echter Kursivschnitt vorhanden (laut fonts.ts geladen). Sonst ist der Schalter gesperrt. */
  hatKursiv: boolean;
  /** Mittlere Zeichenbreite in em (Schätzwert inkl. Reserve) für die Passt-Prüfung; Fett ist breiter (x fettFaktor). */
  breite: number;
}
/** Zusatzbreite des fetten Schnitts gegenüber dem Standardschnitt. */
export const FETT_FAKTOR = 1.08;

// Kuratierte Auswahl (alle SIL OFL 1.1 laut Google Fonts, kommerzielle Nutzung und Druck erlaubt).
// "hinweis" = Strichstärke beim Druck (Alex wählt am Ende; Mindeststrich ca. 1,2 mm).
export const SCHRIFTEN: Schrift[] = [
  { id: "dancing-script", name: "Dancing Script", lizenz: "OFL", family: "var(--font-sf-dancing), cursive", hinweis: "Schreibschrift, Bold ok", hatFett: false, hatKursiv: false, breite: 0.44 },
  { id: "pacifico", name: "Pacifico", lizenz: "OFL", family: "var(--font-sf-pacifico), cursive", hinweis: "Schreibschrift, sehr kräftig", hatFett: false, hatKursiv: false, breite: 0.55 },
  { id: "caveat", name: "Caveat", lizenz: "OFL", family: "var(--font-sf-caveat), cursive", hinweis: "Handschrift, Bold, eher schlank", hatFett: false, hatKursiv: false, breite: 0.4 },
  { id: "satisfy", name: "Satisfy", lizenz: "OFL", family: "var(--font-sf-satisfy), cursive", hinweis: "Schreibschrift, Haarstriche möglich", hatFett: false, hatKursiv: false, breite: 0.45 },
  { id: "lobster", name: "Lobster", lizenz: "OFL", family: "var(--font-sf-lobster), cursive", hinweis: "Verspielt, kräftig", hatFett: false, hatKursiv: false, breite: 0.52 },
  { id: "permanent-marker", name: "Permanent Marker", lizenz: "OFL", family: "var(--font-sf-marker), cursive", hinweis: "Filzstift, sehr kräftig", hatFett: false, hatKursiv: false, breite: 0.58 },
  { id: "bangers", name: "Bangers", lizenz: "OFL", family: "var(--font-sf-bangers), cursive", hinweis: "Comic, sehr kräftig", hatFett: false, hatKursiv: false, breite: 0.48 },
  { id: "righteous", name: "Righteous", lizenz: "OFL", family: "var(--font-sf-righteous), sans-serif", hinweis: "Rund-geometrisch, kräftig", hatFett: false, hatKursiv: false, breite: 0.55 },
  { id: "playfair", name: "Playfair Display", lizenz: "OFL", family: "var(--font-sf-playfair), serif", hinweis: "Elegant, Serifen/Haarlinien dünn", hatFett: true, hatKursiv: true, breite: 0.58 },
  { id: "cinzel", name: "Cinzel", lizenz: "OFL", family: "var(--font-sf-cinzel), serif", hinweis: "Elegant, Versalien, Haarlinien dünn", hatFett: true, hatKursiv: false, breite: 0.72 },
  { id: "montserrat", name: "Montserrat", lizenz: "OFL", family: "var(--font-sf-montserrat), sans-serif", hinweis: "Schlicht, kräftig", hatFett: true, hatKursiv: true, breite: 0.64 },
  { id: "oswald", name: "Oswald", lizenz: "OFL", family: "var(--font-sf-oswald), sans-serif", hinweis: "Schmal, kräftig", hatFett: false, hatKursiv: false, breite: 0.46 },
];

// Erlaubte Zeichen (Schriftsubset): A-Z, Umlaute, ß, 0-9, . , ! ? & - ' und Leerzeichen
const ERLAUBT = /^[A-Za-zÄÖÜäöüß0-9 .,!?&'\-]$/;
export function unerlaubteZeichen(text: string): string[] {
  return Array.from(new Set(Array.from(text).filter((c) => !ERLAUBT.test(c))));
}
