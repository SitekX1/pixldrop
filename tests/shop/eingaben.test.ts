import { createHmac } from "node:crypto";
import { test } from "node:test";
import assert from "node:assert/strict";
import { pruefeKunde, pruefeAnfrage } from "@/lib/shop/server/validierung";
import { erkenneBild, pruefeBild } from "@/lib/shop/server/bild";
import {
  TOKEN_MAX_MS, TOKEN_MIN_MS, erzeugeBremse, erzeugeFormToken, gleichGeheim, honeypotLeer, ipHash, leseBegrenzt, netzKennung, pruefeFormToken,
} from "@/lib/shop/server/spam";

const kundeOk = { name: "Max Mustermann", strasse: "Hauptstraße 12", plz: "86663", ort: "Asbach-Bäumenheim", email: "Max@Mail.de" };

test("Kundendaten: gueltig, E-Mail klein geschrieben, optionale Felder", () => {
  const r = pruefeKunde({ ...kundeOk, telefon: "", hinweis: "bitte klingeln\nzweite Zeile" });
  assert.ok(r.ok);
  assert.equal(r.wert.email, "max@mail.de");
  assert.equal(r.wert.telefon, undefined);
  assert.equal(r.wert.hinweis, "bitte klingeln\nzweite Zeile");
});

test("Kundendaten: Pflichtfelder, PLZ, Zeilenumbrueche (Header-Injection)", () => {
  assert.ok(!pruefeKunde({}).ok);
  assert.ok(!pruefeKunde(null).ok);
  assert.ok(!pruefeKunde({ ...kundeOk, plz: "8666" }).ok);
  assert.ok(!pruefeKunde({ ...kundeOk, plz: "86663 " + "1" }).ok);
  assert.ok(!pruefeKunde({ ...kundeOk, email: "a@b" }).ok);
  assert.ok(!pruefeKunde({ ...kundeOk, email: "a@b.de\r\nBcc: x@y.de" }).ok);
  assert.ok(!pruefeKunde({ ...kundeOk, name: "Max\nMustermann" }).ok);
  assert.ok(!pruefeKunde({ ...kundeOk, name: 42 }).ok);
  assert.ok(!pruefeKunde({ ...kundeOk, hinweis: "x".repeat(501) }).ok);
  assert.ok(!pruefeKunde({ ...kundeOk, telefon: "12" }).ok);
});

test("Anfrage: Pflichtfelder, Masse, Datenschutz", () => {
  const basis = { beschreibung: "Ein Halter fuer meine Kaffeekapseln, passend zur Schublade.", name: "Max", email: "m@x.de", datenschutz: "true" };
  const ok = pruefeAnfrage({ ...basis, breite: "12,5", tiefe: "", hoehe: "30", farbe: "egal" });
  assert.ok(ok.ok);
  assert.equal(ok.wert.breite, 12.5);
  assert.equal(ok.wert.tiefe, null);
  assert.equal(ok.wert.farbe, null);
  assert.ok(!pruefeAnfrage({ ...basis, beschreibung: "zu kurz" }).ok);
  assert.ok(!pruefeAnfrage({ ...basis, datenschutz: "false" }).ok);
  assert.ok(!pruefeAnfrage({ ...basis, breite: "abc" }).ok);
  assert.ok(!pruefeAnfrage({ ...basis, hoehe: "5000" }).ok);
  assert.ok(!pruefeAnfrage({ ...basis, farbe: "<script>" }).ok);
});

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]);

test("Bildpruefung ueber Magic Bytes", () => {
  assert.equal(erkenneBild(jpeg)?.ext, "jpg");
  assert.equal(erkenneBild(png)?.ext, "png");
  assert.equal(erkenneBild(webp)?.ext, "webp");
  assert.equal(erkenneBild(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>")), null);
  assert.equal(erkenneBild(new TextEncoder().encode("GIF89a....")), null);
  assert.equal(erkenneBild(new Uint8Array([0x50, 0x4b, 3, 4])), null); // ZIP/Office
  assert.ok(pruefeBild(jpeg, "image/jpeg").ok);
});

test("Bildpruefung: gemeldeter Typ muss passen, Groesse, leer", () => {
  const r = pruefeBild(jpeg, "image/png");
  assert.ok(!r.ok);
  assert.equal(r.grund, "typ_abweichend");
  const exe = pruefeBild(new Uint8Array([0x4d, 0x5a, 0x90, 0]), "image/jpeg");
  assert.ok(!exe.ok);
  assert.equal(exe.grund, "typ");
  const gross = new Uint8Array(4 * 1024 * 1024 + 1);
  gross.set(jpeg);
  const g = pruefeBild(gross, "image/jpeg");
  assert.ok(!g.ok);
  assert.equal(g.grund, "zu_gross");
  const leer = pruefeBild(new Uint8Array(0), "image/jpeg");
  assert.ok(!leer.ok);
  assert.equal(leer.grund, "leer");
});

test("Formular-Token: Zeitfenster (30 min), Manipulation, fehlendes Token", () => {
  const salz = "test-salz-nur-fuer-tests";
  const t0 = 1_800_000_000_000;
  const bind = { f: "widerruf", ip: "ip-hash-a" };
  const token = erzeugeFormToken(salz, bind, t0);
  assert.equal(TOKEN_MAX_MS, 30 * 60 * 1000);
  assert.equal(pruefeFormToken(token, salz, bind, t0 + 1000), "zu_schnell");
  assert.equal(pruefeFormToken(token, salz, bind, t0 + TOKEN_MIN_MS + 1), "ok");
  assert.equal(pruefeFormToken(token, salz, bind, t0 + TOKEN_MAX_MS - 1000), "ok");
  assert.equal(pruefeFormToken(token, salz, bind, t0 + TOKEN_MAX_MS + 1), "abgelaufen");
  assert.equal(pruefeFormToken(token, "anderes-salz", bind, t0 + 10_000), "ungueltig");
  assert.equal(pruefeFormToken(token.slice(0, -1) + (token.endsWith("a") ? "b" : "a"), salz, bind, t0 + 10_000), "ungueltig");
  assert.equal(pruefeFormToken(`${t0 - 100000}.${token.split(".")[1]}`, salz, bind, t0 + 10_000), "ungueltig");
  assert.equal(pruefeFormToken(undefined, salz, bind), "fehlt");
  assert.equal(pruefeFormToken("irgendwas", salz, bind), "ungueltig");
});

test("Formular-Token: an Formularart und IP-Hash gebunden", () => {
  const salz = "test-salz-nur-fuer-tests";
  const t0 = 1_800_000_000_000;
  const token = erzeugeFormToken(salz, { f: "kontakt", ip: "ip-hash-a" }, t0);
  const spaeter = t0 + 10_000;
  assert.equal(pruefeFormToken(token, salz, { f: "kontakt", ip: "ip-hash-a" }, spaeter), "ok");
  assert.equal(pruefeFormToken(token, salz, { f: "widerruf", ip: "ip-hash-a" }, spaeter), "ungueltig");
  assert.equal(pruefeFormToken(token, salz, { f: "shop", ip: "ip-hash-a" }, spaeter), "ungueltig");
  assert.equal(pruefeFormToken(token, salz, { f: "kontakt", ip: "ip-hash-b" }, spaeter), "ungueltig");
});

test("IPv6 wird fuer den Hash auf /64 gekuerzt, IPv4 bleibt unveraendert", () => {
  assert.equal(netzKennung("203.0.113.7"), "203.0.113.7");
  assert.equal(netzKennung("2001:db8:1:2:aaaa:bbbb:cccc:dddd"), "2001:0db8:0001:0002::/64");
  assert.equal(netzKennung("2001:DB8:1:2::5"), "2001:0db8:0001:0002::/64");
  assert.equal(netzKennung("2001:db8::1"), "2001:0db8:0000:0000::/64");
  assert.equal(netzKennung("::ffff:203.0.113.7"), "203.0.113.7");
  assert.equal(netzKennung("fe80::1%eth0"), "fe80:0000:0000:0000::/64");
  assert.equal(netzKennung("kein-ip"), "kein-ip");
  const salz = "salz";
  assert.equal(ipHash("2001:db8:1:2:aaaa:bbbb:cccc:dddd", salz), ipHash("2001:db8:1:2:1111:2222:3333:4444", salz));
  assert.notEqual(ipHash("2001:db8:1:2::1", salz), ipHash("2001:db8:1:3::1", salz));
  assert.equal(ipHash("203.0.113.7", salz), createHmac("sha256", salz).update("ip:203.0.113.7").digest("hex").slice(0, 32));
});

test("leseBegrenzt: Content-Length und Stream-Grenze", async () => {
  const mk = (body: string, h: Record<string, string> = {}) => new Request("https://t.example/x", { method: "POST", body, headers: h });
  assert.equal(await leseBegrenzt(mk("abc"), 10), "abc");
  assert.equal(await leseBegrenzt(mk("x".repeat(50)), 10), null);
  assert.equal(await leseBegrenzt(mk("abc", { "content-length": "99999" }), 10), null);
  assert.equal(await leseBegrenzt(mk("abc", { "content-length": "abc" }), 10), null);
});

test("Honeypot, IP-Hash, Bremse, Geheimnisvergleich", () => {
  assert.ok(honeypotLeer(undefined) && honeypotLeer(""));
  assert.ok(!honeypotLeer("http://spam.example"));
  const h = ipHash("203.0.113.7", "salz");
  assert.equal(h, ipHash("203.0.113.7", "salz"));
  assert.notEqual(h, ipHash("203.0.113.8", "salz"));
  assert.notEqual(h, ipHash("203.0.113.7", "anderes"));
  assert.ok(h && !h.includes("203"));
  assert.equal(ipHash(null, "salz"), null);
  const begrenzt = erzeugeBremse(60_000, 3);
  assert.deepEqual([1, 2, 3, 4].map(() => begrenzt("ip", 1000)), [false, false, false, true]);
  assert.equal(begrenzt("andere-ip", 1000), false);
  assert.equal(begrenzt("ip", 1000 + 61_000), false, "nach dem Fenster wieder frei");
  assert.ok(gleichGeheim("Bearer abc", "Bearer abc"));
  assert.ok(!gleichGeheim("Bearer abc", "Bearer abd"));
  assert.ok(!gleichGeheim("kurz", "Bearer abc"));
});
