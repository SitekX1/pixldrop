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
  grossbrief: { label: "Großbrief (Deutsche Post)", cent: 180, maxStueck: 2 }, // 35,3 x 25 x 2 cm, 500 g
  maxibrief: { label: "Maxibrief (Deutsche Post)", cent: 290, maxStueck: 7 }, //  35,3 x 25 x 5 cm, 1 kg
} as const;

/** Ab MEHR als dieser Stueckzahl (gesamt) rutscht der Warenkorb eine Stufe hoeher. VORLAEUFIG. */
export const VERSAND_STUFE_HOEHER_UEBER_STUECK = 4;

/** Kurzname der Versandart fuer Mails/Anzeige. */
export const VERSANDART_NAME: Record<VersandArt, string> = {
  hermes: "Hermes",
  dhl: "DHL",
  brief: "Brief (Deutsche Post)",
};

/**
 * Je Produkt: Versandstufe, Brieffaehigkeit und Stueck je Menge (ein Set zaehlt mehrfach). VORLAEUFIG.
 * briefFaehig gilt NUR ohne Box (Option BOX_GRUPPE = BOX_MIT).
 * Unbekannter Slug: Stufe "mittel", nicht brieffaehig, 1 Stueck.
 */
export const BOX_GRUPPE = "box";
export const BOX_MIT = "mit";
export interface VersandProdukt { versandStufe: VersandStufe; briefFaehig: boolean; stueckJeMenge: number }
export const VERSAND_PRODUKTE: Record<string, VersandProdukt> = {
  "wochentags-untersetzer-set": { versandStufe: "klein", briefFaehig: true, stueckJeMenge: 5 },
  "wochentags-untersetzer-einzeln": { versandStufe: "klein", briefFaehig: true, stueckJeMenge: 1 },
  "spruch-untersetzer": { versandStufe: "klein", briefFaehig: true, stueckJeMenge: 1 },
  "halloween-untersetzer-set": { versandStufe: "klein", briefFaehig: true, stueckJeMenge: 3 },
  "halloween-untersetzer-einzeln": { versandStufe: "klein", briefFaehig: true, stueckJeMenge: 1 },
  "stiftebecher-tasse": { versandStufe: "mittel", briefFaehig: false, stueckJeMenge: 1 },
  "tischschild-erster-kaffee": { versandStufe: "klein", briefFaehig: false, stueckJeMenge: 1 },
  "kuerbis-laterne": { versandStufe: "mittel", briefFaehig: false, stueckJeMenge: 1 },
  "geister-set": { versandStufe: "mittel", briefFaehig: false, stueckJeMenge: 1 },
  "geister-set-klein": { versandStufe: "klein", briefFaehig: false, stueckJeMenge: 1 },
  "kuerbis-teelichthalter": { versandStufe: "klein", briefFaehig: false, stueckJeMenge: 1 },
};
const UNBEKANNT: VersandProdukt = { versandStufe: "mittel", briefFaehig: false, stueckJeMenge: 1 };

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
  let stufe = 0;
  let alleBrief = positionen.length > 0;
  for (const p of positionen) {
    const k = VERSAND_PRODUKTE[p.slug] ?? UNBEKANNT;
    const menge = mengeOk(p.menge);
    stueck += menge * k.stueckJeMenge;
    stufe = Math.max(stufe, STUFEN.indexOf(k.versandStufe));
    if (!k.briefFaehig || p.optionen?.[BOX_GRUPPE] === BOX_MIT) alleBrief = false;
  }
  if (positionen.length === 0 || stueck < 1) return [];

  if (alleBrief) {
    const b = stueck <= VERSAND_BRIEF.grossbrief.maxStueck ? VERSAND_BRIEF.grossbrief
      : stueck <= VERSAND_BRIEF.maxibrief.maxStueck ? VERSAND_BRIEF.maxibrief : null;
    if (b) return [{ art: "brief", label: b.label, cent: b.cent, tracking: false }];
  }

  if (stueck > VERSAND_STUFE_HOEHER_UEBER_STUECK) stufe += 1;
  const s = STUFEN[Math.min(stufe, STUFEN.length - 1)];
  return [
    { art: "hermes", ...VERSAND_PREISE.hermes[s] },
    { art: "dhl", ...VERSAND_PREISE.dhl[s] },
  ];
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
