// 8 freie Schriften für den Wunschtext (Namen aus RECHERCHE-MARKT.md, dort OFL bzw. Apache 2.0).
// Lizenz je Datei vor Livegang belegen (Screenshot der Lizenzseite), Druckbarkeit
// (Strichstärke >= 1,2 mm) prüft Alex. Die Schriften werden über next/font beim Build
// selbst gehostet (app/3d-druck/fonts.ts), kein Request an Google zur Laufzeit.
export interface Schrift {
  id: string;
  name: string;
  lizenz: "OFL" | "Apache 2.0";
  family: string; // CSS font-family (Variable aus fonts.ts)
}

export const SCHRIFTEN: Schrift[] = [
  { id: "montserrat", name: "Montserrat", lizenz: "OFL", family: "var(--font-sf-montserrat), sans-serif" },
  { id: "merriweather", name: "Merriweather", lizenz: "OFL", family: "var(--font-sf-merriweather), serif" },
  { id: "poppins", name: "Poppins", lizenz: "OFL", family: "var(--font-sf-poppins), sans-serif" },
  { id: "oswald", name: "Oswald", lizenz: "OFL", family: "var(--font-sf-oswald), sans-serif" },
  { id: "fredoka", name: "Fredoka", lizenz: "OFL", family: "var(--font-sf-fredoka), sans-serif" },
  { id: "vt323", name: "VT323", lizenz: "OFL", family: "var(--font-sf-vt323), monospace" },
  { id: "lato", name: "Lato", lizenz: "OFL", family: "var(--font-sf-lato), sans-serif" },
  { id: "opensans", name: "Open Sans", lizenz: "Apache 2.0", family: "var(--font-sf-opensans), sans-serif" },
];

// Erlaubte Zeichen (Schriftsubset): A-Z, Umlaute, ß, 0-9, . , ! ? & - ' und Leerzeichen
const ERLAUBT = /^[A-Za-zÄÖÜäöüß0-9 .,!?&'\-]$/;
export function unerlaubteZeichen(text: string): string[] {
  return Array.from(new Set(Array.from(text).filter((c) => !ERLAUBT.test(c))));
}
