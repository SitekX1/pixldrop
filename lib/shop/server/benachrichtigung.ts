import "server-only";
// Benachrichtigungen hinter einer austauschbaren Schnittstelle.
// Standard: dieselben Wege wie /api/kontakt-notify (Telegram-Bot + SMTP ueber die eigene
// Mailbox, kostenlos, kein zusaetzlicher Dienst). Wer das aendern will, ersetzt nur
// erzeugeBenachrichtiger() oder reicht ein eigenes Objekt mit diesem Interface ein.
//
// DATENSCHUTZ: Telegram bekommt NUR Bestellnummer und Art (keine Namen, Anschriften,
// Texte, Bilder). Die Mail an Alex enthaelt nur Nummer + Link ins Admin Panel.
import type { ShopEnv } from "./env";
import type { FetchFn } from "./db";

/** Mail-Anhang (nodemailer-kompatibel). */
export interface MailAnhang {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface Benachrichtiger {
  /** Kurze Push-Nachricht an Alex (nur Nummer/Art!). true = zugestellt. */
  telegram(text: string): Promise<boolean>;
  /** Mail an Alex (nur Nummer + Link). true = zugestellt. */
  mailAlex(betreff: string, text: string, replyTo?: string): Promise<boolean>;
  /** Mail an den Kunden (Bestellbestaetigung). true = zugestellt. */
  mailKunde(an: string, betreff: string, text: string, anhaenge?: MailAnhang[]): Promise<boolean>;
}

export interface MailTransport {
  sendMail(opts: { from: string; to: string; subject: string; text: string; replyTo?: string; attachments?: MailAnhang[] }): Promise<unknown>;
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

export function erzeugeBenachrichtiger(
  env: ShopEnv,
  fetchImpl: FetchFn = fetch,
  transportFactory: TransportFactory = nodemailerTransport,
): Benachrichtiger {
  const mailBereit = Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);

  async function senden(an: string, betreff: string, text: string, replyTo?: string, anhaenge?: MailAnhang[]): Promise<boolean> {
    if (!mailBereit) return false;
    try {
      const t = await transportFactory(env.smtp);
      await t.sendMail({
        from: `"PixlDrop 3D-Druck" <${env.smtp.user}>`,
        to: an,
        subject: einzeilig(betreff),
        text,
        ...(replyTo ? { replyTo } : {}),
        ...(anhaenge && anhaenge.length ? { attachments: anhaenge } : {}),
      });
      return true;
    } catch (err) {
      console.error("Shop-Mail-Fehler:", err instanceof Error ? err.name : "unbekannt");
      return false;
    }
  }

  return {
    async telegram(text) {
      if (!env.telegramToken || !env.telegramChatId) return false;
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
    },
    async mailAlex(betreff, text, replyTo) {
      if (!env.alexMail) return false;
      return senden(env.alexMail, betreff, text, replyTo);
    },
    async mailKunde(an, betreff, text, anhaenge) {
      return senden(an, betreff, text, env.alexMail, anhaenge);
    },
  };
}
