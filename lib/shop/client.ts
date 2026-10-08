// Browser-Seite der Shop-Anbindung: Formtoken, Bestellung, Anfrage, Bildverkleinerung.
// Keine Preise vom Client (Server rechnet), keine Kundendaten in URL oder Storage.
import type { Auswahl } from "./auswahl";

export const BILD_BUDGET_BYTES = 3_800_000; // Vercel-Body-Limit ca. 4,5 MB, Server erlaubt 4,2 MB Bilder

export interface Kunde { name: string; strasse: string; plz: string; ort: string; email: string; hinweis: string }
export interface ApiFehler { code: string; meldung: string; felder?: Record<string, string> }
export type ApiErgebnis<T> = ({ ok: true } & T) | { ok: false; fehler: ApiFehler };

type FetchFn = typeof fetch;

const NETZ: ApiFehler = { code: "netz", meldung: "Keine Verbindung zum Server. Deine Eingaben sind noch da, bitte versuch es gleich noch einmal." };

async function lies(res: Response): Promise<ApiErgebnis<Record<string, unknown>>> {
  let b: Record<string, unknown> = {};
  try { b = (await res.json()) as Record<string, unknown>; } catch { /* kein JSON */ }
  if (res.ok && b.ok === true) return { ok: true, ...b };
  const felder = b.felder && typeof b.felder === "object" ? (b.felder as Record<string, string>) : undefined;
  const code = typeof b.code === "string" ? b.code : "fehler";
  let meldung = typeof b.error === "string" ? b.error : "Das hat nicht geklappt. Bitte versuch es gleich noch einmal.";
  if (res.status === 413) meldung = "Die Daten sind zu groß (Bilder zusammen höchstens ca. 4 MB).";
  return { ok: false, fehler: { code, meldung, felder } };
}

export async function holeFormToken(f: FetchFn = fetch): Promise<string | null> {
  try {
    const r = await f("/api/shop/formtoken", { cache: "no-store" });
    const b = (await r.json()) as { ok?: boolean; token?: string };
    return r.ok && b.ok && typeof b.token === "string" ? b.token : null;
  } catch {
    return null;
  }
}

export function neuerIdempotenzKey(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

export function baueBestellung(p: { token: string; idempotenzKey: string; auswahl: Auswahl; kunde: Kunde; agb: boolean; verzicht: boolean; website?: string }) {
  const { auswahl: a, kunde: k } = p;
  const mitText = a.text.trim() !== "";
  return {
    token: p.token,
    website: p.website ?? "",
    idempotenzKey: p.idempotenzKey,
    positionen: [{
      slug: a.slug, menge: a.menge, farbeId: a.farbeId, optionen: a.optionen,
      text: mitText ? a.text.trim() : "", schriftId: mitText ? a.schriftId : null,
    }],
    kunde: {
      name: k.name.trim(), strasse: k.strasse.trim(), plz: k.plz.trim(), ort: k.ort.trim(), email: k.email.trim(),
      ...(k.hinweis.trim() ? { hinweis: k.hinweis.trim() } : {}),
    },
    einwilligungen: { agb: p.agb, ...(p.verzicht ? { verzicht: true } : {}) },
  };
}

export async function sendeBestellung(body: object, f: FetchFn = fetch): Promise<ApiErgebnis<{ approveUrl: string; bestellnummer?: string }>> {
  try {
    const r = await lies(await f("/api/shop/bestellung", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
    if (r.ok && typeof r.approveUrl !== "string") return { ok: false, fehler: { code: "fehler", meldung: "Die Weiterleitung zu PayPal fehlt. Bitte versuch es noch einmal." } };
    return r as ApiErgebnis<{ approveUrl: string; bestellnummer?: string }>;
  } catch {
    return { ok: false, fehler: NETZ };
  }
}

export async function sendeAnfrage(fd: FormData, f: FetchFn = fetch): Promise<ApiErgebnis<{ anfragenummer?: string; bilderFehlgeschlagen?: boolean }>> {
  try {
    return (await lies(await f("/api/shop/anfrage", { method: "POST", body: fd }))) as ApiErgebnis<{ anfragenummer?: string; bilderFehlgeschlagen?: boolean }>;
  } catch {
    return { ok: false, fehler: NETZ };
  }
}

/** Nur PayPal-Domains als Weiterleitungsziel zulassen (Schutz vor manipulierten Antworten). */
export function istPaypalUrl(u: string): boolean {
  try {
    const h = new URL(u);
    return h.protocol === "https:" && /(^|\.)paypal\.com$/.test(h.hostname);
  } catch {
    return false;
  }
}

/** Danke-Seite: PD-2026-0001 (neu) oder nur Ziffern (alt). */
export function bestellnummerOk(nr: string | undefined): string | null {
  return nr && /^(PD-[0-9]{4}-[0-9]{1,6}|[0-9]{1,8})$/.test(nr) ? nr : null;
}

/** Bilder auf zusammen <= Budget bringen. Passt alles schon, bleiben die Originale unverändert. */
export async function bilderVerkleinern(dateien: File[], budget = BILD_BUDGET_BYTES): Promise<File[]> {
  if (dateien.reduce((s, d) => s + d.size, 0) <= budget) return dateien;
  const je = Math.floor(budget / dateien.length);
  const aus: File[] = [];
  for (const d of dateien) aus.push(d.size <= je ? d : await verkleinere(d, je));
  return aus;
}

async function verkleinere(datei: File, maxBytes: number): Promise<File> {
  const bmp = await createImageBitmap(datei);
  let kante = Math.min(2400, Math.max(bmp.width, bmp.height));
  for (let runde = 0; runde < 6; runde++) {
    const s = Math.min(1, kante / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(bmp.width * s));
    c.height = Math.max(1, Math.round(bmp.height * s));
    const ctx = c.getContext("2d");
    if (!ctx) break;
    ctx.fillStyle = "#fff"; // Transparenz -> weiß (JPEG)
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    for (const q of [0.85, 0.7, 0.55]) {
      const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/jpeg", q));
      if (blob && blob.size <= maxBytes) {
        bmp.close();
        return new File([blob], datei.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
      }
    }
    kante = Math.round(kante * 0.75);
  }
  bmp.close();
  throw new Error("verkleinern_fehlgeschlagen");
}

// ---- Widerrufsfunktion (§ 356a BGB) ----
export interface WiderrufEingabe { name: string; vertrag: string; positionen: string; email: string }
export interface WiderrufZusammenfassung { name: string; vertrag: string; ganzerVertrag: boolean; positionen: string | null; email: string }
export interface WiderrufErfolg { widerrufsnummer: string; eingegangenAmText: string; eingangsbestaetigung: boolean }
type WiderrufAntwort = { schritt?: string; zusammenfassung?: WiderrufZusammenfassung } & Partial<WiderrufErfolg>;

export async function holeWiderrufToken(f: FetchFn = fetch): Promise<string | null> {
  try {
    const r = await f("/api/shop/formtoken?f=widerruf", { cache: "no-store" });
    const b = (await r.json()) as { ok?: boolean; token?: string };
    return r.ok && b.ok && typeof b.token === "string" ? b.token : null;
  } catch {
    return null;
  }
}

/** Ohne confirm nur Pruefung (Zusammenfassung), mit confirm: true wird der Widerruf abgesendet. */
export async function sendeWiderruf(
  p: { token: string; website: string; daten: WiderrufEingabe; confirm: boolean },
  f: FetchFn = fetch,
): Promise<ApiErgebnis<WiderrufAntwort>> {
  try {
    const body = {
      token: p.token, website: p.website, name: p.daten.name.trim(), vertrag: p.daten.vertrag.trim(), email: p.daten.email.trim(),
      ...(p.daten.positionen.trim() ? { positionen: p.daten.positionen.trim() } : {}),
      ...(p.confirm ? { confirm: true } : {}),
    };
    const r = await lies(await f("/api/shop/widerruf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
    return r as ApiErgebnis<WiderrufAntwort>;
  } catch {
    return { ok: false, fehler: { code: "netz", meldung: "Keine Verbindung zum Server. Deine Eingaben sind noch da. Bitte versuch es gleich noch einmal oder schreibe deinen Widerruf an as@sitekx.de." } };
  }
}

// Zwischenstand nur im sessionStorage dieses Tabs (technisch erforderlich: PayPal-Rückkehr lädt die Seite neu).
const KUNDE_KEY = "shop-kunde-v1";
const KEY_KEY = "shop-idem-v1";
export function ladeKunde(): Kunde | null {
  try { const r = sessionStorage.getItem(KUNDE_KEY); return r ? (JSON.parse(r) as Kunde) : null; } catch { return null; }
}
export function speichereKunde(k: Kunde | null) {
  try { if (k) sessionStorage.setItem(KUNDE_KEY, JSON.stringify(k)); else sessionStorage.removeItem(KUNDE_KEY); } catch { /* gesperrt */ }
}
/** Gleicher Inhalt = gleicher Key (Retry/Rückkehr von PayPal), anderer Inhalt = neuer Key. */
export function idempotenzKeyFuer(signatur: string): string {
  try {
    const r = sessionStorage.getItem(KEY_KEY);
    if (r) { const o = JSON.parse(r) as { s: string; k: string }; if (o.s === signatur) return o.k; }
    const k = neuerIdempotenzKey();
    sessionStorage.setItem(KEY_KEY, JSON.stringify({ s: signatur, k }));
    return k;
  } catch { return neuerIdempotenzKey(); }
}
export function loescheBestellZwischenstand() {
  try { sessionStorage.removeItem(KUNDE_KEY); sessionStorage.removeItem(KEY_KEY); } catch { /* gesperrt */ }
}
