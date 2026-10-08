import { test } from "node:test";
import assert from "node:assert/strict";
import { legeAnfrageAn } from "@/lib/shop/server/anfrage";
import { fuehreBereinigungAus } from "@/lib/shop/server/bereinigung";
import { FakeDb, FakeNotifier, testEnv } from "./mocks";

const jpeg = (n = 100) => { const b = new Uint8Array(n); b.set([0xff, 0xd8, 0xff, 0xe0]); return b; };
const felder = {
  beschreibung: "Ein Halter fuer meine Kaffeekapseln, passend zur Schublade.", name: "Erika Beispiel",
  email: "erika@example.org", datenschutz: "true", rechte: "true", farbe: "schwarz",
};
const farben = [{ id: "schwarz", name: "Schwarz", hex: "#1c1c1c" }];

function aufbau() {
  const db = new FakeDb();
  const notifier = new FakeNotifier();
  return { db, notifier, deps: { db, notifier, env: testEnv() }, ctx: { ipHash: "ip-hash-0123456789abcdef", farben } };
}

test("Anfrage ohne Bilder: gespeichert, nur Nummer in Telegram und Alex-Mail", async () => {
  const { db, notifier, deps, ctx } = aufbau();
  const a = await legeAnfrageAn(deps, felder, [], ctx);
  assert.equal(a.status, 200);
  assert.equal(a.body.anfragenummer, "PA-2026-0001");
  assert.equal(db.anfragen[0].args.p_farbe, "Schwarz");
  assert.deepEqual(notifier.telegrams, ["Neue Anfrage PA-2026-0001 (individueller Druck)"]);
  const alles = notifier.telegrams.join() + notifier.alexMails.map((m) => m.betreff + m.text).join();
  assert.ok(!alles.includes("Erika") && !alles.includes("erika@") && !alles.includes("Kaffeekapseln"));
  assert.ok(db.anfragen[0].benachrichtigt);
});

test("Anfrage mit Bildern: Upload in privaten Pfad, Pfade werden gespeichert", async () => {
  const { db, deps, ctx } = aufbau();
  const a = await legeAnfrageAn(deps, felder, [
    { bytes: jpeg(), typ: "image/jpeg", name: "a.jpg" },
    { bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]), typ: "image/png", name: "b.png" },
  ], ctx);
  assert.equal(a.status, 200);
  assert.equal(a.body.bilderFehlgeschlagen, false);
  assert.deepEqual(db.uploads.map((u) => u.pfad.replace(/^anfragen\/[0-9a-f-]{36}\//, "")), ["1.jpg", "2.png"]);
  assert.deepEqual(db.anfragen[0].pfade, db.uploads.map((u) => u.pfad));
  assert.equal(db.anfragen[0].args.p_bild_anzahl, 2);
});

test("Falscher Dateityp (getarnt), zu viele, zu grosse Bilder und fehlende Rechte werden abgelehnt", async () => {
  const { db, deps, ctx } = aufbau();
  const getarnt = new TextEncoder().encode("<svg onload=alert(1)>");
  assert.equal((await legeAnfrageAn(deps, felder, [{ bytes: getarnt, typ: "image/jpeg", name: "x.jpg" }], ctx)).status, 422);
  assert.equal((await legeAnfrageAn(deps, felder, [{ bytes: jpeg(), typ: "image/png", name: "x.png" }], ctx)).status, 422);
  const vier = Array.from({ length: 4 }, () => ({ bytes: jpeg(), typ: "image/jpeg", name: "x.jpg" }));
  assert.equal((await legeAnfrageAn(deps, felder, vier, ctx)).status, 422);
  const gross = Array.from({ length: 2 }, () => ({ bytes: jpeg(2_500_000), typ: "image/jpeg", name: "x.jpg" }));
  assert.equal((await legeAnfrageAn(deps, felder, gross, ctx)).status, 413);
  assert.equal((await legeAnfrageAn(deps, { ...felder, rechte: "false" }, [{ bytes: jpeg(), typ: "image/jpeg", name: "x.jpg" }], ctx)).status, 422);
  assert.equal(db.anfragen.length, 0, "nichts gespeichert, bevor alles geprueft ist");
  assert.equal(db.uploads.length, 0);
});

test("Fehlerhafte Felder und Rate-Limit der DB", async () => {
  const { db, deps, ctx } = aufbau();
  assert.equal((await legeAnfrageAn(deps, { ...felder, email: "kaputt" }, [], ctx)).status, 422);
  assert.equal((await legeAnfrageAn(deps, { ...felder, datenschutz: "false" }, [], ctx)).status, 422);
  db.anfrageGrund = "zu_viele";
  assert.equal((await legeAnfrageAn(deps, felder, [], ctx)).status, 429);
});

test("Upload scheitert: Anfrage bleibt gespeichert, Nutzer erfaehrt es", async () => {
  const { db, deps, ctx } = aufbau();
  db.uploadOk = false;
  const a = await legeAnfrageAn(deps, felder, [{ bytes: jpeg(), typ: "image/jpeg", name: "a.jpg" }], ctx);
  assert.equal(a.status, 200);
  assert.equal(a.body.bilderFehlgeschlagen, true);
  assert.equal(db.anfragen[0].fehler, true);
  assert.deepEqual(db.anfragen[0].pfade, []);
});

test("Bereinigung: nur vollstaendig geloeschte Anfragen werden an die DB gemeldet", async () => {
  const { db } = aufbau();
  const ok = "anfragen/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/1.jpg";
  const ok2 = "anfragen/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/1.png";
  db.bereinigungListe = [
    { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", pfade: [ok] },
    { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", pfade: [ok2, "../../geheim.txt"] }, // ein Pfad ungueltig
  ];
  const r = await fuehreBereinigungAus(db);
  assert.deepEqual(db.entfernt, [ok, ok2]);
  assert.deepEqual(db.bereinigtMit, ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]);
  assert.equal(r.bilderGeloescht, 2);
  assert.equal(r.bilderFehler, 1);
});

test("Bereinigung: Storage-Fehler -> Zeile bleibt (keine verwaisten Bilder)", async () => {
  const { db } = aufbau();
  db.entfernenOk = false;
  db.bereinigungListe = [{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", pfade: ["anfragen/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/1.jpg"] }];
  await fuehreBereinigungAus(db);
  assert.deepEqual(db.bereinigtMit, []);
});
