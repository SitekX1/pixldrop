import "server-only";
// Loeschkonzept, Teil Vercel Cron: Bilddateien per Storage-API loeschen, dann die Datenbank
// bereinigen lassen (shop_bereinigen_extern -> shop_bereinige). Fristen siehe shop_konst (SQL).
import type { Db } from "./db";
import type { ShopEnv } from "./env";
import type { Benachrichtiger } from "./benachrichtigung";
import { erinnereOffeneFreigaben, sageAbgelaufeneFreigabenAb } from "./freigabe";
import type { Deps } from "./bestellung";

export interface BereinigungsErgebnis {
  bilderGeloescht: number;
  bilderFehler: number;
  datenbank: unknown;
  /** Nur gesetzt, wenn Erinnerungs-Abhaengigkeiten uebergeben wurden: Anzahl gesendeter Freigabe-Erinnerungen. */
  freigabeErinnerungen?: number;
  /** Nur gesetzt, wenn zusaetzlich PayPal uebergeben wurde: Anzahl wegen Fristablauf (> 23 h) automatisch abgesagter Freigaben. */
  freigabeFristAbgesagt?: number;
}

export async function fuehreBereinigungAus(
  db: Db,
  erinnerung?: { env: ShopEnv; notifier: Benachrichtiger; paypal?: Deps["paypal"] },
): Promise<BereinigungsErgebnis> {
  const liste = await db.rpc<{ ok: boolean; anfragen?: { id: string; pfade: string[] }[] }>(
    "shop_bereinige_bilder_liste",
    {},
  );
  if (!liste.ok) throw new Error("Bildliste nicht abrufbar");
  const erledigt: string[] = [];
  let geloescht = 0;
  let fehler = 0;
  for (const a of liste.anfragen ?? []) {
    let alle = true;
    for (const pfad of a.pfade) {
      // Pfade aus der DB nochmals pruefen, bevor sie an die Storage-API gehen
      if (!/^anfragen\/[0-9a-f-]{36}\/[1-3]\.(jpg|png|webp)$/.test(pfad)) {
        alle = false;
        fehler++;
        continue;
      }
      if (await db.remove(pfad)) geloescht++;
      else {
        alle = false;
        fehler++;
      }
    }
    if (alle) erledigt.push(a.id);
  }
  const r = await db.rpc<{ ok: boolean; ergebnis?: unknown }>("shop_bereinigen_extern", { p_bild_ids: erledigt });
  if (!r.ok) throw new Error("Bereinigung in der Datenbank fehlgeschlagen");
  const ergebnis: BereinigungsErgebnis = { bilderGeloescht: geloescht, bilderFehler: fehler, datenbank: r.ergebnis ?? null };
  if (erinnerung) {
    // Frist: offene Freigaben > 23 h werden automatisch abgelehnt (Absage-Mail, PayPal-Erstattung, Telegram).
    if (erinnerung.paypal) {
      try {
        ergebnis.freigabeFristAbgesagt = await sageAbgelaufeneFreigabenAb({ db, env: erinnerung.env, notifier: erinnerung.notifier, paypal: erinnerung.paypal });
      } catch {
        ergebnis.freigabeFristAbgesagt = 0;
      }
    }
    // Wunschtext-Freigaben, die > 20 h offen sind: Erinnerung per Telegram/Mail. Ein Fehler hier bricht die Bereinigung nicht ab.
    try {
      ergebnis.freigabeErinnerungen = await erinnereOffeneFreigaben({ db, ...erinnerung });
    } catch {
      ergebnis.freigabeErinnerungen = 0;
    }
  }
  return ergebnis;
}
