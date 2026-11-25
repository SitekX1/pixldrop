// Testversand ALLER Shop-Mails (17) ueber den echten Versandweg (erzeugeBenachrichtiger -> mailKunde/mailAlex,
// inkl. Logo-CID-Anhaengen und PDF-Anhaengen wie im Produktivcode) NUR an die feste Testadresse.
//   node --import ./tests/shop/register.mjs scripts/mail-testversand.mts --trocken --env=<env-datei>
//   node --import ./tests/shop/register.mjs scripts/mail-testversand.mts --senden  --env=<env-datei>
// Ohne --trocken/--senden passiert nichts. Die Env-Datei (vercel env pull) liegt AUSSERHALB des Repos,
// wird nur eingelesen (nicht in process.env, Werte werden nie ausgegeben) und danach von Hand geloescht.
import { readFileSync } from "node:fs";
import { leseEnv, type ShopEnv } from "../lib/shop/server/env.ts";
import { erzeugeBenachrichtiger, type MailTransport, type TransportFactory } from "../lib/shop/server/benachrichtigung.ts";
import { logoAnhaengeFuer } from "../lib/shop/server/mail-layout.ts";
import { mailMitAnhaengen } from "../lib/shop/server/pdf.ts";
import { baueBeispiele } from "./mail-beispiele.mts";

// Hart verdrahtet, bewusst KEIN Parameter.
const TESTADRESSE = "sitek_alex@gmx.de";
const PAUSE_MS = 3000;

const args = process.argv.slice(2);
const trocken = args.includes("--trocken");
const senden = args.includes("--senden");
const envPfad = args.find((a) => a.startsWith("--env="))?.slice(6);

function abbruch(msg: string): never {
  console.error("ABBRUCH: " + msg);
  process.exit(1);
}

if (trocken === senden) {
  console.log("Nichts getan. Aufruf mit genau einem Flag: --trocken (nur rendern) oder --senden (echt an " + TESTADRESSE + "), dazu --env=<datei>.");
  process.exit(trocken && senden ? 1 : 0);
}
if (!envPfad) abbruch("--env=<Pfad zur vercel-env-Datei> fehlt.");

/** Liest KEY="wert"-Zeilen (vercel env pull) in ein lokales Objekt. */
function leseEnvDatei(pfad: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const zeile of readFileSync(pfad, "utf8").split(/\r?\n/)) {
    const m = zeile.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || zeile.trim().startsWith("#")) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1).replace(/\\n/g, "\n").replace(/\\"/g, '"');
    }
    out[m[1]] = v;
  }
  return out;
}

const env0 = leseEnv(leseEnvDatei(envPfad));
if (senden && (!env0.smtp.host || !env0.smtp.user || !env0.smtp.pass)) abbruch("SMTP-Zugang unvollstaendig (SMTP_HOST/SMTP_USER/SMTP_PASS fehlen in der Env-Datei).");
// Mails "an Alex" gehen im Produktivcode an env.alexMail: hier ebenfalls auf die Testadresse zwingen.
const env: ShopEnv = { ...env0, alexMail: TESTADRESSE };

// Transport wie im Produktivcode (nodemailer, STARTTLS), zusaetzlich: Empfaenger-Sperre und Fehlermeldung merken.
let letzterFehler = "";
const transport: TransportFactory = async (smtp) => {
  const nodemailer = (await import("nodemailer")).default;
  const t = nodemailer.createTransport({
    host: smtp.host, port: smtp.port, secure: smtp.port === 465, requireTLS: smtp.port !== 465,
    auth: { user: smtp.user, pass: smtp.pass },
  });
  const sicher: MailTransport = {
    async sendMail(opts) {
      if (opts.to !== TESTADRESSE) throw new Error("Empfaenger-Sperre: nur " + TESTADRESSE);
      try {
        return await t.sendMail(opts);
      } catch (e) {
        const x = e as { code?: string; responseCode?: number; command?: string; message?: string };
        letzterFehler = [x.code, x.responseCode, x.command].filter(Boolean).join(" / ") || (e instanceof Error ? e.name : "unbekannt");
        throw e;
      }
    },
  };
  return sicher;
};
const n = erzeugeBenachrichtiger(env, fetch, transport);

const mails = baueBeispiele(env.siteUrl);
const gesamt = mails.length;
console.log(`${gesamt} Mails erzeugt (${trocken ? "TROCKEN, es wird nichts gesendet" : "SENDEN an " + TESTADRESSE}).`);
if (gesamt !== 17) abbruch(`Erwartet 17 Mails, erzeugt ${gesamt}.`);

let ok = 0;
let fehl = 0;
for (let i = 0; i < gesamt; i++) {
  const m = mails[i];
  const betreff = `[TEST ${i + 1}/${gesamt}] ${m.betreff}`;
  // PDF-Anhaenge wie sendeBestaetigung: bei Bestellbestaetigung kurzer Text + PDFs (Fallback: Volltext ohne HTML)
  let text = m.text;
  let html = m.html;
  let anhaenge;
  if (m.bestaetigung) {
    const r = await mailMitAnhaengen(m.bestaetigung);
    text = r.text; anhaenge = r.anhaenge;
    if (r.fallback) html = undefined;
  }
  const info = `${String(i + 1).padStart(2)}/${gesamt} ${m.datei} (${m.art}${anhaenge ? `, ${anhaenge.length} PDF` : ""}${html ? ", " + logoAnhaengeFuer(html).length + " Logo(s)" : ""})`;
  if (trocken) {
    if (!betreff || !text) abbruch("Leerer Betreff/Text bei " + m.datei);
    console.log("OK (trocken) " + info + " | " + betreff);
    ok++;
    continue;
  }
  letzterFehler = "";
  const gesendet = m.art === "kunde"
    ? await n.mailKunde(TESTADRESSE, betreff, text, anhaenge, html)
    : await n.mailAlex(betreff, text, m.replyTo, html);
  if (!gesendet) {
    fehl++;
    abbruch(`SMTP-Versand fehlgeschlagen bei Mail ${i + 1}/${gesamt} (${m.datei}). Fehler: ${letzterFehler || "unbekannt"}. Gesendet bisher: ${ok}. Restliche Mails NICHT gesendet.`);
  }
  ok++;
  console.log("gesendet " + info);
  if (i < gesamt - 1) await new Promise((r) => setTimeout(r, PAUSE_MS));
}
console.log(`Fertig: ${ok} ${trocken ? "erzeugt" : "gesendet"}, ${fehl} fehlgeschlagen.`);
