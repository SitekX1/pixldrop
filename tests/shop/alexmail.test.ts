import { test } from "node:test";
import assert from "node:assert/strict";
import { alexMailFreigabe, alexMailErstattungOffen, fristText, wunschtextKurzliste } from "@/lib/shop/server/freigabe-texte";
import { alexMail, alexMailWiderruf } from "@/lib/shop/server/vorlagen";
import { htmlKontakt, htmlGrussAnfrage } from "@/lib/shop/server/mail-alex";
import { bremseZuruecksetzen, erzeugeBenachrichtiger } from "@/lib/shop/server/benachrichtigung";
import { testEnv } from "./mocks";

const links = { ok: "https://t.example/3d-druck/freigabe?b=1&a=ok&t=AAA", nein: "https://t.example/3d-druck/freigabe?b=1&a=nein&t=BBB" };
const boese = '<script>alert(1)</script> & "x"';
const pos = [{ name: "Individueller Untersetzer mit deinem Text", menge: 2, text: boese, schrift: "Oswald", optionen: { Schriftfarbe: "Honiggelb", Linienfarbe: "<b>Rot</b>" } }];

test("Wunschtext-Mail: HTML escaped Wunschtext, Buttons mit korrekten Links, Frist, Fallback-Text mit beiden Links", () => {
  const m = alexMailFreigabe("PD-2026-0006", links, "neu", wunschtextKurzliste(pos), { positionen: pos, bezahltAm: "2026-10-16T12:00:00Z" });
  assert.ok(!m.html.includes("<script>") && !m.html.includes("<b>Rot</b>"));
  assert.ok(m.html.includes("&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;x&quot;"));
  assert.ok(m.html.includes(`href="${links.ok.replace(/&/g, "&amp;")}"`) && m.html.includes(`href="${links.nein.replace(/&/g, "&amp;")}"`));
  assert.match(m.html, />Freigeben</);
  assert.match(m.html, />Ablehnen und erstatten</);
  assert.ok(m.html.includes("Entscheide bis 17.10.2026, 14:00 Uhr"), "12:00 UTC + 24 h = 14:00 MESZ");
  assert.ok(m.html.includes("7 Tage") && m.html.includes("Bestätigungsschritt") && m.html.includes("2 × "));
  assert.ok(m.text.includes(links.ok) && m.text.includes(links.nein) && m.text.includes("Entscheide bis 17.10.2026, 14:00 Uhr"));
  assert.ok(!/Erika|Anschrift|@example/.test(m.html));
  assert.match(m.html, /prefers-color-scheme:dark/);
});

test("Wunschtext-Mail: ohne Zahlungszeitpunkt keine konkrete Frist; Erinnerung hat eigenen Betreff", () => {
  const m = alexMailFreigabe("PD-1", links, "erinnerung", [], {});
  assert.ok(!m.html.includes("Entscheide bis ") && m.html.includes("Entscheide innerhalb von 24 Stunden"));
  assert.match(m.betreff, /^Erinnerung: Wunschtext prüfen/);
  assert.equal(fristText("kaputt"), null);
  assert.equal(fristText(null), null);
});

test("Weitere Alex-Mails: Betreff/Text unveraendert, HTML escaped, keine Kundendaten", () => {
  const b = alexMail("Bestellung", "PD-9", "https://admin.example/shop");
  assert.equal(b.betreff, "Neue Bestellung PD-9");
  assert.ok(b.text.includes("https://admin.example/shop") && b.html.includes('href="https://admin.example/shop"'));
  const a = alexMail("Anfrage", "PA-9");
  assert.ok(a.html.includes("3D-Druck → Anfragen") && !a.html.includes("href=\"undefined"));
  const w = alexMailWiderruf("WD-1", null, "<img src=x>", false);
  assert.ok(w.html.includes("NICHT") && !w.html.includes("<img src=x>") && w.text.includes("NICHT versendet"));
  const e = alexMailErstattungOffen("PD-9");
  assert.equal(e.betreff, "Erstattung offen: PD-9");
  assert.ok(e.html.includes("PayPal") && e.text.includes("Bitte in PayPal erstatten."));
  const k = htmlKontakt("<i>Name</i>", "a@b.de", "Zeile1\n<script>x</script>");
  assert.ok(!k.includes("<script>") && !k.includes("<i>Name</i>") && k.includes("Zeile1<br>"));
  const g = htmlGrussAnfrage({ anlass: "Geburtstag", variante: "a", textart: "-", name: "<b>x</b>", kontakt: "k", nachricht: "&" });
  assert.ok(!g.includes("<b>x</b>") && g.includes("&amp;"));
});

test("Notifier.mailAlex: sendet multipart (text + html) mit Logo-CID; ohne html wie bisher nur Text", async () => {
  bremseZuruecksetzen();
  const gesendet: { text: string; html?: string; replyTo?: string; attachments?: { cid?: string }[] }[] = [];
  const n = erzeugeBenachrichtiger(testEnv({ SMTP_HOST: "smtp.test", SMTP_USER: "u@test.de", SMTP_PASS: "x" }), fetch, async () => ({ sendMail: async (o) => { gesendet.push(o as never); return {}; } }));
  const m = alexMailFreigabe("PD-1", links, "neu");
  assert.equal(await n.mailAlex(m.betreff, m.text, undefined, m.html), true);
  assert.equal(gesendet[0].text, m.text);
  assert.ok(gesendet[0].html?.includes("Freigeben"));
  assert.deepEqual((gesendet[0].attachments ?? []).map((a) => a.cid), ["pixldrop-logo"]);
  assert.equal(await n.mailAlex("B", "nur Text", "k@example.de"), true);
  assert.equal(gesendet[1].html, undefined);
  assert.equal(gesendet[1].attachments, undefined);
  assert.equal(gesendet[1].replyTo, "k@example.de");
});

test("Alex-Bestellmail: Positionen, Optionen, Wunschtext (escaped), Versand und Summe; ohne Kundendaten", () => {
  const m = alexMail("Bestellung", "PD-9", "https://admin.example/shop", {
    positionen: [
      { name: "Bubble-Buchstaben", menge: 1, einzelpreis_cent: 1490, farbe: "Rosa", text: boese, optionen: { Höhe: "10 cm" } },
      { name: "Wandbuchstaben", menge: 2, einzelpreis_cent: 850, optionen: { Schrift: "Rundschrift", Oberfläche: "Glatt", Dicke: "10 mm" } },
    ],
    summe_waren_cent: 3190, versand_cent: 490, versandart: "dhl", gesamt_cent: 3680,
  });
  assert.ok(!m.html.includes("<script>") && m.html.includes("&lt;script&gt;"));
  for (const x of ["Bubble-Buchstaben", "Farbe: Rosa", "Höhe: 10 cm", "2 × Wandbuchstaben", "Oberfläche: Glatt", "Dicke: 10 mm", "Versand (Deutschland", "Gesamtpreis"]) {
    assert.ok(m.html.includes(x), x);
  }
  assert.ok(m.text.includes("2 x Wandbuchstaben") && m.text.includes("Gesamtpreis:") && m.text.includes("Versand (Deutschland"));
  assert.ok(!/Erika|Anschrift:|@example/.test(m.html + m.text));
  const ohne = alexMail("Bestellung", "PD-9");
  assert.ok(!ohne.html.includes("Gesamtpreis") && !ohne.text.includes("Positionen:"));
});
