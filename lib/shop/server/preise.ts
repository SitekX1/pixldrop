import "server-only";
// Serverseitige Preis- und Warenkorbberechnung. Preise kommen AUSSCHLIESSLICH aus
// lib/shop/produkte.ts (bzw. dem uebergebenen Katalog); vom Client wird nie ein Betrag
// uebernommen, nur Artikel-Slug, Menge und Auswahl.
import { istIndividuell, type Produkt } from "../produkte";
import type { Farbe } from "../farben";
import { SCHRIFTEN, unerlaubteZeichen } from "../schriften";

export const MAX_MENGE = 20;
export const MAX_POSITIONEN = 5;
export const MAX_GESAMT_CENT = 200_000;

export interface Kontext {
  /** Sichtbarer Katalog (Preise in Cent; null = "Preis folgt" = nicht bestellbar). */
  produkte: Produkt[];
  /** Aktuell vorraetige Farben aus dem Lager. null = Lager nicht lesbar -> Bestellung ablehnen. */
  farben: Farbe[] | null;
  /** Versandkosten in Cent (null = noch nicht festgelegt -> nicht bestellbar). */
  versandCent: number | null;
  bestellbar: (p: Produkt) => boolean;
}

export type FehlerCode =
  | "ungueltig"
  | "unbekannt"
  | "nicht_bestellbar"
  | "preis_folgt"
  | "versand_folgt"
  | "farbe_ungueltig"
  | "lager_nicht_lesbar"
  | "text_ungueltig"
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

export function berechneWarenkorb(eingabe: unknown, ctx: Kontext): Ergebnis<Warenkorb> {
  if (!Array.isArray(eingabe) || eingabe.length < 1 || eingabe.length > MAX_POSITIONEN) {
    return fehler("ungueltig", "Der Warenkorb ist leer oder zu groß.");
  }
  if (ctx.versandCent == null || !Number.isInteger(ctx.versandCent) || ctx.versandCent < 0) {
    return fehler("versand_folgt", "Die Versandkosten stehen noch nicht fest.");
  }
  if (ctx.farben == null) {
    return fehler("lager_nicht_lesbar", "Die Farben sind gerade nicht abrufbar. Bitte versuch es später noch einmal.");
  }

  const positionen: BerechnetePosition[] = [];
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

    // Farbe: muss aktuell im Lager sein
    const fid = typeof roh.farbeId === "string" ? roh.farbeId : "";
    const farbe = ctx.farben.find((f) => f.id === fid);
    if (!farbe) return fehler("farbe_ungueltig", "Diese Farbe ist nicht (mehr) vorrätig. Bitte wähle eine andere.");

    // Optionen: jede Gruppe des Artikels braucht eine gueltige Auswahl, nichts darueber hinaus
    const optIn = istObjekt(roh.optionen) ? roh.optionen : {};
    if (Object.keys(optIn).some((k) => !produkt.optionen.some((g) => g.id === k))) {
      return fehler("option_ungueltig", "Ungültige Auswahl.");
    }
    const optionen: Record<string, string> = {};
    for (const g of produkt.optionen) {
      const gewaehlt = optIn[g.id];
      const o = typeof gewaehlt === "string" ? g.optionen.find((x) => x.id === gewaehlt) : undefined;
      if (!o) return fehler("option_ungueltig", `Bitte wähle bei „${g.label}“ eine Option.`);
      optionen[g.label] = o.label;
    }

    // Personalisierung (Text einzeilig oder mehrzeilig "zeile1\nzeile2", Schrift fest oder aus der Liste)
    const pers = produkt.personalisierung;
    const textRoh = typeof roh.text === "string" ? roh.text.replace(/\r/g, "").trim() : "";
    let text: string | null = null;
    let schriftId: string | null = null;
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
      const wunsch = pers.festeSchrift ?? (typeof roh.schriftId === "string" ? roh.schriftId : "");
      const s = SCHRIFTEN.find((x) => x.id === wunsch);
      if (!s) return fehler("text_ungueltig", "Bitte wähle eine Schrift.");
      text = zeilen.join("\n");
      schriftId = s.id;
    } else if (produkt.nurMitText) {
      return fehler("text_ungueltig", "Für diesen Artikel ist ein Text erforderlich.");
    }

    summe += produkt.preisCent * menge;
    positionen.push({
      slug: produkt.slug,
      name: produkt.name,
      menge,
      einzelpreisCent: produkt.preisCent,
      farbeName: farbe.name,
      farbeHex: farbe.hex,
      optionen,
      text,
      schriftId,
      individuell: istIndividuell(produkt, text),
    });
  }

  const gesamt = summe + ctx.versandCent;
  if (gesamt > MAX_GESAMT_CENT) return fehler("zu_teuer", "Der Warenkorb ist zu groß. Bitte wende dich per Anfrage an uns.");

  return {
    ok: true,
    wert: {
      positionen,
      summeWarenCent: summe,
      versandCent: ctx.versandCent,
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
