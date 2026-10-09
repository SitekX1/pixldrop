import "server-only";
// Elektronische Widerrufsfunktion nach § 356a BGB (Backend).
// Ablauf: (1) confirm != true -> nur pruefen + Zusammenfassung ("Widerruf bestaetigen"-Schritt im Frontend),
//         (2) confirm === true -> in shop_widerrufe speichern (Zeitstempel = DB-Zeit = Zugang, Abs. 5),
//             Eingangsbestaetigung an den Verbraucher (Abs. 4: Inhalt + Datum/Uhrzeit), Alex benachrichtigen.
// Die Antwort verraet NIE, ob eine Bestellnummer existiert oder zur E-Mail/zum Namen passt.
import type { Db } from "./db";
import { DbFehler } from "./db";
import type { ShopEnv } from "./env";
import type { Benachrichtiger } from "./benachrichtigung";
import type { Antwort } from "./bestellung";
import { pruefeWiderruf } from "./validierung";
import { alexMailWiderruf, datumUhrzeit, telegramWiderruf, widerrufEingangsMail } from "./vorlagen";

export interface WiderrufDeps {
  db: Db;
  notifier: Benachrichtiger;
  env: ShopEnv;
}

const fehler = (status: number, code: string, meldung: string, extra: Record<string, unknown> = {}): Antwort => ({
  status,
  body: { ok: false, code, error: meldung, ...extra },
});

const AUSWEICH = "Bitte versuch es später noch einmal oder schreibe deinen Widerruf an as@sitekx.de.";

// Mail-Relay-Schutz: max. 5 Eingangsbestaetigungen je Ziel-Adresse und 24 h (Zaehlung in der DB).
// Nur bei sehr hohem Missbrauch wird die Bestaetigung unterdrueckt (§ 356a Abs. 4 BGB verlangt sie sonst unverzueglich).
// Der Widerruf wird trotzdem gespeichert (Zugang § 356a Abs. 5 BGB), es geht nur keine Mail an diese Adresse.
export const MAX_BESTAETIGUNGEN_JE_ADRESSE = 5;
const LIMIT_HINWEIS =
  "Für diese E-Mail-Adresse wurden heute bereits mehrere Bestätigungsmails gesendet, deshalb schicke ich keine weitere. Dein Widerruf ist trotzdem eingegangen. Bei Fragen schreibe an as@sitekx.de.";
// Auffaelliges Aufkommen: mehr als 20 Widerrufe in der letzten Stunde -> Telegram an Alex, hoechstens einmal pro Stunde (je Instanz).
export const AUFKOMMEN_SCHWELLE_STUNDE = 20;
const AUFKOMMEN_PAUSE_MS = 60 * 60 * 1000;
let letzteAufkommenWarnung = 0;
/** Nur fuer Tests. */
export function setzeAufkommenWarnungZurueck() { letzteAufkommenWarnung = 0; }

interface ZielAnzahl {
  ok: boolean;
  anzahl?: number;
  stunde?: number;
}

interface Angelegt {
  ok: boolean;
  grund?: string;
  id?: string;
  nummer?: string;
  eingegangen_am?: string;
  wiederholt?: boolean;
  bestaetigt?: boolean;
  abgleich?: string;
}

export async function verarbeiteWiderruf(
  deps: WiderrufDeps,
  eingabe: Record<string, unknown>,
  ctx: { ipHash: string },
): Promise<Antwort> {
  const p = pruefeWiderruf(eingabe);
  if (!p.ok) return fehler(422, "ungueltig", "Bitte prüfe deine Angaben.", { felder: p.felder });
  const d = p.wert;
  const zusammenfassung = { name: d.name, vertrag: d.vertrag, ganzerVertrag: d.positionen === null, positionen: d.positionen, email: d.email };

  // Schritt 1: nur pruefen, nichts speichern, nichts senden
  if (eingabe.confirm !== true) {
    return { status: 200, body: { ok: true, schritt: "pruefen", zusammenfassung } };
  }

  let res: Angelegt;
  try {
    res = await deps.db.rpc<Angelegt>("shop_widerruf_anlegen", {
      p_ip_hash: ctx.ipHash,
      p_name: d.name,
      p_vertrag: d.vertrag,
      p_bestellnummer: d.bestellnummer,
      p_positionen: d.positionen,
      p_email: d.email,
    });
  } catch (err) {
    console.error("Shop: Widerruf speichern fehlgeschlagen:", err instanceof DbFehler ? err.message : "unbekannt");
    return fehler(503, "db", `Dein Widerruf konnte gerade nicht übermittelt werden. ${AUSWEICH}`);
  }
  if (!res.ok || !res.id || !res.nummer || !res.eingegangen_am) {
    switch (res.grund) {
      case "zu_viele":
        return fehler(429, "zu_viele", `Zu viele Widerrufe in kurzer Zeit. ${AUSWEICH}`);
      case "ueberlastet":
        return fehler(503, "ueberlastet", `Gerade ist sehr viel los. ${AUSWEICH}`);
      case "ungueltige_eingabe":
        return fehler(422, "ungueltig", "Bitte prüfe deine Angaben.");
      default:
        console.error("Shop: Widerruf abgelehnt, Grund:", res.grund ?? "unbekannt");
        return fehler(500, "intern", `Dein Widerruf konnte gerade nicht übermittelt werden. ${AUSWEICH}`);
    }
  }
  const { id, nummer, eingegangen_am } = res;

  // Eingangsbestaetigung (bis zu 2 Versuche). Bei Wiederholung nur, wenn die erste nie raus ging.
  let bestaetigt = res.bestaetigt === true;
  let limitErreicht = false;
  let hinweis: string | undefined;
  let aufkommenWarnung: string | null = null;
  if (!bestaetigt) {
    // Zaehlung je Ziel-Adresse (und Aufkommen der letzten Stunde). Faellt die Zaehlung aus, wird trotzdem gesendet
    // (die Bestaetigung ist Pflicht; ein DB-Ausfall direkt nach dem Speichern ist unwahrscheinlich).
    const z = await deps.db.rpc<ZielAnzahl>("shop_widerruf_ziel_anzahl", { p_email: d.email }).catch(() => null);
    if (z?.ok === true && typeof z.anzahl === "number" && z.anzahl >= MAX_BESTAETIGUNGEN_JE_ADRESSE) limitErreicht = true;
    if (z?.ok === true && typeof z.stunde === "number" && z.stunde > AUFKOMMEN_SCHWELLE_STUNDE && Date.now() - letzteAufkommenWarnung > AUFKOMMEN_PAUSE_MS) {
      letzteAufkommenWarnung = Date.now();
      aufkommenWarnung = `Auffälliges Widerruf-Aufkommen: ${z.stunde} in der letzten Stunde (mögliche Spam-Welle, bitte im Admin Panel prüfen)`;
      console.warn("Shop: " + aufkommenWarnung);
    }
  }
  if (!bestaetigt && limitErreicht) {
    hinweis = LIMIT_HINWEIS;
    console.warn("Shop: Widerruf gespeichert, keine Bestätigungsmail (Limit je Adresse):", nummer);
  } else if (!bestaetigt) {
    const { betreff, text } = widerrufEingangsMail({
      nummer, name: d.name, vertragAngabe: d.vertrag, positionen: d.positionen, email: d.email, eingegangenAm: eingegangen_am,
    });
    for (let versuch = 0; versuch < 2 && !bestaetigt; versuch++) {
      bestaetigt = await deps.notifier.mailKunde(d.email, betreff, text).catch(() => false);
    }
    if (bestaetigt) await deps.db.rpc("shop_widerruf_markiere", { p_id: id, p_art: "bestaetigt" }).catch(() => undefined);
  }

  if (aufkommenWarnung) await deps.notifier.telegram(aufkommenWarnung).catch(() => false);

  // Alex benachrichtigen: nur Nummern + Abgleich, keine Kundendaten (nicht bei Wiederholung)
  if (res.wiederholt !== true) {
    const abgleich = res.abgleich ?? "nicht_gefunden";
    const mail = alexMailWiderruf(nummer, d.bestellnummer, abgleich, bestaetigt, deps.env.adminUrl);
    // Telegram und Mail an Alex gleichzeitig senden (statt nacheinander), damit der Besucher nicht auf beide warten muss.
    const [t, m] = await Promise.all([
      deps.notifier.telegram(telegramWiderruf(nummer, abgleich === "passt") + (bestaetigt ? "" : limitErreicht ? " - keine Bestätigungsmail (Limit je Adresse erreicht)" : " - Eingangsbestätigung FEHLGESCHLAGEN")),
      deps.notifier.mailAlex(mail.betreff, mail.text),
    ]);
    if (t || m) await deps.db.rpc("shop_widerruf_markiere", { p_id: id, p_art: "benachrichtigt" }).catch(() => undefined);
    else console.error("Shop: Widerruf gespeichert, aber Alex nicht benachrichtigt:", nummer);
  }

  return {
    status: 200,
    body: {
      ok: true,
      widerrufsnummer: nummer,
      eingegangenAm: new Date(eingegangen_am).toISOString(),
      eingegangenAmText: datumUhrzeit(eingegangen_am),
      eingangsbestaetigung: bestaetigt,
      ...(hinweis ? { hinweis } : {}),
      zusammenfassung,
    },
  };
}
