// Rendert ALLE Shop-Mails als HTML-Vorschau (Logo als data-URI). Aufruf im Repo-Root:
//   node --import ./tests/shop/register.mjs scripts/mail-vorschau-alle.mts [Zielordner]
// Standard-Ziel: D:/Apps/3D-Druck/Modelle/Shop-Redesign/mail-vorschau
import { mkdirSync, writeFileSync } from "node:fs";
import { bestaetigungsMail, ablehnungsMail, widerrufEingangsMail, alexMail, alexMailWiderruf, type MailBestellung } from "../lib/shop/server/vorlagen.ts";
import { einfacheMailHtml, cidZuDataUri } from "../lib/shop/server/mail-layout.ts";
import { angebotsMail } from "../lib/shop/server/angebot.ts";
import { versandMail } from "../lib/shop/server/versandmail.ts";
import { eingangsMail, absageMail, alexMailFreigabe, alexMailErstattungOffen } from "../lib/shop/server/freigabe-texte.ts";
import { htmlKontakt, htmlGrussAnfrage } from "../lib/shop/server/mail-alex.ts";
import { agbKlartext } from "../lib/shop/agb-daten.ts";

const OUT = process.argv[2] || "D:/Apps/3D-Druck/Modelle/Shop-Redesign/mail-vorschau";
mkdirSync(OUT, { recursive: true });
const SITE = "https://pixldrop.de";
const opt = { siteUrl: SITE, lieferzeit: "3 bis 5 Werktage", agbText: agbKlartext("3 bis 5 Werktage") };
const w = (name: string, html: string) => writeFileSync(`${OUT}/${name}.html`, cidZuDataUri(html), "utf8");

const b: MailBestellung = {
  nummer: "PD-2026-0042", name: "Erika Mustermann", strasse: "Beispielweg 12", plz: "86663", ort: "Asbach-Bäumenheim",
  gesamt_cent: 3380, summe_waren_cent: 2890, versand_cent: 490, individuell: false,
  erstellt_am: "2026-10-09T10:15:00Z", bezahlt_am: "2026-10-09T10:16:30Z", capture_id: "5TY12345AB678901C",
  positionen: [
    { name: "Tischschild", menge: 1, einzelpreis_cent: 1490, individuell: false, farbe: "Honiggelb", optionen: { Format: "Querformat", Größe: "L" } },
    { name: "Spruch-Untersetzer", menge: 2, einzelpreis_cent: 700, individuell: false, farbe: "Schwarz" },
  ],
};
const mix: MailBestellung = {
  ...b, individuell: true,
  positionen: [
    { name: "Tischschild", menge: 1, einzelpreis_cent: 1490, individuell: true, farbe: "Honiggelb", text: "Eddies Kaffee-Ecke\nOpen 24/7", schrift: "Rundschrift", optionen: { Format: "Querformat" } },
    { name: "Spruch-Untersetzer", menge: 2, einzelpreis_cent: 700, individuell: false, farbe: "Schwarz" },
  ],
};
w("01-bestellbestaetigung-standard", bestaetigungsMail(b, undefined, false, opt).html);
w("02-bestellbestaetigung-gemischt", bestaetigungsMail(mix, undefined, false, opt).html);

const ab = ablehnungsMail({ nummer: b.nummer, name: b.name, gesamt_cent: 3380 }, "Dein Text enthält eine geschützte Marke.");
w("03-absage-kurz", einfacheMailHtml(ab.betreff, ab.text, SITE));
const ein = eingangsMail({ nummer: b.nummer, name: b.name, gesamt_cent: 3380, positionen: "1 × Tischschild" }, SITE);
w("04-eingangsbestaetigung-freigabe", einfacheMailHtml(ein.betreff, ein.text, SITE));
const abs = absageMail({ nummer: b.nummer, name: b.name, gesamt_cent: 3380 }, "frist", SITE);
w("05-absage-erstattung", einfacheMailHtml(abs.betreff, abs.text, SITE));
const wi = widerrufEingangsMail({ nummer: "WD-2026-0003", name: b.name, vertragAngabe: "Bestellung PD-2026-0042", positionen: null, email: "erika@example.de", eingegangenAm: new Date() });
w("06-widerruf-eingang", einfacheMailHtml(wi.betreff, wi.text, SITE));

const base = { nummer: b.nummer, name: b.name, strasse: b.strasse, plz: b.plz, ort: b.ort };
w("07-versand-hermes", versandMail({ ...base, versandart: "hermes", sendungsnummer: "H1234567890123" }, SITE).html);
w("08-versand-dhl", versandMail({ ...base, versandart: "dhl", sendungsnummer: "00340434161094042557" }, SITE).html);
w("09-versand-brief", versandMail({ ...base, versandart: "brief", sendungsnummer: null }, SITE).html);
w("10-versand-ohne-nummer", versandMail({ ...base, versandart: "dhl", sendungsnummer: null }, SITE).html);

w("11-angebot", angebotsMail(
  { nummer: "PA-2026-0007", name: b.name, beschreibung: "Ein Halter für meine Kopfhörer, passend zur Tischkante (ca. 3 cm dick). Maximal 12 cm hoch.", farbe: "Schwarz", preisCent: 2490, versandCent: 490, lieferzeit: "3 bis 5 Werktage", text: "Hallo Erika,\n\nich habe die Tischkante mit 3 cm eingeplant.", gueltigBis: "2026-12-07T20:00:00Z" },
  `${SITE}/3d-druck/angebot/AbCdEfGhIjKlMnOpQrStUvWxYz0123456789`, SITE).html);

// intern an Alex
w("20-alex-neue-bestellung", alexMail("Bestellung", b.nummer, "https://example.invalid/admin").html);
w("21-alex-widerruf", alexMailWiderruf("WD-2026-0003", b.nummer, "passt", true, "https://example.invalid/admin").html);
w("22-alex-erstattung-offen", alexMailErstattungOffen(b.nummer).html);
w("23-alex-freigabe", alexMailFreigabe(b.nummer, { ok: `${SITE}/3d-druck/freigabe/ok-token`, nein: `${SITE}/3d-druck/freigabe/nein-token` }, "neu", [], {
  positionen: [{ name: "Tischschild", menge: 1, text: "Eddies Kaffee-Ecke\nOpen 24/7", schrift: "Rundschrift", optionen: { Format: "Querformat" } }], bezahltAm: "2026-10-09T10:16:30Z" }).html);
w("24-alex-kontakt", htmlKontakt("Erika Mustermann", "erika@example.de", "Hallo, habt ihr das auch in Grün?\nViele Grüße"));
w("25-alex-gruss-anfrage", htmlGrussAnfrage({ anlass: "Geburtstag", variante: "Standard", textart: "Lied", name: "Erika", kontakt: "erika@example.de", nachricht: "Für meine Mutter zum 60." }));
console.log("fertig:", OUT);
