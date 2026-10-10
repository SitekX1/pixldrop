import "server-only";
// Shop-Einstellungen aus der DB (Panel-Reiter "Einstellungen"): Lieferzeit, Bestellpause, Wunschtext-Pause.
// Lesen per anon-RPC public.shop_einstellungen_lesen() (nur oeffentliche Werte, kein Geheimnis noetig).
// Kurzer In-Memory-Cache (45 s je Serverinstanz); bei Fehler/fehlender Konfiguration gilt der Fallback
// (Lieferzeit aus config.ts, NICHT pausiert), damit ein DB-Ausfall den Shop nicht von selbst sperrt.
import { LIEFERZEIT_TEXT } from "../config";
import { leseEnv, type ShopEnv } from "./env";

export interface ShopEinstellungen {
  lieferzeit: string | null;
  bestellungPausiert: boolean;
  /** Fertiger Hinweistext (Grundtext + "Voraussichtlich wieder ab ..." falls Datum/Text gesetzt). */
  pauseText: string;
  pauseBis: string | null;
  wunschtextPausiert: boolean;
}

export const STANDARD_PAUSE_TEXT =
  "Aufgrund der aktuell sehr hohen Auftragslage kann ich derzeit keine weiteren Bestellungen aufnehmen.";
export const STANDARD_WUNSCHTEXT_PAUSE_TEXT =
  "Aufgrund der aktuell sehr hohen Auftragslage sind Artikel mit Wunschtext aktuell pausiert. Alle anderen Artikel bleiben bestellbar.";

export const FALLBACK: ShopEinstellungen = {
  lieferzeit: LIEFERZEIT_TEXT,
  bestellungPausiert: false,
  pauseText: STANDARD_PAUSE_TEXT,
  pauseBis: null,
  wunschtextPausiert: false,
};

const TTL_MS = 45_000;
const TIMEOUT_MS = 3_000;
let cache: { bis: number; wert: ShopEinstellungen } | null = null;

export function leereEinstellungenCache(): void {
  cache = null;
}

function text(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return t ? t.slice(0, max) : null;
}

/** Rohdaten der RPC -> geprueftes Objekt (unbekannte/ungueltige Felder fallen auf den Fallback zurueck). */
export function normalisiere(roh: unknown): ShopEinstellungen {
  const o = typeof roh === "object" && roh !== null && !Array.isArray(roh) ? (roh as Record<string, unknown>) : {};
  const bool = (v: unknown) => v === true || v === "true";
  const bis = text(o.pause_bis, 80);
  const grund = text(o.pause_text, 500) ?? STANDARD_PAUSE_TEXT;
  const pauseText = bis ? `${grund} Voraussichtlich wieder ab ${bis}${/[.!?]$/.test(bis) ? "" : "."}` : grund;
  return {
    lieferzeit: text(o.lieferzeit_text, 80) ?? LIEFERZEIT_TEXT,
    bestellungPausiert: bool(o.bestellung_pausiert),
    pauseText,
    pauseBis: bis,
    wunschtextPausiert: bool(o.wunschtext_pausiert),
  };
}

export async function holeEinstellungen(
  env: ShopEnv = leseEnv(),
  fetchImpl: typeof fetch = fetch,
  jetzt: number = Date.now(),
): Promise<ShopEinstellungen> {
  if (cache && cache.bis > jetzt) return cache.wert;
  if (!env.dbUrl || !env.dbAnonKey) return FALLBACK;
  try {
    const res = await fetchImpl(`${env.dbUrl}/rest/v1/rpc/shop_einstellungen_lesen`, {
      method: "POST",
      headers: { apikey: env.dbAnonKey, Authorization: `Bearer ${env.dbAnonKey}`, "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("status");
    const wert = normalisiere(await res.json());
    cache = { bis: jetzt + TTL_MS, wert };
    return wert;
  } catch {
    // Kurz cachen, damit bei DB-Ausfall nicht jede Anfrage 3 s wartet.
    cache = { bis: jetzt + 10_000, wert: FALLBACK };
    return FALLBACK;
  }
}
