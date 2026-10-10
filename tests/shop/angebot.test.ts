import { test } from "node:test";
import assert from "node:assert/strict";
import {
  angebotLink, angebotsMail, erzeugeAngebotToken, hashAngebotToken, liesAngebot, nimmAngebotAn, sendeAngebot, ANGEBOT_TOKEN,
} from "@/lib/shop/server/angebot";
import type { Db } from "@/lib/shop/server/db";
import { FakeNotifier, FakePayPal, testEnv } from "./mocks";
import type { Deps } from "@/lib/shop/server/bestellung";

type Handler = (args: Record<string, unknown>) => unknown;

/** Skript-DB: Antworten je RPC-Name, alle Aufrufe werden mitgeschrieben (Hash-/Preis-Pruefung der Argumente). */
class SkriptDb implements Db {
  aufrufe: { name: string; args: Record<string, unknown> }[] = [];
  constructor(private h: Record<string, Handler>) {}
  async rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
    this.aufrufe.push({ name, args });
    const f = this.h[name];
    if (!f) throw new Error("kein Skript fuer " + name);
    return f(args) as T;
  }
  async upload() { return true; }
  async remove() { return true; }
  namen() { return this.aufrufe.map((a) => a.name); }
}

const ID = "11111111-1111-4111-8111-111111111111";
const erzeugtOk = () => ({
  ok: true, id: ID, nummer: "PA-2026-0007", name: "Erika Beispiel", email: "erika@example.org",
  beschreibung: "Ein Halter fuer Kaffeekapseln, passend zur Schublade.", farbe: "Schwarz", preis_cent: 2500,
  versand_cent: 490, lieferzeit: "3-5 Werktage", text: "Gern mache ich dir folgendes Angebot.", gueltig_bis: "2026-10-25T10:00:00Z",
});
const opt = { versandCent: 490, lieferzeit: "3-5 Werktage", zufall: () => Buffer.alloc(32, 7) };

function sendeAufbau(h: Record<string, Handler> = {}) {
  const db = new SkriptDb({ shop_angebot_erzeugen: erzeugtOk, shop_angebot_gesendet: () => ({ ok: true }), shop_angebot_zurueck: () => ({ ok: true }), ...h });
  const notifier = new FakeNotifier();
  return { db, notifier, deps: { db, notifier, env: testEnv() } };
}

test("Token: 43 Zeichen, Hash 64 Hex, Klartext nie im Hash", () => {
  const t = erzeugeAngebotToken();
  assert.match(t.klar, ANGEBOT_TOKEN);
  assert.match(t.hash, /^[0-9a-f]{64}$/);
  assert.equal(hashAngebotToken(t.klar), t.hash);
  assert.notEqual(erzeugeAngebotToken().klar, t.klar);
});

test("Senden: DB bekommt nur den Hash, die Mail den Klartext-Link; Status wird gesetzt", async () => {
  const { db, notifier, deps } = sendeAufbau();
  const a = await sendeAngebot(deps, { id: ID }, opt);
  assert.equal(a.status, 200);
  assert.equal(a.body.statusGespeichert, true);
  const klar = Buffer.alloc(32, 7).toString("base64url");
  const erz = db.aufrufe.find((x) => x.name === "shop_angebot_erzeugen")!;
  assert.equal(erz.args.p_token_hash, hashAngebotToken(klar));
  assert.ok(!JSON.stringify(db.aufrufe).includes(klar), "Klartext-Token darf nie an die DB gehen");
  assert.equal(erz.args.p_versand_cent, 490);
  assert.equal(erz.args.p_lieferzeit, "3-5 Werktage");
  assert.deepEqual(db.namen(), ["shop_angebot_erzeugen", "shop_angebot_gesendet"]);
  const m = notifier.kundenMails[0];
  assert.equal(m.an, "erika@example.org");
  const link = angebotLink(deps.env, klar);
  assert.ok(m.text.includes(link) && m.html!.includes(link));
  for (const s of ["PA-2026-0007", "25,00", "4,90", "29,90", "3-5 Werktage", "25.10.2026", "Angebot ansehen und annehmen"]) {
    assert.ok(m.text.includes(s) || m.html!.includes(s), "fehlt: " + s);
  }
  assert.ok(m.text.includes("kein gesetzliches Widerrufsrecht"));
});

test("Senden: Mailfehler entwertet den Link und meldet 502; ungueltige Eingaben und fehlender Versand rufen die DB nicht", async () => {
  const f = sendeAufbau();
  f.notifier.kundenMailOk = false;
  const a = await sendeAngebot(f.deps, { id: ID }, opt);
  assert.equal(a.status, 502);
  assert.deepEqual(f.db.namen(), ["shop_angebot_erzeugen", "shop_angebot_zurueck"]);

  const g = sendeAufbau();
  assert.equal((await sendeAngebot(g.deps, { id: "../x" }, opt)).status, 400);
  assert.equal((await sendeAngebot(g.deps, { id: ID }, { ...opt, versandCent: null })).status, 503);
  assert.equal(g.db.aufrufe.length, 0);
});

test("Senden: shop_angebot_gesendet liefert ok:false -> statusGespeichert:false mit Hinweis", async () => {
  const { deps } = sendeAufbau({ shop_angebot_gesendet: () => ({ ok: false }) });
  const a = await sendeAngebot(deps, { id: ID }, opt);
  assert.equal(a.status, 200);
  assert.equal(a.body.statusGespeichert, false);
  assert.match(String(a.body.hinweis), /neu senden/);
});

test("Senden ohne Anforderung durch das Panel (DB: nicht_moeglich): 409, keine Mail", async () => {
  const { notifier, deps } = sendeAufbau({ shop_angebot_erzeugen: () => ({ ok: false, grund: "nicht_moeglich" }) });
  const a = await sendeAngebot(deps, { id: ID }, opt);
  assert.equal(a.status, 409);
  assert.equal(notifier.kundenMails.length, 0);
});

test("Mail: Kundeneingaben werden escaped", () => {
  const m = angebotsMail({
    nummer: "PA-2026-0001", name: "<b>X</b>", beschreibung: "<script>alert(1)</script> und mehr Text", farbe: null,
    preisCent: 1000, versandCent: 0, lieferzeit: null, text: null, gueltigBis: "2026-10-25T10:00:00Z",
  }, "https://t.example/3d-druck/angebot/abc", "https://t.example");
  assert.ok(!m.html.includes("<script>") && !m.html.includes("<b>X</b>"));
  assert.ok(m.text.includes("Versand: kostenlos"));
});

test("Lesen: Format wird vor der DB geprueft; Antworten und Fehlercodes", async () => {
  const db = new SkriptDb({ shop_angebot_lesen: () => ({ ok: true, nummer: "PA-2026-0007", name: "E", beschreibung: "B", preis_cent: 2500, versand_cent: 490, gesamt_cent: 2990, gueltig_bis: "x", zahlung_offen: false }) });
  assert.equal((await liesAngebot({ db }, "zu-kurz")).status, 404);
  assert.equal((await liesAngebot({ db }, undefined)).status, 404);
  assert.equal(db.aufrufe.length, 0);
  const t = erzeugeAngebotToken().klar;
  const ok = await liesAngebot({ db }, t);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.gesamtCent, 2990);
  assert.equal(db.aufrufe[0].args.p_token_hash, hashAngebotToken(t));
  const abg = new SkriptDb({ shop_angebot_lesen: () => ({ ok: false, grund: "abgelaufen", nummer: "PA-2026-0007" }) });
  assert.equal((await liesAngebot({ db: abg }, t)).status, 410);
  const schon = new SkriptDb({ shop_angebot_lesen: () => ({ ok: false, grund: "bereits_angenommen" }) });
  assert.equal((await liesAngebot({ db: schon }, t)).status, 409);
});

const kunde = { name: "Erika Beispiel", strasse: "Hauptstr. 1", plz: "86663", ort: "Asbach-Bäumenheim" };
const einw = { agb: true, verzicht: true };

function annahmeAufbau(h: Record<string, Handler> = {}) {
  const db = new SkriptDb({
    shop_angebot_annehmen: () => ({ ok: true, id: ID, nummer: "PD-2026-0042", wiederholt: false, gesamt_cent: 2990, summe_waren_cent: 2500, versand_cent: 490, anfragenummer: "PA-2026-0007" }),
    shop_bestellung_paypal_setzen: () => ({ ok: true }),
    ...h,
  });
  const paypal = new FakePayPal();
  const deps: Deps = { db, paypal, notifier: new FakeNotifier(), env: testEnv(), zufall: () => "xyz12345" };
  return { db, paypal, deps };
}

test("Annehmen: Preis kommt aus der DB, nie vom Client; PayPal-Order mit DB-Betraegen und Rueckweg zum Angebot", async () => {
  const { db, paypal, deps } = annahmeAufbau();
  const t = erzeugeAngebotToken().klar;
  const a = await nimmAngebotAn(deps, { t, kunde, einwilligungen: einw, preisCent: 1, gesamtCent: 1, email: "boese@example.org" }, { ipHash: "ip-hash-0123456789abcdef" });
  assert.equal(a.status, 200);
  assert.ok(String(a.body.approveUrl).includes("paypal"));
  assert.equal(a.body.bestellnummer, "PD-2026-0042");
  const arg = db.aufrufe[0].args;
  assert.equal(arg.p_token_hash, hashAngebotToken(t));
  const s = JSON.stringify(arg);
  assert.ok(!s.includes("boese@") && !s.includes("kein-wert@") && !s.includes('"preis') && !s.includes(t));
  const order = [...paypal.orders.values()][0];
  assert.equal(order.gesamtCent, 2990);
  assert.equal(order.summeWarenCent, 2500);
  assert.equal(order.versandCent, 490);
  assert.equal(order.positionen[0].name, "Individuelle Anfertigung PA-2026-0007");
  assert.equal(order.cancelUrl, `https://test.example/3d-druck/angebot/${t}?zahlung=abgebrochen`);
});

test("Annehmen: Pause sperrt verbindlich, Pflicht-Einwilligungen und Anschrift werden geprueft, DB wird dabei nicht gerufen", async () => {
  const { db, deps } = annahmeAufbau();
  const t = erzeugeAngebotToken().klar;
  const ip = { ipHash: "ip-hash-0123456789abcdef" };
  const p = await nimmAngebotAn(deps, { t, kunde, einwilligungen: einw }, { ...ip, pausiert: true, pauseText: "Pause" });
  assert.equal(p.status, 503);
  assert.equal(p.body.code, "pausiert");
  assert.equal((await nimmAngebotAn(deps, { t, kunde, einwilligungen: { agb: true } }, ip)).status, 422);
  assert.equal((await nimmAngebotAn(deps, { t, kunde, einwilligungen: { verzicht: true } }, ip)).status, 422);
  assert.equal((await nimmAngebotAn(deps, { t, kunde: { ...kunde, plz: "12" }, einwilligungen: einw }, ip)).status, 422);
  assert.equal((await nimmAngebotAn(deps, { t: "kurz", kunde, einwilligungen: einw }, ip)).status, 404);
  assert.equal(db.aufrufe.length, 0);
});

test("Annehmen: abgelaufen / bereits angenommen / Rate-Limit werden sauber abgebildet, keine PayPal-Order", async () => {
  const t = erzeugeAngebotToken().klar;
  for (const [grund, status] of [["abgelaufen", 410], ["bereits_angenommen", 409], ["ungueltig", 404], ["zu_viele", 429]] as const) {
    const { paypal, deps } = annahmeAufbau({ shop_angebot_annehmen: () => ({ ok: false, grund }) });
    const a = await nimmAngebotAn(deps, { t, kunde, einwilligungen: einw }, { ipHash: "ip-hash-0123456789abcdef" });
    assert.equal(a.status, status, grund);
    assert.equal(paypal.erzeugt, 0);
  }
});
