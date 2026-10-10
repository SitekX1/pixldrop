import { test } from "node:test";
import assert from "node:assert/strict";
import { PRODUKTE, type Produkt } from "@/lib/shop/produkte";
import { berechneWarenkorb, centZuPayPal, farbeId, payPalZuCent, type Kontext } from "@/lib/shop/server/preise";
import { farbenAusZeilen } from "@/lib/shop/farben";

const katalog: Produkt[] = PRODUKTE.map((p) => ({ ...p, preisCent: 1290 }));
const farben = [
  { id: "honiggold", name: "Honiggold", hex: "#f0bb55" },
  { id: "schwarz", name: "Schwarz", hex: "#1c1c1c" },
];
const ctx = (extra: Partial<Kontext> = {}): Kontext => ({
  produkte: katalog, farben, versandCent: 490, bestellbar: () => true, ...extra,
});
const pos = (extra: Record<string, unknown> = {}) => ({ slug: "koffein-pegel", menge: 2, farbeId: "schwarz", ...extra });

test("Preis wird serverseitig berechnet: 2 x 12,90 + 4,90 Versand", () => {
  const r = berechneWarenkorb([pos()], ctx());
  assert.ok(r.ok);
  assert.equal(r.wert.summeWarenCent, 2580);
  assert.equal(r.wert.gesamtCent, 3070);
  assert.equal(r.wert.positionen[0].einzelpreisCent, 1290);
});

test("Vom Client gesendete Preise werden ignoriert", () => {
  const r = berechneWarenkorb([pos({ einzelpreisCent: 1, preisCent: 1, preis: 0.01, gesamt: 1 })], ctx());
  assert.ok(r.ok);
  assert.equal(r.wert.gesamtCent, 3070);
});

test("Artikel ohne Preis (Preis folgt) ist nicht bestellbar", () => {
  const leer = PRODUKTE.map((p) => ({ ...p, preisCent: null }));
  const r = berechneWarenkorb([pos()], ctx({ produkte: leer }));
  assert.ok(!r.ok);
  assert.equal(r.fehler.code, "preis_folgt");
});

test("Ohne festgelegte Versandkosten keine Bestellung", () => {
  const r = berechneWarenkorb([pos()], ctx({ versandCent: null }));
  assert.ok(!r.ok);
  assert.equal(r.fehler.code, "versand_folgt");
});

test("Lager nicht lesbar -> kein stiller Platzhalter", () => {
  const r = berechneWarenkorb([pos()], ctx({ farben: null }));
  assert.ok(!r.ok);
  assert.equal(r.fehler.code, "lager_nicht_lesbar");
});

test("Mengenpruefung", () => {
  for (const menge of [0, -1, 21, 1.5, "2", null, NaN]) {
    const r = berechneWarenkorb([pos({ menge })], ctx());
    assert.ok(!r.ok, `Menge ${String(menge)} muss abgelehnt werden`);
    assert.equal(r.fehler.code, "ungueltig");
  }
  assert.ok(berechneWarenkorb([pos({ menge: 20 })], ctx()).ok);
});

test("Unbekannter oder nicht bestellbarer Artikel", () => {
  assert.equal((berechneWarenkorb([pos({ slug: "gibt-es-nicht" })], ctx()) as { fehler: { code: string } }).fehler.code, "unbekannt");
  const r = berechneWarenkorb([pos()], ctx({ bestellbar: () => false }));
  assert.ok(!r.ok);
  assert.equal(r.fehler.code, "nicht_bestellbar");
});

test("Farbe muss im Lager sein", () => {
  const r = berechneWarenkorb([pos({ farbeId: "neon-pink" })], ctx());
  assert.ok(!r.ok);
  assert.equal(r.fehler.code, "farbe_ungueltig");
  assert.ok(!berechneWarenkorb([{ slug: "koffein-pegel", menge: 1 }], ctx()).ok);
});

test("Optionen: alle Gruppen Pflicht, nur gueltige IDs", () => {
  const ohne = berechneWarenkorb([pos({ slug: "kuerbis-laterne" })], ctx());
  assert.ok(!ohne.ok);
  assert.equal(ohne.fehler.code, "option_ungueltig");
  const falsch = berechneWarenkorb([pos({ slug: "kuerbis-laterne", optionen: { gesicht: "x", groesse: "klein" } })], ctx());
  assert.ok(!falsch.ok);
  const fremd = berechneWarenkorb([pos({ slug: "kuerbis-laterne", optionen: { gesicht: "a", groesse: "klein", preis: "0" } })], ctx());
  assert.ok(!fremd.ok);
  const ok = berechneWarenkorb([pos({ slug: "kuerbis-laterne", optionen: { gesicht: "a", groesse: "mittel" } })], ctx());
  assert.ok(ok.ok);
  assert.deepEqual(ok.wert.positionen[0].optionen, { Gesicht: "Gesicht A", "Größe": "Mittel" });
});

test("Personalisierung: Laenge, Zeichen, Schrift, individuell-Flag", () => {
  const basis = { slug: "spruch-untersetzer", menge: 1, farbeId: "schwarz" };
  assert.ok(!berechneWarenkorb([{ ...basis }], ctx()).ok, "nurMitText: ohne Text nicht moeglich");
  assert.ok(!berechneWarenkorb([{ ...basis, text: "x".repeat(41), schriftId: "oswald" }], ctx()).ok, "zu lang");
  assert.ok(!berechneWarenkorb([{ ...basis, text: "Hi <b>", schriftId: "oswald" }], ctx()).ok, "unerlaubte Zeichen");
  assert.ok(!berechneWarenkorb([{ ...basis, text: "Montag", schriftId: "comic-sans" }], ctx()).ok, "Schrift nicht in der Liste");
  const ok = berechneWarenkorb([{ ...basis, text: "  Montag  ", schriftId: "oswald" }], ctx());
  assert.ok(ok.ok);
  assert.equal(ok.wert.positionen[0].text, "Montag");
  assert.equal(ok.wert.individuell, true);
  assert.ok(!berechneWarenkorb([pos({ text: "Hallo", schriftId: "oswald" })], ctx()).ok, "Artikel ohne Personalisierung");
  assert.equal((berechneWarenkorb([pos()], ctx()) as { wert: { individuell: boolean } }).wert.individuell, false);
});

test("Obergrenzen: leerer Warenkorb, zu viele Positionen, Gesamtsumme", () => {
  assert.ok(!berechneWarenkorb([], ctx()).ok);
  assert.ok(!berechneWarenkorb("x", ctx()).ok);
  assert.ok(!berechneWarenkorb(Array.from({ length: 6 }, () => pos()), ctx()).ok);
  const teuer = katalog.map((p) => ({ ...p, preisCent: 99_999 }));
  const r = berechneWarenkorb([pos({ menge: 3 })], ctx({ produkte: teuer }));
  assert.ok(!r.ok);
  assert.equal(r.fehler.code, "zu_teuer");
});

test("Betragsformat fuer PayPal ohne Gleitkomma", () => {
  assert.equal(centZuPayPal(3070), "30.70");
  assert.equal(centZuPayPal(5), "0.05");
  assert.equal(centZuPayPal(100), "1.00");
  assert.throws(() => centZuPayPal(1.5));
  assert.throws(() => centZuPayPal(-1));
  assert.equal(payPalZuCent("30.70"), 3070);
  assert.equal(payPalZuCent("30.7"), 3070);
  assert.equal(payPalZuCent("30"), 3000);
  assert.equal(payPalZuCent("30,70"), null);
  assert.equal(payPalZuCent(30.7), null);
  assert.equal(payPalZuCent("-1.00"), null);
});

test("Farb-IDs und Lager-Zeilen", () => {
  assert.equal(farbeId("Mintgrün"), "mintgruen");
  assert.equal(farbeId("  Weiß / Perl "), "weiss-perl");
  const f = farbenAusZeilen([
    { name: "Schwarz", hex: "#1C1C1C", material: "PLA", vorraetig: true },
    { name: "schwarz", hex: "#1C1C1C", material: "PETG", vorraetig: true },
    { name: "Rot", hex: "kaputt", material: "PLA", vorraetig: true },
    { name: "Blau", hex: "#0000FF", material: "PLA", vorraetig: false },
  ]);
  assert.equal(f.length, 1);
  assert.deepEqual(f[0], { id: "schwarz", name: "Schwarz", hex: "#1c1c1c", material: "PLA / PETG" });
  assert.deepEqual(farbenAusZeilen(null), []);
});

test("Tischschild: Standardtext = Standardware, geaenderter Text = individuell, Zeilen werden geprueft", () => {
  const basis = { slug: "tischschild-erster-kaffee", menge: 1, farbeId: "schwarz" };
  const std = berechneWarenkorb([{ ...basis, text: "Teamleiter\nSabine" }], ctx());
  assert.ok(std.ok);
  assert.equal(std.wert.individuell, false);
  assert.equal(std.wert.positionen[0].schriftId, "montserrat", "feste Schrift");
  const neu = berechneWarenkorb([{ ...basis, text: "Chef\nPetra" }], ctx());
  assert.ok(neu.ok);
  assert.equal(neu.wert.individuell, true);
  assert.equal(neu.wert.positionen[0].text, "Chef\nPetra");
  assert.ok(!berechneWarenkorb([{ ...basis, text: "nur eine Zeile" }], ctx()).ok, "zwei Zeilen noetig");
  assert.ok(!berechneWarenkorb([{ ...basis, text: "Chef\nPetra Maria Katharina" }], ctx()).ok, "Zeile zu lang");
  assert.ok(!berechneWarenkorb([{ ...basis, text: "Chef\n<b>" }], ctx()).ok, "unerlaubte Zeichen");
  assert.ok(berechneWarenkorb([{ ...basis }], ctx()).ok, "ohne Text bestellbar (Standard)");
});

test("Schriftfarbe: nur Lagerfarben, nicht gleich/aehnlich wie Grundfarbe, ohne Preis- und Widerrufswirkung", () => {
  const basis = { slug: "tischschild-erster-kaffee", menge: 1, farbeId: "schwarz", text: "Teamleiter\nSabine" };
  const ok = berechneWarenkorb([{ ...basis, optionen: { textfarbe: "honiggold" } }], ctx());
  assert.ok(ok.ok);
  assert.equal(ok.wert.positionen[0].optionen["Schriftfarbe"], "Honiggold");
  assert.equal(ok.wert.individuell, false, "Schriftfarbe ist Variantenwahl: Standardtext bleibt widerruflich");
  assert.equal(ok.wert.gesamtCent, 1290 + 490, "kein Preisaufschlag");
  const gleich = berechneWarenkorb([{ ...basis, optionen: { textfarbe: "schwarz" } }], ctx());
  assert.ok(!gleich.ok && gleich.fehler.code === "textfarbe_ungueltig", "gleiche Farbe wie Grundfarbe");
  const fremd = berechneWarenkorb([{ ...basis, optionen: { textfarbe: "neon-pink" } }], ctx());
  assert.ok(!fremd.ok && fremd.fehler.code === "textfarbe_ungueltig", "nicht im Lager");
  const ohne = berechneWarenkorb([{ ...basis }], ctx());
  assert.ok(ohne.ok, "ohne Schriftfarbe (alter Warenkorb) weiter moeglich");
  const ohneText = berechneWarenkorb([{ slug: "tischschild-erster-kaffee", menge: 1, farbeId: "schwarz", optionen: { textfarbe: "honiggold" } }], ctx());
  assert.ok(!ohneText.ok, "Schriftfarbe nur mit Wunschtext");
  const kaum = berechneWarenkorb([{ ...basis, farbeId: "honiggold", optionen: { textfarbe: "honiggold" } }], ctx());
  assert.ok(!kaum.ok);
  const mitAndererText = berechneWarenkorb([{ ...basis, text: "Chef\nPetra", optionen: { textfarbe: "honiggold", fett_1: "1" } }], ctx());
  assert.ok(mitAndererText.ok && mitAndererText.wert.individuell, "geaenderter Text bleibt individuell");
});

test("Schriftfarbe: Kontrastregel und automatische Voreinstellung", async () => {
  const { textfarbeErlaubt, automatischeTextfarbe } = await import("@/lib/shop/textfarbe");
  const weiss = { id: "weiss", name: "Weiß", hex: "#f4f1ea" };
  const alle = [...farben, weiss];
  assert.equal(textfarbeErlaubt(farben[0], farben[0]), false, "gleiche Farbe gesperrt");
  assert.equal(textfarbeErlaubt(farben[0], weiss), false, "Honig auf Weiss zu schwach");
  assert.equal(textfarbeErlaubt(farben[1], weiss), true);
  assert.equal(automatischeTextfarbe(farben[1], alle)?.id, "weiss", "dunkle Grundfarbe -> helle Schrift");
  assert.equal(automatischeTextfarbe(farben[0], alle)?.id, "schwarz", "helle Grundfarbe -> dunkle Schrift");
  assert.equal(automatischeTextfarbe(farben[1], [farben[1]]), null, "keine erlaubte Farbe");
});
