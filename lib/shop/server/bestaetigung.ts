import "server-only";
// Gemeinsame Bausteine fuer Bestellung und Freigabe: Ereignisprotokoll und Vertragsbestaetigung an den Kunden.
// (Eigene Datei, damit bestellung.ts und freigabe.ts sich nicht gegenseitig importieren muessen.)
import type { Deps } from "./bestellung";
import { bestaetigungsMail, type MailBestellung } from "./vorlagen";
import { mailMitAnhaengen } from "./pdf";
import { holeEinstellungen } from "./einstellungen";
import { agbKlartext } from "../agb-daten";

/** Technisches Ereignis (ohne personenbezogene Daten) protokollieren; Fehler hier sind egal. */
export async function ereignis(deps: Pick<Deps, "db">, id: string | null, art: string, details: Record<string, unknown>) {
  try {
    await deps.db.rpc("shop_ereignis_schreiben", { p_bestellung_id: id, p_art: art, p_details: details });
  } catch {
    /* Protokoll ist Zusatz */
  }
}

export type MailArt = "eingang" | "absage" | "bestaetigung";

/**
 * Sendeflag atomar VOR dem Versand setzen (shop_freigabe_claim, Migration 12): nur der erste von mehreren
 * parallelen Aufrufern bekommt true. Fehlt die Funktion (Migration nicht angewendet), gilt das alte Verhalten (true).
 */
export async function claimeMail(deps: Pick<Deps, "db">, id: string, art: MailArt): Promise<boolean> {
  try {
    const r = await deps.db.rpc<{ ok: boolean; neu?: boolean }>("shop_freigabe_claim", { p_id: id, p_art: art });
    return r.ok ? r.neu === true : false;
  } catch {
    return true;
  }
}

/** Claim nach fehlgeschlagenem Versand zuruecknehmen, damit ein Retry moeglich bleibt. */
export async function gibMailFrei(deps: Pick<Deps, "db">, id: string, art: MailArt): Promise<void> {
  try {
    await deps.db.rpc("shop_freigabe_claim_zurueck", { p_id: id, p_art: art });
  } catch {
    /* Retry bleibt dann aus */
  }
}

/**
 * Bestellbestaetigung (= Vertragsschluss) mit 3 PDFs an den Kunden, nur wenn noch nicht gesendet.
 * Die DB-Funktion shop_bestellung_mail_daten liefert bei Wunschtext-Bestellungen erst nach Freigabe Daten.
 * Rueckgabe: "gesendet" | "schon" (nichts zu tun/bereits gesendet/gesperrt) | "fehler".
 */
export async function sendeBestaetigung(deps: Deps, id: string): Promise<"gesendet" | "schon" | "fehler"> {
  let claimed = false;
  try {
    const d = await deps.db.rpc<Record<string, unknown> & { ok: boolean }>("shop_bestellung_mail_daten", { p_id: id });
    if (!d.ok) return "schon";
    const b = d as unknown as MailBestellung & { email: string };
    // Lieferzeit aus den Shop-Einstellungen (Fallback config.ts); AGB-Anhang mit derselben Lieferzeit wie die Seite.
    const lz = (await holeEinstellungen(deps.env)).lieferzeit;
    const mail = bestaetigungsMail(b, deps.pflichtangabenText, deps.pflichtangabenFreigegeben, {
      siteUrl: deps.env.siteUrl,
      lieferzeit: lz,
      agbText: deps.agbText ?? agbKlartext(lz),
    });
    // Kurzer Mailtext + PDF-Anhaenge; scheitert die PDF-Erzeugung, geht der Volltext im Mailkoerper raus.
    const { betreff, text, anhaenge } = await mailMitAnhaengen(mail, deps.anhangErzeuger);
    if (!(await claimeMail(deps, id, "bestaetigung"))) return "schon";
    claimed = true;
    if (await deps.notifier.mailKunde(b.email, betreff, text, anhaenge)) {
      await deps.db.rpc("shop_markiere", { p_art: "bestellung_bestaetigt", p_id: id }).catch(() => undefined);
      return "gesendet";
    }
    await gibMailFrei(deps, id, "bestaetigung");
    await ereignis(deps, id, "benachrichtigung", { ergebnis: "kundenmail_fehlgeschlagen" });
    return "fehler";
  } catch {
    if (claimed) await gibMailFrei(deps, id, "bestaetigung");
    await ereignis(deps, id, "benachrichtigung", { ergebnis: "kundenmail_fehler" });
    return "fehler";
  }
}
