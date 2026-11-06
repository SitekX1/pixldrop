import test from "node:test";
import assert from "node:assert/strict";
import { aktionsHinweis } from "@/lib/shop/server/vorlagen";
import { PRODUKTE } from "@/lib/shop/produkte";

const weih = PRODUKTE.find((p) => p.gruppe === "weihnachten")!.name;
const norm = PRODUKTE.find((p) => p.gruppe !== "weihnachten")!.name;
const pos = (name: string) => [{ name, menge: 1, einzelpreis_cent: 441 }] as never;

test("Aktionshinweis nur bei Weihnachtsartikel im Aktionszeitraum", () => {
  assert.ok(aktionsHinweis({ positionen: pos(weih), erstellt_am: "2026-11-10T12:00:00+01:00" })?.includes("WEIHNACHTEN10"));
  assert.equal(aktionsHinweis({ positionen: pos(norm), erstellt_am: "2026-11-10T12:00:00+01:00" }), null);
  assert.equal(aktionsHinweis({ positionen: pos(weih), erstellt_am: "2026-11-25T12:00:00+01:00" }), null);
  assert.equal(aktionsHinweis({ positionen: pos(weih), erstellt_am: "2026-11-05T12:00:00+01:00" }), null);
});
