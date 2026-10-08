import { test } from "node:test";
import assert from "node:assert/strict";
import { verarbeiteKontakt } from "@/lib/shop/server/kontakt";
import { pruefeKontakt } from "@/lib/shop/server/validierung";
import type { Benachrichtiger } from "@/lib/shop/server/benachrichtigung";
import type { Db } from "@/lib/shop/server/db";

const ctx = { ipHash: "ip-hash-0123456789abcdef" };
const eingabe = (extra: Record<string, unknown> = {}) => ({
  name: "Erika Beispiel", email: "Erika@Example.org", nachricht: "Hallo,\nhabt ihr das auch in Rot?", ...extra,
});

function aufbau(grund: string | null = null) {
  const aufrufe: string[] = [];
  const db = { rpc: async (n: string) => { aufrufe.push(n); return grund ? { ok: false, grund } : { ok: true }; } } as unknown as Db;
  const mails: { betreff: string; text: string; replyTo?: string }[] = [];
  const telegrams: string[] = [];
  const state = { mailOk: true };
  const notifier: Benachrichtiger = {
    telegram: async (t) => { telegrams.push(t); return true; },
    mailAlex: async (betreff, text, replyTo) => { if (state.mailOk) mails.push({ betreff, text, replyTo }); return state.mailOk; },
    mailKunde: async () => true,
  };
  return { aufrufe, db, mails, telegrams, state, deps: { db, notifier } };
}

test("Kontakt ok: Mail an Alex mit Reply-To, Telegram ohne Inhalt/Kundendaten", async () => {
  const { deps, mails, telegrams } = aufbau();
  const a = await verarbeiteKontakt(deps, eingabe(), ctx);
  assert.deepEqual([a.status, a.body], [200, { ok: true }]);
  assert.equal(mails[0].replyTo, "erika@example.org");
  assert.match(mails[0].text, /Erika Beispiel/);
  assert.match(mails[0].text, /in Rot/);
  assert.ok(!/Erika|erika@|Rot/.test(mails[0].betreff + telegrams.join()));
  assert.equal(telegrams.length, 1);
});

test("Validierung: Feldfehler 422, Steuerzeichen/Header-Injection, Längen", async () => {
  const { deps, aufrufe } = aufbau();
  const a = await verarbeiteKontakt(deps, eingabe({ name: "A", email: "kaputt", nachricht: "x" }), ctx);
  assert.equal(a.status, 422);
  assert.deepEqual(Object.keys(a.body.felder as object).sort(), ["email", "nachricht", "name"]);
  assert.equal(pruefeKontakt(eingabe({ email: "a@b.de\r\nBcc: x@y.de" })).ok, false);
  assert.equal(pruefeKontakt(eingabe({ name: "Ab\r\nBcc: x" })).ok, false);
  assert.equal(pruefeKontakt(eingabe({ nachricht: "Hallo\u0000Welt" })).ok, false);
  assert.equal(pruefeKontakt(eingabe({ nachricht: "x".repeat(2001) })).ok, false);
  assert.ok(pruefeKontakt(eingabe({ nachricht: "x".repeat(2000) })).ok);
  assert.equal(aufrufe.length, 0);
});

test("Rate-Limit: zu_viele -> 429, ueberlastet -> 503, DB-Ausfall -> 503, nichts gesendet", async () => {
  for (const [grund, status] of [["zu_viele", 429], ["ueberlastet", 503]] as const) {
    const { deps, mails } = aufbau(grund);
    assert.equal((await verarbeiteKontakt(deps, eingabe(), ctx)).status, status);
    assert.equal(mails.length, 0);
  }
  const x = aufbau();
  x.deps.db.rpc = async () => { throw new Error("db weg"); };
  const a = await verarbeiteKontakt(x.deps, eingabe(), ctx);
  assert.equal(a.status, 503);
  assert.match(String(a.body.error), /as@sitekx\.de/);
  assert.equal(x.mails.length, 0);
});

test("Mail-Fehler -> 503 ohne Interna, kein Telegram", async () => {
  const { deps, state, telegrams } = aufbau();
  state.mailOk = false;
  const a = await verarbeiteKontakt(deps, eingabe(), ctx);
  assert.equal(a.status, 503);
  assert.equal(a.body.code, "mail");
  assert.equal(telegrams.length, 0);
});

test("Route Kontakt: Honeypot -> 400, Token ungültig -> 400, zu groß -> 413, Token-Route auch bei SHOP_AKTIV=false", async () => {
  const route = await import("@/app/api/shop/kontakt/route");
  const tokenRoute = await import("@/app/api/shop/formtoken/route");
  const env = ["SHOP_SUPABASE_URL", "SHOP_SUPABASE_ANON_KEY", "SHOP_API_SECRET", "SHOP_IP_SALT", "SHOP_AKTIV"];
  const alt = Object.fromEntries(env.map((n) => [n, process.env[n]]));
  const altFetch = globalThis.fetch;
  let fetches = 0;
  globalThis.fetch = (async () => { fetches++; throw new Error("verboten"); }) as typeof fetch;
  Object.assign(process.env, { SHOP_SUPABASE_URL: "https://x.example", SHOP_SUPABASE_ANON_KEY: "a", SHOP_API_SECRET: "s".repeat(40), SHOP_IP_SALT: "salz-salz-salz", SHOP_AKTIV: "false" });
  try {
    const post = (b: unknown) => route.POST(new Request("https://t.example/api/shop/kontakt", { method: "POST", body: JSON.stringify(b) }));
    assert.equal((await post({ ...eingabe(), website: "http://spam", token: "x" })).status, 400);
    assert.equal((await post({ ...eingabe(), token: "kaputt" })).status, 400);
    assert.equal((await post({ ...eingabe(), nachricht: "x".repeat(20_000) })).status, 413);
    assert.equal(fetches, 0);
    const t = await tokenRoute.GET(new Request("https://t.example/api/shop/formtoken?f=kontakt"));
    assert.equal(t.status, 200);
    assert.equal((await tokenRoute.GET(new Request("https://t.example/api/shop/formtoken"))).status, 503);
  } finally {
    globalThis.fetch = altFetch;
    for (const n of env) { if (alt[n] === undefined) delete process.env[n]; else process.env[n] = alt[n]; }
  }
});
