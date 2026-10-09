import "server-only";
// Einfacher Spam-Schutz ohne externe Dienste:
//  1. Honeypot-Feld "website" (Menschen sehen es nicht, Bots fuellen es),
//  2. signiertes Zeit-Token (mind. 3 s, hoechstens 30 min alt; gebunden an Formularart UND IP-Hash),
//  3. IP-Hash (HMAC mit Salz, nicht rueckrechenbar) fuer Limits in der Datenbank,
//  4. In-Memory-Bremse pro Instanz (wie /api/kontakt-notify; schuetzt nur vor Dauerfeuer).
import { createHmac, timingSafeEqual } from "node:crypto";

export const TOKEN_MIN_MS = 3_000;
export const TOKEN_MAX_MS = 30 * 60 * 1000;

function hmac(salz: string, daten: string): string {
  return createHmac("sha256", salz).update(daten).digest("hex");
}

/**
 * IPv6 auf das /64-Praefix kuerzen (Endgeraete wechseln ihre Adresse im /64 laufend, "Privacy Extensions").
 * IPv4 und IPv4-mapped (::ffff:a.b.c.d) -> IPv4; alles Unlesbare bleibt unveraendert.
 */
export function netzKennung(ip: string): string {
  let s = ip.trim().toLowerCase();
  const zone = s.indexOf("%");
  if (zone >= 0) s = s.slice(0, zone);
  if (!s.includes(":")) return ip;
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(s);
  if (mapped) return mapped[1];
  const teile = s.split("::");
  if (teile.length > 2) return ip;
  const kopf = teile[0] ? teile[0].split(":") : [];
  const rest = teile.length === 2 && teile[1] ? teile[1].split(":") : [];
  let gruppen: string[];
  if (teile.length === 2) {
    const fehlend = 8 - kopf.length - rest.length;
    if (fehlend < 1) return ip;
    gruppen = [...kopf, ...Array<string>(fehlend).fill("0"), ...rest];
  } else {
    gruppen = kopf;
  }
  if (gruppen.length !== 8 || gruppen.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return ip;
  return `${gruppen.slice(0, 4).map((g) => g.padStart(4, "0")).join(":")}::/64`;
}

/** IP -> pseudonymer Hash (32 Hex-Zeichen), IPv6 vorher auf /64 gekuerzt. Ohne Salz/IP: null. */
export function ipHash(ip: string | null | undefined, salz: string | undefined): string | null {
  if (!ip || !salz) return null;
  return hmac(salz, `ip:${netzKennung(ip)}`).slice(0, 32);
}

/** Client-IP aus den Vercel-Headern (von Vercel gesetzt; lokal ggf. leer). */
export function clientIp(headers: Headers): string | null {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const xff = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return xff || null;
}

/** Formularart + IP-Hash, an die ein Token gebunden ist. f: "shop" (Bestellung/Anfrage), "widerruf", "kontakt". */
export interface TokenBindung {
  f: string;
  ip: string;
}

const tokenDaten = (ts: string, b: TokenBindung) => `form:${ts}|${b.f}|${b.ip}`;

export function erzeugeFormToken(salz: string, bindung: TokenBindung, jetzt: number = Date.now()): string {
  const ts = String(jetzt);
  return `${ts}.${hmac(salz, tokenDaten(ts, bindung)).slice(0, 32)}`;
}

export type TokenErgebnis = "ok" | "fehlt" | "ungueltig" | "zu_schnell" | "abgelaufen";

export function pruefeFormToken(token: unknown, salz: string, bindung: TokenBindung, jetzt: number = Date.now()): TokenErgebnis {
  if (typeof token !== "string" || token === "") return "fehlt";
  const m = /^(\d{10,15})\.([0-9a-f]{32})$/.exec(token);
  if (!m) return "ungueltig";
  const erwartet = hmac(salz, tokenDaten(m[1], bindung)).slice(0, 32);
  const a = Buffer.from(erwartet);
  const b = Buffer.from(m[2]);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return "ungueltig";
  const alter = jetzt - Number(m[1]);
  if (alter < TOKEN_MIN_MS) return "zu_schnell";
  if (alter > TOKEN_MAX_MS) return "abgelaufen";
  return "ok";
}

/**
 * Liest den Request-Body hoechstens bis maxBytes (auch ohne/mit falschem Content-Length).
 * Gibt null zurueck, wenn er groesser ist oder nicht gelesen werden kann.
 */
export async function leseBegrenzt(request: Request, maxBytes: number): Promise<string | null> {
  const angabe = request.headers.get("content-length");
  if (angabe !== null && !(Number(angabe) <= maxBytes)) return null;
  const reader = request.body?.getReader();
  if (!reader) return "";
  const teile: Uint8Array[] = [];
  let summe = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      summe += value.byteLength;
      if (summe > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      teile.push(value);
    }
  } catch {
    return null;
  }
  return Buffer.concat(teile).toString("utf8");
}

/** Honeypot: das Feld "website" muss leer sein. */
export function honeypotLeer(wert: unknown): boolean {
  return wert == null || wert === "";
}

/** Zeitgesteuerte Bremse im Arbeitsspeicher (pro Serverless-Instanz). */
export function erzeugeBremse(fensterMs: number, maxProFenster: number) {
  const treffer = new Map<string, number[]>();
  return function begrenzt(schluessel: string, jetzt: number = Date.now()): boolean {
    const neu = (treffer.get(schluessel) ?? []).filter((t) => jetzt - t < fensterMs);
    if (neu.length >= maxProFenster) {
      treffer.set(schluessel, neu);
      return true;
    }
    neu.push(jetzt);
    treffer.set(schluessel, neu);
    if (treffer.size > 5000) treffer.clear();
    return false;
  };
}

/** Konstantzeit-Vergleich fuer Geheimnisse (Cron-Token). */
export function gleichGeheim(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
