import { test } from "node:test";
import assert from "node:assert/strict";
import { PRODUKTE, type Produkt } from "@/lib/shop/produkte";
import { berechneWarenkorb as berechneRoh, centZuPayPal, farbeId, payPalZuCent, type Kontext } from "@/lib/shop/server/preise";
import { farbenAusZeilen } from "@/lib/shop/farben";
import { versandOptionenFuerKorb } from "@/lib/shop/versand";
// Standard-Versandart: erste zulaessige Option des Warenkorbs (Tests, die Versand nicht pruefen)
const berechneWarenkorb = (e: unknown, c: Kontext, v: unknown = versandOptionenFuerKorb(Array.isArray(e) ? e : [])[0]?.art ?? "hermes") => berechneRoh(e, c, v);

const katalog: Produkt[] = PRODUKTE.map((p) => ({ ...p, preisCent: 1290 }));
const farben = [
  { id: "honiggold", name: "Honiggold", hex: "#f0bb55" },
  { id: "schwarz", name: "Schwarz", hex: "#1c1c1c" },
];
const ctx = (extra: Partial<Kontext> = {}): Kontext => ({
  produkte: katalog, farben, bestellbar: () => true, ...extra,
});
const K = "schwarz-tuerkis-weiss";
const pos = (extra: Record<string, unknown> = {}) => ({ slug: "stiftebecher-tasse", menge: 2, farbeId: "schwarz", ...extra });

test("Preis wird serverseitig berechnet: 2 x 12,90 + 4,89 Versand (Hermes Paket S)", () => {
  const r = berechneWarenkorb([pos()], ctx());
  assert.ok(r.ok);
  assert.equal(r.wert.summeWarenCent, 2580);
  assert.equal(r.wert.gesamtCent, 3069);
  assert.equal(r.wert.positionen[0].einzelpreisCent, 1290);
});

test("Vom Client gesendete Preise werden ignoriert", () => {
  const r = berechneWarenkorb([pos({ einzelpreisCent: 1, preisCent: 1, preis: 0.01, gesamt: 1 })], ctx());
  assert.ok(r.ok);
  assert.equal(r.wert.gesamtCent, 3069);
});

test("Artikel ohne Preis (Preis folgt) ist nicht bestellbar", () => {
  const leer = PRODUKTE.map((p) => ({ ...p, preisCent: null }));
  const r = berechneWarenkorb([pos()], ctx({ produkte: leer }));
  assert.ok(!r.ok);
  assert.equal(r.fehler.code, "preis_folgt");
});

test("Versandart ist Pflicht und kommt aus der Whitelist", () => {
  const ohne = berechneRoh([pos()], ctx(), undefined);
  assert.ok(!ohne.ok);
  assert.equal(ohne.fehler.code, "versandart_fehlt");
  for (const v of [null, ""]) assert.equal((berechneWarenkorb([pos()], ctx(), v) as { fehler: { code: string } }).fehler.code, "versandart_fehlt");
  for (const v of ["ups", "HERMES", 5, {}, ["hermes"], "hermes; drop"]) {
    const r = berechneWarenkorb([pos()], ctx(), v);
    assert.ok(!r.ok, String(v));
    assert.equal(r.fehler.code, "versandart_ungueltig");
  }
});

test("Server rechnet den Versand aus der Versandart, nicht vom Client", () => {
  const h = berechneWarenkorb([pos({ versandCent: 1, versand: 0 })], ctx(), "hermes");
  const d = berechneWarenkorb([pos()], ctx(), "dhl");
  assert.ok(h.ok && d.ok);
  assert.equal(h.wert.versandCent, 489); // stiftebecher = mittel, 2 Stueck: Hermes Paket S
  assert.equal(h.wert.versandart, "hermes");
  assert.equal(d.wert.versandCent, 769);
  assert.equal(d.wert.gesamtCent, 2580 + 769);
});

test("Brief nur fuer flache Untersetzer ohne Box", () => {
  const flach = { slug: "wochentags-untersetzer-einzeln", menge: 1, farbeId: null };
  const ok = berechneWarenkorb([{ ...flach, optionen: { tag: "mo", box: "ohne", farbkombi: K } }], ctx(), "brief");
  assert.ok(ok.ok);
  assert.equal(ok.wert.versandCent, 180);
  assert.equal(ok.wert.versandart, "brief");
  // statt Brief gibt es dann keine Paketwahl
  assert.equal((berechneWarenkorb([{ ...flach, optionen: { tag: "mo", box: "ohne", farbkombi: K } }], ctx(), "hermes") as { fehler: { code: string } }).fehler.code, "versandart_ungueltig");
  // mit Box: kein Brief
  const box = berechneWarenkorb([{ ...flach, optionen: { tag: "mo", box: "mit", farbkombi: K } }], ctx(), "brief");
  assert.ok(!box.ok);
  assert.equal(box.fehler.code, "versandart_ungueltig");
  assert.ok(berechneWarenkorb([{ ...flach, optionen: { tag: "mo", box: "mit", farbkombi: K } }], ctx(), "hermes").ok);
  // nicht brieffaehiger Artikel: kein Brief
  assert.ok(!berechneWarenkorb([pos()], ctx(), "brief").ok);
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
  assert.ok(!berechneWarenkorb([{ slug: "stiftebecher-tasse", menge: 1 }], ctx()).ok);
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
  assert.equal(ok.wert.gesamtCent, 1290 + 399, "kein Preisaufschlag");
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

test("Wochentags-Set: Box-Aufpreis wird serverseitig addiert", () => {
  const set = { slug: "wochentags-untersetzer-set", menge: 2, farbeId: "schwarz" };
  const ohne = berechneWarenkorb([{ ...set, optionen: { box: "ohne", farbkombi: K } }], ctx());
  const mit = berechneWarenkorb([{ ...set, optionen: { box: "mit", farbkombi: K } }], ctx());
  assert.ok(ohne.ok && mit.ok);
  assert.equal(ohne.wert.positionen[0].einzelpreisCent, 1290);
  assert.equal(mit.wert.positionen[0].einzelpreisCent, 1690);
  assert.equal(mit.wert.summeWarenCent, 3380);
  assert.equal(mit.wert.positionen[0].optionen["Box"], "Mit Box zum Hineinstellen");
});

test("Wochentags-Set: ungueltige oder fehlende Box-Wahl wird abgelehnt", () => {
  const set = { slug: "wochentags-untersetzer-set", menge: 1, optionen: { farbkombi: K } };
  assert.ok(!berechneWarenkorb([{ ...set, optionen: { box: "gratis", farbkombi: K } }], ctx()).ok);
  assert.ok(!berechneWarenkorb([set], ctx()).ok);
});

test("Kork-Option: Aufpreis kommt vom Server, Box und Kork addieren sich", () => {
  const set = { slug: "wochentags-untersetzer-set", menge: 1, farbeId: "schwarz" };
  const r = berechneWarenkorb([{ ...set, optionen: { box: "mit", kork: "mit", farbkombi: K } }], ctx());
  assert.ok(r.ok);
  assert.equal(r.wert.positionen[0].einzelpreisCent, 1290 + 400 + 200);
  assert.ok(!berechneWarenkorb([{ ...set, optionen: { box: "ohne", kork: "gratis", farbkombi: K } }], ctx()).ok);
  const hw = berechneWarenkorb([{ slug: "halloween-untersetzer-einzeln", menge: 2, farbeId: "schwarz", optionen: { motiv: "geister", kork: "mit" } }], ctx());
  assert.ok(hw.ok);
  assert.equal(hw.wert.summeWarenCent, 2 * (1290 + 50));
});

test("Wochentags-Einzelartikel: Tag Pflicht, Box und Kork als Aufpreis", () => {
  const e = { slug: "wochentags-untersetzer-einzeln", menge: 1, farbeId: "schwarz" };
  const r = berechneWarenkorb([{ ...e, optionen: { tag: "fr", box: "mit", kork: "mit", farbkombi: K } }], ctx());
  assert.ok(r.ok);
  assert.equal(r.wert.positionen[0].einzelpreisCent, 1290 + 400 + 50);
  assert.equal(r.wert.positionen[0].optionen["Wochentag"], "Freitag");
  assert.ok(!berechneWarenkorb([{ ...e, optionen: { box: "ohne", farbkombi: K } }], ctx()).ok);
  assert.ok(!berechneWarenkorb([{ ...e, optionen: { tag: "sa", box: "ohne", farbkombi: K } }], ctx()).ok);
});


test("Farbkombination: gueltig (ohne farbeId), Preis unveraendert/mit Box, farbeName = Label", () => {
  const set = { slug: "wochentags-untersetzer-set", menge: 1 };
  const r = berechneWarenkorb([{ ...set, farbeId: null, optionen: { box: "ohne", farbkombi: "schwarz-orange-weiss" } }], ctx());
  assert.ok(r.ok);
  const p = r.wert.positionen[0];
  assert.equal(p.einzelpreisCent, 1290);
  assert.equal(p.farbeName, "Schwarz / Orange / Weiß");
  assert.equal(p.farbeHex, "#1c1c1c");
  assert.equal(p.optionen["Farbkombination"], "Schwarz / Orange / Weiß");
  const mit = berechneWarenkorb([{ ...set, optionen: { box: "mit", farbkombi: "schwarz-violett-tuerkis" } }], ctx());
  assert.ok(mit.ok);
  assert.equal(mit.wert.positionen[0].einzelpreisCent, 1690);
  // Lager wird fuer Kombinationen nicht gebraucht
  assert.ok(berechneWarenkorb([{ ...set, optionen: { box: "ohne", farbkombi: K } }], ctx({ farben: [] })).ok);
});

test("Farbkombination: fehlend oder unbekannt -> farbe_ungueltig", () => {
  const set = { slug: "wochentags-untersetzer-set", menge: 1, farbeId: "schwarz" };
  for (const optionen of [{ box: "ohne" }, { box: "ohne", farbkombi: "rot-gelb" }, { box: "ohne", farbkombi: 5 }]) {
    const r = berechneWarenkorb([{ ...set, optionen }], ctx());
    assert.ok(!r.ok);
    assert.equal(r.fehler.code, "farbe_ungueltig");
    assert.equal(r.fehler.meldung, "Bitte wähle eine Farbkombination.");
  }
});

test("farbkombi bei Artikel ohne Kombinationen -> option_ungueltig", () => {
  const r = berechneWarenkorb([pos({ optionen: { farbkombi: K } })], ctx());
  assert.ok(!r.ok);
  assert.equal(r.fehler.code, "option_ungueltig");
});

test("Unbekannte Optionsschluessel werden abgelehnt (kork/box bei Artikeln ohne diese Gruppe)", () => {
  const ohneKork = { slug: "stiftebecher-tasse", menge: 1, farbeId: "schwarz" };
  const r1 = berechneWarenkorb([{ ...ohneKork, optionen: { kork: "mit" } }], ctx());
  assert.ok(!r1.ok);
  assert.equal(r1.fehler.code, "option_ungueltig");
  const r2 = berechneWarenkorb([{ slug: "spruch-untersetzer", menge: 1, farbeId: "schwarz", text: "Montag", schriftId: "oswald", optionen: { box: "mit" } }], ctx());
  assert.ok(!r2.ok);
  assert.equal(r2.fehler.code, "option_ungueltig");
});

test("Alte Warenkorb-Slugs (entfernte Artikel) liefern 'unbekannt'", () => {
  for (const slug of ["koffein-pegel", "halloween-untersetzer"]) {
    const r = berechneWarenkorb([{ slug, menge: 1, farbeId: "schwarz" }], ctx());
    assert.ok(!r.ok);
    assert.equal(r.fehler.code, "unbekannt");
  }
});

// Livegang-Wächter: nur mit SHOP_LIVEGANG_CHECK=1 aktiv (vor dem Merge nach main laufen lassen).
test("Livegang: keine Testpreise mehr im Katalog", { skip: process.env.SHOP_LIVEGANG_CHECK !== "1" }, () => {
  const test = PRODUKTE.filter((p) => !p.nurAnfrage && p.preisCent === 990).map((p) => p.slug);
  assert.deepEqual(test, [], `Noch Testpreis (9,90 EUR): ${test.join(", ")}`);
});
