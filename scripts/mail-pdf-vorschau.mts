// Vorschau fuer Bestellbestaetigung (HTML) und PDF-Anhaenge. Aufruf (im Repo-Root):
//   node --import ./tests/shop/register.mjs scripts/mail-pdf-vorschau.mts
// Schreibt nach D:\Apps\.playwright-mcp\ : mail-vorschau-<variante>.html, PDFs in pdf-vorschau\.
// Screenshots (390/700 px) und PDF->PNG macht anschliessend scripts/mail-pdf-vorschau.cjs bzw. PyMuPDF (siehe Bericht).
import { mkdirSync, writeFileSync } from "node:fs";
import { bestaetigungsMail, ablehnungsMail, widerrufEingangsMail, type MailBestellung } from "../lib/shop/server/vorlagen.ts";
import { einfacheMailHtml } from "../lib/shop/server/mail-layout.ts";
import { erzeugeAnhaenge } from "../lib/shop/server/pdf.ts";
import { angebotsMail } from "../lib/shop/server/angebot.ts";
import { agbKlartext } from "../lib/shop/agb-daten.ts";

const OUT = "D:/Apps/.playwright-mcp";
const PDF = `${OUT}/pdf-vorschau`;
mkdirSync(PDF, { recursive: true });
const opt = { siteUrl: process.env.VORSCHAU_SITE || "http://localhost:3999", lieferzeit: "3 bis 5 Werktage", agbText: agbKlartext("3 bis 5 Werktage") };

const standard: MailBestellung = {
  nummer: "PD-2026-0042", name: "Erika Mustermann", strasse: "Beispielweg 12", plz: "86663", ort: "Asbach-Bäumenheim",
  gesamt_cent: 3380, summe_waren_cent: 2890, versand_cent: 490, individuell: false,
  erstellt_am: "2026-10-09T10:15:00Z", bezahlt_am: "2026-10-09T10:16:30Z", capture_id: "5TY12345AB678901C",
  positionen: [
    { name: "Tischschild", menge: 1, einzelpreis_cent: 1490, individuell: false, farbe: "Honiggelb", optionen: { Format: "Querformat", Größe: "L" } },
    { name: "Spruch-Untersetzer", menge: 2, einzelpreis_cent: 700, individuell: false, farbe: "Schwarz" },
  ],
};
const mix: MailBestellung = {
  ...standard, individuell: true,
  positionen: [
    { name: "Tischschild", menge: 1, einzelpreis_cent: 1490, individuell: true, farbe: "Honiggelb", text: "Eddies Kaffee-Ecke\nOpen 24/7", schrift: "Rundschrift", optionen: { Format: "Querformat" } },
    { name: "Spruch-Untersetzer", menge: 2, einzelpreis_cent: 700, individuell: false, farbe: "Schwarz" },
  ],
};
const nurIndividuell: MailBestellung = { ...mix, positionen: [mix.positionen[0]], summe_waren_cent: 1490, gesamt_cent: 1980 };

for (const [name, b] of [["standard", standard], ["gemischt", mix], ["individuell", nurIndividuell]] as const) {
  const m = bestaetigungsMail(b, undefined, false, opt);
  writeFileSync(`${OUT}/mail-vorschau-${name}.html`, m.html, "utf8");
  if (name === "gemischt") {
    for (const a of await erzeugeAnhaenge(m.anhaenge)) writeFileSync(`${PDF}/${a.filename}`, a.content);
  }
}
const ab = ablehnungsMail({ nummer: "PD-2026-0042", name: "Erika Mustermann", gesamt_cent: 3380 }, "Dein Text enthält eine geschützte Marke.");
writeFileSync(`${OUT}/mail-vorschau-absage.html`, einfacheMailHtml(ab.betreff, ab.text, opt.siteUrl), "utf8");
const w = widerrufEingangsMail({ nummer: "WD-2026-0003", name: "Erika Mustermann", vertragAngabe: "Bestellung PD-2026-0042", positionen: null, email: "erika@example.de", eingegangenAm: new Date() });
writeFileSync(`${OUT}/mail-vorschau-widerruf.html`, einfacheMailHtml(w.betreff, w.text, opt.siteUrl), "utf8");
const an = angebotsMail(
  { nummer: "PA-2026-0007", name: "Erika Mustermann", beschreibung: "Ein Halter für meine Kopfhörer, passend zur Tischkante (ca. 3 cm dick), gern mit Eddie-Gesicht vorne. Maximal 12 cm hoch.", farbe: "Honiggelb", preisCent: 1890, versandCent: 490, lieferzeit: "3 bis 5 Werktage", text: "Hallo Erika, das mache ich gern! Ich habe die Tischkante mit 3 cm eingeplant und das Eddie-Gesicht als Relief vorgesehen.", gueltigBis: "2026-10-24T20:00:00Z" },
  `${opt.siteUrl}/3d-druck/angebot/AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde`, opt.siteUrl);
writeFileSync(`${OUT}/mail-vorschau-angebot.html`, an.html, "utf8");
writeFileSync(`${OUT}/mail-vorschau-angebot.txt`, an.text, "utf8");
console.log("fertig:", OUT);
