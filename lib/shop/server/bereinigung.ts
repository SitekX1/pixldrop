import "server-only";
// Loeschkonzept, Teil Vercel Cron: Bilddateien per Storage-API loeschen, dann die Datenbank
// bereinigen lassen (shop_bereinigen_extern -> shop_bereinige). Fristen siehe shop_konst (SQL).
import type { Db } from "./db";

export interface BereinigungsErgebnis {
  bilderGeloescht: number;
  bilderFehler: number;
  datenbank: unknown;
}

export async function fuehreBereinigungAus(db: Db): Promise<BereinigungsErgebnis> {
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
  return { bilderGeloescht: geloescht, bilderFehler: fehler, datenbank: r.ergebnis ?? null };
}
