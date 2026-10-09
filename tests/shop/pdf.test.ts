import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { bestaetigungsMail, PFLICHTANGABEN_PLATZHALTER, type MailBestellung } from "@/lib/shop/server/vorlagen";
import { erzeugeAnhaenge, mailMitAnhaengen } from "@/lib/shop/server/pdf";

const pos = (individuell: boolean) => ({ name: "X", menge: 1, einzelpreis_cent: 990, individuell });
const basis: MailBestellung = {
  nummer: "PD-2026-0001", name: "Erika", strasse: "Teststr. 1", plz: "86663", ort: "Asbach",
  gesamt_cent: 1480, summe_waren_cent: 990, versand_cent: 490, individuell: false, positionen: [pos(false)],
};
const opt = { siteUrl: "https://pixldrop.de", lieferzeit: "5 Werktage" };

test("PDF-Anhaenge: Namen, MIME, Groesse, lesbar", async () => {
  const m = bestaetigungsMail(basis, undefined, false, opt);
  const r = await mailMitAnhaengen(m);
  assert.equal(r.fallback, false);
  assert.deepEqual(r.anhaenge!.map((a) => a.filename), ["AGB.pdf", "Widerrufsbelehrung.pdf", "Muster-Widerrufsformular.pdf"]);
  let summe = 0;
  for (const a of r.anhaenge!) {
    assert.equal(a.contentType, "application/pdf");
    summe += a.content.length;
    assert.ok((await PDFDocument.load(a.content)).getPageCount() >= 1);
  }
  assert.ok(summe < 1024 * 1024, "unter 1 MB");
  assert.ok(r.text.length < 2500 && !r.text.includes("MUSTER-WIDERRUFSFORMULAR"));
});

test("PDF: individuell nur AGB, gemischt mit Belehrung", () => {
  const nur = bestaetigungsMail({ ...basis, individuell: true, positionen: [pos(true)] }, undefined, false, opt);
  assert.deepEqual(nur.anhaenge.map((d) => d.dateiname), ["AGB.pdf"]);
  assert.match(nur.text, /kein Widerrufsrecht/);
  const mix = bestaetigungsMail({ ...basis, individuell: true, positionen: [pos(true), pos(false)] }, undefined, false, opt);
  assert.equal(mix.anhaenge.length, 3);
  assert.match(mix.text, /kein Widerrufsrecht/);
});

test("PDF-Fehler: Fallback mit Volltext im Mailkoerper, ohne Anhang", async () => {
  const m = bestaetigungsMail(basis, undefined, false, opt);
  const alt = console.error; console.error = () => {};
  const r = await mailMitAnhaengen(m, async () => { throw new Error("kaputt"); });
  console.error = alt;
  assert.equal(r.fallback, true);
  assert.equal(r.anhaenge, undefined);
  assert.ok(r.text.includes("MUSTER-WIDERRUFSFORMULAR") && r.text.includes("ALLGEMEINE GESCHÄFTSBEDINGUNGEN"));
});

test("Guard: Platzhalter im PDF-Quelltext sperrt bei freigegeben", () => {
  assert.throws(() => bestaetigungsMail(basis, PFLICHTANGABEN_PLATZHALTER, true, { ...opt, agbText: "Echte AGB" }));
  assert.throws(() => bestaetigungsMail(basis, "Echter Rechtstext", true, { ...opt, agbText: "x [PLATZHALTER 2]" }));
  assert.doesNotThrow(() => bestaetigungsMail(basis, "Echter Rechtstext", true, { ...opt, agbText: "Echte AGB" }));
});

test("PDF: Sonderzeichen werfen nicht", async () => {
  const [a] = await erzeugeAnhaenge([{ dateiname: "x.pdf", titel: "Test", text: "– „ “ § € ± ä ö ü ß à → 😀 https://pixldrop.de/" + "x".repeat(200) }]);
  assert.ok(a.content.length > 500);
});
