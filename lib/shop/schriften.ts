// 8 freie Schriften für den Wunschtext (Namen aus RECHERCHE-MARKT.md, dort OFL bzw. Apache 2.0).
// Lizenz je Datei vor Livegang belegen (Screenshot der Lizenzseite), Druckbarkeit
// (Strichstärke >= 1,2 mm) prüft Alex. Die Schriften werden über next/font beim Build
// selbst gehostet (app/3d-druck/fonts.ts), kein Request an Google zur Laufzeit.
export interface Schrift {
  id: string;
  name: string;
  lizenz: "OFL" | "Apache 2.0" | string; // "frei (Autor)" bzw. "unklar (…)": siehe SCHRIFTEN-LIZENZEN.md
  hinweis?: string;
  family: string; // CSS font-family (Variable aus fonts.ts)
  /** Echter fetter Schnitt vorhanden, der sich vom Standardschnitt (700) unterscheidet (geladen: 900). */
  hatFett: boolean;
  /** Echter Kursivschnitt vorhanden (laut fonts.ts geladen). Sonst ist der Schalter gesperrt. */
  hatKursiv: boolean;
  /** Mittlere Zeichenbreite in em (Schätzwert inkl. Reserve) für die Passt-Prüfung; Fett ist breiter (x fettFaktor). */
  breite: number;
  /** Zeichen aus dem erlaubten Zeichensatz, die die Schrift laut cmap NICHT hat (leer = vollständig). */
  fehlendeZeichen: string;
}
/** Zusatzbreite des fetten Schnitts gegenüber dem Standardschnitt. */
export const FETT_FAKTOR = 1.08;

// Kuratierte Auswahl (alle SIL OFL 1.1 laut Google Fonts, kommerzielle Nutzung und Druck erlaubt).
// "hinweis" = Strichstärke beim Druck (Alex wählt am Ende; Mindeststrich ca. 1,2 mm).
export const SCHRIFTEN: Schrift[] = [
  { id: "dancing-script", name: "Dancing Script", lizenz: "OFL", family: "var(--font-sf-dancing), cursive", hinweis: "Schreibschrift, Bold ok", hatFett: false, hatKursiv: false, breite: 0.44, fehlendeZeichen: "" },
  { id: "pacifico", name: "Pacifico", lizenz: "OFL", family: "var(--font-sf-pacifico), cursive", hinweis: "Schreibschrift, sehr kräftig", hatFett: false, hatKursiv: false, breite: 0.55, fehlendeZeichen: "" },
  { id: "caveat", name: "Caveat", lizenz: "OFL", family: "var(--font-sf-caveat), cursive", hinweis: "Handschrift, Bold, eher schlank", hatFett: false, hatKursiv: false, breite: 0.4, fehlendeZeichen: "" },
  { id: "satisfy", name: "Satisfy", lizenz: "OFL", family: "var(--font-sf-satisfy), cursive", hinweis: "Schreibschrift, Haarstriche möglich", hatFett: false, hatKursiv: false, breite: 0.45, fehlendeZeichen: "" },
  { id: "lobster", name: "Lobster", lizenz: "OFL", family: "var(--font-sf-lobster), cursive", hinweis: "Verspielt, kräftig", hatFett: false, hatKursiv: false, breite: 0.52, fehlendeZeichen: "" },
  { id: "permanent-marker", name: "Permanent Marker", lizenz: "OFL", family: "var(--font-sf-marker), cursive", hinweis: "Filzstift, sehr kräftig", hatFett: false, hatKursiv: false, breite: 0.58, fehlendeZeichen: "" },
  { id: "bangers", name: "Bangers", lizenz: "OFL", family: "var(--font-sf-bangers), cursive", hinweis: "Comic, sehr kräftig", hatFett: false, hatKursiv: false, breite: 0.48, fehlendeZeichen: "" },
  { id: "righteous", name: "Righteous", lizenz: "OFL", family: "var(--font-sf-righteous), sans-serif", hinweis: "Rund-geometrisch, kräftig", hatFett: false, hatKursiv: false, breite: 0.55, fehlendeZeichen: "" },
  { id: "playfair", name: "Playfair Display", lizenz: "OFL", family: "var(--font-sf-playfair), serif", hinweis: "Elegant, Serifen/Haarlinien dünn", hatFett: true, hatKursiv: true, breite: 0.58, fehlendeZeichen: "" },
  { id: "cinzel", name: "Cinzel", lizenz: "OFL", family: "var(--font-sf-cinzel), serif", hinweis: "Elegant, Versalien, Haarlinien dünn", hatFett: true, hatKursiv: false, breite: 0.72, fehlendeZeichen: "" },
  { id: "montserrat", name: "Montserrat", lizenz: "OFL", family: "var(--font-sf-montserrat), sans-serif", hinweis: "Schlicht, kräftig", hatFett: true, hatKursiv: true, breite: 0.64, fehlendeZeichen: "" },
  { id: "oswald", name: "Oswald", lizenz: "OFL", family: "var(--font-sf-oswald), sans-serif", hinweis: "Schmal, kräftig", hatFett: false, hatKursiv: false, breite: 0.46, fehlendeZeichen: "" },
  { id: "artsy-morning", name: "Artsy Morning", lizenz: "frei (Eko Bimantara)", family: "var(--font-sf-artsy), cursive", hinweis: "Pinsel-Schreibschrift", hatFett: false, hatKursiv: false, breite: 0.58, fehlendeZeichen: "ÄÖÜäöüß" },
  { id: "bulbear", name: "Bulbear", lizenz: "frei (Eko Bimantara)", family: "var(--font-sf-bulbear), cursive", hinweis: "Rund, verspielt, kräftig", hatFett: false, hatKursiv: false, breite: 0.65, fehlendeZeichen: "ß" },
  { id: "montague", name: "Montague", lizenz: "unklar (keine Lizenzdatei)", family: "var(--font-sf-montague), cursive", hinweis: "Klassische Schreibschrift", hatFett: false, hatKursiv: false, breite: 0.53, fehlendeZeichen: "" },
  { id: "oldwest", name: "Old West", lizenz: "frei (Eko Bimantara)", family: "var(--font-sf-oldwest), cursive", hinweis: "Western, Holzschnitt, kräftig", hatFett: false, hatKursiv: false, breite: 0.74, fehlendeZeichen: "ÄÖÜäöüß" },
  { id: "rosemartin", name: "Rosemartin", lizenz: "frei (Eko Bimantara)", family: "var(--font-sf-rosemartin), cursive", hinweis: "Schreibschrift", hatFett: false, hatKursiv: false, breite: 0.6, fehlendeZeichen: "ÄÖÜäöüß" },
  { id: "roundex", name: "Roundex", lizenz: "frei (Eko Bimantara)", family: "var(--font-sf-roundex), cursive", hinweis: "Rund, kräftig", hatFett: false, hatKursiv: false, breite: 0.55, fehlendeZeichen: "" },
  { id: "start-story", name: "Start Story", lizenz: "frei (Khurasan)", family: "var(--font-sf-startstory), cursive", hinweis: "Handschrift", hatFett: false, hatKursiv: false, breite: 0.56, fehlendeZeichen: "ÄÖÜäöüß" },
  { id: "street-year", name: "Street Year", lizenz: "frei (Khurasan)", family: "var(--font-sf-streetyear), cursive", hinweis: "Street-Stil, kräftig", hatFett: false, hatKursiv: false, breite: 0.65, fehlendeZeichen: "ÄÖÜäöüß" },
  { id: "the-sally", name: "The Sally", lizenz: "frei (Khurasan)", family: "var(--font-sf-sally), cursive", hinweis: "Schreibschrift", hatFett: false, hatKursiv: false, breite: 0.44, fehlendeZeichen: "ÄÖÜäöüß" },
  { id: "travellia", name: "Travellia", lizenz: "frei (Khurasan)", family: "var(--font-sf-travellia), cursive", hinweis: "Schreibschrift, schmal", hatFett: false, hatKursiv: false, breite: 0.39, fehlendeZeichen: "" },
  { id: "vegan-days", name: "Vegan Days", lizenz: "frei (Khurasan)", family: "var(--font-sf-vegan), cursive", hinweis: "Handschrift, sehr schmal", hatFett: false, hatKursiv: false, breite: 0.35, fehlendeZeichen: "ÄÖÜäöüß" },
  { id: "welcome-drama", name: "Welcome Drama", lizenz: "frei (Khurasan)", family: "var(--font-sf-drama), cursive", hinweis: "Schreibschrift", hatFett: false, hatKursiv: false, breite: 0.42, fehlendeZeichen: "ÄÖÜäöüß" },
  { id: "winter-draw", name: "Winter Draw", lizenz: "frei (Khurasan)", family: "var(--font-sf-winter), cursive", hinweis: "Gezeichnete Schrift", hatFett: false, hatKursiv: false, breite: 0.49, fehlendeZeichen: "ÄÖÜäöüß" },
  { id: "wood-dragon", name: "Wood Dragon", lizenz: "frei (Khurasan)", family: "var(--font-sf-dragon), cursive", hinweis: "Fantasy-Schrift", hatFett: false, hatKursiv: false, breite: 0.47, fehlendeZeichen: "ÄÖÜäöüß" },
];

// Erlaubte Zeichen (Schriftsubset): A-Z, Umlaute, ß, 0-9, . , ! ? & - ' und Leerzeichen
const ERLAUBT = /^[A-Za-zÄÖÜäöüß0-9 .,!?&'\-]$/;
export function unerlaubteZeichen(text: string): string[] {
  return Array.from(new Set(Array.from(text).filter((c) => !ERLAUBT.test(c))));
}

const UMLAUT_ERSATZ: Record<string, string> = { "ä": "ae", "ö": "oe", "ü": "ue", "Ä": "Ae", "Ö": "Oe", "Ü": "Ue", "ß": "ss" };

/** Zeichen im Text, die die gewählte Schrift nicht darstellen kann (Client UND Server). Unbekannte Schrift: []. */
export function fehlendeZeichen(text: string, schriftId: string): string[] {
  const s = SCHRIFTEN.find((x) => x.id === schriftId);
  if (!s || !s.fehlendeZeichen) return [];
  return Array.from(new Set(Array.from(text).filter((c) => s.fehlendeZeichen.includes(c))));
}

/** Ersetzt ä→ae, ö→oe, ü→ue, Ä→Ae, Ö→Oe, Ü→Ue, ß→ss. */
export function umlauteErsetzen(text: string, nur?: string): string {
  return text.replace(/[äöüÄÖÜß]/g, (c) => (nur === undefined || nur.includes(c) ? UMLAUT_ERSATZ[c] : c));
}

/** Verständliche Meldung für fehlende Zeichen, sonst null. */
export function fehlendeZeichenMeldung(text: string, schriftId: string): string | null {
  const f = fehlendeZeichen(text, schriftId);
  if (f.length === 0) return null;
  const s = SCHRIFTEN.find((x) => x.id === schriftId)!;
  const z = f.map((c) => `„${c}“`).join(", ");
  return `Die Schrift ${s.name} hat kein ${z}. Wähle eine andere Schrift${f.some((c) => c in UMLAUT_ERSATZ) ? " oder ersetze es (z. B. durch „ae“)" : ""}.`;
}
