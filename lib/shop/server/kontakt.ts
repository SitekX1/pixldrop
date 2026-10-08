import "server-only";
// Kontaktformular: validieren, Rate-Limit in der DB (nur ip_hash-Zaehler, Nachricht wird NICHT gespeichert),
// Mail an Alex (Reply-To = Kunde), Telegram nur als Hinweis ohne Inhalt/Kundendaten.
import type { Db } from "./db";
import { DbFehler } from "./db";
import type { Benachrichtiger } from "./benachrichtigung";
import type { Antwort } from "./bestellung";
import { pruefeKontakt } from "./validierung";

export interface KontaktDeps {
  db: Db;
  notifier: Benachrichtiger;
}

const fehler = (status: number, code: string, meldung: string, extra: Record<string, unknown> = {}): Antwort => ({
  status,
  body: { ok: false, code, error: meldung, ...extra },
});

const AUSWEICH = "Bitte versuch es später noch einmal oder schreibe direkt an as@sitekx.de.";

export async function verarbeiteKontakt(
  deps: KontaktDeps,
  eingabe: Record<string, unknown>,
  ctx: { ipHash: string },
): Promise<Antwort> {
  const p = pruefeKontakt(eingabe);
  if (!p.ok) return fehler(422, "ungueltig", "Bitte prüfe deine Angaben.", { felder: p.felder });
  const d = p.wert;

  try {
    const r = await deps.db.rpc<{ ok: boolean; grund?: string }>("shop_kontakt_zaehlen", { p_ip_hash: ctx.ipHash });
    if (!r.ok) {
      if (r.grund === "zu_viele") return fehler(429, "zu_viele", "Zu viele Nachrichten in kurzer Zeit. Bitte versuch es später noch einmal.");
      if (r.grund === "ueberlastet") return fehler(503, "ueberlastet", `Gerade ist sehr viel los. ${AUSWEICH}`);
      if (r.grund === "ungueltige_eingabe") return fehler(422, "ungueltig", "Bitte prüfe deine Angaben.");
      console.error("Shop: Kontakt abgelehnt, Grund:", r.grund ?? "unbekannt");
      return fehler(503, "intern", `Deine Nachricht konnte gerade nicht gesendet werden. ${AUSWEICH}`);
    }
  } catch (err) {
    console.error("Shop: Kontakt-Zaehler fehlgeschlagen:", err instanceof DbFehler ? err.message : "unbekannt");
    return fehler(503, "db", `Deine Nachricht konnte gerade nicht gesendet werden. ${AUSWEICH}`);
  }

  const text = [
    "Neue Nachricht über das Kontaktformular (3D-Druck-Shop):",
    "",
    `Name: ${d.name}`,
    `E-Mail: ${d.email}`,
    "",
    d.nachricht,
    "",
    "Antworten geht direkt per Reply an den Absender.",
  ].join("\n");

  let gesendet = false;
  for (let versuch = 0; versuch < 2 && !gesendet; versuch++) {
    gesendet = await deps.notifier.mailAlex("Neue Kontaktanfrage (3D-Druck-Shop)", text, d.email).catch(() => false);
  }
  if (!gesendet) {
    console.error("Shop: Kontakt-Mail an Alex fehlgeschlagen");
    return fehler(503, "mail", `Deine Nachricht konnte gerade nicht gesendet werden. ${AUSWEICH}`);
  }

  await deps.notifier.telegram("Neue Kontaktanfrage im 3D-Druck-Shop (Details per Mail)").catch(() => false);
  return { status: 200, body: { ok: true } };
}
