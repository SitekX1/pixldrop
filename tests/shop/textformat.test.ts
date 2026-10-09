import { test } from "node:test";
import assert from "node:assert/strict";
import { PRODUKTE, istIndividuell, type Produkt } from "@/lib/shop/produkte";
import { SCHRIFTEN } from "@/lib/shop/schriften";
import { berechneWarenkorb, type Kontext } from "@/lib/shop/server/preise";
import {
  formatAnzeige, formatAusOptionen, formatZuOptionen, formatUnerlaubt, groessteDiePasst, pruefePasst, standardFormat,
} from "@/lib/shop/textformat";

const katalog: Produkt[] = PRODUKTE.map((p) => ({ ...p, preisCent: 1290 }));
const farben = [{ id: "schwarz", name: "Schwarz", hex: "#1c1c1c" }];
const ctx = (): Kontext => ({ produkte: katalog, farben, versandCent: 490, bestellbar: () => true });
const spruch = katalog.find((p) => p.slug === "spruch-untersetzer")!;
const schild = katalog.find((p) => p.slug === "tischschild-erster-kaffee")!;
const sf = (id: string) => SCHRIFTEN.find((s) => s.id === id)!;
const bestell = (slug: string, text: string, schriftId: string | undefined, optionen?: Record<string, unknown>) =>
  berechneWarenkorb([{ slug, menge: 1, farbeId: "schwarz", text, schriftId, ...(optionen ? { optionen } : {}) }], ctx());

test("Passt-Pruefung: gleiche Funktion, Groessenstufen, Wortgrenzen", () => {
  const f = standardFormat(1);
  assert.ok(pruefePasst(spruch.personalisierung!, ["Montag"], sf("oswald"), f).passt);
  // 40 Zeichen: klein passt, sehr gross nicht
  const lang = ["Heute ist der beste Tag fuer Kaffee ok"];
  assert.ok(pruefePasst(spruch.personalisierung!, lang, sf("oswald"), { ...f, groesse: "s" }).passt);
  assert.ok(!pruefePasst(spruch.personalisierung!, lang, sf("oswald"), { ...f, groesse: "xl" }).passt);
  // Wort, das nie in eine Zeile passt: bricht nicht mitten im Wort um, passt nicht
  assert.ok(!pruefePasst(spruch.personalisierung!, ["Donaudampfschifffahrt"], sf("montserrat"), { ...f, groesse: "xl" }).passt);
  // Fett macht breiter: grenzwertiger Text passt normal, fett nicht
  const t = ["Kaffeepause"];
  const norm = pruefePasst(spruch.personalisierung!, t, sf("montserrat"), { ...f, groesse: "l" });
  const fett = pruefePasst(spruch.personalisierung!, t, sf("montserrat"), { ...f, groesse: "l", fett: [true] });
  assert.ok(norm.zeilen[0].zeilen.length <= fett.zeilen[0].zeilen.length);
});

test("Tischschild: Standardtext passt in allen Stufen bis gross, beide Zeilen einzeln", () => {
  const p = schild.personalisierung!;
  assert.ok(pruefePasst(p, ["Teamleiter", "Sabine"], sf("montserrat"), standardFormat(2)).passt);
  const gross = { ...standardFormat(2), groesse: "xl" as const };
  assert.ok(!pruefePasst(p, ["Teamleiter", "Maximilian"], sf("montserrat"), gross).passt, "grosse Zeile zu lang fuer sehr gross");
  assert.ok(pruefePasst(p, ["Teamleiter", "Maximilian"], sf("montserrat"), { ...gross, groesse: "s" }).passt);
});

test("Fähigkeiten: Fett/Kursiv gesperrt bei Schriften ohne Schnitt", () => {
  for (const id of ["pacifico", "permanent-marker", "bangers", "lobster", "righteous"]) {
    assert.equal(sf(id).hatFett, false, id);
    assert.ok(formatUnerlaubt({ ...standardFormat(1), fett: [true] }, sf(id)), id);
  }
  assert.ok(sf("montserrat").hatFett && sf("montserrat").hatKursiv);
  assert.ok(!formatUnerlaubt({ ...standardFormat(1), fett: [true], kursiv: [true] }, sf("montserrat")));
  assert.ok(formatUnerlaubt({ ...standardFormat(1), kursiv: [true] }, sf("oswald")), "Oswald hat kein Kursiv");
});

test("optionen: kanonisch, strenge Pruefung, <= 500 Byte", () => {
  const f = { fett: [true, true], kursiv: [true, true], groesse: "xl" as const };
  const o = formatZuOptionen(f);
  assert.deepEqual(o, { fett_0: "1", fett_1: "1", kursiv_0: "1", kursiv_1: "1", groesse: "xl" });
  assert.deepEqual(formatZuOptionen(standardFormat(2)), {}, "Standard wird nicht gespeichert");
  assert.deepEqual(formatAusOptionen(o, 2), f);
  assert.equal(formatAusOptionen({ fett_2: "1" }, 2), null, "Zeilenindex ausserhalb");
  assert.equal(formatAusOptionen({ fett_0: "0" }, 2), null, "nur Wert 1");
  assert.equal(formatAusOptionen({ groesse: "xxl" }, 1), null, "nur gelistete Stufen");
  assert.equal(formatAusOptionen({ unterstrichen_0: "1" }, 1), null, "Unterstrichen gibt es nicht");
  const anz = formatAnzeige(schild.personalisierung!, f);
  assert.ok(Buffer.byteLength(JSON.stringify(Object.fromEntries(anz))) <= 500);
  assert.ok(Buffer.byteLength(JSON.stringify(o)) <= 500);
});

test("Server: Format wird übernommen und lesbar gespeichert", () => {
  const r = bestell("spruch-untersetzer", "Montag", "montserrat", { fett_0: "1", kursiv_0: "1", groesse: "m" });
  assert.ok(r.ok, JSON.stringify(r));
  assert.deepEqual(r.wert.positionen[0].optionen, { Format: "Fett, Kursiv" });
  assert.ok(Buffer.byteLength(JSON.stringify(r.wert.positionen[0].optionen)) <= 500);
});

test("Server lehnt ab: zu groß, ungültig, Schrift ohne Schnitt, Format ohne Text", () => {
  const zuGross = bestell("spruch-untersetzer", "Heute ist der beste Tag fuer Kaffee ok", "oswald", { groesse: "xl" });
  assert.ok(!zuGross.ok);
  assert.equal(zuGross.fehler.code, "text_passt_nicht");
  for (const o of [{ groesse: "xxl" }, { fett_1: "1" }, { fett_0: true }, { unterstrichen_0: "1" }, { kursiv_0: "yes" }]) {
    const r = bestell("spruch-untersetzer", "Montag", "montserrat", o);
    assert.ok(!r.ok, JSON.stringify(o));
    assert.equal(r.fehler.code, "option_ungueltig");
  }
  const ohneFett = bestell("spruch-untersetzer", "Montag", "pacifico", { fett_0: "1" });
  assert.ok(!ohneFett.ok);
  assert.equal(ohneFett.fehler.code, "option_ungueltig");
  const ohneKursiv = bestell("spruch-untersetzer", "Montag", "oswald", { kursiv_0: "1" });
  assert.ok(!ohneKursiv.ok);
  const ohneText = berechneWarenkorb([{ slug: "koffein-pegel", menge: 1, farbeId: "schwarz", optionen: { fett_0: "1" } }], ctx());
  assert.ok(!ohneText.ok);
});

test("individuell: Formatwahl beim Standardtext macht das Stück individuell, Preis bleibt", () => {
  const std = "Teamleiter\nSabine";
  const ohne = bestell("tischschild-erster-kaffee", std, undefined);
  assert.ok(ohne.ok);
  assert.equal(ohne.wert.positionen[0].individuell, false);
  const mit = bestell("tischschild-erster-kaffee", std, undefined, { fett_1: "1", groesse: "s" });
  assert.ok(mit.ok, JSON.stringify(mit));
  assert.equal(mit.wert.positionen[0].individuell, true);
  assert.equal(mit.wert.gesamtCent, ohne.wert.gesamtCent);
  assert.deepEqual(mit.wert.positionen[0].optionen, { "Format Große Zeile in der Mitte": "Fett", "Schriftgröße": "Klein" });
  // explizit gesendeter Standard (groesse m) ändert nichts
  const m = bestell("tischschild-erster-kaffee", std, undefined, { groesse: "m" });
  assert.ok(m.ok);
  assert.equal(m.wert.positionen[0].individuell, false);
  assert.equal(istIndividuell(schild, std, { fett_0: "1" }), true);
  assert.equal(istIndividuell(schild, std, {}), false);
});

test("Automatische Groesse: groesste Stufe, die noch passt", () => {
  const pers = spruch.personalisierung!;
  const f = standardFormat(1);
  // kurzer Text: sehr gross passt
  assert.equal(groessteDiePasst(pers, ["Mo"], sf("oswald"), f), "xl");
  // laenger: nicht mehr xl, aber die gewaehlte Stufe passt wirklich und die naechstgroessere nicht
  const lang = ["Heute ist der beste Tag fuer Kaffee ok"];
  const g = groessteDiePasst(pers, lang, sf("oswald"), f);
  assert.ok(pruefePasst(pers, lang, sf("oswald"), { ...f, groesse: g }).passt);
  assert.notEqual(g, "xl");
  // passt nirgends: kleinste Stufe
  assert.equal(groessteDiePasst(pers, ["Donaudampfschifffahrt"], sf("montserrat"), f), "s");
  // Tischschild: gleiche Logik, Ergebnis passt
  const sp = schild.personalisierung!;
  const z = ["Teamleiter", "Sabine"];
  const gs = groessteDiePasst(sp, z, sf("oswald"), standardFormat(2));
  assert.ok(pruefePasst(sp, z, sf("oswald"), { ...standardFormat(2), groesse: gs }).passt);
  // Server prueft die vom Client gesendete Stufe
  const r = bestell("spruch-untersetzer", "Mo", "oswald", { groesse: "xl" });
  assert.ok(r.ok, JSON.stringify(r));
});
