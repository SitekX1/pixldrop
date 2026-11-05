// Zentrale Saison-Steuerung des Shops (Halloween, Weihnachten, jedes weitere Jahr wiederverwendbar).
// Reine Funktionen ohne Seiteneffekte; auf Server UND Client importierbar (process.env.SHOP_* ist im Browser undefined,
// dann gilt das Datum). Nichts hier ist rechtlich relevant.

export type SaisonId = "halloween" | "weihnachten";
export type SaisonModus = "off" | "preview" | "sale";

/** Ab diesem Datum (UTC, exklusiv) ist die Halloween-Kollektion 2026 auf jeden Fall aus (config.ts re-exportiert das). */
export const HALLOWEEN_ENDE = "2026-11-03";
export const HALLOWEEN_ENDE_TEXT = "bis 2. November";

/** Zeitraum je Saison als Monat/Tag ohne Jahr (inklusive). Ende vor Anfang = Jahreswechsel. */
interface SaisonDef {
  id: SaisonId;
  label: string;
  von: [monat: number, tag: number];
  bis: [monat: number, tag: number];
  texte: {
    badgeVorschau: string; // Karte in der Übersicht, solange nicht bestellbar
    hinweisVorschau: string; // Streifen über dem Raster
    kachelBadge: { preview: string; sale: string };
    kachelButton: { preview: string; sale: string };
  };
}

export const SAISONEN: Record<SaisonId, SaisonDef> = {
  halloween: {
    id: "halloween", label: "Halloween", von: [10, 1], bis: [11, 2],
    texte: {
      badgeVorschau: "Vorschau, noch nicht bestellbar",
      hinweisVorschau: "Noch nicht bestellbar: stöbern ist erlaubt, der Verkauf startet später.",
      kachelBadge: { preview: "Vorschau", sale: "Jetzt im Shop" },
      kachelButton: { preview: "Vorab stöbern →", sale: "Zum Shop →" },
    },
  },
  weihnachten: {
    id: "weihnachten", label: "Weihnachten", von: [11, 3], bis: [1, 6],
    texte: {
      badgeVorschau: "Bald im Shop",
      hinweisVorschau: "Die Weihnachtsstücke sind noch im Druck. Stöbern ist erlaubt, bestellen kannst du sie, sobald der Verkauf startet.",
      kachelBadge: { preview: "Coming soon", sale: "Jetzt im Shop" },
      kachelButton: { preview: "Vorab stöbern →", sale: "Zum Shop →" },
    },
  },
};

const REIHENFOLGE: SaisonId[] = ["halloween", "weihnachten"];

/** Monat/Tag in Deutschland (Europe/Berlin), unabhängig von der Serverzone. */
function monatTag(jetzt: Date): [number, number] {
  try {
    const teile = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", month: "numeric", day: "numeric" }).formatToParts(jetzt);
    const m = Number(teile.find((t) => t.type === "month")?.value);
    const d = Number(teile.find((t) => t.type === "day")?.value);
    if (m >= 1 && d >= 1) return [m, d];
  } catch { /* Intl ohne Zeitzonen: Rückfall auf UTC */ }
  return [jetzt.getUTCMonth() + 1, jetzt.getUTCDate()];
}

function imZeitraum(def: SaisonDef, jetzt: Date): boolean {
  const [m, d] = monatTag(jetzt);
  const x = m * 100 + d;
  const von = def.von[0] * 100 + def.von[1];
  const bis = def.bis[0] * 100 + def.bis[1];
  return von <= bis ? x >= von && x <= bis : x >= von || x <= bis; // Jahreswechsel
}

/**
 * Aktive Saison. Env SHOP_SAISON=halloween|weihnachten|off überschreibt das Datum (Standard: auto).
 * Halloween ist nach HALLOWEEN_ENDE (2026-11-03) immer aus, sofern es nicht ausdrücklich per Env erzwungen wird.
 */
/** true nur im Vercel-Vorschau-Deployment des Branches "weihnachten" (Production hat nie diese Branch-Referenz). */
export function istWeihnachtenVorschau(): boolean {
  return typeof process !== "undefined" && process.env?.VERCEL_ENV === "preview" && process.env?.VERCEL_GIT_COMMIT_REF === "weihnachten";
}

export function aktiveSaison(jetzt: Date = new Date()): SaisonId | null {
  const env = typeof process !== "undefined" ? process.env?.SHOP_SAISON : undefined;
  if (env === "off") return null;
  if (env === "halloween" || env === "weihnachten") return env;
  // Vorschau-Deployment des Branches "weihnachten" zeigt Weihnachten schon vor dem Saisonstart (Production hat nie diese Branch-Referenz).
  if (istWeihnachtenVorschau()) return "weihnachten";
  const ende = Date.parse(HALLOWEEN_ENDE + "T00:00:00Z");
  for (const id of REIHENFOLGE) {
    if (id === "halloween" && jetzt.getTime() >= ende && jetzt.getUTCFullYear() === 2026) continue;
    if (imZeitraum(SAISONEN[id], jetzt)) return id;
  }
  return null;
}

/**
 * Modus einer Saison: "off" (nicht aktiv), "preview" (sichtbar, nicht bestellbar), "sale" (bestellbar).
 * Weihnachten: Env SHOP_SAISON_MODUS=preview|sale (Standard sale). Halloween: SHOP_HALLOWEEN=off|preview|sale (Standard preview, alte Env).
 */
export function saisonModus(id: SaisonId | null, jetzt: Date = new Date()): SaisonModus {
  if (!id || aktiveSaison(jetzt) !== id) return "off";
  const env = typeof process !== "undefined" ? process.env : undefined;
  const v = id === "halloween" ? env?.SHOP_HALLOWEEN : env?.SHOP_SAISON_MODUS;
  // Weihnachten ist ab Livegang bestellbar (Alex 05.11.): ohne Env gilt "sale". Halloween (alte Env) bleibt bei "preview".
  return v === "off" || v === "sale" || v === "preview" ? v : id === "weihnachten" ? "sale" : "preview";
}

/** Modus der gerade aktiven Saison (oder "off"). */
export function aktuellerModus(jetzt: Date = new Date()): SaisonModus {
  return saisonModus(aktiveSaison(jetzt), jetzt);
}
