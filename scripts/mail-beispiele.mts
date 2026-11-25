// Gemeinsame Beispielmails (Beispieldaten + Erzeuger-Funktionen des Produktivcodes).
// Genutzt von scripts/mail-vorschau-alle.mts (Rendern) und scripts/mail-testversand.mts (Testversand).
// Betreff/Text/HTML kommen aus denselben Funktionen wie im Produktivcode; nur die zwei Mailtexte, die dort
// inline gebaut werden (Kontakt, Gruss-Anfrage), sind hier mit ihrem Inhalt nachgebaut.
import { bestaetigungsMail, ablehnungsMail, widerrufEingangsMail, alexMail, alexMailWiderruf, type MailBestellung } from "../lib/shop/server/vorlagen.ts";
import { angebotsMail } from "../lib/shop/server/angebot.ts";
import { versandMail } from "../lib/shop/server/versandmail.ts";
import { eingangsMail, absageMail, alexMailFreigabe, alexMailErstattungOffen } from "../lib/shop/server/freigabe-texte.ts";
import { htmlKontakt, htmlGrussAnfrage } from "../lib/shop/server/mail-alex.ts";
import { agbKlartext } from "../lib/shop/agb-daten.ts";

export type Bestaetigung = ReturnType<typeof bestaetigungsMail>;

export interface Beispielmail {
  /** Dateiname der Vorschau (ohne Endung), z. B. "01-bestellbestaetigung-standard" */
  datei: string;
  art: "kunde" | "alex";
  betreff: string;
  text: string;
  /** wie im Produktivcode uebergeben; undefined = Produktivcode erzeugt das HTML aus dem Text (einfacheMailHtml) */
  html?: string;
  /** nur Bestellbestaetigung: Rechtsdokumente, die im Produktivcode als PDF angehaengt werden */
  bestaetigung?: Bestaetigung;
  replyTo?: string;
}

export function baueBeispiele(SITE = "https://pixldrop.de"): Beispielmail[] {
  const opt = { siteUrl: SITE, lieferzeit: "3 bis 5 Werktage", agbText: agbKlartext("3 bis 5 Werktage") };
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
  const out: Beispielmail[] = [];
  const kunde = (datei: string, m: { betreff: string; text: string; html?: string }, extra: Partial<Beispielmail> = {}) =>
    out.push({ datei, art: "kunde", betreff: m.betreff, text: m.text, html: m.html, ...extra });
  const alex = (datei: string, m: { betreff: string; text: string; html?: string }, extra: Partial<Beispielmail> = {}) =>
    out.push({ datei, art: "alex", betreff: m.betreff, text: m.text, html: m.html, ...extra });

  const m1 = bestaetigungsMail(b, undefined, false, opt);
  const m2 = bestaetigungsMail(mix, undefined, false, opt);
  kunde("01-bestellbestaetigung-standard", m1, { bestaetigung: m1 });
  kunde("02-bestellbestaetigung-gemischt", m2, { bestaetigung: m2 });

  // 03/04/05/06: Produktivcode uebergibt kein HTML (mailKunde setzt den Text in den Shop-Rahmen)
  const ab = ablehnungsMail({ nummer: b.nummer, name: b.name, gesamt_cent: 3380 }, "Dein Text enthält eine geschützte Marke.");
  kunde("03-absage-kurz", ab);
  kunde("04-eingangsbestaetigung-freigabe", eingangsMail({ nummer: b.nummer, name: b.name, gesamt_cent: 3380, positionen: "1 × Tischschild" }, SITE));
  kunde("05-absage-erstattung", absageMail({ nummer: b.nummer, name: b.name, gesamt_cent: 3380 }, "frist", SITE));
  kunde("06-widerruf-eingang", widerrufEingangsMail({ nummer: "WD-2026-0003", name: b.name, vertragAngabe: "Bestellung PD-2026-0042", positionen: null, email: "erika@example.de", eingegangenAm: new Date() }));

  const base = { nummer: b.nummer, name: b.name, strasse: b.strasse, plz: b.plz, ort: b.ort };
  kunde("07-versand-hermes", versandMail({ ...base, versandart: "hermes", sendungsnummer: "H1234567890123" }, SITE));
  kunde("08-versand-dhl", versandMail({ ...base, versandart: "dhl", sendungsnummer: "00340434161094042557" }, SITE));
  kunde("09-versand-brief", versandMail({ ...base, versandart: "brief", sendungsnummer: null }, SITE));
  kunde("10-versand-ohne-nummer", versandMail({ ...base, versandart: "dhl", sendungsnummer: null }, SITE));

  kunde("11-angebot", angebotsMail(
    { nummer: "PA-2026-0007", name: b.name, beschreibung: "Ein Halter für meine Kopfhörer, passend zur Tischkante (ca. 3 cm dick). Maximal 12 cm hoch.", farbe: "Schwarz", preisCent: 2490, versandCent: 490, lieferzeit: "3 bis 5 Werktage", text: "Hallo Erika,\n\nich habe die Tischkante mit 3 cm eingeplant.", gueltigBis: "2026-12-07T20:00:00Z" },
    `${SITE}/3d-druck/angebot/AbCdEfGhIjKlMnOpQrStUvWxYz0123456789`, SITE));

  // intern an Alex
  const alexB: MailBestellung = {
    ...b, gesamt_cent: 3680, summe_waren_cent: 3190, versand_cent: 490, versandart: "dhl",
    positionen: [
      { name: "Bubble-Buchstaben", menge: 1, einzelpreis_cent: 1490, farbe: "Rosa, Weiß, Mint", text: "ERIKA <3 & Co", optionen: { Höhe: "10 cm" } },
      { name: "Wandbuchstaben", menge: 2, einzelpreis_cent: 850, farbe: "Weiß", text: "Hallo\nWelt", optionen: { Schrift: "Rundschrift", Höhe: "15 cm", Oberfläche: "Glatt", Dicke: "10 mm" } },
    ],
  };
  alex("20-alex-neue-bestellung", alexMail("Bestellung", b.nummer, "https://example.invalid/admin", alexB));
  alex("21-alex-widerruf", alexMailWiderruf("WD-2026-0003", b.nummer, "passt", true, "https://example.invalid/admin"));
  alex("22-alex-erstattung-offen", alexMailErstattungOffen(b.nummer));
  alex("23-alex-freigabe", alexMailFreigabe(b.nummer, { ok: `${SITE}/3d-druck/freigabe/ok-token`, nein: `${SITE}/3d-druck/freigabe/nein-token` }, "neu", [], {
    positionen: [{ name: "Tischschild", menge: 1, text: "Eddies Kaffee-Ecke\nOpen 24/7", schrift: "Rundschrift", optionen: { Format: "Querformat" } }], bezahltAm: "2026-10-09T10:16:30Z" }));
  const kName = "Erika Mustermann", kMail = "erika@example.de", kText = "Hallo, habt ihr das auch in Grün?\nViele Grüße";
  alex("24-alex-kontakt", {
    betreff: "Neue Kontaktanfrage (3D-Druck-Shop)",
    text: ["Neue Nachricht über das Kontaktformular (3D-Druck-Shop):", "", `Name: ${kName}`, `E-Mail: ${kMail}`, "", kText, "", "Antworten geht direkt per Reply an den Absender."].join("\n"),
    html: htmlKontakt(kName, kMail, kText),
  }, { replyTo: kMail });
  const g = { anlass: "Geburtstag", variante: "Standard", textart: "Lied", name: "Erika", kontakt: "erika@example.de", nachricht: "Für meine Mutter zum 60." };
  alex("25-alex-gruss-anfrage", {
    betreff: `Neue Grußvideo-Anfrage (${g.anlass})`,
    text: ["Neue Grußvideo-Anfrage über pixldrop.de", `Anlass: ${g.anlass}`, `Variante: ${g.variante}`, `Textart: ${g.textart}`, `Name: ${g.name}`, `Kontakt: ${g.kontakt}`, `Nachricht: ${g.nachricht}`].join("\n"),
    html: htmlGrussAnfrage(g),
  });
  return out;
}
