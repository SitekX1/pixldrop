import "server-only";
// Benachrichtigungen hinter einer austauschbaren Schnittstelle.
// Standard: dieselben Wege wie /api/kontakt-notify (Telegram-Bot + SMTP ueber die eigene
// Mailbox, kostenlos, kein zusaetzlicher Dienst). Wer das aendern will, ersetzt nur
// erzeugeBenachrichtiger() oder reicht ein eigenes Objekt mit diesem Interface ein.
//
// DATENSCHUTZ: Telegram bekommt NUR Bestellnummer, Art und den Hinweis "Details in deiner Mail / im Panel"
// (keine Namen, Anschriften, Wunschtexte, Bilder und KEINE Freigabe-Links). Die Mail an Alex (eigene Mailbox) enthaelt
// Nummer + Link ins Admin Panel; beim Wunschtext-Flow zusaetzlich die Freigabe-Links und die gekuerzte Wunschtext-Liste.
import type { ShopEnv } from "./env";
import type { FetchFn } from "./db";
import { einfacheMailHtml, logoAnhaengeFuer } from "./mail-layout";

/** Mail-Anhang (nodemailer-kompatibel). */
export interface MailAnhang {
  filename: string;
  content: Buffer;
  contentType: string;
  /** Inline-Bild (multipart/related): Content-ID, im HTML als cid:<id> */
  cid?: string;
  contentDisposition?: "inline" | "attachment";
}

export interface Benachrichtiger {
  /** Kurze Push-Nachricht an Alex (nur Nummer/Art + Hinweis, nie Links/Texte/Kundendaten!). true = zugestellt. */
  telegram(text: string): Promise<boolean>;
  /** Mail an Alex (Nummer + Link ins Panel; Wunschtext-Flow: Freigabe-Links + Kurzliste). true = zugestellt. */
  mailAlex(betreff: string, text: string, replyTo?: string): Promise<boolean>;
  /** Mail an den Kunden (Bestellbestaetigung). true = zugestellt. */
  mailKunde(an: string, betreff: string, text: string, anhaenge?: MailAnhang[], html?: string): Promise<boolean>;
}

export interface MailTransport {
  sendMail(opts: { from: string; to: string; subject: string; text: string; replyTo?: string; attachments?: MailAnhang[]; html?: string }): Promise<unknown>;
}

export type TransportFactory = (smtp: ShopEnv["smtp"]) => Promise<MailTransport>;

const nodemailerTransport: TransportFactory = async (smtp) => {
  const nodemailer = (await import("nodemailer")).default;
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    requireTLS: smtp.port !== 465, // STARTTLS erzwingen, nie Klartext-Login
    auth: { user: smtp.user, pass: smtp.pass },
  });
};

/** Mail-Header duerfen keine Zeilenumbrueche enthalten. */
function einzeilig(s: string): string {
  return s.replace(/[\r\n]+/g, " ").slice(0, 200);
}

// Bremse gegen Meldungsfluten (Spam ueber Formulare): je Art hoechstens N Meldungen an Alex in 10 Minuten
// (pro Serverless-Instanz, im Arbeitsspeicher). Darueber hinaus wird nicht gesendet (false = "nicht zugestellt",
// die DB-Flags bleiben offen) und EINMAL je Fenster eine Warnung geschickt. Kundenmails sind nicht betroffen
// (die haben Limits je IP und je Adresse in der Datenbank).
const BREMSE_FENSTER_MS = 10 * 60_000;
export const BREMSE_MAX = { telegram: 20, mailAlex: 30 } as const;
const gesendet: Record<keyof typeof BREMSE_MAX, number[]> = { telegram: [], mailAlex: [] };
const gewarntAm: Record<keyof typeof BREMSE_MAX, number> = { telegram: 0, mailAlex: 0 };

/** Nur fuer Tests. */
export function bremseZuruecksetzen() {
  for (const k of Object.keys(gesendet) as (keyof typeof BREMSE_MAX)[]) { gesendet[k] = []; gewarntAm[k] = 0; }
}

/** "ja" = senden, "warnen" = nicht senden, aber jetzt die Warnung schicken, "nein" = nicht senden. */
function bremsePruefen(art: keyof typeof BREMSE_MAX, jetzt: number = Date.now()): "ja" | "warnen" | "nein" {
  const neu = gesendet[art].filter((t) => jetzt - t < BREMSE_FENSTER_MS);
  if (neu.length < BREMSE_MAX[art]) { neu.push(jetzt); gesendet[art] = neu; return "ja"; }
  gesendet[art] = neu;
  if (jetzt - gewarntAm[art] >= BREMSE_FENSTER_MS) { gewarntAm[art] = jetzt; return "warnen"; }
  return "nein";
}

export function erzeugeBenachrichtiger(
  env: ShopEnv,
  fetchImpl: FetchFn = fetch,
  transportFactory: TransportFactory = nodemailerTransport,
): Benachrichtiger {
  const mailBereit = Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);

  async function senden(an: string, betreff: string, text: string, replyTo?: string, anhaenge?: MailAnhang[], html?: string): Promise<boolean> {
    if (!mailBereit) return false;
    try {
      const t = await transportFactory(env.smtp);
      await t.sendMail({
        from: `"PixlDrop 3D-Druck" <${env.smtp.user}>`,
        to: an,
        subject: einzeilig(betreff),
        text,
        ...(html ? { html } : {}),
        ...(replyTo ? { replyTo } : {}),
        ...(anhaenge && anhaenge.length ? { attachments: anhaenge } : {}),
      });
      return true;
    } catch (err) {
      console.error("Shop-Mail-Fehler:", err instanceof Error ? err.name : "unbekannt");
      return false;
    }
  }

  async function telegramSenden(text: string): Promise<boolean> {
    try {
      const res = await fetchImpl(`https://api.telegram.org/bot${env.telegramToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: env.telegramChatId, text, link_preview_options: { is_disabled: true } }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) console.error("Shop-Telegram-Fehler:", res.status);
      return res.ok;
    } catch {
      console.error("Shop-Telegram-Fehler: Netz");
      return false;
    }
  }

  return {
    async telegram(text) {
      if (!env.telegramToken || !env.telegramChatId) return false;
      const b = bremsePruefen("telegram");
      if (b !== "ja") {
        if (b === "warnen") await telegramSenden("⚠ Shop: ungewöhnlich viele Meldungen (mehr als " + BREMSE_MAX.telegram + " in 10 Minuten). Weitere werden vorübergehend nicht gesendet. Bitte im Panel nachsehen.");
        return false;
      }
      return telegramSenden(text);
    },
    async mailAlex(betreff, text, replyTo) {
      if (!env.alexMail) return false;
      const b = bremsePruefen("mailAlex");
      if (b !== "ja") {
        if (b === "warnen") await senden(env.alexMail, "Shop: ungewöhnlich viele Meldungen", "Mehr als " + BREMSE_MAX.mailAlex + " Mails an dich in 10 Minuten. Weitere werden vorübergehend nicht gesendet. Bitte im Panel nachsehen.");
        return false;
      }
      return senden(env.alexMail, betreff, text, replyTo);
    },
    async mailKunde(an, betreff, text, anhaenge, html) {
      // Kundenmails immer multipart (Text + HTML im Shop-Rahmen); ohne eigenes HTML wird der Text umgesetzt.
      let h = html;
      if (!h) { try { h = einfacheMailHtml(betreff, text, env.siteUrl); } catch { h = undefined; } }
      // Logos als eingebettete CID-Bilder (Outlook blockt externe Bilder) -> multipart/related
      const alle = [...(h ? logoAnhaengeFuer(h) : []), ...(anhaenge ?? [])];
      return senden(an, betreff, text, env.alexMail, alle, h);
    },
  };
}
