import "server-only";
// Einfacher Spam-Schutz ohne externe Dienste:
//  1. Honeypot-Feld "website" (Menschen sehen es nicht, Bots fuellen es),
//  2. signiertes Zeit-Token (Formular muss mindestens 3 s offen gewesen sein, hoechstens 2 h),
//  3. IP-Hash (HMAC mit Salz, nicht rueckrechenbar) fuer Limits in der Datenbank,
//  4. In-Memory-Bremse pro Instanz (wie /api/kontakt-notify; schuetzt nur vor Dauerfeuer).
import { createHmac, timingSafeEqual } from "node:crypto";

export const TOKEN_MIN_MS = 3_000;
export const TOKEN_MAX_MS = 2 * 60 * 60 * 1000;

function hmac(salz: string, daten: string): string {
  return createHmac("sha256", salz).update(daten).digest("hex");
}

/** IP -> pseudonymer Hash (32 Hex-Zeichen). Ohne Salz/IP: null. */
export function ipHash(ip: string | null | undefined, salz: string | undefined): string | null {
  if (!ip || !salz) return null;
  return hmac(salz, `ip:${ip}`).slice(0, 32);
}

/** Client-IP aus den Vercel-Headern (von Vercel gesetzt; lokal ggf. leer). */
export function clientIp(headers: Headers): string | null {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const xff = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return xff || null;
}

export function erzeugeFormToken(salz: string, jetzt: number = Date.now()): string {
  const ts = String(jetzt);
  return `${ts}.${hmac(salz, `form:${ts}`).slice(0, 32)}`;
}

export type TokenErgebnis = "ok" | "fehlt" | "ungueltig" | "zu_schnell" | "abgelaufen";

export function pruefeFormToken(token: unknown, salz: string, jetzt: number = Date.now()): TokenErgebnis {
  if (typeof token !== "string" || token === "") return "fehlt";
  const m = /^(\d{10,15})\.([0-9a-f]{32})$/.exec(token);
  if (!m) return "ungueltig";
  const erwartet = hmac(salz, `form:${m[1]}`).slice(0, 32);
  const a = Buffer.from(erwartet);
  const b = Buffer.from(m[2]);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return "ungueltig";
  const alter = jetzt - Number(m[1]);
  if (alter < TOKEN_MIN_MS) return "zu_schnell";
  if (alter > TOKEN_MAX_MS) return "abgelaufen";
  return "ok";
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
