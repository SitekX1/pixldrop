// Produktdaten. Später durch DB/Supabase ersetzbar, die Typen bleiben gleich.
// Keine erfundenen Maße, Gewichte oder Bewertungen: masse null = Maßblock wird nicht angezeigt.
import { halloweenModus } from "./config";

export type Kategorie = "halloween" | "untersetzer" | "sonstiges";
export type Form = "rund" | "set" | "pegel" | "schild" | "laterne" | "geister" | "teelicht" | "untersetzer-kuerbis";

export interface Optionsgruppe {
  id: string;
  label: string;
  optionen: { id: string; label: string }[];
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

export const PRODUKTE: Produkt[] = [
  {
    slug: "wochentags-untersetzer-set",
    name: "Wochentags-Untersetzer-Set Mo–Fr",
    kurz: "Fünf Untersetzer, ein Halter. Jeder Tag bekommt seine Tasse.",
    beschreibung:
      "Fünf Untersetzer für Montag bis Freitag mit Halter, damit der Tisch sauber bleibt, auch wenn der Kaffee es nicht ist. Auf Wunsch später mit QR-Code zum Song des Tages auf der Rückseite.",
    gruppe: "allgemein", kategorien: ["untersetzer"], form: "set", grundfarbe: "#4fb894",
    preisCent: TESTPREIS_CENT, masse: null, material: MATERIAL, optionen: [],
    personalisierung: null, hinweise: [HITZE, KEIN_SPIELZEUG], bestseller: true,
  },
  {
    slug: "koffein-pegel",
    name: "Koffein-Pegel zum Aufstellen",
    kurz: "Tischaufsteller mit Schieber. Zeigt in fünf Stufen, wie es dir geht.",
    beschreibung:
      "Ein kleiner Aufsteller mit Schieber in fünf Stufen. Du stellst ein, wie viel Kaffee schon durch ist, die Kollegen wissen Bescheid.",
    gruppe: "allgemein", kategorien: ["sonstiges"], form: "pegel", grundfarbe: "#6b4423",
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
    preisCent: TESTPREIS_CENT, masse: null, material: MATERIAL, optionen: [],
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
    name: "Geister-Set (3 kleine Geister)",
    kurz: "Drei Geister für LED-Mini-Teelichter. Verschluss unten.",
    beschreibung:
      "Drei kleine Geister, die mit einem LED-Mini-Teelicht von innen leuchten. Der Verschluss sitzt unten.",
    gruppe: "halloween", kategorien: ["halloween"], form: "geister", grundfarbe: "#f4f1ea",
    preisCent: TESTPREIS_CENT, masse: null, material: MATERIAL, optionen: [],
    personalisierung: null, hinweise: [LED, KEIN_SPIELZEUG],
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
    slug: "halloween-untersetzer",
    name: "Halloween-Untersetzer",
    kurz: "Der Untersetzer für die Tasse im Herbst, mit Halloween-Motiv.",
    beschreibung:
      "Ein Untersetzer mit Halloween-Motiv für die Tasse.",
    gruppe: "halloween", kategorien: ["halloween", "untersetzer"], form: "untersetzer-kuerbis", grundfarbe: "#ff8a1f",
    preisCent: TESTPREIS_CENT, masse: null, material: MATERIAL, optionen: [],
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

/** Individuell gefertigt = Text vorhanden und nicht der unveraenderte Standardtext (dann normale Standardware). */
export function istIndividuell(p: Produkt, text: string | null | undefined): boolean {
  const t = (text ?? "").trim();
  if (t === "" || !p.personalisierung) return false;
  return t !== standardText(p);
}
