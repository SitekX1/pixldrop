import "server-only";
// Individuelle Anfrage (unverbindlich, kein Vertragsschluss): speichern, Bilder in den
// privaten Bucket legen, Alex nur mit Nummer benachrichtigen.
import type { Db } from "./db";
import { DbFehler } from "./db";
import type { ShopEnv } from "./env";
import type { Benachrichtiger } from "./benachrichtigung";
import type { Farbe } from "../farben";
import { MAX_BILDER, MAX_GESAMT_BYTES, pruefeBild, type BildTyp } from "./bild";
import { pruefeAnfrage } from "./validierung";
import { alexMail, telegramAnfrage } from "./vorlagen";
import type { Antwort } from "./bestellung";

export interface AnfrageDeps {
  db: Db;
  notifier: Benachrichtiger;
  env: ShopEnv;
}

export interface HochgeladenesBild {
  bytes: Uint8Array;
  /** vom Browser gemeldeter MIME-Typ (muss zu den Magic Bytes passen) */
  typ: string;
  name: string;
}

const fehler = (status: number, code: string, meldung: string, extra: Record<string, unknown> = {}): Antwort => ({
  status,
  body: { ok: false, code, error: meldung, ...extra },
});

export async function legeAnfrageAn(
  deps: AnfrageDeps,
  felder: Record<string, unknown>,
  bilder: HochgeladenesBild[],
  ctx: { ipHash: string; farben: Farbe[] | null },
): Promise<Antwort> {
  const p = pruefeAnfrage(felder);
  if (!p.ok) return fehler(422, "ungueltig", "Bitte prüfe deine Angaben.", { felder: p.felder });
  const d = p.wert;

  if (bilder.length > MAX_BILDER) return fehler(422, "bilder", `Es sind höchstens ${MAX_BILDER} Bilder möglich.`);
  if (bilder.length > 0 && !d.rechte) {
    return fehler(422, "einwilligung_fehlt", "Bitte bestätige, dass du die Rechte an den Bildern hast.");
  }
  if (bilder.reduce((s, b) => s + b.bytes.length, 0) > MAX_GESAMT_BYTES) {
    return fehler(413, "zu_gross", "Die Bilder sind zusammen zu groß (höchstens ca. 4 MB).");
  }
  const geprueft: { bytes: Uint8Array; typ: BildTyp }[] = [];
  for (const b of bilder) {
    const r = pruefeBild(b.bytes, b.typ);
    if (!r.ok) {
      const text =
        r.grund === "zu_gross" ? "Ein Bild ist zu groß."
        : r.grund === "leer" ? "Eine Datei ist leer."
        : "Nur JPG-, PNG- oder WebP-Bilder sind erlaubt.";
      return fehler(422, "bild_" + r.grund, text);
    }
    geprueft.push({ bytes: b.bytes, typ: r.typ });
  }

  // Wunschfarbe: ID -> Name (nur wenn im Lager bekannt), sonst ignorieren
  const farbName = d.farbe ? ctx.farben?.find((f) => f.id === d.farbe)?.name ?? null : null;

  let res: { ok: boolean; grund?: string; id?: string; nummer?: string };
  try {
    res = await deps.db.rpc("shop_anfrage_anlegen", {
      p_ip_hash: ctx.ipHash,
      p_name: d.name,
      p_email: d.email,
      p_beschreibung: d.beschreibung,
      p_masse: { breite: d.breite, tiefe: d.tiefe, hoehe: d.hoehe },
      p_farbe: farbName,
      p_bild_anzahl: geprueft.length,
      p_einw: { datenschutz: d.datenschutz, rechte: d.rechte },
    });
  } catch (err) {
    console.error("Shop: Anfrage anlegen fehlgeschlagen:", err instanceof DbFehler ? err.message : "unbekannt");
    return fehler(503, "db", "Die Anfrage ist gerade nicht möglich. Bitte versuch es später noch einmal.");
  }
  if (!res.ok || !res.id || !res.nummer) {
    switch (res.grund) {
      case "zu_viele":
        return fehler(429, "zu_viele", "Zu viele Anfragen in kurzer Zeit. Bitte versuch es später noch einmal.");
      case "ueberlastet":
        return fehler(503, "ueberlastet", "Gerade ist sehr viel los. Bitte versuch es später noch einmal.");
      case "einwilligung_fehlt":
        return fehler(422, "einwilligung_fehlt", "Bitte bestätige die Pflichtangaben.");
      case "ungueltige_eingabe":
        return fehler(422, "ungueltig", "Bitte prüfe deine Angaben.");
      default:
        console.error("Shop: Anfrage abgelehnt, Grund:", res.grund ?? "unbekannt");
        return fehler(500, "intern", "Die Anfrage ist gerade nicht möglich.");
    }
  }
  const { id, nummer } = res;

  // Bilder hochladen (nur Pfade der erfolgreichen Uploads speichern)
  const pfade: string[] = [];
  for (let i = 0; i < geprueft.length; i++) {
    const pfad = `anfragen/${id}/${i + 1}.${geprueft[i].typ.ext}`;
    if (await deps.db.upload(pfad, geprueft[i].bytes, geprueft[i].typ.mime)) pfade.push(pfad);
  }
  let uploadFehler = pfade.length < geprueft.length;
  if (geprueft.length > 0) {
    // bis zu 3 Versuche; sonst fehlen die Pfade im Admin Panel -> dem Nutzer und Alex melden
    let gespeichert = false;
    for (let versuch = 0; versuch < 3 && !gespeichert; versuch++) {
      try {
        const r = await deps.db.rpc<{ ok: boolean }>("shop_anfrage_bilder_setzen", { p_id: id, p_pfade: pfade, p_fehler: uploadFehler });
        gespeichert = r.ok === true;
      } catch {
        /* naechster Versuch */
      }
    }
    if (!gespeichert) {
      console.error("Shop: Bildpfade der Anfrage konnten nicht gespeichert werden:", nummer);
      uploadFehler = true;
    }
  }

  // Alex benachrichtigen: nur Nummer + Art, nie Namen/Texte/Bilder
  const mail = alexMail("Anfrage", nummer, deps.env.adminUrl);
  const t = await deps.notifier.telegram(telegramAnfrage(nummer));
  const m = await deps.notifier.mailAlex(mail.betreff, mail.text);
  if (t || m) await deps.db.rpc("shop_markiere", { p_art: "anfrage_benachrichtigt", p_id: id }).catch(() => undefined);

  return { status: 200, body: { ok: true, anfragenummer: nummer, bilderFehlgeschlagen: uploadFehler } };
}
