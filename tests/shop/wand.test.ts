import { test } from "node:test";
import assert from "node:assert/strict";
import {
  gewichtGramm, maxWandHoehe, nichtDruckbar, passtAufsBett, pruefeWandKonfiguration, schriftHatZeichen, WAND_HOEHEN, WAND_PREIS_CENT,
} from "@/lib/shop/wand";

const zeile = (extra: Record<string, unknown> = {}) => ({ text: "Emil", schrift: "libre-baskerville", hoeheCm: 10, farbe: "schwarz", ...extra });
const ein = (zeilen: unknown[], extra: Record<string, unknown> = {}) => pruefeWandKonfiguration({ zeilen, oberflaeche: "glatt", ...extra });

test("Preis je Zeichen: Emil, 10 cm, glatt = 4 x 6,12 €", () => {
  const r = ein([zeile()]);
  assert.ok(r.ok);
  assert.equal(r.wert.zeichen, 4);
  assert.equal(r.wert.summeCent, 4 * 612);
  assert.equal(r.wert.rabattCent, 0);
  assert.equal(r.wert.gesamtCent, 2448);
});

test("Leerzeichen kosten nichts, Satzzeichen zählen als Zeichen", () => {
  const r = ein([zeile({ text: "Hi du!" })]);
  assert.ok(r.ok);
  assert.equal(r.wert.zeichen, 5);
});

test("10 % Rabatt ab 10 Zeichen, über alle Zeilen gezählt", () => {
  const a = ein([zeile({ text: "Willkommen" })]);
  assert.ok(a.ok);
  assert.equal(a.wert.zeichen, 10);
  assert.equal(a.wert.rabattCent, Math.round(10 * 612 * 0.1));
  const b = ein([zeile({ text: "Hallo" }), zeile({ text: "Welt1", hoeheCm: 15 })]);
  assert.ok(b.ok);
  assert.equal(b.wert.zeichen, 10);
  assert.equal(b.wert.summeCent, 5 * 612 + 5 * 732);
  assert.equal(b.wert.gesamtCent, b.wert.summeCent - b.wert.rabattCent);
  const c = ein([zeile({ text: "Neun Zeic" })]);
  assert.ok(c.ok);
  assert.equal(c.wert.zeichen, 8);
  assert.equal(c.wert.rabattCent, 0);
});

test("Strukturiert ist in jeder Höhe billiger als Glatt", () => {
  for (const h of WAND_HOEHEN) assert.ok(WAND_PREIS_CENT.strukturiert[h] < WAND_PREIS_CENT.glatt[h], `Höhe ${h}`);
  const r = ein([zeile()], { oberflaeche: "strukturiert" });
  assert.ok(r.ok);
  assert.equal(r.wert.summeCent, 4 * 498);
});

test("Manipulierte Eingaben werden abgelehnt", () => {
  assert.equal(ein([]).ok, false);
  assert.equal(ein([zeile(), zeile(), zeile(), zeile()]).ok, false, "mehr als 3 Zeilen");
  assert.equal(ein([zeile({ hoeheCm: 30 })]).ok, false, "30 cm gibt es nicht");
  assert.equal(ein([zeile({ hoeheCm: 12 })]).ok, false, "Höhe nicht in der Liste");
  assert.equal(ein([zeile({ schrift: "comic" })]).ok, false);
  assert.equal(ein([zeile({ farbe: "pink" })]).ok, false);
  assert.equal(ein([zeile({ text: "<b>x" })]).ok, false);
  assert.equal(ein([zeile({ text: "a".repeat(21) })]).ok, false);
  assert.equal(ein([zeile({ text: "   " })]).ok, false);
  assert.equal(pruefeWandKonfiguration(null).ok, false);
  assert.equal(pruefeWandKonfiguration({ zeilen: [zeile()], oberflaeche: "hochglanz" }).ok, false);
});

test("Schreibweise 'erster Buchstabe groß' gilt nur für Schreibschriften", () => {
  const s = ein([zeile({ text: "EMILIA", schrift: "great-vibes", hoeheCm: 10 })], { schreibweise: "erster-gross" });
  assert.ok(s.ok);
  assert.equal(s.wert.zeilen[0].text, "Emilia");
  const k = ein([zeile({ text: "EMILIA" })], { schreibweise: "erster-gross" });
  assert.ok(k.ok);
  assert.equal(k.wert.zeilen[0].text, "EMILIA");
});

test("Passt-aufs-Druckbett: ein W in 20 cm Libre Baskerville passt nicht, in 10 cm schon", () => {
  assert.equal(passtAufsBett("libre-baskerville", "W", 20), false);
  assert.equal(passtAufsBett("libre-baskerville", "W", 10), true);
  assert.equal(passtAufsBett("libre-baskerville", "I", 20), true);
  assert.equal(passtAufsBett("libre-baskerville", "H", 20), true, "ein 20-cm-H passt");
  assert.deepEqual(nichtDruckbar("libre-baskerville", "IE W", 20), ["W"]);
  const r = ein([zeile({ text: "Wand", hoeheCm: 20 })]);
  assert.equal(r.ok, false);
  assert.match(!r.ok ? r.meldung : "", /passt in 20 cm nicht aufs Druckbett/);
  assert.equal(maxWandHoehe("libre-baskerville", "Wand"), 15);
  assert.equal(maxWandHoehe("libre-baskerville", "IE"), 20);
  assert.ok(maxWandHoehe("great-vibes", "Kai") < 20, "große Schnörkel-Großbuchstaben brauchen mehr Platz");
});

test("Zeichen, die die Schrift nicht hat, sind nicht bestellbar", () => {
  assert.equal(schriftHatZeichen("libre-baskerville", "ß"), true);
  assert.equal(schriftHatZeichen("libre-baskerville", "€"), false);
  assert.equal(schriftHatZeichen("gibt-es-nicht", "A"), false);
  const r = ein([zeile({ text: "Fuß" })]);
  assert.ok(r.ok);
});

test("Gewicht des 8-cm-E (Libre Baskerville Bold, 5 mm) liegt bei 4 g wie im Testdruck", () => {
  const g = gewichtGramm("libre-baskerville", "E", 8, 5);
  assert.ok(g > 3.6 && g < 4.4, `Gewicht ${g}`);
  assert.ok(Math.abs(gewichtGramm("libre-baskerville", "E", 8, 10) - 2 * g) < 0.01, "10 mm = doppelt");
});

test("Dicke: Standard 10 mm, 5 mm ist günstiger, ungültige Dicke wird abgelehnt", () => {
  const a = ein([zeile()]);
  assert.ok(a.ok);
  assert.equal(a.wert.dickeMm, 10);
  const b = ein([zeile()], { dickeMm: 5 });
  assert.ok(b.ok);
  assert.ok(b.wert.summeCent < a.wert.summeCent);
  assert.equal(ein([zeile()], { dickeMm: 7 }).ok, false);
  assert.equal(ein([zeile()], { dickeMm: "10" }).ok, false);
});

test("Wunschtext-Filter greift (unzulässige Wörter)", () => {
  const r = ein([zeile({ text: "Hitler" })]);
  assert.equal(r.ok, false);
});
