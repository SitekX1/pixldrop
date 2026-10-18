// Versandarten und -kosten. Reine Logik OHNE "server-only": der Server rechnet damit den verbindlichen
// Betrag (lib/shop/server/preise.ts), der Client darf dieselbe Funktion nur zur ANZEIGE nutzen
// (versandOptionenFuerKorb). Der Client sendet nie einen Betrag, nur die gewaehlte Versandart.
//
// ==========================================================================================
// VORLAEUFIG, Alex misst nach: ALLE Zahlen in diesem Block (Stufen je Produkt, Schwellen in
// Stueck, Preise) sind Platzhalter, bis die Packmasse gemessen sind. Nur HIER aendern.
// ==========================================================================================

export const VERSANDARTEN = ["hermes", "dhl", "brief"] as const;
export type VersandArt = (typeof VERSANDARTEN)[number];

export type VersandStufe = "klein" | "mittel" | "gross";
const STUFEN: readonly VersandStufe[] = ["klein", "mittel", "gross"];

export interface VersandOption {
  art: VersandArt;
  label: string;
  cent: number;
  /** true = mit Sendungsverfolgung (Hermes, DHL Paket); false = ohne (DHL Paeckchen, Brief) */
  tracking: boolean;
}

/**
 * KUNDENPREISE in Cent je Stufe (Alex-Entscheidung 2026-10-12). Hermes ~ Selbstkosten + ca. 10 ct; DHL = Hermes + 1 EUR ("Premium").
 * Tatsaechliche Kosten fuer Alex: Hermes Paeckchen 3,99 / Paket S 4,89 / Paket M 5,90; DHL Paket 2 kg 6,19 / 5 kg 7,69
 * (Stand Januar 2026, vor Livegang auf hermes.de/dhl.de gegenpruefen). Den DHL-Zuschuss rechnet Karla in die Artikelpreise ein.
 * Beide Arten haben Sendungsverfolgung; nur Brief nicht.
 */
export const VERSAND_PREISE: Record<"hermes" | "dhl", Record<VersandStufe, { label: string; cent: number; tracking: boolean }>> = {
  hermes: {
    klein: { label: "Hermes Päckchen", cent: 410, tracking: true }, //   lang + kurz <= 37 cm
    mittel: { label: "Hermes Paket S", cent: 500, tracking: true }, //   <= 50 cm
    gross: { label: "Hermes Paket M", cent: 600, tracking: true }, //    <= 80 cm
  },
  dhl: {
    klein: { label: "DHL Paket 2 kg", cent: 510, tracking: true }, //   bis 60 x 30 x 15 cm
    mittel: { label: "DHL Paket 2 kg", cent: 600, tracking: true }, //  bis 60 x 30 x 15 cm
    gross: { label: "DHL Paket 5 kg", cent: 700, tracking: true }, //   bis 120 x 60 x 60 cm (VORLAEUFIG)
  },
};

/** Brief (Deutsche Post), nur fuer flache Untersetzer OHNE Box. VORLAEUFIG: Stueckgrenzen. */
export const VERSAND_BRIEF = {
  grossbrief: { label: "Großbrief (Deutsche Post)", cent: 180, maxStueck: 25, maxStueckKork: 20, maxDickeMm: 20, maxG: 500 }, // 35,3 x 25 x 2 cm, 500 g
  maxibrief: { label: "Maxibrief (Deutsche Post)", cent: 290, maxStueck: 63, maxDickeMm: 50, maxG: 1000 }, //  35,3 x 25 x 5 cm, 1 kg
} as const;
/** Untersetzer (Ø 90 mm) liegen als Stapel nebeneinander: 3 in der Laenge (35,3 cm) x 2 in der Breite (25 cm) = 6 Stapel. */
export const BRIEF_STAPEL = 6;
/** Gewicht von Umschlag + Pappe in g (Annahme). */
export const BRIEF_UMSCHLAG_G = 50;
export const UNTERSETZER_G = 15;
/** Brief-Dicke: Untersetzer 3 mm (Ø 90 mm passt flach), selbstklebender Kork +1 mm (Annahme, Alex misst nach), Umschlag/Pappe 3 mm. */
export const UNTERSETZER_DICKE_MM = 3;
export const KORK_DICKE_MM = 1;
export const BRIEF_UMSCHLAG_MM = 3;

/** Kurzname der Versandart fuer Mails/Anzeige. */
export const VERSANDART_NAME: Record<VersandArt, string> = {
  hermes: "Hermes",
  dhl: "DHL",
  brief: "Brief (Deutsche Post)",
};

/**
 * VOLUMENMODELL (Alex 2026-10-13): Es gibt keine festen Kartons. Die Grenze einer Stufe ist das Hoechstmass, das der
 * Paketdienst fuer diese Stufe vorschreibt (Hermes: laengste + kuerzeste Seite; Paeckchen 37 cm, Paket S 50 cm, M 80 cm).
 * Jeder Artikel hat echte Masse aus den STL-Dateien (Modelle/Uebersicht/PACKMASSE.md). Der Warenkorb passt in eine Stufe, wenn
 *   (1) ein Karton mit laengste + kuerzeste Seite <= Grenze existiert, in den jeder Artikel (mit PACK_PUFFER_MM) passt und
 *   (2) dessen Volumen fuer das Gesamtvolumen x POLSTER_FAKTOR reicht.
 * Passt der Korb nicht in die groesste Stufe oder ueber das Hoechstgewicht, wird er auf mehrere Pakete verteilt und die
 * Preise addiert. Es gibt nie "bitte anfragen". Preise der Stufen: VERSAND_PREISE.
 */
export const POLSTER_FAKTOR = 1.3;
/** Platz je Kartonkante fuer Wand/Polster in mm (zusaetzlich zum Volumenzuschlag). */
export const PACK_PUFFER_MM = 10;
/** Grenze "laengste + kuerzeste Seite" in mm je Stufe (Hermes-Preisliste 2026; DHL-Paeckchen/Paket sind grosszuegiger). */
export const STUFE_GRENZE_MM: Record<VersandStufe, number> = { klein: 370, mittel: 500, gross: 800 };
/** Hoechstgewicht je Paket in g (DHL 5-kg-Produkt). Darueber wird auf mehrere Pakete verteilt. */
export const PAKET_MAX_G = 5000;
/** DHL "Paket 2 kg" ist nur bis 2 kg zulaessig: schwerere Pakete zahlen mindestens den Preis der Stufe "gross" (5 kg). */
export const DHL_KLEIN_MAX_G = 2000;

/** Ein Teil eines Produkts: Masse in mm (Reihenfolge egal), Gewicht in g, Anzahl. */
export interface PackTeil {
  mm: [number, number, number]; g: number; anz: number;
  /** rotationssymmetrisch (z. B. Geister, Kuerbisse): zaehlt beim Hineinlegen in einen Becher als Kreis mit der groessten Kante */
  rund?: boolean;
  /** hohl: nimmt kleine Artikel auf (Innendurchmesser, Innentiefe in mm); die Artikel zaehlen dann nicht extra */
  hohl?: { d: number; h: number };
}
export const BOX_GRUPPE = "box";
export const BOX_MIT = "mit";
export interface VersandProdukt {
  /** Teile je Stueck (z. B. Set aus 3 Geistern) */
  teile: PackTeil[];
  /** Mit Box (BOX_MIT): ersetzt die Teile durch die Box mit Inhalt */
  teileMitBox?: PackTeil[];
  briefFaehig: boolean;
  /** Stueck je Menge fuer die Brief-Grenzen (ein Set zaehlt mehrfach) */
  stueckJeMenge: number;
  /** Stufe bei genau 1 Stueck (nur fuer die Anzeige "Versand ab"), wird unten berechnet */
  versandStufe: VersandStufe;
}
type Roh = Omit<VersandProdukt, "versandStufe">;
const UNTERSETZER = (anz: number): PackTeil => ({ mm: [90, 90, 3], g: 15, anz });
/** Stiftebecher innen (aus der STL: Innen-Radius 37,6 mm, Boden 3 mm; abzueglich 1 mm Spiel je Seite). */
const TASSE_INNEN = { d: 74, h: 95 };
const BOX_SET: PackTeil[] = [{ mm: [96.8, 40, 54], g: 169, anz: 1 }]; // 5 Untersetzer hochkant in der Box
/** Breite Box fuer Untersetzer MIT Kork (Alex 2026-10-15): 97 x 47 x 54 mm, Box 95 g + 5 Untersetzer 75 g (Kork-Gewicht vernachlaessigt). */
const BOX_SET_KORK: PackTeil[] = [{ mm: [97, 47, 54], g: 170, anz: 1 }];
const ROH: Record<string, Roh> = {
  "wochentags-untersetzer-set": { teile: [UNTERSETZER(5)], teileMitBox: BOX_SET, briefFaehig: true, stueckJeMenge: 5 },
  "wochentags-untersetzer-einzeln": { teile: [UNTERSETZER(1)], teileMitBox: BOX_SET, briefFaehig: true, stueckJeMenge: 1 },
  "spruch-untersetzer": { teile: [UNTERSETZER(1)], briefFaehig: true, stueckJeMenge: 1 },
  "halloween-untersetzer-set": { teile: [UNTERSETZER(3)], briefFaehig: true, stueckJeMenge: 3 },
  "halloween-untersetzer-einzeln": { teile: [UNTERSETZER(1)], briefFaehig: true, stueckJeMenge: 1 },
  "stiftebecher-tasse": { teile: [{ mm: [166.3, 85, 100], g: 97, anz: 1, hohl: TASSE_INNEN }], briefFaehig: false, stueckJeMenge: 1 },
  "namensschild": { teile: [{ mm: [196.5, 57.7, 19], g: 67, anz: 1 }], briefFaehig: false, stueckJeMenge: 1 }, // Platte 6 + Staender 13, zerlegt
  "kuerbis-laterne": { teile: [{ mm: [108, 111, 122], g: 90, anz: 1 }], briefFaehig: false, stueckJeMenge: 1 }, // Version 5: Körper 107,6x110,7x78 + Stiel 37,5x35,4x44,1, Höhe zusammengesteckt vorsichtig 122; 90 g gewogen von Alex 16.10.
  "skelett-beweglich": { teile: [{ mm: [74.6, 36.9, 186.8], g: 42, anz: 1 }], briefFaehig: false, stueckJeMenge: 1 }, // Kettenversion, Maße aus Skelett_Kette_stehend.stl; 42 g laut Panel-Auftrag (Shop nennt 38 g)
  "geister-set": { teile: [{ mm: [77.2, 86.2, 70], g: 21, anz: 1, rund: true }, { mm: [81.5, 84.2, 96], g: 24, anz: 1, rund: true }, { mm: [104.5, 104.5, 80], g: 28, anz: 1, rund: true }], briefFaehig: false, stueckJeMenge: 1 },
  "geister-set-klein": { teile: [{ mm: [46.3, 51.7, 42], g: 6, anz: 1, rund: true }, { mm: [48.9, 50.5, 57.6], g: 6, anz: 1, rund: true }, { mm: [62.7, 62.7, 48], g: 7, anz: 1, rund: true }], briefFaehig: false, stueckJeMenge: 1 },
  "kuerbis-klein-set": { teile: [{ mm: [51.1, 50.1, 50], g: 20, anz: 1, rund: true }, { mm: [58.7, 58.5, 50], g: 26, anz: 1, rund: true }, { mm: [59.9, 59.5, 50], g: 28, anz: 1, rund: true }, { mm: [35.4, 35.7, 50], g: 8, anz: 1, rund: true }], briefFaehig: false, stueckJeMenge: 1 }, // 4 Kuerbisse = 82 g laut Alex, Masse aus der 3MF
  "design-kuerbis": { teile: [{ mm: [109.7, 109.7, 114.9], g: 82, anz: 1, rund: true }], briefFaehig: false, stueckJeMenge: 1 }, // große Größe: 109,7 breit x 114,9 hoch mit Strunk (Alex 18.10.), 82 g = Körper 78,5 + Strunk 3,15 laut Druckaufträgen
  "kuerbis-teelichthalter": { teile: [{ mm: [72, 73, 40], g: 38, anz: 1, rund: true }], briefFaehig: false, stueckJeMenge: 1 },
};
/** Unbekannter Slug: grosszuegiger Quader, nie Brief. */
const UNBEKANNT: Roh = { teile: [{ mm: [200, 150, 100], g: 300, anz: 1 }], briefFaehig: false, stueckJeMenge: 1 };

/** Ein einzelnes Packstueck (Masse sortiert: l >= m >= k). */
interface Stueck { l: number; m: number; k: number; g: number; vol: number; rund?: boolean; hohl?: { d: number; h: number } }
function stueckVon(t: PackTeil): Stueck {
  const [l, m, k] = [...t.mm].sort((x, y) => y - x);
  return { l, m, k, g: t.g, vol: l * m * k, rund: t.rund, hohl: t.hohl };
}
function teileJeStueck(roh: Roh, box: boolean, kork = false): PackTeil[] {
  if (box && roh.teileMitBox && kork) return roh.teileMitBox === BOX_SET ? BOX_SET_KORK : roh.teileMitBox;
  return box && roh.teileMitBox ? roh.teileMitBox : roh.teile;
}
const stueckeAusTeilen = (teile: readonly PackTeil[]): Stueck[] =>
  teile.flatMap((t) => Array.from({ length: t.anz }, () => stueckVon(t)));

/** Groesstes Kartonvolumen (mm3) der Stufe fuer diesen Inhalt; 0 = passt nicht. Karton a x a x c mit a + c = Grenze. */
function kartonVolumen(stufe: VersandStufe, inhalt: readonly Stueck[]): number {
  const grenze = STUFE_GRENZE_MM[stufe];
  const maxL = Math.max(...inhalt.map((x) => x.l)) + PACK_PUFFER_MM;
  const maxM = Math.max(...inhalt.map((x) => x.m)) + PACK_PUFFER_MM;
  const maxK = Math.max(...inhalt.map((x) => x.k)) + PACK_PUFFER_MM;
  // kurze Kante c in [maxK, grenze - max(maxL, maxM)]; (grenze - c)^2 * c ist bei c = grenze / 3 am groessten
  const cMin = maxK;
  const cMax = grenze - Math.max(maxL, maxM);
  if (cMax < cMin) return 0;
  const c = Math.min(Math.max(grenze / 3, cMin), cMax);
  const a = grenze - c;
  return a * a * c;
}

const volumenInhalt = (inhalt: readonly Stueck[]) => inhalt.reduce((t, x) => t + x.vol, 0) * POLSTER_FAKTOR;
const gewichtInhalt = (inhalt: readonly Stueck[]) => inhalt.reduce((t, x) => t + x.g, 0);

/** Kleinste Stufe, in die der Inhalt passt (null = passt in keine). */
function kleinsteStufe(inhalt: readonly Stueck[]): VersandStufe | null {
  const v = volumenInhalt(inhalt);
  for (const s of STUFEN) if (kartonVolumen(s, inhalt) >= v) return s;
  return null;
}

/** Verteilt die Stuecke auf Pakete (groesste zuerst, First-Fit). Ein Stueck, das nirgends passt, bekommt ein eigenes Paket. */
function verteileAufPakete(stuecke: readonly Stueck[]): Stueck[][] {
  const pakete: Stueck[][] = [];
  for (const st of [...stuecke].sort((x, y) => y.vol - x.vol)) {
    const platz = pakete.find((p) => {
      const neu = [...p, st];
      return gewichtInhalt(neu) <= PAKET_MAX_G && kleinsteStufe(neu) !== null;
    });
    if (platz) platz.push(st); else pakete.push([st]);
  }
  return pakete;
}

/** Passt ein Stueck in den Hohlraum? Runde Teile als Kreis (groesste Kante), sonst Diagonale des Querschnitts; Hoehe <= Innentiefe. */
function passtInHohlraum(x: Stueck, h: { d: number; h: number }): boolean {
  return x.rund ? x.l <= h.d && x.k <= h.h : Math.hypot(x.m, x.k) <= h.d && x.l <= h.h;
}
/**
 * Kleine Artikel reisen im hohlen Artikel (Stiftebecher) mit: Sie zaehlen kein eigenes Volumen, ihr Gewicht kommt zum Becher.
 * Je Becher: Summe der Hoehen <= Innentiefe und Summe der Volumina <= Innenvolumen. Die Becher selbst bleiben als Stueck.
 */
function verschachtele(stuecke: Stueck[]): Stueck[] {
  const hohle = stuecke.filter((x) => x.hohl).map((x) => ({ ...x, h: 0, v: 0, hohl: x.hohl }));
  if (hohle.length === 0) return stuecke;
  const rest = stuecke.filter((x) => !x.hohl).sort((a, b) => b.vol - a.vol);
  const uebrig: Stueck[] = [];
  for (const x of rest) {
    const b = hohle.find((t) => {
      const h = t.hohl!;
      return passtInHohlraum(x, h) && t.h + x.k <= h.h && t.v + x.vol <= Math.PI * (h.d / 2) ** 2 * h.h;
    });
    if (b) { b.h += x.k; b.v += x.vol; b.g += x.g; } else uebrig.push(x);
  }
  return [...hohle.map(({ h: _h, v: _v, ...t }) => t), ...uebrig];
}

/** Stuecke eines Warenkorbs (je Menge einzeln, damit sie auf Pakete verteilt werden koennen). */
function stueckeAusKorb(positionen: readonly VersandPosition[]): Stueck[] {
  const out: Stueck[] = [];
  for (const p of positionen) {
    const roh = ROH[p.slug] ?? UNBEKANNT;
    const box = p.optionen?.[BOX_GRUPPE] === BOX_MIT;
    for (let i = 0, n = Math.min(mengeOk(p.menge), 500); i < n; i++) out.push(...stueckeAusTeilen(teileJeStueck(roh, box, p.optionen?.kork === "mit")));
  }
  return verschachtele(out);
}

export const VERSAND_PRODUKTE: Record<string, VersandProdukt> = Object.fromEntries(
  Object.entries(ROH).map(([slug, roh]) => [slug, { ...roh, versandStufe: kleinsteStufe(stueckeAusTeilen(roh.teile)) ?? "gross" }]),
);

// ------------------------------------------------------------------------------------------
// Logik
// ------------------------------------------------------------------------------------------
export interface VersandPosition {
  slug: string;
  menge: number;
  /** gewaehlte Option-IDs je Gruppe (wie im Request), z. B. { box: "mit" } */
  optionen?: Record<string, unknown> | null;
}

export function istVersandArt(v: unknown): v is VersandArt {
  return typeof v === "string" && (VERSANDARTEN as readonly string[]).includes(v);
}

function mengeOk(m: unknown): number {
  return typeof m === "number" && Number.isFinite(m) && m > 0 ? Math.floor(m) : 0;
}

/** Zulaessige Versandoptionen fuer die Positionen. Brief-faehig = NUR Brief (keine Auswahl); sonst Hermes + DHL. */
export function versandOptionen(positionen: readonly VersandPosition[]): VersandOption[] {
  let stueck = 0;
  let dicke = 0;
  let stueckOhneKork = 0;
  let stueckMitKork = 0;
  let alleBrief = positionen.length > 0;
  for (const p of positionen) {
    const k = ROH[p.slug] ?? UNBEKANNT;
    stueck += mengeOk(p.menge) * k.stueckJeMenge;
    if (p.optionen?.kork === "mit") stueckMitKork += mengeOk(p.menge) * k.stueckJeMenge; else stueckOhneKork += mengeOk(p.menge) * k.stueckJeMenge;
    dicke += mengeOk(p.menge) * k.stueckJeMenge * (UNTERSETZER_DICKE_MM + (p.optionen?.kork === "mit" ? KORK_DICKE_MM : 0));
    if (!k.briefFaehig || p.optionen?.[BOX_GRUPPE] === BOX_MIT) alleBrief = false;
  }
  if (positionen.length === 0 || stueck < 1) return [];

  if (alleBrief) {
    // Stapel (Dicke je Stueck) nebeneinander: so viele Stapel wie noetig, hoechstens BRIEF_STAPEL; Gewicht inkl. Umschlag
    const passt = (x: { maxDickeMm: number; maxG: number }) =>
      Math.ceil(dicke / (x.maxDickeMm - BRIEF_UMSCHLAG_MM)) <= BRIEF_STAPEL && stueck * UNTERSETZER_G + BRIEF_UMSCHLAG_G <= x.maxG;
    // Grossbrief: feste Obergrenze mit Puffer (Alex 2026-10-15): 25 Untersetzer ohne Kork, 20 mit Kork (Kork zaehlt 1/20, sonst 1/25 der Kapazitaet)
    const gbAnteil = stueckOhneKork / VERSAND_BRIEF.grossbrief.maxStueck + stueckMitKork / VERSAND_BRIEF.grossbrief.maxStueckKork;
    const b = gbAnteil <= 1 ? VERSAND_BRIEF.grossbrief
      : passt(VERSAND_BRIEF.maxibrief) ? VERSAND_BRIEF.maxibrief : null;
    if (b) return [{ art: "brief", label: b.label, cent: b.cent, tracking: false }];
  }

  const pakete = verteileAufPakete(stueckeAusKorb(positionen));
  const option = (art: "hermes" | "dhl"): VersandOption => {
    const stufen = pakete.map((p) => {
      let s = kleinsteStufe(p) ?? "gross";
      if (art === "dhl" && gewichtInhalt(p) > DHL_KLEIN_MAX_G) s = "gross";
      return s;
    });
    const cent = stufen.reduce((t, s) => t + VERSAND_PREISE[art][s].cent, 0);
    const label = stufen.length === 1
      ? VERSAND_PREISE[art][stufen[0]].label
      : `${art === "hermes" ? "Hermes" : "DHL"}, ${stufen.length} Pakete`;
    return { art, label, cent, tracking: true };
  };
  return [option("hermes"), option("dhl")];
}

/**
 * Client-taugliche Variante fuer die Anzeige im Warenkorb/Bestellablauf: nimmt beliebige Eintraege
 * mit slug, menge und optionen (ungueltige werden ignoriert). Verbindlich rechnet immer der Server.
 */
export function versandOptionenFuerKorb(positionen: readonly unknown[]): VersandOption[] {
  const ok: VersandPosition[] = [];
  for (const p of positionen) {
    if (typeof p !== "object" || p === null) continue;
    const o = p as { slug?: unknown; menge?: unknown; optionen?: unknown };
    if (typeof o.slug !== "string") continue;
    ok.push({
      slug: o.slug,
      menge: o.menge as number,
      optionen: typeof o.optionen === "object" && o.optionen !== null ? (o.optionen as Record<string, unknown>) : null,
    });
  }
  return versandOptionen(ok);
}

/** Kurzuebersicht fuer AGB/Versandseite, direkt aus den Konstanten (keine festen Preise im Fliesstext). */
export function versandPreisUebersicht(formatiere: (cent: number) => string): string {
  const ab = (a: "hermes" | "dhl") => Math.min(...STUFEN.map((s) => VERSAND_PREISE[a][s].cent));
  const bis = (a: "hermes" | "dhl") => Math.max(...STUFEN.map((s) => VERSAND_PREISE[a][s].cent));
  return (
    `Hermes ${formatiere(ab("hermes"))} bis ${formatiere(bis("hermes"))}, ` +
    `DHL ${formatiere(ab("dhl"))} bis ${formatiere(bis("dhl"))}, ` +
    `Großbrief ${formatiere(VERSAND_BRIEF.grossbrief.cent)} bzw. Maxibrief ${formatiere(VERSAND_BRIEF.maxibrief.cent)} (Deutsche Post)`
  );
}
