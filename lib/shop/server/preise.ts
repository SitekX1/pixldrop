import { pruefeWunschtext } from "@/lib/shop/textfilter";
import "server-only";
// Serverseitige Preis- und Warenkorbberechnung. Preise kommen AUSSCHLIESSLICH aus
// lib/shop/produkte.ts (bzw. dem uebergebenen Katalog); vom Client wird nie ein Betrag
// uebernommen, nur Artikel-Slug, Menge und Auswahl.
import { KOMBI_KEY, einzelpreisCent, istIndividuell, type Produkt } from "../produkte";
import type { Farbe } from "../farben";
import { standardTeilFarbe } from "../teilfarben";
import { SCHRIFTEN, SCHRIFT_TITEL_KEY, unerlaubteZeichen, fehlendeZeichen, fehlendeZeichenMeldung } from "../schriften";
import {
  formatAnzeige, formatAusOptionen, formatUnerlaubt, istFormatSchluessel, pruefePasst, zeilenAnzahl,
} from "../textformat";
import { LINIENFARBE_HINWEIS, LINIENFARBE_KEY, TEXTFARBE_HINWEIS, TEXTFARBE_KEY, automatischeLinienfarbe, textfarbeErlaubt } from "../textfarbe";
import { istVersandArt, versandOptionen, type VersandArt, type VersandPosition } from "../versand";

export const MAX_MENGE = 20;
export const MAX_POSITIONEN = 10;
export const MAX_GESAMT_CENT = 200_000;

export interface Kontext {
  /** Sichtbarer Katalog (Preise in Cent; null = "Preis folgt" = nicht bestellbar). */
  produkte: Produkt[];
  /** Aktuell vorraetige Farben aus dem Lager. null = Lager nicht lesbar -> Bestellung ablehnen. */
  farben: Farbe[] | null;
  bestellbar: (p: Produkt) => boolean;
}

export type FehlerCode =
  | "ungueltig"
  | "schrift_zeichen_fehlen"
  | "unbekannt"
  | "nicht_bestellbar"
  | "preis_folgt"
  | "versandart_fehlt"
  | "versandart_ungueltig"
  | "farbe_ungueltig"
  | "textfarbe_ungueltig"
  | "linienfarbe_ungueltig"
  | "lager_nicht_lesbar"
  | "text_ungueltig"
  | "text_unzulaessig"
  | "text_passt_nicht"
  | "option_ungueltig"
  | "zu_teuer";

export interface PreisFehler {
  code: FehlerCode;
  meldung: string;
}

export interface BerechnetePosition {
  slug: string;
  name: string;
  menge: number;
  einzelpreisCent: number;
  farbeName: string;
  farbeHex: string;
  /** Beschriftung -> gewaehlte Option, nur Anzeigetexte (kein Client-Freitext). */
  optionen: Record<string, string>;
  text: string | null;
  schriftId: string | null;
  individuell: boolean;
}

export interface Warenkorb {
  positionen: BerechnetePosition[];
  summeWarenCent: number;
  versandCent: number;
  versandart: VersandArt;
  versandLabel: string;
  gesamtCent: number;
  individuell: boolean;
}

export type Ergebnis<T> = { ok: true; wert: T } | { ok: false; fehler: PreisFehler };

const fehler = (code: FehlerCode, meldung: string): { ok: false; fehler: PreisFehler } => ({
  ok: false,
  fehler: { code, meldung },
});

function istObjekt(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Wandelt einen Farbnamen in eine stabile ID (Kleinbuchstaben, ohne Umlaute/Sonderzeichen). */
export function farbeId(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/**
 * `versandart` kommt vom Client (nur "hermes" | "dhl" | "brief"); der Betrag wird ausschliesslich aus
 * versandOptionen(...) (lib/shop/versand.ts) bestimmt, nie vom Client uebernommen.
 */
export function berechneWarenkorb(eingabe: unknown, ctx: Kontext, versandart?: unknown): Ergebnis<Warenkorb> {
  if (!Array.isArray(eingabe) || eingabe.length < 1 || eingabe.length > MAX_POSITIONEN) {
    return fehler("ungueltig", "Der Warenkorb ist leer oder zu groß.");
  }
  if (ctx.farben == null) {
    return fehler("lager_nicht_lesbar", "Die Farben sind gerade nicht abrufbar. Bitte versuch es später noch einmal.");
  }

  const positionen: BerechnetePosition[] = [];
  const versandPos: VersandPosition[] = [];
  let summe = 0;

  for (const roh of eingabe) {
    if (!istObjekt(roh)) return fehler("ungueltig", "Ungültige Position.");
    const slug = typeof roh.slug === "string" ? roh.slug : "";
    const produkt = ctx.produkte.find((p) => p.slug === slug);
    if (!produkt) return fehler("unbekannt", "Dieser Artikel ist nicht verfügbar.");
    if (!ctx.bestellbar(produkt)) return fehler("nicht_bestellbar", "Dieser Artikel kann noch nicht bestellt werden.");
    if (produkt.preisCent == null || !Number.isInteger(produkt.preisCent) || produkt.preisCent <= 0) {
      return fehler("preis_folgt", "Für diesen Artikel steht der Preis noch nicht fest.");
    }

    const menge = roh.menge;
    if (typeof menge !== "number" || !Number.isInteger(menge) || menge < 1 || menge > MAX_MENGE) {
      return fehler("ungueltig", `Die Menge muss zwischen 1 und ${MAX_MENGE} liegen.`);
    }

    // Farbe: Artikel mit fertigen Kombinationen brauchen eine bekannte Kombination (kein Lager); sonst muss die Farbe aktuell im Lager sein
    const fid = typeof roh.farbeId === "string" ? roh.farbeId : "";
    let farbe: Farbe | undefined;
    const teilOptionen: Record<string, string> = {};
    let kombi: NonNullable<Produkt["kombinationen"]>[number] | undefined;
    if (produkt.kombinationen) {
      const kid = istObjekt(roh.optionen) ? roh.optionen[KOMBI_KEY] : undefined;
      kombi = typeof kid === "string" ? produkt.kombinationen.find((k) => k.id === kid) : undefined;
      if (!kombi) return fehler("farbe_ungueltig", "Bitte wähle eine Farbkombination.");
    } else if (produkt.teile) {
      // Mehrteilig: je Teil eine vorrätige PLA-Lagerfarbe; fehlt ein Teil, gilt die Standardfarbe (wie im Browser: ähnlichste Lagerfarbe zur Referenz, z. B. Orange/Schwarz)
      const roh2 = roh.teilFarben;
      if (roh2 !== undefined && !istObjekt(roh2)) return fehler("farbe_ungueltig", "Ungültige Farbwahl.");
      const wahl = roh2 ?? {};
      if (Object.keys(wahl).some((k) => !produkt.teile!.some((t) => t.id === k))) return fehler("farbe_ungueltig", "Ungültige Farbwahl.");
      if (!ctx.farben[0]) return fehler("farbe_ungueltig", "Zurzeit ist keine Farbe vorrätig. Bitte versuch es später noch einmal.");
      const gewaehlt: Farbe[] = [];
      for (const t of produkt.teile) {
        const w = wahl[t.id];
        if (w === undefined) { const standard = standardTeilFarbe(t.id, ctx.farben)!; gewaehlt.push(standard); teilOptionen[t.label] = standard.name; continue; }
        const f = typeof w === "string" ? ctx.farben.find((x) => x.id === w) : undefined;
        if (!f) return fehler("farbe_ungueltig", `Die Farbe für „${t.label}“ ist nicht (mehr) vorrätig. Bitte wähle eine andere.`);
        gewaehlt.push(f);
        teilOptionen[t.label] = f.name;
      }
      farbe = { ...gewaehlt[0], name: gewaehlt.map((f) => f.name).join(" / ") };
    } else {
      if (roh.teilFarben !== undefined) return fehler("farbe_ungueltig", "Ungültige Farbwahl.");
      farbe = ctx.farben.find((f) => f.id === fid);
      if (!farbe) return fehler("farbe_ungueltig", "Diese Farbe ist nicht (mehr) vorrätig. Bitte wähle eine andere.");
    }

    // Optionen: jede Gruppe des Artikels braucht eine gueltige Auswahl, nichts darueber hinaus
    // Textformat-Schluessel (fett_i, kursiv_i, groesse) gehoeren nicht zu den Optionsgruppen und werden unten geprueft.
    const { [TEXTFARBE_KEY]: textfarbeRoh, [SCHRIFT_TITEL_KEY]: schriftTitelRoh, [LINIENFARBE_KEY]: linienRoh, [KOMBI_KEY]: _kombiRoh, ...optAlle } = istObjekt(roh.optionen) ? roh.optionen : ({} as Record<string, unknown>);
    if (!produkt.kombinationen && istObjekt(roh.optionen) && KOMBI_KEY in roh.optionen) return fehler("option_ungueltig", "Ungültige Auswahl.");
    const optIn: Record<string, unknown> = {};
    const formatIn: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(optAlle)) {
      if (istFormatSchluessel(k) && !produkt.optionen.some((g) => g.id === k)) formatIn[k] = v; else optIn[k] = v;
    }
    if (Object.keys(optIn).some((k) => !produkt.optionen.some((g) => g.id === k))) {
      return fehler("option_ungueltig", "Ungültige Auswahl.");
    }
    const optionen: Record<string, string> = {};
    for (const g of produkt.optionen) {
      const gewaehlt = optIn[g.id] ?? (g.optional ? g.optionen[0].id : undefined);
      const o = typeof gewaehlt === "string" ? g.optionen.find((x) => x.id === gewaehlt) : undefined;
      if (!o) return fehler("option_ungueltig", `Bitte wähle bei „${g.label}“ eine Option.`);
      optionen[g.label] = o.label;
    }

    // Linienfarbe (nur Artikel mit Zierlinien): vorrätige Lagerfarbe, die sich vom Untersetzer abhebt; fehlt sie, gilt die automatische (Weiß bzw. kontrastreichste)
    if (linienRoh !== undefined && !produkt.linienfarbe) return fehler("option_ungueltig", "Ungültige Auswahl.");
    if (produkt.linienfarbe) {
      const lf = linienRoh === undefined ? automatischeLinienfarbe(farbe, ctx.farben)
        : typeof linienRoh === "string" ? ctx.farben.find((f) => f.id === linienRoh) : undefined;
      if (!lf && linienRoh !== undefined) return fehler("linienfarbe_ungueltig", "Diese Linienfarbe ist nicht (mehr) vorrätig. Bitte wähle eine andere.");
      if (lf && farbe && linienRoh !== undefined && !textfarbeErlaubt(farbe, lf)) return fehler("linienfarbe_ungueltig", `${LINIENFARBE_HINWEIS}. Bitte wähle eine andere Linienfarbe.`);
      if (lf) optionen["Linienfarbe"] = lf.name; // ohne Wahl und ohne passende Lagerfarbe: keine Linienfarbe festgelegt (Alex entscheidet)
    }

    if (kombi) optionen["Farbkombination"] = kombi.label;
    Object.assign(optionen, teilOptionen); // z. B. „Kürbis: Orange“, „Stiel: Grün“ (Mail, PDF, Telegram, Admin lesen optionen)

    // Personalisierung (Text einzeilig oder mehrzeilig "zeile1\nzeile2", Schrift fest oder aus der Liste)
    const pers = produkt.personalisierung;
    const textRoh = typeof roh.text === "string" ? roh.text.replace(/\r/g, "").trim() : "";
    let text: string | null = null;
    let schriftId: string | null = null;
    let formatWahl: Record<string, unknown> | null = null;
    if (textRoh !== "") {
      if (!pers) return fehler("text_ungueltig", "Dieser Artikel hat keinen Wunschtext.");
      const zeilen = textRoh.split("\n").map((z) => z.trim());
      if (pers.zeilen) {
        if (zeilen.length !== pers.zeilen.length || zeilen.some((z) => z === "")) {
          return fehler("text_ungueltig", "Bitte fülle alle Textzeilen aus.");
        }
        const zu = zeilen.findIndex((z, i) => z.length > pers.zeilen![i].max);
        if (zu >= 0) return fehler("text_ungueltig", `„${pers.zeilen[zu].label}“ darf höchstens ${pers.zeilen[zu].max} Zeichen haben.`);
      } else {
        if (zeilen.length !== 1) return fehler("text_ungueltig", "Der Text darf nur eine Zeile haben.");
        if (textRoh.length > pers.maxLaenge) {
          return fehler("text_ungueltig", `Der Text darf höchstens ${pers.maxLaenge} Zeichen haben.`);
        }
      }
      if (unerlaubteZeichen(zeilen.join("")).length > 0) {
        return fehler("text_ungueltig", "Der Text enthält Zeichen, die nicht gedruckt werden können.");
      }
      const pruef = pruefeWunschtext(zeilen);
      if (!pruef.ok) return fehler("text_unzulaessig", pruef.meldung);
      const wunsch = pers.festeSchrift ?? (typeof roh.schriftId === "string" && roh.schriftId ? roh.schriftId : pers.standardSchrift ?? "");
      const s = SCHRIFTEN.find((x) => x.id === wunsch);
      if (!s) return fehler("text_ungueltig", "Bitte wähle eine Schrift.");
      // Namensschild: optional eigene Schrift für die Titelzeile (nur Schriften aus der Shop-Liste); ohne Angabe gilt die Namensschrift
      let sTitel = s;
      if (schriftTitelRoh !== undefined) {
        if (!pers.schriftJeZeile) return fehler("option_ungueltig", "Ungültige Auswahl.");
        const st = typeof schriftTitelRoh === "string" ? SCHRIFTEN.find((x) => x.id === schriftTitelRoh) : undefined;
        if (!st) return fehler("text_ungueltig", "Bitte wähle eine Schrift für den Titel.");
        sTitel = st;
      }
      const schriftenJeZeile = pers.schriftJeZeile ? [s, sTitel] : s;
      for (let zi = 0; zi < zeilen.length; zi++) {
        const sz = pers.schriftJeZeile ? (zi === 1 ? sTitel : s) : s;
        if (fehlendeZeichen(zeilen[zi], sz.id).length > 0) {
          return fehler("schrift_zeichen_fehlen", fehlendeZeichenMeldung(zeilen[zi], sz.id) ?? "Die Schrift kann nicht alle Zeichen darstellen.");
        }
      }
      // Textformat: nur gelistete Schalter/Stufen, nur Fähigkeiten der Schrift, Text muss aufs Stück passen
      const fmt = formatAusOptionen(formatIn, zeilenAnzahl(pers));
      if (!fmt) return fehler("option_ungueltig", "Ungültige Formatwahl.");
      if (formatUnerlaubt(fmt, schriftenJeZeile)) return fehler("option_ungueltig", "Diese Formatwahl ist bei dieser Schrift nicht verfügbar.");
      if (!pruefePasst(pers, zeilen, schriftenJeZeile, fmt).passt) return fehler("text_passt_nicht", "Passt nicht aufs Stück – bitte kleiner wählen oder kürzen.");
      for (const [k, v] of formatAnzeige(pers, fmt)) optionen[k] = v;
      formatWahl = formatIn;
      text = zeilen.join("\n");
      schriftId = s.id;
      if (pers.schriftJeZeile) { optionen["Schrift Name"] = s.name; optionen["Schrift Titel"] = sTitel.name; }
      // Schriftfarbe (optional, Variantenwahl ohne Preis-/Widerrufswirkung): nur vorrätige Lagerfarbe, die sich von der Grundfarbe abhebt
      if (textfarbeRoh !== undefined) {
        const tf = typeof textfarbeRoh === "string" ? ctx.farben.find((f) => f.id === textfarbeRoh) : undefined;
        if (!tf) return fehler("textfarbe_ungueltig", "Diese Schriftfarbe ist nicht (mehr) vorrätig. Bitte wähle eine andere.");
        if (farbe && !textfarbeErlaubt(farbe, tf)) return fehler("textfarbe_ungueltig", `${TEXTFARBE_HINWEIS}. Bitte wähle eine andere Schriftfarbe.`);
        optionen["Schriftfarbe"] = tf.name;
      }
    } else if (schriftTitelRoh !== undefined) {
      return fehler("option_ungueltig", "Eine Schrift gibt es nur mit Wunschtext.");
    } else if (textfarbeRoh !== undefined) {
      return fehler("option_ungueltig", "Eine Schriftfarbe gibt es nur mit Wunschtext.");
    } else if (Object.keys(formatIn).length > 0) {
      return fehler("option_ungueltig", "Eine Formatwahl gibt es nur mit Wunschtext.");
    } else if (produkt.nurMitText) {
      return fehler("text_ungueltig", "Für diesen Artikel ist ein Text erforderlich.");
    }

    const einzel = einzelpreisCent(produkt, optIn) ?? produkt.preisCent;
    summe += einzel * menge;
    versandPos.push({ slug: produkt.slug, menge, optionen: optIn });
    positionen.push({
      slug: produkt.slug,
      name: produkt.name,
      menge,
      einzelpreisCent: einzel,
      farbeName: kombi ? kombi.label : farbe!.name,
      farbeHex: kombi ? kombi.farben[0].hex : farbe!.hex,
      optionen,
      text,
      schriftId,
      individuell: istIndividuell(produkt, text, formatWahl),
    });
  }

  // Versandart: Pflichtangabe, nur aus den serverseitig berechneten zulaessigen Optionen
  if (versandart === undefined || versandart === null || versandart === "") {
    return fehler("versandart_fehlt", "Bitte wähle eine Versandart.");
  }
  const versand = istVersandArt(versandart) ? versandOptionen(versandPos).find((o) => o.art === versandart) : undefined;
  if (!versand) return fehler("versandart_ungueltig", "Diese Versandart ist für deine Bestellung nicht möglich. Bitte wähle eine andere.");

  const gesamt = summe + versand.cent;
  if (gesamt > MAX_GESAMT_CENT) return fehler("zu_teuer", "Der Warenkorb ist zu groß. Bitte wende dich per Anfrage an uns.");

  return {
    ok: true,
    wert: {
      positionen,
      summeWarenCent: summe,
      versandCent: versand.cent,
      versandart: versand.art,
      versandLabel: versand.label,
      gesamtCent: gesamt,
      individuell: positionen.some((p) => p.individuell),
    },
  };
}

/** Cent -> "12.34" fuer die PayPal-API (ohne Gleitkomma). */
export function centZuPayPal(cent: number): string {
  if (!Number.isInteger(cent) || cent < 0) throw new Error("ungueltiger Betrag");
  return `${Math.floor(cent / 100)}.${String(cent % 100).padStart(2, "0")}`;
}

/** "12.34" -> 1234; null bei unerwartetem Format. */
export function payPalZuCent(wert: unknown): number | null {
  if (typeof wert !== "string" || !/^\d{1,7}(\.\d{1,2})?$/.test(wert)) return null;
  const [euro, rest = ""] = wert.split(".");
  return Number(euro) * 100 + Number(rest.padEnd(2, "0"));
}
