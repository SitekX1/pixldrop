import { test } from "node:test";
import assert from "node:assert/strict";
import { pruefeWunschtext, LISTEN_GROESSE } from "@/lib/shop/textfilter";
import { PRODUKTE } from "@/lib/shop/produkte";
import { berechneWarenkorb, type Kontext } from "@/lib/shop/server/preise";

const ok = (...z: string[]) => assert.deepEqual(pruefeWunschtext(z), { ok: true }, `sollte erlaubt sein: ${z.join(" / ")}`);
const nein = (grund: "unzulaessig" | "marke", ...z: string[]) => {
  const r = pruefeWunschtext(z);
  assert.ok(!r.ok, `sollte blockiert werden: ${z.join(" / ")}`);
  if (!r.ok) assert.equal(r.grund, grund, z.join(" / "));
};

test("Gewoehnliche Woerter und Namen sind erlaubt (keine Fehlalarme)", () => {
  for (const t of ["Sabine", "Teamleiter", "Abteilungsleiter", "Kaffee zuerst", "Fickert", "Hasse", "Mueller", "Müller", "Schmidt", "Nikolaus", "Niklas",
    "Mario", "Chef", "Montag", "Bitte nicht stören", "Grammatik-Nazi", "Kaffee-Nazi", "Schweiß", "Klassenleiter", "Ich bin 88", "Platz 14", "Hundert Bullen",
    "Anna", "Elsa", "Mini", "Bosch", "Apfelsaft", "Dienstag", "Assistent", "Passwort", "Pilot", "Dr. Best", "Lego-Fan?"]) {
    if (t === "Lego-Fan?") continue; // Marke, bewusst blockiert
    ok(t);
  }
  ok("Teamleiter", "Sabine");
});

test("Beleidigungen und Hassbezuege werden blockiert, auch getarnt", () => {
  nein("unzulaessig", "Du Arschloch");
  nein("unzulaessig", "Ar5chl0ch");
  nein("unzulaessig", "A.r.s.c.h.l.o.c.h");
  nein("unzulaessig", "scheißegal");
  nein("unzulaessig", "Fiiick");
  nein("unzulaessig", "Fuck you");
  nein("unzulaessig", "Sieg", "Heil");
  nein("unzulaessig", "H1tler");
  nein("unzulaessig", "Heil 88");
  nein("unzulaessig", "1488");
  nein("unzulaessig", "14 88");
  nein("unzulaessig", "Nazi Power");
});

test("Marken und Figuren werden blockiert, auch getarnt", () => {
  nein("marke", "Nike");
  nein("marke", "N1ke");
  nein("marke", "N.i.k.e");
  nein("marke", "N i k e");
  nein("marke", "NIIIKE");
  nein("marke", "Hello Kitty");
  nein("marke", "Hello", "Kitty");
  nein("marke", "Pokémon");
  nein("marke", "Super Mario");
  nein("marke", "FC Bayern");
  nein("marke", "Red Bull");
  nein("marke", "adidas");
  nein("marke", "Lego");
});

test("Listen sind umfangreich genug", () => {
  assert.ok(LISTEN_GROESSE.marken >= 150, `Marken: ${LISTEN_GROESSE.marken}`);
  assert.ok(LISTEN_GROESSE.beleidigung >= 60);
});

test("Server: berechneWarenkorb lehnt unzulaessigen Wunschtext ab", () => {
  const katalog = PRODUKTE.map((p) => ({ ...p, preisCent: 1290 }));
  const ctx: Kontext = { produkte: katalog, farben: [{ id: "schwarz", name: "Schwarz", hex: "#1c1c1c" }], versandCent: 490, bestellbar: () => true };
  const basis = { slug: "koffein-pegel", menge: 1, farbeId: "schwarz" };
  const slugMitText = PRODUKTE.find((p) => p.personalisierung && !p.personalisierung.zeilen)!;
  const b = { slug: slugMitText.slug, menge: 1, farbeId: "schwarz", schriftId: slugMitText.personalisierung!.festeSchrift ?? "oswald" };
  void basis;
  const gut = berechneWarenkorb([{ ...b, text: "Kaffee" }], ctx);
  assert.ok(gut.ok, "harmloser Text geht durch");
  for (const t of ["Nike", "N1ke", "Arschloch"]) {
    const r = berechneWarenkorb([{ ...b, text: t }], ctx);
    assert.ok(!r.ok, t);
    if (!r.ok) assert.equal(r.fehler.code, "text_unzulaessig");
  }
});
