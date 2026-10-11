// Produktdaten. Später durch DB/Supabase ersetzbar, die Typen bleiben gleich.
// Keine erfundenen Maße, Gewichte oder Bewertungen: masse null = Maßblock wird nicht angezeigt.
import { halloweenModus } from "./config";

export type Kategorie = "halloween" | "untersetzer" | "sonstiges";
export type Form = "rund" | "set" | "pegel" | "schild" | "laterne" | "geister" | "teelicht" | "untersetzer-kuerbis";

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
  /** Feste Schrift (id aus lib/shop/schriften.ts), keine Auswahl; andere Schrift nur ueber "Individuell anfragen". */
  festeSchrift?: string;
}

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
  personalisierung: null | Personalisierung;
  nurMitText?: boolean;
  /** Nur über „Individueller Druck“ (Preis nach Anfrage), nie im Warenkorb (Variante B). */
  nurAnfrage?: boolean;
  hinweise: string[];
  bestseller?: boolean;
}

const KEIN_SPIELZEUG = "Kein Spielzeug, nicht für Kinder.";
/** Hitzehinweis je Material. */
export function hitzeHinweis(material: string): string {
  const grenze = /petg/i.test(material) ? "ca. 70 °C" : "ca. 50 °C";
  return `Nicht für Töpfe oder direkt heiße Gefäße; nicht für dauerhaft über ${grenze}.`;
}
const LED = "Nicht für offene Flammen (nur mit LED-Teelichtern).";
const MATERIAL = "PLA"; // Alex trägt je Artikel das echte Material ein (PLA oder PETG)
const HITZE = hitzeHinweis(MATERIAL);
// TESTWERT: Testpreis (9,90 EUR) fuer alle bestellbaren Artikel, damit der Server Bestellungen annimmt.
// Alex ersetzt ihn je Artikel durch den echten Preis.
const TESTPREIS_CENT = 990;
const TESTAUFPREIS_BOX_CENT = 400;
// Kork-Unterseite (selbstklebend, 90 mm; Einkauf 24,90 EUR / 100 Stk = 0,25 EUR je Stueck).
// KORK_LIEFERBAR auf false setzen, solange der Kork nicht geliefert ist: dann verschwindet die Option.
const KORK_LIEFERBAR = true;
// TESTWERTE Aufpreis: Alex legt die echten Preise fest.
const korbGruppe = (aufpreisCent: number): Optionsgruppe[] => KORK_LIEFERBAR ? [{
  id: "kork", label: "Unterseite", optional: true,
  optionen: [{ id: "ohne", label: "Ohne Kork" }, { id: "mit", label: "Mit selbstklebendem Kork", aufpreisCent }],
}] : [];

export const PRODUKTE: Produkt[] = [
  {
    slug: "wochentags-untersetzer-set",
    name: "Wochentags-Untersetzer-Set Mo–Fr",
    kurz: "Fünf Untersetzer für Montag bis Freitag, auf Wunsch mit Box.",
    beschreibung:
      "Fünf Untersetzer für Montag bis Freitag, damit der Tisch sauber bleibt, auch wenn der Kaffee es nicht ist. Auf Wunsch mit passender Box, in die du die Untersetzer hineinstellst. Auf der Box sitzt ein QR-Code zu meinen Songs auf Spotify.",
    gruppe: "allgemein", kategorien: ["untersetzer"], form: "set", grundfarbe: "#4fb894",
    preisCent: TESTPREIS_CENT, masse: null, material: MATERIAL,
    // TESTWERT: Aufpreis Box (4,00 EUR), Alex legt den echten Preis fest.
    optionen: [
      { id: "box", label: "Box", optionen: [{ id: "ohne", label: "Ohne Box" }, { id: "mit", label: "Mit Box zum Hineinstellen", aufpreisCent: TESTAUFPREIS_BOX_CENT }] },
      ...korbGruppe(200),
    ],
    personalisierung: null, hinweise: [HITZE, KEIN_SPIELZEUG], bestseller: true,
  },
  {
    slug: "wochentags-untersetzer-einzeln",
    name: "Wochentags-Untersetzer einzeln",
    kurz: "Ein Untersetzer für deinen Wochentag, auf Wunsch mit Box.",
    beschreibung:
      "Ein einzelner Untersetzer mit deinem Wochentag, 90 mm Durchmesser. Wähle den Tag. Du möchtest alle fünf? Dann gibt es das Set Montag bis Freitag. Auf Wunsch mit passender Box, auf der ein QR-Code zu meinen Songs auf Spotify sitzt.",
    gruppe: "allgemein", kategorien: ["untersetzer"], form: "rund", grundfarbe: "#4fb894",
    preisCent: TESTPREIS_CENT, masse: null, material: MATERIAL,
    optionen: [
      { id: "tag", label: "Wochentag", optionen: [{ id: "mo", label: "Montag" }, { id: "di", label: "Dienstag" }, { id: "mi", label: "Mittwoch" }, { id: "do", label: "Donnerstag" }, { id: "fr", label: "Freitag" }] },
      { id: "box", label: "Box", optionen: [{ id: "ohne", label: "Ohne Box" }, { id: "mit", label: "Mit Box zum Hineinstellen", aufpreisCent: TESTAUFPREIS_BOX_CENT }] },
      ...korbGruppe(50),
    ],
    personalisierung: null, hinweise: [HITZE, KEIN_SPIELZEUG],
  },
  {
    slug: "stiftebecher-tasse",
    name: "Stiftebecher in Tassenform",
    kurz: "Der Stiftebecher fürs Büro, mit Lamellen und Kaffeetassen-Look.",
    beschreibung:
      "Ein Stiftebecher in Tassenform mit Lamellenstruktur. Er hält Stifte, Pinsel oder Lineale ordentlich beisammen und sieht dabei aus wie dein Kaffee.",
    gruppe: "allgemein", kategorien: ["sonstiges"], form: "rund", grundfarbe: "#6b4423",
    preisCent: TESTPREIS_CENT, masse: null, material: MATERIAL, optionen: [],
    personalisierung: null, hinweise: [KEIN_SPIELZEUG],
  },
  {
    slug: "spruch-untersetzer",
    name: "Spruch-Untersetzer mit deinem Text",
    kurz: "Name oder Spruch frei wählbar, Schrift aus zwölf Vorschlägen.",
    beschreibung:
      "Ein Untersetzer mit deinem Namen oder Spruch, in einer von zwölf Schriften. Jedes Stück wird einzeln für dich gedruckt.",
    gruppe: "allgemein", kategorien: ["untersetzer"], form: "rund", grundfarbe: "#f0bb55",
    preisCent: TESTPREIS_CENT, masse: null, material: MATERIAL, optionen: korbGruppe(100),
    personalisierung: { maxLaenge: 40, label: "Dein Text", beispiel: "Montag" },
    nurMitText: true, hinweise: [HITZE, KEIN_SPIELZEUG],
  },
  {
    slug: "tischschild-erster-kaffee",
    name: "Tischschild „Bitte nicht vor dem ersten Kaffee“",
    kurz: "Das Schild für den Schreibtisch. Der Name ist änderbar.",
    beschreibung:
      "Ein Tischschild mit dem Satz, den jeder schon mal denken wollte. Die kleine Zeile und der große Name sind vorbelegt („Teamleiter“, „Sabine“). Du kannst beide ändern, die Vorschau zeigt sofort, wie es aussieht.",
    gruppe: "allgemein", kategorien: ["sonstiges"], form: "schild", grundfarbe: "#1c1c1c",
    preisCent: TESTPREIS_CENT, masse: null, material: MATERIAL, optionen: [],
    personalisierung: {
      maxLaenge: 30, label: "Text auf dem Schild", beispiel: "Sabine", festeSchrift: "montserrat",
      zeilen: [
        { label: "Kleine Zeile oben links", max: 16, standard: "Teamleiter" },
        { label: "Große Zeile in der Mitte", max: 12, standard: "Sabine" },
      ],
    },
    hinweise: [KEIN_SPIELZEUG],
  },
  {
    slug: "kuerbis-laterne",
    name: "Kürbis-Laterne mit Gesicht",
    kurz: "Drei Gesichter, Drehverschluss unten, klein oder mittel.",
    beschreibung:
      "Eine ausgehöhlte Kürbis-Laterne für ein LED-Teelicht. Das Licht scheint durch das Gesicht. Der Drehverschluss sitzt unten, das Teelicht wechselst du ohne Werkzeug.",
    gruppe: "halloween", kategorien: ["halloween"], form: "laterne", grundfarbe: "#ff8a1f",
    preisCent: TESTPREIS_CENT, masse: null, material: MATERIAL,
    optionen: [
      { id: "gesicht", label: "Gesicht", optionen: [{ id: "a", label: "Gesicht A" }, { id: "b", label: "Gesicht B" }, { id: "c", label: "Gesicht C" }] },
      { id: "groesse", label: "Größe", optionen: [{ id: "klein", label: "Klein" }, { id: "mittel", label: "Mittel" }] },
    ],
    personalisierung: null, hinweise: [LED, KEIN_SPIELZEUG],
  },
  {
    slug: "geister-set",
    name: "Geister-Set groß (3 Geister)",
    kurz: "Drei Geister, groß genug für LED-Teelichter. Verschluss unten.",
    beschreibung:
      "Drei Geister, die mit einem LED-Teelicht von innen leuchten. Der Verschluss sitzt unten.",
    gruppe: "halloween", kategorien: ["halloween"], form: "geister", grundfarbe: "#f4f1ea",
    preisCent: TESTPREIS_CENT, masse: null, material: MATERIAL, optionen: [],
    personalisierung: null, hinweise: [LED, KEIN_SPIELZEUG],
  },
  {
    slug: "geister-set-klein",
    name: "Geister-Set klein (3 Geister)",
    kurz: "Drei kleine Geister als Deko, ohne Teelicht.",
    beschreibung:
      "Drei kleine Geister zum Hinstellen, dieselben wie im großen Set, nur kleiner. Es passt kein Teelicht hinein.",
    gruppe: "halloween", kategorien: ["halloween"], form: "geister", grundfarbe: "#f4f1ea",
    preisCent: TESTPREIS_CENT, masse: null, material: MATERIAL, optionen: [],
    personalisierung: null, hinweise: [KEIN_SPIELZEUG],
  },
  {
    slug: "kuerbis-teelichthalter",
    name: "Kürbis-Teelichthalter, offen",
    kurz: "Der einfache Einstieg: LED-Teelicht von oben einsetzen.",
    beschreibung:
      "Ein offener Kürbis-Halter. Das LED-Teelicht kommt von oben hinein, fertig. Der einfachste und günstigste Weg zur Deko.",
    gruppe: "halloween", kategorien: ["halloween"], form: "teelicht", grundfarbe: "#ff8a1f",
    preisCent: TESTPREIS_CENT, masse: null, material: MATERIAL, optionen: [],
    personalisierung: null, hinweise: [LED, KEIN_SPIELZEUG],
  },
  {
    slug: "halloween-untersetzer-set",
    name: "Halloween-Untersetzer-Set (3 Stück)",
    kurz: "Drei Untersetzer für die Tasse im Herbst, mit Halloween-Motiv.",
    beschreibung:
      "Drei Untersetzer mit Halloween-Motiv für die Tasse, 90 mm Durchmesser. Auch einzeln erhältlich.",
    gruppe: "halloween", kategorien: ["halloween", "untersetzer"], form: "untersetzer-kuerbis", grundfarbe: "#ff8a1f",
    preisCent: TESTPREIS_CENT, masse: null, material: MATERIAL, optionen: korbGruppe(150),
    personalisierung: null, hinweise: [HITZE, KEIN_SPIELZEUG],
  },
  {
    slug: "halloween-untersetzer-einzeln",
    name: "Halloween-Untersetzer einzeln",
    kurz: "Ein Untersetzer mit Halloween-Motiv, Motiv frei wählbar.",
    beschreibung:
      "Ein einzelner Untersetzer mit Halloween-Motiv, 90 mm Durchmesser. Wähle das Motiv. Du möchtest mehrere vom selben Motiv? Dann erhöhe die Menge.",
    gruppe: "halloween", kategorien: ["halloween", "untersetzer"], form: "untersetzer-kuerbis", grundfarbe: "#ff8a1f",
    preisCent: TESTPREIS_CENT, masse: null, material: MATERIAL,
    optionen: [
      { id: "motiv", label: "Motiv", optionen: [{ id: "kuerbis", label: "Kürbis" }, { id: "geister", label: "Geister" }, { id: "spukhaus", label: "Spukhaus" }] },
      ...korbGruppe(50),
    ],
    personalisierung: null, hinweise: [HITZE, KEIN_SPIELZEUG],
  },
];

export const KATEGORIEN: { id: "alle" | Kategorie; label: string }[] = [
  { id: "alle", label: "Alle" },
  { id: "halloween", label: "Halloween" },
  { id: "untersetzer", label: "Untersetzer" },
  { id: "sonstiges", label: "Sonstiges" },
];

/** Sichtbare Produkte: Halloween-Artikel nur, wenn der Modus nicht "off" ist. */
export function sichtbareProdukte(): Produkt[] {
  const aus = halloweenModus() === "off";
  return PRODUKTE.filter((p) => !(aus && p.gruppe === "halloween"));
}

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
  return z ? z.map((x) => x.standard).join("\n") : null;
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
