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

/** Mindestalter eines Tokens laut Server (TOKEN_MIN_MS = 3 s) plus Reserve. */
export const TOKEN_WARTE_MS = 3_300;
const schlafen = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Das Token ist 30 Minuten gueltig und an Formularart + IP gebunden. Lehnt der Server es ab (Code "token":
 * abgelaufen, Netzwechsel), wird einmal automatisch ein neues geholt, kurz gewartet (Mindestalter) und
 * dieselbe Anfrage erneut gesendet. Alle betroffenen Sendungen sind wiederholbar (Idempotenz-Key bzw. nichts gespeichert).
 */
async function mitTokenNeu<T>(
  erster: ApiErgebnis<T>,
  neuHolen: () => Promise<string | null>,
  nochmal: (token: string) => Promise<ApiErgebnis<T>>,
): Promise<ApiErgebnis<T>> {
  if (erster.ok || erster.fehler.code !== "token") return erster;
  const neu = await neuHolen();
  if (!neu) return erster;
  await schlafen(TOKEN_WARTE_MS);
  return nochmal(neu);
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

export function baueBestellung(p: { token: string; idempotenzKey: string; auswahl: Auswahl | Auswahl[]; kunde: Kunde; agb: boolean; verzicht: boolean; website?: string }) {
  const k = p.kunde;
  const liste = Array.isArray(p.auswahl) ? p.auswahl : [p.auswahl];
  return {
    token: p.token,
    website: p.website ?? "",
    idempotenzKey: p.idempotenzKey,
    positionen: liste.map((a) => {
      const mitText = a.text.trim() !== "";
      return {
        slug: a.slug, menge: a.menge, farbeId: a.farbeId, optionen: a.optionen,
        text: mitText ? a.text.trim() : "", schriftId: mitText ? a.schriftId : null,
      };
    }),
    kunde: {
      name: k.name.trim(), strasse: k.strasse.trim(), plz: k.plz.trim(), ort: k.ort.trim(), email: k.email.trim(),
      ...(k.hinweis.trim() ? { hinweis: k.hinweis.trim() } : {}),
    },
    einwilligungen: { agb: p.agb, ...(p.verzicht ? { verzicht: true } : {}) },
  };
}

export async function sendeBestellung(body: object, f: FetchFn = fetch): Promise<ApiErgebnis<{ approveUrl: string; bestellnummer?: string }>> {
  try {
    const einmal = async (b: object) => {
      const r = await lies(await f("/api/shop/bestellung", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }));
      if (r.ok && typeof r.approveUrl !== "string") return { ok: false, fehler: { code: "fehler", meldung: "Die Weiterleitung zu PayPal fehlt. Bitte versuch es noch einmal." } } as const;
      return r as ApiErgebnis<{ approveUrl: string; bestellnummer?: string }>;
    };
    return await mitTokenNeu(await einmal(body), () => holeFormToken(f), (t) => einmal({ ...body, token: t }));
  } catch {
    return { ok: false, fehler: NETZ };
  }
}

export async function sendeAnfrage(fd: FormData, f: FetchFn = fetch): Promise<ApiErgebnis<{ anfragenummer?: string; bilderFehlgeschlagen?: boolean }>> {
  try {
    type Erfolg = { anfragenummer?: string; bilderFehlgeschlagen?: boolean };
    const einmal = async (daten: FormData) => (await lies(await f("/api/shop/anfrage", { method: "POST", body: daten }))) as ApiErgebnis<Erfolg>;
    return await mitTokenNeu(await einmal(fd), () => holeFormToken(f), (t) => {
      const kopie = new FormData();
      fd.forEach((v, k) => { if (k !== "token") kopie.append(k, v); });
      kopie.set("token", t);
      return einmal(kopie);
    });
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
    const einmal = async (b: object) =>
      (await lies(await f("/api/shop/widerruf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }))) as ApiErgebnis<WiderrufAntwort>;
    return await mitTokenNeu(await einmal(body), () => holeWiderrufToken(f), (t) => einmal({ ...body, token: t }));
  } catch {
    return { ok: false, fehler: { code: "netz", meldung: "Keine Verbindung zum Server. Deine Eingaben sind noch da. Bitte versuch es gleich noch einmal oder schreibe deinen Widerruf an as@sitekx.de." } };
  }
}

// ---- Kontaktformular (Backend: /api/shop/kontakt) ----
export interface KontaktEingabe { name: string; email: string; nachricht: string }
export const KONTAKT_NICHT_ERREICHBAR = "Das Kontaktformular ist gerade nicht erreichbar. Bitte versuch es später noch einmal.";

export async function holeKontaktToken(f: FetchFn = fetch): Promise<string | null> {
  try {
    const r = await f("/api/shop/formtoken?f=kontakt", { cache: "no-store" });
    const b = (await r.json()) as { ok?: boolean; token?: string };
    return r.ok && b.ok && typeof b.token === "string" ? b.token : null;
  } catch {
    return null;
  }
}

/** Sendet die Kontaktnachricht. 422 = Feldfehler (fehler.felder), 429 = zu oft, 503/Netz = nicht erreichbar. */
export async function sendeKontakt(
  p: { token: string; website: string; daten: KontaktEingabe },
  f: FetchFn = fetch,
): Promise<ApiErgebnis<object>> {
  try {
    const basis = { website: p.website, name: p.daten.name.trim(), email: p.daten.email.trim(), nachricht: p.daten.nachricht.trim() };
    let status = 0;
    const einmal = async (token: string) => {
      const res = await f("/api/shop/kontakt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, ...basis }) });
      status = res.status;
      return lies(res);
    };
    const r = await mitTokenNeu(await einmal(p.token), () => holeKontaktToken(f), einmal);
    if (r.ok) return { ok: true };
    if (status === 503) return { ok: false, fehler: { ...r.fehler, code: r.fehler.code === "fehler" ? "nicht_erreichbar" : r.fehler.code, meldung: KONTAKT_NICHT_ERREICHBAR } };
    if (status === 429 && r.fehler.code === "fehler") return { ok: false, fehler: { code: "zu_oft", meldung: "Du hast gerade schon mehrere Nachrichten geschickt. Bitte warte kurz und versuch es dann noch einmal." } };
    return r;
  } catch {
    return { ok: false, fehler: { code: "netz", meldung: NETZ.meldung } };
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

// ---- Textfreigabe durch Alex (Seite /3d-druck/freigabe, Backend: /api/shop/freigabe) ----
export interface FreigabePosition {
  name: string; menge: number; farbe: string | null; farbeHex: string | null;
  text: string | null; schrift: string | null; optionen?: Record<string, string> | null; individuell?: boolean;
  /** Wunschtext als Zeilen (Tischschild: 2 Zeilen; sonst eine Zeile; leer ohne Text). */
  zeilen?: string[];
}
export interface FreigabeGrund { id: string; label: string }
export interface FreigabeDaten {
  aktion: "ok" | "nein" | null; bestellnummer: string; status: "offen" | "freigegeben" | "abgelehnt";
  angefordertAm: string | null; entschiedenAm: string | null; grund: string | null;
  positionen: FreigabePosition[]; gruende: FreigabeGrund[];
}
export type FreigabeErgebnisDaten =
  | { status: "freigegeben"; neu: boolean; mail: boolean }
  | { status: "abgelehnt"; neu: boolean; erstattung: "erstattet" | "erstattung_offen"; mail: boolean };
export type FreigabeFehlerCode = "ungueltig" | "bereits_entschieden" | "nicht_moeglich" | "zu_oft" | "nicht_erreichbar" | "netz" | "fehler";
export interface FreigabeFehler { code: FreigabeFehlerCode; meldung: string; status?: "freigegeben" | "abgelehnt"; grund?: string }
export type FreigabeErgebnis<T> = { ok: true; daten: T } | { ok: false; fehler: FreigabeFehler };

/** API-Fehler (HTTP-Status + Body) auf Anzeige-Codes abbilden. */
export function freigabeFehler(status: number, b: Record<string, unknown>): FreigabeFehler {
  const code = typeof b.code === "string" ? b.code : "";
  if (status === 403 || code === "link_ungueltig" || code === "link_abgelaufen") return { code: "ungueltig", meldung: "Link ungültig oder abgelaufen." };
  if (status === 409 && code === "bereits_entschieden") {
    const s = b.status === "freigegeben" || b.status === "abgelehnt" ? b.status : undefined;
    return { code: "bereits_entschieden", meldung: "Diese Freigabe ist schon entschieden.", status: s };
  }
  // Frist (24 h nach Zahlung) abgelaufen: die Bestellung ist automatisch abgesagt worden
  if (status === 409 && code === "frist_abgelaufen") return { code: "bereits_entschieden", meldung: "Frist abgelaufen, die Bestellung wurde automatisch abgesagt.", status: "abgelehnt", grund: "frist" };
  if (status === 409) return { code: "nicht_moeglich", meldung: "Das geht für diese Bestellung nicht mehr. Bitte im Admin-Panel nachsehen." };
  if (status === 429) return { code: "zu_oft", meldung: "Zu viele Versuche. Bitte kurz warten und noch einmal versuchen." };
  if (status === 503) return { code: "nicht_erreichbar", meldung: "Der Shop ist gerade nicht erreichbar. Bitte gleich noch einmal versuchen." };
  return { code: "fehler", meldung: typeof b.error === "string" && b.error ? b.error : "Das hat nicht geklappt. Bitte noch einmal versuchen." };
}
const FREIGABE_NETZ: FreigabeFehler = { code: "netz", meldung: "Keine Verbindung zum Server. Bitte noch einmal versuchen." };

async function freigabeLies(res: Response): Promise<{ b: Record<string, unknown>; fehler: FreigabeFehler | null }> {
  let b: Record<string, unknown> = {};
  try { b = (await res.json()) as Record<string, unknown>; } catch { /* kein JSON */ }
  if (res.ok && b.ok === true) return { b, fehler: null };
  return { b, fehler: freigabeFehler(res.status, b) };
}

/** Lädt die Freigabe-Daten (ändert nichts am Server). */
export async function holeFreigabeDaten(p: { b: string; t: string }, f: FetchFn = fetch): Promise<FreigabeErgebnis<FreigabeDaten>> {
  try {
    const r = await f(`/api/shop/freigabe/daten?b=${encodeURIComponent(p.b)}&t=${encodeURIComponent(p.t)}`, { cache: "no-store" });
    const { b, fehler } = await freigabeLies(r);
    if (fehler) return { ok: false, fehler };
    if (typeof b.bestellnummer !== "string" || !Array.isArray(b.positionen) || !["offen", "freigegeben", "abgelehnt"].includes(b.status as string)) {
      return { ok: false, fehler: freigabeFehler(500, {}) };
    }
    return { ok: true, daten: { ...b, aktion: b.aktion === "ok" || b.aktion === "nein" ? b.aktion : null, gruende: Array.isArray(b.gruende) ? b.gruende : [] } as unknown as FreigabeDaten };
  } catch {
    return { ok: false, fehler: FREIGABE_NETZ };
  }
}

/** Entscheidung senden. Der Grund geht nur bei Ablehnung mit. */
export async function sendeFreigabe(
  p: { b: string; t: string; aktion: "ok" | "nein"; grund?: string },
  f: FetchFn = fetch,
): Promise<FreigabeErgebnis<FreigabeErgebnisDaten>> {
  try {
    const body = { b: p.b, t: p.t, aktion: p.aktion, ...(p.aktion === "nein" && p.grund ? { grund: p.grund } : {}) };
    const r = await f("/api/shop/freigabe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const { b, fehler } = await freigabeLies(r);
    if (fehler) return { ok: false, fehler };
    const neu = b.neu !== false;
    const mail = b.mail === true;
    if (b.status === "freigegeben") return { ok: true, daten: { status: "freigegeben", neu, mail } };
    if (b.status === "abgelehnt") return { ok: true, daten: { status: "abgelehnt", neu, mail, erstattung: b.erstattung === "erstattet" ? "erstattet" : "erstattung_offen" } };
    return { ok: false, fehler: freigabeFehler(500, {}) };
  } catch {
    return { ok: false, fehler: FREIGABE_NETZ };
  }
}
