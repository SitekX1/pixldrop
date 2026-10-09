import "server-only";
// Gemeinsame Bausteine fuer Bestellung und Freigabe: Ereignisprotokoll und Vertragsbestaetigung an den Kunden.
// (Eigene Datei, damit bestellung.ts und freigabe.ts sich nicht gegenseitig importieren muessen.)
import type { Deps } from "./bestellung";
import { bestaetigungsMail, type MailBestellung } from "./vorlagen";
import { mailMitAnhaengen } from "./pdf";

/** Technisches Ereignis (ohne personenbezogene Daten) protokollieren; Fehler hier sind egal. */
export async function ereignis(deps: Pick<Deps, "db">, id: string | null, art: string, details: Record<string, unknown>) {
  try {
    await deps.db.rpc("shop_ereignis_schreiben", { p_bestellung_id: id, p_art: art, p_details: details });
  } catch {
    /* Protokoll ist Zusatz */
  }
}

/**
 * Bestellbestaetigung (= Vertragsschluss) mit 3 PDFs an den Kunden, nur wenn noch nicht gesendet.
 * Die DB-Funktion shop_bestellung_mail_daten liefert bei Wunschtext-Bestellungen erst nach Freigabe Daten.
 * Rueckgabe: "gesendet" | "schon" (nichts zu tun/bereits gesendet/gesperrt) | "fehler".
 */
export async function sendeBestaetigung(deps: Deps, id: string): Promise<"gesendet" | "schon" | "fehler"> {
  try {
    const d = await deps.db.rpc<Record<string, unknown> & { ok: boolean }>("shop_bestellung_mail_daten", { p_id: id });
    if (!d.ok) return "schon";
    const b = d as unknown as MailBestellung & { email: string };
    const mail = bestaetigungsMail(b, deps.pflichtangabenText, deps.pflichtangabenFreigegeben, { siteUrl: deps.env.siteUrl, agbText: deps.agbText });
    // Kurzer Mailtext + PDF-Anhaenge; scheitert die PDF-Erzeugung, geht der Volltext im Mailkoerper raus.
    const { betreff, text, anhaenge } = await mailMitAnhaengen(mail, deps.anhangErzeuger);
    if (await deps.notifier.mailKunde(b.email, betreff, text, anhaenge)) {
      await deps.db.rpc("shop_markiere", { p_art: "bestellung_bestaetigt", p_id: id }).catch(() => undefined);
      return "gesendet";
    }
    await ereignis(deps, id, "benachrichtigung", { ergebnis: "kundenmail_fehlgeschlagen" });
    return "fehler";
  } catch {
    await ereignis(deps, id, "benachrichtigung", { ergebnis: "kundenmail_fehler" });
    return "fehler";
  }
}
