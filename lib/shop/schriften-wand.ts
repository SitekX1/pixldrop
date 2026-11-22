// Schriften für die geplanten Wandbuchstaben/Wandtexte (noch kein Konfigurator, nur Vorbereitung).
// Orientiert an der Auswahl von n3ddesign.com; nur kostenlose, kommerziell nutzbare Äquivalente (SIL OFL 1.1 laut Google Fonts).
// Selbst gehostet über next/font (app/3d-druck/fonts.ts, Variablen --font-wand-*), kein Request an Google im Browser.
// Lizenz je Schrift belegt Dr. Justus später (siehe SCHRIFTEN-LIZENZEN.md). Druckbarkeit: Alex prüft am Probedruck.
export type WandKategorie = "elegant-gross" | "zuhause-klein";

export interface WandSchrift {
  id: string;
  name: string;
  lizenz: "OFL";
  kategorie: WandKategorie;
  /** CSS font-family (Variable aus fonts.ts). */
  family: string;
  /** Vorbild bei n3ddesign.com (nur Orientierung). */
  vorbild: string;
  /** Hinweis zur Druckbarkeit (Strichstärke, Haarlinien). */
  druck: string;
}

export const WAND_SCHRIFTEN: WandSchrift[] = [
  { id: "libre-baskerville", name: "Libre Baskerville", lizenz: "OFL", kategorie: "elegant-gross", family: "var(--font-wand-baskerville), Georgia, serif", vorbild: "Baskerville / Times New Roman", druck: "Serife mit Haarlinien: erst ab ca. 10 cm Höhe sicher druckbar" },
  { id: "cormorant", name: "Cormorant Garamond", lizenz: "OFL", kategorie: "elegant-gross", family: "var(--font-wand-cormorant), Georgia, serif", vorbild: "The Seasons / Alta", druck: "Sehr feine Haarlinien: nur Bold und ab ca. 12 cm, Probedruck nötig" },
  { id: "playfair", name: "Playfair Display", lizenz: "OFL", kategorie: "elegant-gross", family: "var(--font-sf-playfair), Georgia, serif", vorbild: "Glamour / Gentlemens", druck: "Starker Strichkontrast, Haarlinien dünn: Bold ab ca. 10 cm" },
  { id: "great-vibes", name: "Great Vibes", lizenz: "OFL", kategorie: "elegant-gross", family: "var(--font-wand-greatvibes), cursive", vorbild: "Beyond Script / Gistesy", druck: "Schreibschrift mit dünnen Verbindungen: nur große Höhen, Strichstärke am Probedruck prüfen" },
  { id: "montserrat", name: "Montserrat", lizenz: "OFL", kategorie: "elegant-gross", family: "var(--font-sf-montserrat), system-ui, sans-serif", vorbild: "Montserrat / Kenao Sans", druck: "Gleichmäßiger Strich, in Bold gut druckbar" },
  { id: "outfit", name: "Outfit", lizenz: "OFL", kategorie: "elegant-gross", family: "var(--font-wand-outfit), system-ui, sans-serif", vorbild: "Aileron / Kenao Sans", druck: "Geometrisch, in Semibold/Bold gut druckbar" },
  { id: "arimo", name: "Arimo", lizenz: "OFL", kategorie: "zuhause-klein", family: "var(--font-wand-arimo), Arial, sans-serif", vorbild: "Arial", druck: "Arial-ähnlich (metrisch kompatibel), Bold unkritisch" },
  { id: "courier-prime", name: "Courier Prime", lizenz: "OFL", kategorie: "zuhause-klein", family: "var(--font-wand-courier), 'Courier New', monospace", vorbild: "Courier New", druck: "Schreibmaschine mit Serifen: nur Bold, ab ca. 6 cm" },
  { id: "parisienne", name: "Parisienne", lizenz: "OFL", kategorie: "elegant-gross", family: "var(--font-wand-parisienne), cursive", vorbild: "Pinselschrift wie „beautiful“ (Referenzfoto)", druck: "Feine Pinselschrift mit dünnen Verbindungen: erst ab ca. 12 cm Höhe, Probedruck nötig" },
  { id: "marck-script", name: "Marck Script", lizenz: "OFL", kategorie: "zuhause-klein", family: "var(--font-wand-marck), cursive", vorbild: "Pinselschrift wie „beautiful“ (Referenzfoto)", druck: "Aufrechte Pinselschrift, kräftiger Strich: ab ca. 8 cm gut druckbar" },
  { id: "mansalva", name: "Mansalva", lizenz: "OFL", kategorie: "zuhause-klein", family: "var(--font-wand-mansalva), cursive", vorbild: "Mansalva", druck: "Handschrift, Strich kräftig genug, enge Buchstabenabstände prüfen" },
  { id: "dancing-script", name: "Dancing Script", lizenz: "OFL", kategorie: "zuhause-klein", family: "var(--font-sf-dancing), cursive", vorbild: "Beyond Script", druck: "Schreibschrift, Bold ok, Verbindungen ab ca. 5 cm Höhe" },
];

export const WAND_KATEGORIE_LABEL: Record<WandKategorie, string> = { "elegant-gross": "Elegant, groß", "zuhause-klein": "Zuhause, klein" };
