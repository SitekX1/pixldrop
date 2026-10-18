// Produktdaten. Später durch DB/Supabase ersetzbar, die Typen bleiben gleich.
// Keine erfundenen Maße, Gewichte oder Bewertungen: masse null = Maßblock wird nicht angezeigt.
import { halloweenModus, TEXTE } from "./config";
const TEXTE_LED = TEXTE.ledHinweis;

export type Kategorie = "halloween" | "untersetzer" | "sonstiges";
export type Form = "rund" | "set" | "pegel" | "schild" | "laterne" | "tasse" | "geister" | "teelicht" | "untersetzer-kuerbis";

export interface Optionsgruppe {
  id: string;
  label: string;
  /** optional: fehlt die Wahl, gilt die erste Option (ohne Aufpreis). */
  optional?: boolean;
  /** aufpreisCent: Aufpreis in Cent je Stueck, wenn diese Option gewaehlt ist (Standard 0). */
  optionen: { id: string; label: string; aufpreisCent?: number }[];
}

export interface TextZeile { label: string; max: number; standard: string }
export interface Personalisierung {
  maxLaenge: number;
  label: string;
  beispiel: string;
  /** Mehrzeiliger Text (Tischschild): je Zeile Label, Maximallaenge und Standardtext. Gespeichert als "zeile1
zeile2". */
  zeilen?: TextZeile[];
  /** Feste Schrift (id aus lib/shop/schriften.ts), keine Auswahl; Schrift ausserhalb der Shop-Liste nur ueber "Individuell anfragen". */
  festeSchrift?: string;
  /** Vorbelegte Schrift (id), Kunde darf trotzdem wechseln. */
  standardSchrift?: string;
  /** Schrift füllt die Zeile (Namensschild): keine Größenstufen, der Name wird so groß wie möglich (lib/shop/namensschild.ts). */
  fuellt?: boolean;
  /** Vorbelegter Text bei einzeiligen Artikeln (ohne `zeilen`). Der unveränderte Standardtext bleibt Standardware (Widerruf). */
  standardText?: string;
  /** Eigene Schrift je Zeile (Namensschild: Name und Titel getrennt, Titelschrift in optionen.schriftTitel). */
  schriftJeZeile?: boolean;
  /** Freie Textfläche des runden Artikels: Standard = Spruch-/Stiftetassen-Fläche, "untersetzer" = Mitte innerhalb der Zierlinien. */
  flaeche?: "untersetzer" | "becher";
}

/** Fertige Farbkombination (statt Lagerfarb-Wahl). Erweiterbar: einfach einen Eintrag in KOMBI_WOCHENTAG ergaenzen. */
export interface Farbkombination { id: string; label: string; farben: { name: string; hex: string }[] }
export const KOMBI_KEY = "farbkombi";

export interface Produkt {
  slug: string;
  name: string;
  kurz: string;
  beschreibung: string;
  gruppe: "allgemein" | "halloween";
  kategorien: Kategorie[];
  form: Form;
  grundfarbe: string; // nur für den Bildplatzhalter
  preisCent: number | null; // null = "Preis auf Anfrage"
  masse: string | null; // "L × B × H" in mm, z. B. "90 × 90 × 6"; null = keine Maßangabe, Block entfällt
  toleranzMm?: string; // z. B. "0,5"; gehört zur Maßangabe; fehlt sie, gilt der allgemeine FDM-Hinweis
  material: string;
  optionen: Optionsgruppe[];
  /** Fertige Farbkombinationen; gesetzt = keine Lagerfarb-Wahl, Auswahl als optionen.farbkombi (erste = Standard). */
  kombinationen?: Farbkombination[];
  /** Mehrteilige Artikel: je Teil eine Lagerfarbe (Auswahl.teilFarben: teilId -> farbeId). */
  teile?: { id: string; label: string; /** Vorauswahl: ähnlichste Lagerfarbe zu dieser Farbe (sonst Standard je Teil-ID, siehe teilfarben.ts) */ referenz?: string }[];
  personalisierung: null | Personalisierung;
  /** Zusätzlich wählbare Linienfarbe (Zierlinien am Rand, Individueller Untersetzer): Lagerfarbe, hebt sich vom Untergrund ab. */
  linienfarbe?: boolean;
  nurMitText?: boolean;
  /** Nur über „Individueller Druck“ (Preis nach Anfrage), nie im Warenkorb (Variante B). */
  nurAnfrage?: boolean;
  hinweise: string[];
  bestseller?: boolean;
  /** Platzhalter ohne fertige Daten (Preis, Maße, Gewicht, Fotos): nur in Vorschau/lokal sichtbar (VERCEL_ENV !== production), nie im Live-Shop. Flag entfernen, sobald alles stimmt. */
  entwurf?: boolean;
}

const KEIN_SPIELZEUG = "Kein Spielzeug. Enthält Kleinteile bzw. kann zerbrechen: von Kleinkindern fernhalten.";
/** Hitzehinweis je Material. */
export function hitzeHinweis(material: string, untersetzer = false): string {
  const grenze = /petg/i.test(material) ? "ca. 70 °C" : "ca. 50 °C";
  const nur = grenze.replace("ca. ", "");
  return untersetzer
    ? `Für Tassen und Gläser bis etwa ${nur} Bodentemperatur. Nicht für frisch aufgebrühte heiße Getränke (Tasse kurz abkühlen lassen), nicht für Töpfe, Pfannen oder Backofen und nicht dauerhaft über ${grenze}. Wärme verformt den Kunststoff; eine Verformung durch Hitze ist kein Mangel (AGB Ziffer 11 Abs. 4).`
    : `Nicht für Töpfe, Pfannen oder Backofen und nicht dauerhaft über ${grenze}. Wärme verformt den Kunststoff.`;
}
const LED = TEXTE_LED; // Wortlaut zentral in lib/shop/config.ts (GPSR Art. 19, Justus 2026-10-16)
const MATERIAL = "PLA"; // alle Shop-Artikel sind PLA (Alex 16.10.); PETG nur bei individuellen Anfragen auf Angebot
const HITZE = hitzeHinweis(MATERIAL, true); // alle Artikel mit HITZE sind Untersetzer
// Preise (Alex, 2026-10-15, Karla-Kalkulation): je Artikel direkt bei preisCent. Kork: 30 Cent je Untersetzer, nicht im Grundpreis.
const AUFPREIS_BOX_CENT = 490; // Box: Set 14,90 -> 19,80 EUR, Einzel 5,90 -> 10,80 EUR
// Kork-Unterseite (selbstklebend, 90 mm; Einkauf 24,90 EUR / 100 Stk = 0,25 EUR je Stueck).
// KORK_LIEFERBAR auf false setzen, solange der Kork nicht geliefert ist: dann verschwindet die Option.
const KORK_LIEFERBAR = true;
const korbGruppe = (aufpreisCent: number): Optionsgruppe[] => KORK_LIEFERBAR ? [{
  id: "kork", label: "Unterseite", optional: true,
  optionen: [{ id: "ohne", label: "Ohne Kork" }, { id: "mit", label: "Mit selbstklebendem Kork", aufpreisCent }],
}] : [];

const SCHWARZ = { name: "Schwarz", hex: "#1c1c1c" };
const WEISS = { name: "Weiß", hex: "#f4f1ea" };
const TUERKIS = { name: "Türkis", hex: "#2bb8a8" };
const ORANGE = { name: "Orange", hex: "#ff6a13" };
const VIOLETT = { name: "Violett", hex: "#7a3fb0" };
// Einzelfarben als „Kombinationen“ mit je einer Farbe (Skelett: nur diese drei Farben, kein freies Lager)
const FARBEN_SKELETT: Farbkombination[] = [
  { id: "weiss", label: "Weiß", farben: [WEISS] },
  { id: "violett", label: "Violett", farben: [VIOLETT] },
  { id: "orange", label: "Orange", farben: [ORANGE] },
];
// Feste Farbe ohne Auswahl (Halloween-Untersetzer: nur die abgebildete Ausführung schwarz/orange/weiß, Alex 18.10.): eine einzige Kombination, die Seite zeigt sie als Hinweis statt als Auswahl
const FARBEN_NUR_SCHWARZ: Farbkombination[] = [{ id: "wie-abgebildet", label: "Wie abgebildet", farben: [SCHWARZ, ORANGE, WEISS] }];
/** Artikel mit nur einer Farbe je Auswahl heißen „Farbe“ statt „Farbkombination“. */
export const nurEinzelfarben = (p: { kombinationen?: Farbkombination[] }): boolean => !!p.kombinationen?.every((k) => k.farben.length === 1);
const KOMBI_WOCHENTAG: Farbkombination[] = [
  { id: "schwarz-tuerkis-weiss", label: "Schwarz / Türkis / Weiß", farben: [SCHWARZ, TUERKIS, WEISS] },
  { id: "schwarz-orange-weiss", label: "Schwarz / Orange / Weiß", farben: [SCHWARZ, ORANGE, WEISS] },
  { id: "schwarz-violett-tuerkis", label: "Schwarz / Violett / Türkis", farben: [SCHWARZ, VIOLETT, TUERKIS] },
];

export const PRODUKTE: Produkt[] = [
  {
    slug: "wochentags-untersetzer-set",
    name: "Wochentags-Untersetzer-Set Mo–Fr",
    kurz: "Fünf Untersetzer für Montag bis Freitag, auf Wunsch mit Box.",
    beschreibung:
      "Fünf Untersetzer für Montag bis Freitag, damit der Tisch sauber bleibt. Auf Wunsch mit passender Box, in die du die Untersetzer hineinstellst. Auf der Unterseite der Box sitzt ein QR-Code zu meinen Songs auf Spotify.",
    gruppe: "allgemein", kategorien: ["untersetzer"], form: "set", grundfarbe: "#4fb894",
    preisCent: 1490, masse: null, material: MATERIAL,
    optionen: [
      { id: "box", label: "Box", optionen: [{ id: "ohne", label: "Ohne Box" }, { id: "mit", label: "Mit Box zum Hineinstellen", aufpreisCent: AUFPREIS_BOX_CENT }] },
      ...korbGruppe(150),
    ],
    kombinationen: KOMBI_WOCHENTAG,
    personalisierung: null, hinweise: [HITZE, KEIN_SPIELZEUG], bestseller: true,
  },
  {
    slug: "wochentags-untersetzer-einzeln",
    name: "Wochentags-Untersetzer einzeln",
    kurz: "Ein Untersetzer für deinen Wochentag, auf Wunsch mit Box.",
    beschreibung:
      "Ein einzelner Untersetzer mit deinem Wochentag, 90 mm Durchmesser. Wähle den Tag. Du möchtest alle fünf? Dann gibt es das Set Montag bis Freitag. Auf Wunsch mit passender Box, auf der ein QR-Code zu meinen Songs auf Spotify sitzt.",
    gruppe: "allgemein", kategorien: ["untersetzer"], form: "rund", grundfarbe: "#4fb894",
    preisCent: 590, masse: null, material: MATERIAL,
    optionen: [
      { id: "tag", label: "Wochentag", optionen: [{ id: "mo", label: "Montag" }, { id: "di", label: "Dienstag" }, { id: "mi", label: "Mittwoch" }, { id: "do", label: "Donnerstag" }, { id: "fr", label: "Freitag" }] },
      { id: "box", label: "Box", optionen: [{ id: "ohne", label: "Ohne Box" }, { id: "mit", label: "Mit Box zum Hineinstellen", aufpreisCent: AUFPREIS_BOX_CENT }] },
      ...korbGruppe(30),
    ],
    kombinationen: KOMBI_WOCHENTAG,
    personalisierung: null, hinweise: [HITZE, KEIN_SPIELZEUG],
  },
  {
    slug: "stiftebecher-tasse",
    name: "Stiftebecher in Tassenform",
    kurz: "Der Stiftebecher fürs Büro, mit Lamellen und Kaffeetassen-Look.",
    beschreibung:
      "Ein Stiftebecher in Tassenform mit Lamellenstruktur. Er hält Stifte, Pinsel oder Lineale ordentlich beisammen und sieht dabei aus wie dein Kaffee. Auf Wunsch mit einer Textzeile in einer von 25 Schriften; änderst du den Text, wird das Stück einzeln für dich gefertigt.",
    gruppe: "allgemein", kategorien: ["sonstiges"], form: "tasse", grundfarbe: "#6b4423",
    preisCent: 1290, masse: null, material: MATERIAL, optionen: [],
    personalisierung: { maxLaenge: 14, label: "Text auf der Tasse", beispiel: "Stifte", standardSchrift: "montserrat", flaeche: "becher" },
    hinweise: [KEIN_SPIELZEUG],
  },
  {
    slug: "spruch-untersetzer",
    name: "Individueller Untersetzer mit deinem Text",
    kurz: "Dein Text in der Mitte, Untersetzer-, Linien- und Textfarbe wählst du selbst.",
    beschreibung:
      "Ein Untersetzer mit deinem Text in der Mitte, 90 mm Durchmesser. Vorbelegt ist „PixlDrop“, du schreibst stattdessen deinen Namen, ein Wort oder einen kurzen Spruch. Du wählst Schrift, Untersetzerfarbe, Linienfarbe (die dünnen Zierlinien am Rand) und Textfarbe. Die Vorschau zeigt deine Wahl auf dem Foto, jedes Stück wird einzeln für dich gedruckt. Auf Wunsch mit selbstklebendem Kork auf der Unterseite.",
    gruppe: "allgemein", kategorien: ["untersetzer"], form: "rund", grundfarbe: "#1c1c1c",
    preisCent: 590, masse: null, material: MATERIAL, optionen: korbGruppe(30),
    personalisierung: { maxLaenge: 40, label: "Dein Text", beispiel: "PixlDrop", standardText: "PixlDrop", flaeche: "untersetzer", standardSchrift: "montserrat" },
    linienfarbe: true,
    nurMitText: true, hinweise: [HITZE, KEIN_SPIELZEUG],
  },
  {
    slug: "namensschild",
    name: "Namensschild für den Schreibtisch",
    kurz: "Dein Name groß, darunter dein Titel. Schrift und Farben wählst du selbst.",
    beschreibung:
      "Ein Namensschild mit Ständer für den Schreibtisch: Dein Name steht groß in der Mitte, darunter dein Titel (vorbelegt sind „Eddie Pixldrop“ und „Content Creator“). Die Schrift ist bündig ins Schild eingelegt. Du wählst Schrift, Schildfarbe und Schriftfarbe, die Vorschau zeigt das Schild nahezu genau so; die Position der Schrift wird beim Druck bei Bedarf um wenige Millimeter angepasst.",
    gruppe: "allgemein", kategorien: ["sonstiges"], form: "schild", grundfarbe: "#1c1c1c",
    preisCent: 1690, masse: null, material: MATERIAL, optionen: [],
    personalisierung: {
      maxLaenge: 40, label: "Text auf dem Schild", beispiel: "Eddie Pixldrop", standardSchrift: "montserrat", fuellt: true, schriftJeZeile: true,
      zeilen: [
        { label: "Name (große Zeile)", max: 20, standard: "Eddie Pixldrop" },
        { label: "Titel (kleine Zeile)", max: 28, standard: "Content Creator" },
      ],
    },
    hinweise: [KEIN_SPIELZEUG],
  },
  {
    slug: "kuerbis-laterne",
    name: "Kürbis",
    kurz: "Kürbis mit Gesicht und Teelicht-Öffnung unten, ca. 11 cm hoch.",
    beschreibung:
      "Ein ausgehöhlter Kürbis für ein LED-Teelicht. Das Licht scheint durch das Gesicht. Das LED-Teelicht setzt du unten durch die Öffnung ein, ganz ohne Werkzeug.",
    gruppe: "halloween", kategorien: ["halloween"], form: "laterne", grundfarbe: "#ff8a1f",
    preisCent: 1290, masse: null, material: MATERIAL,
    teile: [{ id: "koerper", label: "Kürbis" }, { id: "stiel", label: "Stiel" }],
    optionen: [],
    personalisierung: null, hinweise: [LED, KEIN_SPIELZEUG],
  },
  {
    slug: "skelett-beweglich",
    name: "Bewegliches Skelett",
    kurz: "Ein kleines Skelett mit beweglichen Gelenken, ca. 19 cm groß. In Weiß, Violett oder Orange.",
    beschreibung:
      "Ein kleines Skelett zum Aufstellen, Hinsetzen oder Aufhängen, ca. 19 cm groß. Arme, Beine, Hals und Taille sind mit kleinen Kettengliedern verbunden und lassen sich bewegen, sodass du es in jede Pose setzen kannst. Es wird in einem Stück gedruckt, du musst nichts zusammenbauen. Am Kopf sitzt eine kleine Öse zum Aufhängen mit Schnur oder Faden (Schnur nicht dabei). Du wählst Weiß, Violett oder Orange; die Fotos zeigen die weiße Ausführung. Die Gelenke sind filigran, bitte bewege sie vorsichtig.",
    gruppe: "halloween", kategorien: ["halloween"], form: "geister", grundfarbe: "#f4f1ea",
    preisCent: 999, masse: "75 × 37 × 187", material: MATERIAL, optionen: [],
    kombinationen: FARBEN_SKELETT,
    personalisierung: null, hinweise: [KEIN_SPIELZEUG],
  },
  {
    slug: "geister-set",
    name: "Geister-Set groß (3 Geister)",
    kurz: "Drei Geister, groß genug für LED-Teelichter. Verschluss unten.",
    beschreibung:
      "Drei Geister, die mit einem LED-Teelicht von innen leuchten. Der Verschluss sitzt unten.",
    gruppe: "halloween", kategorien: ["halloween"], form: "geister", grundfarbe: "#f4f1ea",
    preisCent: 1190, masse: null, material: MATERIAL, optionen: [],
    personalisierung: null, hinweise: [LED, KEIN_SPIELZEUG],
  },
  {
    slug: "geister-set-klein",
    name: "Geister-Set klein (3 Geister)",
    kurz: "Drei kleine Geister als Deko, ohne Teelicht.",
    beschreibung:
      "Drei kleine Geister zum Hinstellen, dieselben wie im großen Set, nur kleiner. Es passt kein Teelicht hinein.",
    gruppe: "halloween", kategorien: ["halloween"], form: "geister", grundfarbe: "#f4f1ea",
    preisCent: 690, masse: null, material: MATERIAL, optionen: [],
    personalisierung: null, hinweise: [KEIN_SPIELZEUG],
  },
  {
    slug: "kuerbis-klein-set",
    name: "Mini-Kürbisse mit Gesicht (4er-Set)",
    kurz: "Vier lustige Deko-Kürbisse mit Gesicht.",
    beschreibung:
      "Vier lustige Deko-Kürbisse mit Gesicht zum Hinstellen, jeder mit anderem Gesichtsausdruck. Sie sind 50 mm hoch und 35 bis 60 mm breit, innen massiv, ohne Teelicht. Eine kleine Deko für Fensterbank, Tisch oder Regal.",
    gruppe: "halloween", kategorien: ["halloween"], form: "laterne", grundfarbe: "#ff8a1f",
    preisCent: 990, masse: "60 × 60 × 50", material: MATERIAL, optionen: [],
    personalisierung: null, hinweise: [KEIN_SPIELZEUG],
  },
  // Gruppe "allgemein": bleibt nach Halloween im Shop (Alex 18.10.), steht in der Übersicht bei den normalen Produkten, in der Halloween-Kollektion nur über die Kategorie
  {
    slug: "kuerbis-teelichthalter",
    name: "Kürbis-Teelichthalter, offen",
    kurz: "Der einfache Einstieg: LED-Teelicht von oben einsetzen.",
    beschreibung:
      "Ein offener Kürbis-Halter. Das LED-Teelicht kommt von oben hinein, fertig. Der einfachste und günstigste Weg zur Deko.",
    gruppe: "allgemein", kategorien: ["halloween", "sonstiges"], form: "teelicht", grundfarbe: "#ff8a1f",
    preisCent: 790, masse: null, material: MATERIAL, optionen: [],
    personalisierung: null, hinweise: [LED, KEIN_SPIELZEUG],
  },
  {
    slug: "halloween-untersetzer-set",
    name: "Halloween-Untersetzer-Set (3 Stück)",
    kurz: "Drei Untersetzer für die Tasse im Herbst, mit Halloween-Motiv.",
    beschreibung:
      "Drei Untersetzer mit Halloween-Motiv für die Tasse, 90 mm Durchmesser. Auch einzeln erhältlich.",
    gruppe: "halloween", kategorien: ["halloween", "untersetzer"], form: "untersetzer-kuerbis", grundfarbe: "#1c1c1c",
    preisCent: 1190, masse: null, material: MATERIAL, optionen: korbGruppe(90),
    kombinationen: FARBEN_NUR_SCHWARZ,
    personalisierung: null, hinweise: [HITZE, KEIN_SPIELZEUG],
  },
  {
    slug: "halloween-untersetzer-einzeln",
    name: "Halloween-Untersetzer einzeln",
    kurz: "Ein Untersetzer mit Halloween-Motiv, Motiv frei wählbar.",
    beschreibung:
      "Ein einzelner Untersetzer mit Halloween-Motiv, 90 mm Durchmesser. Wähle das Motiv. Du möchtest mehrere vom selben Motiv? Dann erhöhe die Menge.",
    gruppe: "halloween", kategorien: ["halloween", "untersetzer"], form: "untersetzer-kuerbis", grundfarbe: "#1c1c1c",
    preisCent: 590, masse: null, material: MATERIAL,
    optionen: [
      { id: "motiv", label: "Motiv", optionen: [{ id: "kuerbis", label: "Kürbis" }, { id: "geister", label: "Geister" }, { id: "spukhaus", label: "Spukhaus" }] },
      ...korbGruppe(30),
    ],
    kombinationen: FARBEN_NUR_SCHWARZ,
    personalisierung: null, hinweise: [HITZE, KEIN_SPIELZEUG],
  },
  {
    slug: "design-kuerbis",
    name: "Design-Kürbis",
    kurz: "Moderner Deko-Kürbis mit geschwungenen Lamellen, ca. 11 cm hoch. Farbe von Kürbis und Strunk wählbar.",
    beschreibung:
      "Ein Kürbis als Herbstdeko, ganz ohne Gesicht: 18 geschwungene Lamellen laufen wie gedreht um den Körper, oben sitzt ein gebogener Strunk mit gebrochener Spitze. Der Kürbis steht sicher auf einer flachen Bodenfläche und passt auf Fensterbank, Sideboard oder Esstisch. Er ist ein reines Deko-Stück ohne Öffnung, ein Teelicht passt nicht hinein. Körper und Strunk werden getrennt gedruckt und von mir zusammengesteckt und verklebt, deshalb kannst du beide Teile in einer eigenen Farbe wählen. Die Oberfläche ist fein und leicht rau, die Lamellen sieht man auch im Streiflicht. Die Fotos zeigen den Kürbis in Sand mit weißem Strunk, das erste Foto färbt sich nach deiner Wahl um.",
    gruppe: "allgemein", kategorien: ["halloween", "sonstiges"], form: "laterne", grundfarbe: "#d9731a",
    preisCent: 1190, masse: "110 × 110 × 115", material: MATERIAL, // Richtpreis (Karla 18.10.), Alex entscheidet; weitere Größen klein 55 × 57 mm (max. 6,90 €) und groß 140 × 145 mm folgen später
    teile: [{ id: "koerper", label: "Kürbis", referenz: "#c2ad96" }, { id: "stiel", label: "Strunk", referenz: "#f4f1ea" }],
    optionen: [], // Größenauswahl (klein/mittel/groß) kommt, sobald die anderen Größen gedruckt sind; Versandmaße je Größe liegen schon in versand.ts
    personalisierung: null, hinweise: [KEIN_SPIELZEUG], entwurf: true,
  },
];

export const KATEGORIEN: { id: "alle" | Kategorie; label: string }[] = [
  { id: "alle", label: "Alle" },
  { id: "halloween", label: "Halloween" },
  { id: "untersetzer", label: "Untersetzer" },
  { id: "sonstiges", label: "Sonstiges" },
];

/** Echte Live-Seite (Vercel-Production). Vorschau-Deployments und lokale Entwicklung zeigen Entwurfs-Produkte, Production nie. */
const liveUmgebung = (): boolean => typeof process !== "undefined" && process.env?.VERCEL_ENV === "production";

/** Sichtbare Produkte: Halloween-Artikel nur, wenn der Modus nicht "off" ist. */
export function sichtbareProdukte(): Produkt[] {
  const aus = halloweenModus() === "off";
  return PRODUKTE.filter((p) => !(aus && p.gruppe === "halloween") && !(p.entwurf && liveUmgebung()));
}

/** Artikelnummern (Produktidentifikation nach GPSR); stabil halten, nie umnummerieren. */
const ARTIKELNR: Record<string, string> = {
  "wochentags-untersetzer-set": "PD-001",
  "wochentags-untersetzer-einzeln": "PD-002",
  "stiftebecher-tasse": "PD-003",
  "spruch-untersetzer": "PD-004",
  "namensschild": "PD-005",
  "kuerbis-laterne": "PD-006",
  "skelett-beweglich": "PD-013",
  "geister-set": "PD-007",
  "geister-set-klein": "PD-008",
  "kuerbis-klein-set": "PD-009",
  "kuerbis-teelichthalter": "PD-010",
  "halloween-untersetzer-set": "PD-011",
  "halloween-untersetzer-einzeln": "PD-012",
  "design-kuerbis": "PD-014",
};
export function artikelnummer(slug: string): string | null { return ARTIKELNR[slug] ?? null; }
/** Teelichtfach (aus dem Modell gemessen): nur Artikel mit offenem Fach. */
export const TEELICHTFACH: Record<string, string> = { "kuerbis-teelichthalter": "Durchmesser ca. 42 mm, Tiefe ca. 20 mm" };

export function holeProdukt(slug: string): Produkt | undefined {
  return sichtbareProdukte().find((p) => p.slug === slug);
}

/** Live-Betrieb (PAYPAL_ENV=live). Nur serverseitig sinnvoll; im Browser immer false. */
export function istLiveBetrieb(): boolean {
  return typeof process !== "undefined" && process.env?.PAYPAL_ENV === "live";
}

export function istBestellbar(p: Produkt): boolean {
  if (p.nurAnfrage) return false;
  return p.gruppe !== "halloween" || halloweenModus() === "sale";
}

/** Der vorbelegte Standardtext (mehrzeilig, mit "\n" verbunden) oder null, wenn der Artikel keinen hat. */
export function standardText(p: Produkt): string | null {
  const z = p.personalisierung?.zeilen;
  return z ? z.map((x) => x.standard).join("\n") : p.personalisierung?.standardText ?? null;
}

/**
 * Individuell gefertigt (Widerrufsausschluss) = Text vorhanden UND Text vom Standardtext abweichend (beim Untersetzer:
 * jeder eigene Text). Format (Fett/Kursiv) und Groessenstufe allein machen das Stueck NICHT individuell: das ist eine
 * Variantenwahl, der Widerruf bleibt. Kommt ein geaenderter Text dazu, ist es wegen des Textes individuell.
 * `optionen` bleibt als Parameter fuer bestehende Aufrufer, wird bewusst nicht ausgewertet.
 */
export function istIndividuell(p: Produkt, text: string | null | undefined, _optionen?: Record<string, unknown> | null): boolean {
  const t = (text ?? "").trim();
  if (t === "" || !p.personalisierung) return false;
  return t !== standardText(p);
}

/** Abweichung vom Standardformat in `optionen` (fett_i/kursiv_i = "1" oder groesse != "m"). */
export function hatFormatwahl(optionen?: Record<string, unknown> | null): boolean {
  if (!optionen) return false;
  return Object.entries(optionen).some(([k, v]) => (/^(fett|kursiv)_\d$/.test(k) && v === "1") || (k === "groesse" && v !== "m"));
}

/** Einzelpreis in Cent inkl. Aufpreisen der gewaehlten Optionen (id je Gruppe). null = Preis folgt. Gilt fuer Server und Anzeige. */
export function einzelpreisCent(p: Produkt, optionen?: Record<string, unknown> | null): number | null {
  if (p.preisCent == null) return null;
  let s = p.preisCent;
  for (const g of p.optionen) {
    const gewaehlt = optionen?.[g.id];
    s += g.optionen.find((o) => o.id === gewaehlt)?.aufpreisCent ?? 0;
  }
  return s;
}
