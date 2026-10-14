import test from "node:test";
import assert from "node:assert/strict";
import { testEnv } from "./mocks";
import { BREMSE_MAX, bremseZuruecksetzen, erzeugeBenachrichtiger } from "@/lib/shop/server/benachrichtigung";

function mitZaehler() {
  const aufrufe: string[] = [];
  const fake = (async (_url: unknown, init?: { body?: string }) => {
    aufrufe.push(String(JSON.parse(init?.body ?? "{}").text));
    return { ok: true, status: 200 } as Response;
  }) as unknown as typeof fetch;
  const n = erzeugeBenachrichtiger({ ...testEnv(), telegramToken: "t-123", telegramChatId: "42" }, fake);
  return { n, aufrufe };
}

test("Telegram: bis zum Limit normal, danach nicht gesendet und genau EINE Warnung", async () => {
  bremseZuruecksetzen();
  const { n, aufrufe } = mitZaehler();
  for (let i = 0; i < BREMSE_MAX.telegram; i++) assert.equal(await n.telegram(`Bestellung ${i}`), true);
  assert.equal(aufrufe.length, BREMSE_MAX.telegram);
  assert.equal(await n.telegram("zu viel 1"), false); // loest die Warnung aus
  assert.equal(aufrufe.length, BREMSE_MAX.telegram + 1);
  assert.match(aufrufe[aufrufe.length - 1], /ungewöhnlich viele Meldungen/);
  assert.equal(await n.telegram("zu viel 2"), false);
  assert.equal(await n.telegram("zu viel 3"), false);
  assert.equal(aufrufe.length, BREMSE_MAX.telegram + 1, "keine weiteren Nachrichten und keine zweite Warnung");
  bremseZuruecksetzen();
});

test("Bremse zaehlt je Art getrennt und ist nach Zuruecksetzen wieder frei", async () => {
  bremseZuruecksetzen();
  const { n, aufrufe } = mitZaehler();
  for (let i = 0; i < BREMSE_MAX.telegram + 2; i++) await n.telegram("x");
  bremseZuruecksetzen();
  assert.equal(await n.telegram("wieder frei"), true);
  assert.equal(aufrufe[aufrufe.length - 1], "wieder frei");
  bremseZuruecksetzen();
});

test("leseBegrenzt: ohne Content-Length wird ein zu grosser Body trotzdem abgelehnt", async () => {
  const { leseBegrenzt, leseBegrenztBytes } = await import("@/lib/shop/server/spam");
  const gross = new Request("http://x.test/", { method: "POST", body: new ReadableStream({ start(c) { c.enqueue(new Uint8Array(60_000)); c.close(); } }), duplex: "half" } as RequestInit);
  assert.equal(gross.headers.get("content-length"), null);
  assert.equal(await leseBegrenzt(gross, 50_000), null);
  const klein = new Request("http://x.test/", { method: "POST", body: JSON.stringify({ a: 1 }) });
  assert.equal(await leseBegrenzt(klein, 50_000), '{"a":1}');
  const bin = new Request("http://x.test/", { method: "POST", body: new Uint8Array([0, 255, 128]) });
  assert.deepEqual(Array.from((await leseBegrenztBytes(bin, 10)) ?? []), [0, 255, 128]);
});
